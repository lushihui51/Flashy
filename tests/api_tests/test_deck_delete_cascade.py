import uuid

from sqlmodel import col, select

from app.mastery.ema import EmaStrategy
from app.models.card import Card
from app.models.card_field_mastery import CardFieldMastery
from app.models.deck_practice_config import DeckPracticeConfig
from app.models.field_def import FieldDef
from app.models.practice_card import PracticeCard
from app.models.practice_deck import PracticeDeck
from app.models.practice_session import SessionStatus
from app.models.review_log import ReviewLog
from app.services.mastery import rebuild_mastery


class TestDeckDeleteCascade:
    """Deleting a deck must cascade through rows it owns (field_def, card,
    deck_practice_config, and — since a practice_card without a card is meaningless —
    practice_card too) but never delete review_log, the durable historical record,
    which SETs its references NULL instead. practice_deck also SETs NULL: it's an
    immutable session snapshot, not deck-owned state. See the 'deck-delete cascade'
    migration and AGENTS.md's card_field_value entry."""

    def _setup(self, db, client, existing_deck, rate=True):
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
            "/api/practice_sessions",
            json={"name": "Cascade run", "deck_practice_config_ids": [config.json()["id"]]},
        )
        assert session.status_code == 201, session.text
        session_id = session.json()["id"]

        current = client.get(f"/api/practice_sessions/{session_id}/current_card")
        assert current.status_code == 200, current.text
        practice_card = current.json()

        if rate:
            rate_response = client.post(
                f"/api/practice_cards/{practice_card['id']}/rate",
                json={"ratings": {answer_id: 4}},
            )
            assert rate_response.status_code == 200, rate_response.text

        return {
            "field_ids": [uuid.UUID(prompt_id), uuid.UUID(answer_id)],
            "card_id": uuid.UUID(card_id),
            "config_id": uuid.UUID(config.json()["id"]),
            "session_id": uuid.UUID(session_id),
            "practice_card_id": uuid.UUID(practice_card["id"]),
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
            db.exec(select(CardFieldMastery).where(CardFieldMastery.card_id == ids["card_id"]))
            .all()
            == []
        )
        assert db.get(PracticeCard, ids["practice_card_id"]) is None

        # review_log — the durable record — survives, decoupled via SET NULL
        surviving_logs = db.exec(
            select(ReviewLog).where(col(ReviewLog.id).in_(review_log_ids))
        ).all()
        assert len(surviving_logs) == len(review_log_ids)
        assert all(row.card_id is None for row in surviving_logs)
        assert all(row.field_def_id is None for row in surviving_logs)
        assert all(row.practice_card_id is None for row in surviving_logs)

        # practice_deck — the session snapshot — also survives, deck_id nulled
        practice_deck = db.exec(
            select(PracticeDeck).where(PracticeDeck.practice_session_id == ids["session_id"])
        ).first()
        assert practice_deck is not None
        assert practice_deck.deck_id is None

    def test_single_card_delete_cascades_mastery_and_nulls_review_log_card_refs(
        self, db, client, existing_deck
    ):
        """Phase 4.5 (§2.6): DELETE /api/cards/{id} follows the same D12 policy as a
        deck delete, just scoped to one card — card_field_mastery for it is gone, and
        review_log rows keep existing (card_id, practice_card_id SET NULL) rather than
        being deleted. Unlike a deck delete, the field_def itself isn't touched, so
        review_log.field_def_id is untouched too — this is the one place that differs
        from the deck-delete test above."""
        ids = self._setup(db, client, existing_deck)

        review_log_ids = list(
            db.exec(select(ReviewLog.id).where(ReviewLog.card_id == ids["card_id"])).all()
        )
        assert review_log_ids, "setup should have produced at least one review_log row"

        response = client.delete(f"/api/cards/{ids['card_id']}")
        assert response.status_code == 204, response.text

        assert (
            db.exec(
                select(CardFieldMastery).where(CardFieldMastery.card_id == ids["card_id"])
            ).all()
            == []
        )
        assert db.get(PracticeCard, ids["practice_card_id"]) is None
        # the deck, its other field_defs, etc. are all untouched — only this one
        # card's owned state is gone.
        assert db.get(Card, ids["card_id"]) is None

        surviving_logs = db.exec(select(ReviewLog).where(col(ReviewLog.id).in_(review_log_ids))).all()
        assert len(surviving_logs) == len(review_log_ids)
        assert all(row.card_id is None for row in surviving_logs)
        assert all(row.practice_card_id is None for row in surviving_logs)
        assert all(row.field_def_id is not None for row in surviving_logs)

    def test_rebuild_mastery_skips_orphaned_history(self, db, client, existing_deck):
        ids = self._setup(db, client, existing_deck)
        response = client.delete(f"/api/decks/{existing_deck['id']}")
        assert response.status_code == 204, response.text

        # must not crash trying to write card_field_mastery for a card_id that no
        # longer exists — orphaned review_log rows are excluded from the replay
        rebuild_mastery(db, EmaStrategy())

        assert (
            db.exec(
                select(CardFieldMastery).where(CardFieldMastery.card_id == ids["card_id"])
            ).all()
            == []
        )

    def test_rating_a_card_whose_deck_was_deleted_mid_session_is_rejected(
        self, db, client, existing_deck
    ):
        """A pending practice_card cascade-deletes along with its card when the deck
        is deleted mid-session — submit_rating sees a plain 'not found', the same path
        as any other unknown practice_card_id, with no special-case guard needed."""
        ids = self._setup(db, client, existing_deck, rate=False)

        response = client.delete(f"/api/decks/{existing_deck['id']}")
        assert response.status_code == 204, response.text

        rate_response = client.post(
            f"/api/practice_cards/{ids['practice_card_id']}/rate",
            json={"ratings": {str(ids["field_ids"][1]): 4}},
        )
        assert rate_response.status_code == 404, rate_response.text

    def test_current_card_read_abandons_session_when_nothing_remains(
        self, db, client, existing_deck
    ):
        """The read path, not the rate path: once the deck (and with it every pending
        practice_card) is gone, the next GET of current_card finds nothing and — since
        the session was still active — transitions it to abandoned instead of leaving
        it active forever against an endpoint that will only ever 404."""
        ids = self._setup(db, client, existing_deck, rate=False)

        response = client.delete(f"/api/decks/{existing_deck['id']}")
        assert response.status_code == 204, response.text

        current = client.get(
            f"/api/practice_sessions/{ids['session_id']}/current_card"
        )
        assert current.status_code == 404, current.text

        session = client.get(f"/api/practice_sessions/{ids['session_id']}")
        assert session.status_code == 200, session.text
        assert session.json()["status"] == SessionStatus.abandoned.value
