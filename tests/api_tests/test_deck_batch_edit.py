"""PATCH /api/decks/{id} per plan §2.3 — the batch changeset endpoint Phase 6 adds:
field_defs and cards applied together in one transaction, in the stated order (field
create -> field update -> field delete -> reorder -> card delete -> card update ->
card create). Task 013 T5: the field and card delete phases run through
compute_deletion_impact + apply_deletion (ADR 049, ADR 051), the same closure a
direct subject/deck/card delete uses."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import desc
from sqlmodel import select

from app.mastery.ema import EmaStrategy
from app.mastery.types import MasteryUpdate, ReviewGroup, ReviewSide
from app.models.deck_practice_config import DeckPracticeConfig
from app.models.mastery_log import MasteryLog
from app.models.practice_deck import PracticeDeck
from app.models.practice_run import PracticeRun, RunStatus
from app.models.review_log import ReviewLog
from app.services.mastery import record_review_group


def _field_defs(**overrides):
    payload = {"create": [], "update": [], "delete": [], "order": []}
    payload.update(overrides)
    return payload


def _cards(**overrides):
    payload = {"create": [], "update": [], "delete": []}
    payload.update(overrides)
    return payload


class TestFieldDefsCreateAlone:
    def test_field_create_alone(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}])},
        )
        assert response.status_code == 200, response.text
        names = {fd["name"] for fd in response.json()["field_defs"]}
        assert names == {"front", "back", "Notes"}

    def test_field_create_backfills_dense_card_field_value_rows(
        self, client, existing_deck, existing_field_defs
    ):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}])},
        )
        assert response.status_code == 200, response.text
        data = response.json()
        notes_id = next(fd["id"] for fd in data["field_defs"] if fd["name"] == "Notes")
        found = next(c for c in data["cards"] if c["id"] == card["id"])
        assert len(found["values"]) == 3
        assert found["values"][notes_id] == ""

    def test_duplicate_client_key_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": _field_defs(
                    create=[
                        {"client_key": "c1", "name": "Notes", "type": "text"},
                        {"client_key": "c1", "name": "Other", "type": "text"},
                    ]
                )
            },
        )
        assert response.status_code == 422

    def test_blank_name_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(create=[{"client_key": "c1", "name": "  ", "type": "text"}])},
        )
        assert response.status_code == 422


class TestFieldDefsUpdateAlone:
    def test_field_rename_alone(self, client, existing_deck, existing_field_defs):
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(update=[{"id": field_id, "name": "Renamed"}])},
        )
        assert response.status_code == 200, response.text
        renamed = next(fd for fd in response.json()["field_defs"] if fd["id"] == field_id)
        assert renamed["name"] == "Renamed"

    def test_field_type_change_rejected(self, client, existing_deck, existing_field_defs):
        """MD-1: a type change is refused with the same message PATCH /fields/{id}
        uses, keeping ADR 009 intact — an entry whose type is present and differs
        from the field's current type raises before anything is written."""
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(update=[{"id": field_id, "type": "image"}])},
        )
        assert response.status_code == 422, response.text
        assert response.json()["detail"] == "field_defs.update type cannot be changed"

        unchanged = client.get(f"/api/decks/{existing_deck['id']}").json()
        kept = next(fd for fd in unchanged["field_defs"] if fd["id"] == field_id)
        assert kept["type"] == "text"

    def test_field_type_unchanged_in_update_entry_is_not_rejected(
        self, client, existing_deck, existing_field_defs
    ):
        """The refusal is only for a type that actually differs — an entry that
        merely repeats the field's current type (e.g. a client that always sends the
        full row) must still succeed."""
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": _field_defs(
                    update=[{"id": field_id, "name": "Renamed", "type": "text"}]
                )
            },
        )
        assert response.status_code == 200, response.text
        updated = next(fd for fd in response.json()["field_defs"] if fd["id"] == field_id)
        assert updated["name"] == "Renamed"
        assert updated["type"] == "text"

    def test_rename_only_batch_issues_zero_mastery_log_statements(
        self, client, existing_deck, existing_field_defs, mastery_log_statement_counter
    ):
        field_id = existing_field_defs[0]["id"]
        mastery_log_statement_counter.reset()
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(update=[{"id": field_id, "name": "Renamed"}])},
        )
        assert response.status_code == 200, response.text
        assert mastery_log_statement_counter.count == 0


class TestFieldDefsDeleteAlone:
    def test_field_delete_alone(self, client, existing_deck, existing_field_defs):
        client.post(f"/api/decks/{existing_deck['id']}/fields", json={"name": "Extra", "type": "text"})
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[field_id])},
        )
        assert response.status_code == 200, response.text
        ids = {fd["id"] for fd in response.json()["field_defs"]}
        assert field_id not in ids

    def test_field_delete_cascades_card_field_value_rows(
        self, client, existing_deck, existing_field_defs
    ):
        client.post(f"/api/decks/{existing_deck['id']}/fields", json={"name": "Extra", "type": "text"})
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[front_id])},
        )
        assert response.status_code == 200, response.text
        found = next(c for c in response.json()["cards"] if c["id"] == card["id"])
        assert front_id not in found["values"]
        assert back_id in found["values"]


class TestFieldDeleteGoesThroughTheClosure:
    def test_field_delete_drops_prompt_influence_scopes_scrub_updates_configs_and_runs(
        self, client, db, existing_user, existing_subject
    ):
        """The field-B scenario from T3's service test (test_deletion.py), asserted
        end to end through PATCH /api/decks/{id} instead of calling
        compute_deletion_impact/apply_deletion directly: prompt P shown with answers
        A (rated 3) and B (rated 1) in one appearance, B also shown as a prompt in a
        second appearance. Deleting B must move P's mastery, leave A's alone, remove
        every trace of B, scrub only deck1's own rows, and update the configs and
        runs naming B without touching the ones that don't."""
        strategy = EmaStrategy()

        deck1 = client.post(
            "/api/decks",
            json={
                "name": "D1",
                "subject_id": existing_subject["id"],
                "field_defs": [
                    {"name": "P", "type": "text"},
                    {"name": "A", "type": "text"},
                    {"name": "B", "type": "text"},
                ],
            },
        ).json()
        deck1_id = deck1["id"]
        p_id, a_id, b_id = (uuid.UUID(fd["id"]) for fd in deck1["field_defs"])
        card1 = client.post(
            "/api/cards",
            json={
                "deck_id": deck1_id,
                "values": {str(p_id): "p", str(a_id): "a", str(b_id): "b"},
            },
        ).json()
        card1_id = uuid.UUID(card1["id"])

        base_time = datetime(2026, 3, 1, tzinfo=UTC)

        # Appearance 1 (what the mastery assertions below are about): prompt P
        # shown with answers A rated 3 and B rated 1.
        appearance1 = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card1_id,
            reviewed_at=base_time,
            ratings=((a_id, 3), (b_id, 1)),
            shown_prompt_ids=(p_id,),
        )
        record_review_group(db, strategy, existing_user.id, appearance1, None)
        db.commit()

        # Appearance 2, same card, later: A rated again, with B shown as a *prompt*
        # this time — sets up the shown_prompt_ids scrub assertion below.
        appearance2 = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card1_id,
            reviewed_at=base_time + timedelta(minutes=1),
            ratings=((a_id, 4),),
            shown_prompt_ids=(b_id,),
        )
        record_review_group(db, strategy, existing_user.id, appearance2, None)
        db.commit()

        a_before = db.exec(
            select(MasteryLog)
            .where(MasteryLog.card_id == card1_id, MasteryLog.field_def_id == a_id)
            .order_by(desc(MasteryLog.reviewed_at))
        ).first()
        assert a_before is not None
        a_state_before = (a_before.answer_mastery, a_before.answer_review_count)

        # A second, unrelated deck whose review_log row's shown_prompt_ids array is
        # deliberately made to also name B's id — proves the scrub is scoped to
        # deck1's own cards, not to every row anywhere that happens to name B.
        deck2 = client.post(
            "/api/decks",
            json={
                "name": "D2",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "X", "type": "text"}, {"name": "Y", "type": "text"}],
            },
        ).json()
        x_id, y_id = (uuid.UUID(fd["id"]) for fd in deck2["field_defs"])
        card2 = client.post(
            "/api/cards",
            json={"deck_id": deck2["id"], "values": {str(x_id): "x", str(y_id): "y"}},
        ).json()
        card2_id = uuid.UUID(card2["id"])
        record_review_group(
            db,
            strategy,
            existing_user.id,
            ReviewGroup(
                review_group_id=uuid.uuid4(),
                card_id=card2_id,
                reviewed_at=base_time,
                ratings=((y_id, 4),),
                shown_prompt_ids=(b_id,),
            ),
            None,
        )
        db.commit()

        config_with_b = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": deck1_id,
                "name": "with-b",
                "prompt_field_ids": [str(p_id)],
                "answer_field_ids": [str(a_id), str(b_id)],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()
        config_without_b = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": deck1_id,
                "name": "without-b",
                "prompt_field_ids": [str(p_id)],
                "answer_field_ids": [str(a_id)],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()

        def _run(name, status=RunStatus.active):
            run = PracticeRun(user_id=existing_user.id, name=name, status=status)
            db.add(run)
            db.commit()
            db.refresh(run)
            return run.id

        def _snapshot(run_id, deck_id, prompt_ids, answer_ids):
            db.add(
                PracticeDeck(
                    practice_run_id=run_id,
                    deck_id=deck_id,
                    prompt_field_ids=list(prompt_ids),
                    answer_field_ids=list(answer_ids),
                    prompt_pool_ids=[],
                    prompt_pool_counts=[],
                    answer_pool_ids=[],
                    answer_pool_counts=[],
                )
            )
            db.commit()

        deck1_uuid = uuid.UUID(deck1_id)
        active_run_with_b_id = _run("active-with-b")
        _snapshot(active_run_with_b_id, deck1_uuid, [p_id], [a_id, b_id])
        active_run_without_b_id = _run("active-without-b")
        _snapshot(active_run_without_b_id, deck1_uuid, [p_id], [a_id])
        completed_run_with_b_id = _run("completed-with-b", RunStatus.completed)
        _snapshot(completed_run_with_b_id, deck1_uuid, [p_id], [a_id, b_id])

        # The deletion itself, through the real endpoint.
        response = client.patch(
            f"/api/decks/{deck1_id}",
            json={"field_defs": _field_defs(delete=[str(b_id)])},
        )
        assert response.status_code == 200, response.text
        remaining_ids = {fd["id"] for fd in response.json()["field_defs"]}
        assert str(b_id) not in remaining_ids

        # P's latest prompt_mastery is exactly what a single appearance with just
        # A's rating would have produced — B's influence on the shared prompt is
        # gone.
        p_row = db.exec(
            select(MasteryLog)
            .where(MasteryLog.card_id == card1_id, MasteryLog.field_def_id == p_id)
            .order_by(desc(MasteryLog.reviewed_at))
        ).first()
        assert p_row is not None
        expected_prompt = strategy.apply_review(
            None,
            MasteryUpdate(
                side=ReviewSide.prompt, target_score=strategy.rating_scores[3], breadth=1
            ),
        ).prompt_mastery
        assert p_row.prompt_mastery == pytest.approx(expected_prompt, abs=1e-4)

        # A's own row is unchanged — its answer-side update never depended on B.
        a_after = db.exec(
            select(MasteryLog)
            .where(MasteryLog.card_id == card1_id, MasteryLog.field_def_id == a_id)
            .order_by(desc(MasteryLog.reviewed_at))
        ).first()
        assert a_after is not None
        assert (a_after.answer_mastery, a_after.answer_review_count) == pytest.approx(
            a_state_before
        )

        # B has no mastery_log or review_log rows left at all.
        assert db.exec(select(MasteryLog).where(MasteryLog.field_def_id == b_id)).first() is None
        assert db.exec(select(ReviewLog).where(ReviewLog.field_def_id == b_id)).first() is None

        # The scrub: deck1's own row no longer names B, deck2's identical array
        # still does.
        d1_row = db.exec(
            select(ReviewLog).where(
                ReviewLog.card_id == card1_id,
                ReviewLog.review_group_id == appearance2.review_group_id,
            )
        ).first()
        assert d1_row is not None
        assert b_id not in d1_row.shown_prompt_ids

        d2_row = db.exec(select(ReviewLog).where(ReviewLog.card_id == card2_id)).first()
        assert d2_row is not None
        assert d2_row.shown_prompt_ids == [b_id]

        # Configurations: the one naming B is gone, the one that doesn't survives.
        assert db.get(DeckPracticeConfig, uuid.UUID(config_with_b["id"])) is None
        assert db.get(DeckPracticeConfig, uuid.UUID(config_without_b["id"])) is not None

        # Runs: the active run naming B is gone; the active run not naming it, and
        # the completed run that does name it, both survive.
        assert db.get(PracticeRun, active_run_with_b_id) is None
        assert db.get(PracticeRun, active_run_without_b_id) is not None
        assert db.get(PracticeRun, completed_run_with_b_id) is not None


class TestMinimumTwoActiveFields:
    def test_delete_below_two_fields_rejected(self, client, existing_deck, existing_field_defs):
        field_id = existing_field_defs[0]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[field_id])},
        )
        assert response.status_code == 422
        assert "at least two fields" in response.json()["detail"]

    def test_delete_all_active_fields_at_once_rejected(self, client, existing_deck, existing_field_defs):
        extra = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "Extra", "type": "text"}
        ).json()
        field_ids = [fd["id"] for fd in existing_field_defs] + [extra["id"]]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=field_ids)},
        )
        assert response.status_code == 422
        assert "at least two fields" in response.json()["detail"]

        # rejected before commit — nothing persisted, all three still active.
        get_response = client.get(f"/api/decks/{existing_deck['id']}")
        assert len(get_response.json()["field_defs"]) == 3

    def test_delete_below_two_fields_rejected_before_apply_deletion_runs(
        self, client, existing_deck, existing_field_defs, mastery_log_statement_counter
    ):
        """The two-field floor check runs before apply_deletion is ever called — a
        zero mastery_log statement count proves rebuild_deck_mastery never ran,
        which it would have had the deletion closure been executed first."""
        field_id = existing_field_defs[0]["id"]
        mastery_log_statement_counter.reset()
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[field_id])},
        )
        assert response.status_code == 422, response.text
        assert "at least two fields" in response.json()["detail"]
        assert mastery_log_statement_counter.count == 0


class TestFieldDefsReorder:
    def test_reorder_alone(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(order=[back_id, front_id])},
        )
        assert response.status_code == 200, response.text
        by_id = {fd["id"]: fd["position"] for fd in response.json()["field_defs"]}
        assert by_id[back_id] == 0
        assert by_id[front_id] == 1

    def test_reorder_updates_positions_contiguously(self, client, existing_deck, existing_field_defs):
        extra = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "Extra", "type": "text"}
        ).json()
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(order=[extra["id"], back_id, front_id])},
        )
        assert response.status_code == 200, response.text
        positions = sorted(fd["position"] for fd in response.json()["field_defs"])
        assert positions == [0, 1, 2]

    def test_reorder_including_a_newly_created_field(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": _field_defs(
                    create=[{"client_key": "c1", "name": "Notes", "type": "text"}],
                    order=["c1", back_id, front_id],
                )
            },
        )
        assert response.status_code == 200, response.text
        by_name = {fd["name"]: fd["position"] for fd in response.json()["field_defs"]}
        assert by_name == {"Notes": 0, "back": 1, "front": 2}

    def test_incomplete_order_rejected(self, client, existing_deck, existing_field_defs):
        back_id = existing_field_defs[1]["id"]
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(order=[back_id])},
        )
        assert response.status_code == 422


class TestCardsCreateAlone:
    def test_card_create_alone(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(create=[{"values": {front_id: "Bonjour", back_id: "Hello"}}])},
        )
        assert response.status_code == 200, response.text
        [card] = response.json()["cards"]
        assert card["values"] == {front_id: "Bonjour", back_id: "Hello"}

    def test_card_create_all_blank_dropped(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(create=[{"values": {}}])},
        )
        assert response.status_code == 200, response.text
        assert response.json()["cards"] == []

    def test_card_create_dense_over_untouched_fields(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(create=[{"values": {front_id: "Bonjour"}}])},
        )
        assert response.status_code == 200, response.text
        [card] = response.json()["cards"]
        assert card["values"] == {front_id: "Bonjour", back_id: ""}


class TestCardsUpdateAlone:
    def test_card_update_alone(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(update=[{"id": card["id"], "values": {back_id: "Salut"}}])},
        )
        assert response.status_code == 200, response.text
        [updated] = response.json()["cards"]
        assert updated["values"] == {front_id: "Bonjour", back_id: "Salut"}

    def test_card_update_null_value_clears_to_empty_string(
        self, client, existing_deck, existing_field_defs
    ):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(update=[{"id": card["id"], "values": {back_id: None}}])},
        )
        assert response.status_code == 200, response.text
        [updated] = response.json()["cards"]
        assert updated["values"][back_id] == ""

    def test_card_update_same_card_twice_rejected(
        self, client, existing_deck, existing_field_defs
    ):
        """MD-1: a card named twice in cards.update is refused before any entry applies."""
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card_id = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()["id"]

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "cards": _cards(
                    update=[
                        {"id": card_id, "values": {front_id: "a"}},
                        {"id": card_id, "values": {front_id: "b"}},
                    ]
                )
            },
        )
        assert response.status_code == 422, response.text
        detail = response.json()["detail"]
        assert "is duplicated" in detail
        assert card_id in detail

        deck = client.get(f"/api/decks/{existing_deck['id']}").json()
        [card] = deck["cards"]
        assert card["values"][front_id] == "Bonjour"

    def test_card_update_two_different_cards_accepted(
        self, client, existing_deck, existing_field_defs
    ):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card_ids = [
            client.post(
                "/api/cards",
                json={"deck_id": existing_deck["id"], "values": {front_id: front, back_id: "x"}},
            ).json()["id"]
            for front in ("Bonjour", "Merci")
        ]

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "cards": _cards(
                    update=[
                        {"id": card_ids[0], "values": {front_id: "Salut"}},
                        {"id": card_ids[1], "values": {front_id: "Pardon"}},
                    ]
                )
            },
        )
        assert response.status_code == 200, response.text
        fronts = {c["id"]: c["values"][front_id] for c in response.json()["cards"]}
        assert fronts == {card_ids[0]: "Salut", card_ids[1]: "Pardon"}


class TestCardsDeleteAlone:
    def test_card_delete_alone(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(delete=[card["id"]])},
        )
        assert response.status_code == 200, response.text
        assert response.json()["cards"] == []

    def test_card_delete_removes_review_rows_and_issues_no_rebuild(
        self,
        client,
        db,
        existing_user,
        existing_deck,
        existing_field_defs,
        mastery_log_statement_counter,
    ):
        """A card delete's review rows go with it (ADR 047, ADR 051), same as a
        direct DELETE /api/cards/{id}; unlike a field delete, no deck rebuild ever
        follows one, since deleting a card touches no other card's mastery."""
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()
        card_id = uuid.UUID(card["id"])

        strategy = EmaStrategy()
        record_review_group(
            db,
            strategy,
            existing_user.id,
            ReviewGroup(
                review_group_id=uuid.uuid4(),
                card_id=card_id,
                reviewed_at=datetime.now(UTC),
                ratings=((uuid.UUID(back_id), 4),),
                shown_prompt_ids=(uuid.UUID(front_id),),
            ),
            None,
        )
        db.commit()
        assert db.exec(select(ReviewLog).where(ReviewLog.card_id == card_id)).first() is not None

        mastery_log_statement_counter.reset()
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(delete=[card["id"]])},
        )
        assert response.status_code == 200, response.text
        assert mastery_log_statement_counter.count == 0

        assert db.exec(select(ReviewLog).where(ReviewLog.card_id == card_id)).first() is None


class TestCombinedFieldCreateAndCardCreate:
    def test_field_create_and_card_create_via_client_key(
        self, client, existing_deck, existing_field_defs
    ):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}]),
                "cards": _cards(
                    create=[
                        {"values": {front_id: "Bonjour", back_id: "Hello", "c1": "greeting"}}
                    ]
                ),
            },
        )
        assert response.status_code == 200, response.text
        data = response.json()
        notes_id = next(fd["id"] for fd in data["field_defs"] if fd["name"] == "Notes")
        [card] = data["cards"]
        assert card["values"] == {front_id: "Bonjour", back_id: "Hello", notes_id: "greeting"}

    def test_field_create_and_existing_card_update_via_client_key(
        self, client, existing_deck, existing_field_defs
    ):
        """Phase 7's widened contract: an *existing* card's value for a
        same-request client_key field, set via cards.update rather than
        cards.create — the deck editor's edit-mode diff needs this when a field is
        added and immediately filled in on an already-saved card."""
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}]),
                "cards": _cards(update=[{"id": card["id"], "values": {"c1": "greeting"}}]),
            },
        )
        assert response.status_code == 200, response.text
        data = response.json()
        notes_id = next(fd["id"] for fd in data["field_defs"] if fd["name"] == "Notes")
        [updated] = data["cards"]
        assert updated["values"] == {front_id: "Bonjour", back_id: "Hello", notes_id: "greeting"}


class TestForeignAndUnknownIdsRejected:
    def test_field_update_unknown_id_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(update=[{"id": str(uuid.uuid4()), "name": "x"}])},
        )
        assert response.status_code == 422

    def test_field_delete_unknown_id_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[str(uuid.uuid4())])},
        )
        assert response.status_code == 422

    def test_field_from_another_deck_rejected(
        self, client, existing_subject, existing_deck, existing_field_defs
    ):
        other_deck = client.post(
            "/api/decks",
            json={
                "name": "Other Deck",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "A", "type": "text"}, {"name": "B", "type": "text"}],
            },
        ).json()
        other_field_id = other_deck["field_defs"][0]["id"]

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"field_defs": _field_defs(delete=[other_field_id])},
        )
        assert response.status_code == 422

    def test_card_update_unknown_id_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(update=[{"id": str(uuid.uuid4()), "values": {}}])},
        )
        assert response.status_code == 422

    def test_card_delete_unknown_id_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(delete=[str(uuid.uuid4())])},
        )
        assert response.status_code == 422

    def test_card_from_another_deck_rejected(
        self, client, existing_subject, existing_deck, existing_field_defs
    ):
        other_deck = client.post(
            "/api/decks",
            json={
                "name": "Other Deck",
                "subject_id": existing_subject["id"],
                "field_defs": [{"name": "A", "type": "text"}, {"name": "B", "type": "text"}],
            },
        ).json()
        other_fields = {fd["name"]: fd["id"] for fd in other_deck["field_defs"]}
        other_card = client.post(
            "/api/cards",
            json={
                "deck_id": other_deck["id"],
                "values": {other_fields["A"]: "x", other_fields["B"]: "y"},
            },
        ).json()

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(delete=[other_card["id"]])},
        )
        assert response.status_code == 422

    def test_card_create_unknown_field_key_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(create=[{"values": {str(uuid.uuid4()): "x"}}])},
        )
        assert response.status_code == 422

    def test_card_update_unknown_field_id_rejected(self, client, existing_deck, existing_field_defs):
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front_id: "a", back_id: "b"}},
        ).json()
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={"cards": _cards(update=[{"id": card["id"], "values": {str(uuid.uuid4()): "x"}}])},
        )
        assert response.status_code == 422

    def test_subject_id_not_found_rejected(self, client, existing_deck, existing_field_defs):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}", json={"subject_id": str(uuid.uuid4())}
        )
        assert response.status_code == 422


class TestRollback:
    def test_mid_request_failure_rolls_back_everything(
        self, client, existing_deck, existing_field_defs
    ):
        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "name": "Should Not Stick",
                "field_defs": _field_defs(create=[{"client_key": "c1", "name": "Notes", "type": "text"}]),
                "cards": _cards(update=[{"id": str(uuid.uuid4()), "values": {}}]),
            },
        )
        assert response.status_code == 422

        check = client.get(f"/api/decks/{existing_deck['id']}").json()
        assert check["name"] == "Test Deck"
        assert {fd["name"] for fd in check["field_defs"]} == {"front", "back"}

    def test_duplicated_card_update_rolls_back_staged_card_delete(
        self, client, existing_deck, existing_field_defs
    ):
        """MD-1's pre-scan runs after cards.delete is staged and flushed, so the 422 has
        to roll the delete back with everything else."""
        front_id, back_id = (fd["id"] for fd in existing_field_defs)
        doomed_id, kept_id = (
            client.post(
                "/api/cards",
                json={"deck_id": existing_deck["id"], "values": {front_id: front, back_id: "x"}},
            ).json()["id"]
            for front in ("Bonjour", "Merci")
        )

        response = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "cards": _cards(
                    delete=[doomed_id],
                    update=[
                        {"id": kept_id, "values": {front_id: "a"}},
                        {"id": kept_id, "values": {front_id: "b"}},
                    ],
                )
            },
        )
        assert response.status_code == 422, response.text
        assert "is duplicated" in response.json()["detail"]

        check = client.get(f"/api/decks/{existing_deck['id']}").json()
        fronts = {c["id"]: c["values"][front_id] for c in check["cards"]}
        assert fronts == {doomed_id: "Bonjour", kept_id: "Merci"}
