import random
import uuid

import pytest
from sqlmodel import select

from app.database_ops.practice_card import db_read_current_practice_card
from app.mastery.ema import EmaStrategy
from app.models.practice_card import PracticeCard, PracticeCardStatus
from app.services.practice_session import start_practice_session, submit_rating


@pytest.fixture
def session_fields(client, existing_deck):
    names = [
        "prompt1",
        "answer1",
        "pool_p1",
        "pool_p2",
        "pool_p3",
        "pool_a1",
        "pool_a2",
        "pool_a3",
    ]
    ids = {}
    for name in names:
        res = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": name, "type": "text"}
        )
        assert res.status_code == 201, res.text
        ids[name] = uuid.UUID(res.json()["id"])
    return ids


@pytest.fixture
def session_cards(client, existing_deck, session_fields):
    card_ids = []
    for i in range(3):
        values = {str(fid): f"card{i}-{name}" for name, fid in session_fields.items()}
        res = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert res.status_code == 201, res.text
        card_ids.append(uuid.UUID(res.json()["id"]))
    return card_ids


@pytest.fixture
def session_config(client, existing_deck, session_fields):
    f = session_fields
    payload = {
        "deck_id": existing_deck["id"],
        "name": "Session Config",
        "prompt_field_ids": [str(f["prompt1"])],
        "answer_field_ids": [str(f["answer1"])],
        "prompt_pool_ids": [str(f["pool_p1"]), str(f["pool_p2"]), str(f["pool_p3"])],
        "prompt_pool_counts": [1],
        "answer_pool_ids": [str(f["pool_a1"]), str(f["pool_a2"]), str(f["pool_a3"])],
        "answer_pool_counts": [1],
    }
    res = client.post("/api/deck_practice_configs", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


class TestPracticeSessionHTTPFlow:
    def test_start_session(self, client, existing_user, session_cards, session_config):
        res = client.post(
            "/api/practice_sessions",
            json={
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [session_config["id"]],
            },
        )
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["status"] == "active"
        assert "id" in data

    def test_start_session_config_not_found(self, client, existing_user):
        res = client.post(
            "/api/practice_sessions",
            json={"user_id": str(existing_user.id), "deck_practice_config_ids": [str(uuid.uuid4())]},
        )
        assert res.status_code == 404

    def test_current_card_and_rate_pass(
        self, client, existing_user, session_cards, session_config
    ):
        start_res = client.post(
            "/api/practice_sessions",
            json={
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [session_config["id"]],
            },
        )
        session_id = start_res.json()["id"]

        current_res = client.get(f"/api/practice_sessions/{session_id}/current_card")
        assert current_res.status_code == 200, current_res.text
        card = current_res.json()
        assert card["status"] == "pending"
        assert len(card["answers"]) >= 1

        ratings = {aid: 4 for aid in card["answers"]}
        rate_res = client.post(f"/api/practice_cards/{card['id']}/rate", json={"ratings": ratings})
        assert rate_res.status_code == 200, rate_res.text
        result = rate_res.json()
        assert result["rated_practice_card"]["status"] == "passed"
        assert result["requeued_practice_card"] is None

    def test_rate_wrong_answer_fields_rejected(
        self, client, existing_user, session_cards, session_config
    ):
        start_res = client.post(
            "/api/practice_sessions",
            json={
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [session_config["id"]],
            },
        )
        session_id = start_res.json()["id"]
        card = client.get(f"/api/practice_sessions/{session_id}/current_card").json()

        res = client.post(
            f"/api/practice_cards/{card['id']}/rate",
            json={"ratings": {str(uuid.uuid4()): 4}},
        )
        assert res.status_code == 400

    def test_rate_already_rated_card_rejected(
        self, client, existing_user, session_cards, session_config
    ):
        start_res = client.post(
            "/api/practice_sessions",
            json={
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [session_config["id"]],
            },
        )
        session_id = start_res.json()["id"]
        card = client.get(f"/api/practice_sessions/{session_id}/current_card").json()
        ratings = {aid: 4 for aid in card["answers"]}

        first = client.post(f"/api/practice_cards/{card['id']}/rate", json={"ratings": ratings})
        assert first.status_code == 200

        second = client.post(f"/api/practice_cards/{card['id']}/rate", json={"ratings": ratings})
        assert second.status_code == 400

    def test_fail_and_requeue_via_http(
        self, client, existing_user, session_cards, session_config
    ):
        start_res = client.post(
            "/api/practice_sessions",
            json={
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [session_config["id"]],
            },
        )
        session_id = start_res.json()["id"]
        card = client.get(f"/api/practice_sessions/{session_id}/current_card").json()

        ratings = {aid: 1 for aid in card["answers"]}  # rating 1 -> fail
        rate_res = client.post(f"/api/practice_cards/{card['id']}/rate", json={"ratings": ratings})
        assert rate_res.status_code == 200, rate_res.text
        result = rate_res.json()

        assert result["rated_practice_card"]["status"] == "failed"
        requeued = result["requeued_practice_card"]
        assert requeued is not None
        assert requeued["id"] != card["id"]
        assert requeued["card_id"] == card["card_id"]
        assert requeued["status"] == "pending"


class TestPracticeSessionAcceptance:
    """The Phase 4.2 acceptance test: start, rate, fail, requeue — the requeued card is
    a new row with a different prompt/answer combination and a position consistent
    with its updated mastery; the old row remains failed."""

    def test_full_fail_requeue_cycle(
        self, db, existing_user, session_cards, session_config, session_fields
    ):
        strategy = EmaStrategy()
        config_id = uuid.UUID(session_config["id"])

        session = start_practice_session(
            db, strategy, existing_user.id, [config_id], rng=random.Random(1)
        )
        db.commit()

        original = db.exec(
            select(PracticeCard)
            .where(
                PracticeCard.practice_session_id == session.id,
                PracticeCard.status == PracticeCardStatus.pending,
            )
            .order_by(PracticeCard.position)
        ).first()
        assert original is not None
        original_id = original.id
        original_position = original.position
        original_prompts = set(original.prompts)
        original_answers = set(original.answers)

        ratings = {answer_id: 1 for answer_id in original.answers}  # force a fail
        rated, requeued = submit_rating(
            db, strategy, existing_user.id, original_id, ratings, rng=random.Random(99)
        )
        db.commit()

        assert rated.id == original_id
        assert rated.status == PracticeCardStatus.failed

        assert requeued is not None
        assert requeued.id != original_id
        assert requeued.card_id == original.card_id
        assert requeued.status == PracticeCardStatus.pending
        assert (set(requeued.prompts), set(requeued.answers)) != (
            original_prompts,
            original_answers,
        )

        # Every other card in this fixture is still unreviewed (fresh MASTERY_PRIOR),
        # so a forced fail always drops the requeued card's mastery below all of them
        # — the exact scenario `_insertion_position` guarantees becomes the new session
        # minimum: it is inserted before whatever was previously second-in-queue,
        # making it the new front. This is a hard guarantee of the insertion formula,
        # not an approximation — assert the guarantee itself (new front of the pending
        # queue, i.e. it's what gets served next), not just "position changed".
        assert requeued.position != original_position
        pending_positions = db.exec(
            select(PracticeCard.position).where(
                PracticeCard.practice_session_id == session.id,
                PracticeCard.status == PracticeCardStatus.pending,
            )
        ).all()
        assert len(pending_positions) == len(set(pending_positions))  # all unique
        assert requeued.position == min(pending_positions)

        current = db_read_current_practice_card(db, session.id, existing_user.id)
        assert current is not None
        assert current.id == requeued.id

        db.refresh(original)
        assert original.status == PracticeCardStatus.failed
        assert set(original.prompts) == original_prompts
        assert set(original.answers) == original_answers


class TestPositionCollisionFallback:
    def test_renumber_and_retry_on_collision(
        self, db, existing_user, session_cards, session_config, monkeypatch
    ):
        """Forces the computed insertion position to collide with an existing pending
        card's position, so the requeue must hit db_renumber_pending_practice_cards
        and succeed on the retry. The natural (non-stubbed) insertion formula always
        leaves virtual-boundary gaps of 1000+, so this can't be provoked by just
        wedging existing cards close together — the stub makes it deterministic
        instead of trying to engineer mastery scores precisely enough to collide."""
        import app.services.practice_session as practice_session_module

        strategy = EmaStrategy()
        config_id = uuid.UUID(session_config["id"])

        session = start_practice_session(
            db, strategy, existing_user.id, [config_id], rng=random.Random(7)
        )
        db.commit()

        pending = db.exec(
            select(PracticeCard)
            .where(
                PracticeCard.practice_session_id == session.id,
                PracticeCard.status == PracticeCardStatus.pending,
            )
            .order_by(PracticeCard.position)
        ).all()
        assert len(pending) >= 2

        # Pin one pending card to position 0 — not the one being rated — so the
        # stubbed insertion point below collides with it on the first attempt.
        occupied = pending[0]
        occupied.position = 0
        db.add(occupied)
        db.commit()

        target = pending[1]
        assert target.id != occupied.id

        monkeypatch.setattr(practice_session_module, "_insertion_position", lambda *a, **k: 0)

        ratings = {answer_id: 1 for answer_id in target.answers}
        rated, requeued = submit_rating(
            db, strategy, existing_user.id, target.id, ratings, rng=random.Random(3)
        )
        db.commit()

        assert rated.status == PracticeCardStatus.failed
        assert requeued is not None
        assert requeued.status == PracticeCardStatus.pending
        # Succeeded only because renumbering moved `occupied` off of 0, freeing the
        # position the (stubbed) insertion logic keeps insisting on.
        assert requeued.position == 0
        db.refresh(occupied)
        assert occupied.position != 0

        positions = db.exec(
            select(PracticeCard.position).where(
                PracticeCard.practice_session_id == session.id,
                PracticeCard.status == PracticeCardStatus.pending,
            )
        ).all()
        assert len(positions) == len(set(positions))

        positions = db.exec(
            select(PracticeCard.position).where(
                PracticeCard.practice_session_id == session.id,
                PracticeCard.status == PracticeCardStatus.pending,
            )
        ).all()
        assert len(positions) == len(set(positions))
