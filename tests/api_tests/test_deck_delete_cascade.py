import uuid

import pytest
from sqlmodel import col, select

from app.mastery.ema import EmaStrategy
from app.models.card import Card
from app.models.deck_practice_config import DeckPracticeConfig
from app.models.field_def import FieldDef
from app.models.mastery_log import MasteryLog
from app.models.practice_card import PracticeCard
from app.models.practice_deck import PracticeDeck
from app.models.practice_run import PracticeRun, RunStatus
from app.models.review_log import ReviewLog
from app.services.mastery import rebuild_mastery


class TestDeckDeleteCascade:
    """Deleting a deck cascades through everything that references its id (ADR 047):
    field_def, card, deck_practice_config, practice_card (a practice_card without a
    card is meaningless), practice_deck (an immutable snapshot, but one that no
    longer outlives its deck), and review_log itself (ADR 048 amends the SET NULL
    this table used to have — its own history is not exempt from the rule either). A
    run left owning no practice_deck at all is deleted alongside its last one."""

    def _setup(self, db, client, existing_deck, rate=True, extra_cards=0):
        prompt = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "prompt", "type": "text"}
        )
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        )
        assert prompt.status_code == 201 and answer.status_code == 201, (prompt.text, answer.text)
        prompt_id, answer_id = prompt.json()["id"], answer.json()["id"]

        card = client.post(
            "/api/cards",
            json={
                "deck_id": existing_deck["id"],
                "values": {prompt_id: "Bonjour", answer_id: "Hello"},
            },
        )
        assert card.status_code == 201, card.text
        card_id = card.json()["id"]

        # extra_cards > 0 gives the session more than one pending practice_card, which is
        # what distinguishes "the queue moves on" from "nothing remains".
        for i in range(extra_cards):
            extra = client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {prompt_id: f"Bonsoir {i}", answer_id: f"Good evening {i}"},
                },
            )
            assert extra.status_code == 201, extra.text

        config = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": existing_deck["id"],
                "name": "cascade-test-config",
                "prompt_field_ids": [prompt_id],
                "answer_field_ids": [answer_id],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        )
        assert config.status_code == 201, config.text

        session = client.post(
            "/api/practice_runs",
            json={"name": "Cascade run", "deck_practice_config_ids": [config.json()["id"]]},
        )
        assert session.status_code == 201, session.text
        session_id = session.json()["id"]

        current = client.get(f"/api/practice_runs/{session_id}/state")
        assert current.status_code == 200, current.text
        practice_card = current.json()["current_card"]
        assert practice_card is not None

        if rate:
            rate_response = client.post(
                f"/api/practice_cards/{practice_card['practice_card_id']}/rate",
                json={"ratings": {answer_id: 4}},
            )
            assert rate_response.status_code == 200, rate_response.text

        return {
            "field_ids": [uuid.UUID(prompt_id), uuid.UUID(answer_id)],
            "card_id": uuid.UUID(card_id),
            "config_id": uuid.UUID(config.json()["id"]),
            "session_id": uuid.UUID(session_id),
            "practice_card_id": uuid.UUID(practice_card["practice_card_id"]),
        }

    def test_delete_cascades_owned_rows_and_preserves_history(
        self, db, client, existing_deck
    ):
        ids = self._setup(db, client, existing_deck)
        deck_id = uuid.UUID(existing_deck["id"])

        review_log_ids = list(
            db.exec(select(ReviewLog.id).where(ReviewLog.card_id == ids["card_id"])).all()
        )
        assert review_log_ids, "setup should have produced at least one review_log row"

        response = client.delete(f"/api/decks/{existing_deck['id']}")
        assert response.status_code == 204, response.text

        # owned rows cascade away with the deck, including the now-meaningless
        # practice_card (a practice_card without a card can't exist)
        assert db.exec(select(FieldDef).where(FieldDef.deck_id == deck_id)).all() == []
        assert db.exec(select(Card).where(Card.deck_id == deck_id)).all() == []
        assert (
            db.exec(
                select(DeckPracticeConfig).where(DeckPracticeConfig.id == ids["config_id"])
            ).first()
            is None
        )
        assert (
            db.exec(select(MasteryLog).where(MasteryLog.card_id == ids["card_id"]))
            .all()
            == []
        )
        assert db.get(PracticeCard, ids["practice_card_id"]) is None

        # review_log no longer survives its card/field with nulled references (ADR
        # 048) — it cascades away with them entirely, same as everything else here.
        surviving_logs = db.exec(
            select(ReviewLog).where(col(ReviewLog.id).in_(review_log_ids))
        ).all()
        assert surviving_logs == []

        # the session snapshot cascades away too...
        assert (
            db.exec(
                select(PracticeDeck).where(PracticeDeck.practice_run_id == ids["session_id"])
            ).first()
            is None
        )
        # ...and since this run had only this one deck, the run itself is gone with
        # it (ADR 048's "a run with no decks is deleted").
        assert db.exec(select(PracticeRun).where(PracticeRun.id == ids["session_id"])).first() is None

    def test_delete_leaves_a_two_deck_runs_other_snapshot_and_run_intact(
        self, db, client, existing_subject, existing_deck
    ):
        """A run spanning two decks survives a delete of just one of them (ADR 048):
        the deleted deck's own snapshot cascades away, but the run is not "left with
        no decks" — its other snapshot is untouched and the run still lists it."""
        front = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "front", "type": "text"}
        ).json()["id"]
        back = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "back", "type": "text"}
        ).json()["id"]
        client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front: "Q", back: "A"}},
        )
        config1 = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": existing_deck["id"],
                "name": "cfg1",
                "prompt_field_ids": [front],
                "answer_field_ids": [back],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()

        other_deck = client.post(
            "/api/decks",
            json={
                "name": "Other deck",
                "subject_id": existing_subject["id"],
                "field_defs": [
                    {"name": "front", "type": "text"},
                    {"name": "back", "type": "text"},
                ],
            },
        ).json()
        other_front, other_back = (fd["id"] for fd in other_deck["field_defs"])
        client.post(
            "/api/cards",
            json={
                "deck_id": other_deck["id"],
                "values": {other_front: "Q2", other_back: "A2"},
            },
        )
        config2 = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": other_deck["id"],
                "name": "cfg2",
                "prompt_field_ids": [other_front],
                "answer_field_ids": [other_back],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()

        run = client.post(
            "/api/practice_runs",
            json={
                "name": "Two decks",
                "deck_practice_config_ids": [config1["id"], config2["id"]],
            },
        ).json()

        deleted = client.delete(f"/api/decks/{existing_deck['id']}")
        assert deleted.status_code == 204, deleted.text

        detail = client.get(f"/api/practice_runs/{run['id']}")
        assert detail.status_code == 200, detail.text
        assert [d["deck_id"] for d in detail.json()["decks"]] == [other_deck["id"]]

        remaining_snapshots = db.exec(
            select(PracticeDeck).where(PracticeDeck.practice_run_id == uuid.UUID(run["id"]))
        ).all()
        assert len(remaining_snapshots) == 1
        assert remaining_snapshots[0].deck_id == uuid.UUID(other_deck["id"])

    def test_single_card_delete_cascades_mastery_and_review_log_rows(
        self, db, client, existing_deck
    ):
        """DELETE /api/cards/{id} follows the same rule as a deck delete, just scoped
        to one card (ADR 047, ADR 048): mastery_log for it is gone, and review_log
        rows about it cascade away entirely too, rather than surviving with a nulled
        card_id. Unlike a deck delete, the field_def itself isn't touched here."""
        ids = self._setup(db, client, existing_deck)

        review_log_ids = list(
            db.exec(select(ReviewLog.id).where(ReviewLog.card_id == ids["card_id"])).all()
        )
        assert review_log_ids, "setup should have produced at least one review_log row"

        response = client.delete(f"/api/cards/{ids['card_id']}")
        assert response.status_code == 204, response.text

        assert (
            db.exec(
                select(MasteryLog).where(MasteryLog.card_id == ids["card_id"])
            ).all()
            == []
        )
        assert db.get(PracticeCard, ids["practice_card_id"]) is None
        # the deck, its other field_defs, etc. are all untouched — only this one
        # card's owned state, and the review rows about it, are gone.
        assert db.get(Card, ids["card_id"]) is None

        surviving_logs = db.exec(select(ReviewLog).where(col(ReviewLog.id).in_(review_log_ids))).all()
        assert surviving_logs == []

    def test_rebuild_mastery_after_a_deck_delete_leaves_the_other_decks_rows_equal(
        self, db, client, existing_subject, existing_deck
    ):
        """A user-wide rebuild after a deck delete must not disturb another deck's
        mastery — invariant 3: replaying reproduces the live rows for every group the
        deletion didn't touch, value for value."""
        ids = self._setup(db, client, existing_deck)

        other_deck = client.post(
            "/api/decks",
            json={
                "name": "Surviving deck",
                "subject_id": existing_subject["id"],
                "field_defs": [
                    {"name": "prompt", "type": "text"},
                    {"name": "answer", "type": "text"},
                ],
            },
        ).json()
        other_prompt, other_answer = (fd["id"] for fd in other_deck["field_defs"])
        other_card = client.post(
            "/api/cards",
            json={
                "deck_id": other_deck["id"],
                "values": {other_prompt: "Q", other_answer: "A"},
            },
        ).json()
        other_config = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": other_deck["id"],
                "name": "other-config",
                "prompt_field_ids": [other_prompt],
                "answer_field_ids": [other_answer],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()
        other_run = client.post(
            "/api/practice_runs",
            json={"name": "Other run", "deck_practice_config_ids": [other_config["id"]]},
        ).json()
        other_practice_card = client.get(
            f"/api/practice_runs/{other_run['id']}/state"
        ).json()["current_card"]
        rate_res = client.post(
            f"/api/practice_cards/{other_practice_card['practice_card_id']}/rate",
            json={"ratings": {other_answer: 3}},
        )
        assert rate_res.status_code == 200, rate_res.text

        def _ledger(card_id):
            return {
                (row.card_id, row.field_def_id): (
                    row.prompt_mastery,
                    row.answer_mastery,
                    row.prompt_review_count,
                    row.answer_review_count,
                )
                for row in db.exec(select(MasteryLog).where(MasteryLog.card_id == card_id)).all()
            }

        other_card_id = uuid.UUID(other_card["id"])
        before = _ledger(other_card_id)
        assert before

        response = client.delete(f"/api/decks/{existing_deck['id']}")
        assert response.status_code == 204, response.text

        rebuild_mastery(db, EmaStrategy())

        after = _ledger(other_card_id)
        assert set(before.keys()) == set(after.keys())
        for key, values in before.items():
            assert after[key] == pytest.approx(values, abs=1e-4)

        # the deleted deck's own card has nothing left to rebuild.
        assert (
            db.exec(select(MasteryLog).where(MasteryLog.card_id == ids["card_id"])).all() == []
        )

    def test_rating_a_card_whose_card_was_deleted_mid_session_is_rejected(
        self, db, client, existing_deck
    ):
        """A pending practice_card cascade-deletes along with its card — submit_rating
        sees a plain 'not found', the same path as any other unknown
        practice_card_id, with no special-case guard needed."""
        ids = self._setup(db, client, existing_deck, rate=False)

        response = client.delete(f"/api/cards/{ids['card_id']}")
        assert response.status_code == 204, response.text

        rate_response = client.post(
            f"/api/practice_cards/{ids['practice_card_id']}/rate",
            json={"ratings": {str(ids["field_ids"][1]): 4}},
        )
        assert rate_response.status_code == 404, rate_response.text

    def test_run_state_completes_session_when_nothing_remains(
        self, db, client, existing_deck
    ):
        """The read path, not the rate path: once the card (and with it its pending
        practice_card) is gone, the next GET of run reports `current_card: null` and —
        since the session was still active — session_status already reads completed
        rather than leaving it active forever against a card that's already gone."""
        ids = self._setup(db, client, existing_deck, rate=False)

        response = client.delete(f"/api/cards/{ids['card_id']}")
        assert response.status_code == 204, response.text

        run = client.get(f"/api/practice_runs/{ids['session_id']}/state")
        assert run.status_code == 200, run.text
        assert run.json()["current_card"] is None
        assert run.json()["session_status"] == RunStatus.completed.value

        session = client.get(f"/api/practice_runs/{ids['session_id']}")
        assert session.status_code == 200, session.text
        assert session.json()["status"] == RunStatus.completed.value

    def test_deleting_the_card_being_practiced_serves_the_next_pending_card(
        self, db, client, existing_deck
    ):
        """The other half of the case above: cards remain, so the session must simply
        move on. There is no stored cursor to fix up — the current card is derived
        (`status='pending' ORDER BY position LIMIT 1`, db_read_current_practice_card), so
        the cascade-deleted row stops matching and the next one is served with no write
        anywhere. The session stays active."""
        ids = self._setup(db, client, existing_deck, rate=False, extra_cards=1)

        current = client.get(f"/api/practice_runs/{ids['session_id']}/state")
        assert current.status_code == 200, current.text
        served = current.json()["current_card"]
        assert served is not None

        # Delete whichever card is actually being practiced, rather than assuming which
        # of the two the ordering put first.
        deleted = client.delete(f"/api/cards/{served['card_id']}")
        assert deleted.status_code == 204, deleted.text
        assert db.get(PracticeCard, uuid.UUID(served["practice_card_id"])) is None

        next_run = client.get(f"/api/practice_runs/{ids['session_id']}/state")
        assert next_run.status_code == 200, next_run.text
        next_current = next_run.json()["current_card"]
        assert next_current is not None
        assert next_current["practice_card_id"] != served["practice_card_id"]
        assert next_current["card_id"] != served["card_id"]

        session = client.get(f"/api/practice_runs/{ids['session_id']}")
        assert session.json()["status"] == RunStatus.active.value
