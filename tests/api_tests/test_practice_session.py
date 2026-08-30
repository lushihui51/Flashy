import random
import uuid

import pytest
from sqlmodel import col, select

from app.database_ops.practice_card import db_read_current_practice_card
from app.mastery.ema import EmaStrategy
from app.models.practice_card import PracticeCard, PracticeCardStatus
from app.models.practice_deck import PracticeDeck
from app.models.review_log import ReviewLog
from app.services.practice_generation import (
    generate_practice_card_fields,
    resolve_prompts_or_answers,
)
from app.services.practice_session import session_progress, start_practice_session, submit_rating


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
                "name": "Evening run",
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
            json={
                "name": "Evening run",
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [str(uuid.uuid4())],
            },
        )
        assert res.status_code == 404

    def test_run_state_and_rate_pass(self, client, existing_user, session_cards, session_config):
        start_res = client.post(
            "/api/practice_sessions",
            json={
                "name": "Evening run",
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [session_config["id"]],
            },
        )
        session_id = start_res.json()["id"]

        run_res = client.get(f"/api/practice_sessions/{session_id}/run")
        assert run_res.status_code == 200, run_res.text
        card = run_res.json()["current_card"]
        assert card["attempt"] == 1
        assert len(card["answers"]) >= 1

        ratings = {a["field_def_id"]: 4 for a in card["answers"]}
        rate_res = client.post(
            f"/api/practice_cards/{card['practice_card_id']}/rate", json={"ratings": ratings}
        )
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
                "name": "Evening run",
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [session_config["id"]],
            },
        )
        session_id = start_res.json()["id"]
        card = client.get(f"/api/practice_sessions/{session_id}/run").json()["current_card"]

        res = client.post(
            f"/api/practice_cards/{card['practice_card_id']}/rate",
            json={"ratings": {str(uuid.uuid4()): 4}},
        )
        assert res.status_code == 400

    def test_rate_already_rated_card_rejected(
        self, client, existing_user, session_cards, session_config
    ):
        start_res = client.post(
            "/api/practice_sessions",
            json={
                "name": "Evening run",
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [session_config["id"]],
            },
        )
        session_id = start_res.json()["id"]
        card = client.get(f"/api/practice_sessions/{session_id}/run").json()["current_card"]
        ratings = {a["field_def_id"]: 4 for a in card["answers"]}

        first = client.post(
            f"/api/practice_cards/{card['practice_card_id']}/rate", json={"ratings": ratings}
        )
        assert first.status_code == 200

        second = client.post(
            f"/api/practice_cards/{card['practice_card_id']}/rate", json={"ratings": ratings}
        )
        assert second.status_code == 400

    def test_fail_and_requeue_via_http(
        self, client, existing_user, session_cards, session_config
    ):
        start_res = client.post(
            "/api/practice_sessions",
            json={
                "name": "Evening run",
                "user_id": str(existing_user.id),
                "deck_practice_config_ids": [session_config["id"]],
            },
        )
        session_id = start_res.json()["id"]
        card = client.get(f"/api/practice_sessions/{session_id}/run").json()["current_card"]

        ratings = {a["field_def_id"]: 1 for a in card["answers"]}  # rating 1 -> fail
        rate_res = client.post(
            f"/api/practice_cards/{card['practice_card_id']}/rate", json={"ratings": ratings}
        )
        assert rate_res.status_code == 200, rate_res.text
        result = rate_res.json()

        assert result["rated_practice_card"]["status"] == "failed"
        requeued = result["requeued_practice_card"]
        assert requeued is not None
        assert requeued["id"] != card["practice_card_id"]
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
            db, strategy, existing_user.id, "Acceptance run", [config_id], rng=random.Random(1)
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
            db, strategy, existing_user.id, "Collision run", [config_id], rng=random.Random(7)
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


class TestBlankValueGenerationFilter:
    """ADR 026: a field a card left blank (``""``, the dense-with-empty-string state
    every active field always has) can never be selected as that card's prompt or
    answer, fixed or pool, on either side — `db_fetch_generation_candidates` drops it
    from the join entirely, so no amount of resampling can surface it."""

    def test_blank_pool_field_never_drawn(self, client, db, existing_deck, session_fields):
        f = session_fields
        values = {str(fid): f"filled-{name}" for name, fid in f.items()}
        values[str(f["pool_a1"])] = ""
        res = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert res.status_code == 201, res.text
        card_id = uuid.UUID(res.json()["id"])

        strategy = EmaStrategy()
        # Two non-blank pool survivors (pool_a2, pool_a3) requested in full: if the
        # blank pool_a1 were still a candidate, drawing all survivors would sometimes
        # include it. It never does, because it was never a candidate.
        answers = resolve_prompts_or_answers(
            db,
            strategy,
            card_id,
            fixed_ids=[],
            pool_ids=[f["pool_a1"], f["pool_a2"], f["pool_a3"]],
            pool_counts=[2],
            rng=random.Random(1),
        )
        assert set(answers) == {f["pool_a2"], f["pool_a3"]}
        assert f["pool_a1"] not in answers

    def test_blank_fixed_answer_excluded_card_still_generates(
        self, client, db, existing_deck, session_fields
    ):
        f = session_fields
        values = {str(fid): f"filled-{name}" for name, fid in f.items()}
        values[str(f["answer1"])] = ""  # blank fixed answer field
        res = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert res.status_code == 201, res.text
        card_id = uuid.UUID(res.json()["id"])

        strategy = EmaStrategy()
        resolved = generate_practice_card_fields(
            db,
            strategy,
            card_id,
            prompt_field_ids=[f["prompt1"]],
            answer_field_ids=[f["answer1"]],
            prompt_pool_ids=[],
            prompt_pool_counts=[],
            answer_pool_ids=[f["pool_a1"], f["pool_a2"], f["pool_a3"]],
            answer_pool_counts=[1],
            rng=random.Random(1),
        )
        assert resolved is not None
        prompts, answers = resolved
        assert prompts == [f["prompt1"]]
        assert f["answer1"] not in answers
        assert len(answers) == 1
        assert answers[0] in {f["pool_a1"], f["pool_a2"], f["pool_a3"]}

    def test_all_blank_answer_side_skips_card_generation(
        self, client, db, existing_deck, session_fields
    ):
        f = session_fields
        values = {str(fid): f"filled-{name}" for name, fid in f.items()}
        for name in ("answer1", "pool_a1", "pool_a2", "pool_a3"):
            values[str(f[name])] = ""  # every candidate answer field left blank
        res = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert res.status_code == 201, res.text
        card_id = uuid.UUID(res.json()["id"])

        strategy = EmaStrategy()
        resolved = generate_practice_card_fields(
            db,
            strategy,
            card_id,
            prompt_field_ids=[f["prompt1"]],
            answer_field_ids=[f["answer1"]],
            prompt_pool_ids=[],
            prompt_pool_counts=[],
            answer_pool_ids=[f["pool_a1"], f["pool_a2"], f["pool_a3"]],
            answer_pool_counts=[1],
            rng=random.Random(1),
        )
        assert resolved is None


def _start(client, name, config_ids):
    res = client.post(
        "/api/practice_sessions",
        json={"name": name, "deck_practice_config_ids": config_ids},
    )
    assert res.status_code == 201, res.text
    return res.json()


def _finish_session(client, session_id):
    """Drives a session to completion by passing every card as it comes up (rating 4
    on every answer field) — a pass never requeues, so this always terminates once the
    session's practice_cards run out."""
    for _ in range(50):
        run = client.get(f"/api/practice_sessions/{session_id}/run").json()
        if run["current_card"] is None:
            return
        card = run["current_card"]
        ratings = {a["field_def_id"]: 4 for a in card["answers"]}
        res = client.post(
            f"/api/practice_cards/{card['practice_card_id']}/rate", json={"ratings": ratings}
        )
        assert res.status_code == 200, res.text
    raise AssertionError(f"session {session_id} never reported current_card: null")


def _bare_practice_card(card_id, status):
    """An unpersisted PracticeCard for session_progress's pure-function tests below —
    the fold only reads card_id and status, and requires callers to already hand it
    cards in created_at-ascending order (list position stands in for that here)."""
    return PracticeCard(
        practice_session_id=uuid.uuid4(),
        card_id=card_id,
        position=0,
        prompts=[],
        answers=[],
        status=status,
    )


class TestPracticeSessionList:
    """GET /api/practice_sessions — the practice overview's only read. Relevance to a
    subject or deck is answered through practice_deck → deck → subject and nothing else
    (schema invariant 5: a session has no config lineage)."""

    def test_lists_newest_first_with_name_and_deck_context(self, client, multi_subject_library):
        lib = multi_subject_library
        _start(client, "Alpha run", [lib["configs"]["a"]["id"]])
        _start(client, "Beta run", [lib["configs"]["b"]["id"]])

        res = client.get("/api/practice_sessions")
        assert res.status_code == 200, res.text
        rows = res.json()

        assert [row["name"] for row in rows] == ["Beta run", "Alpha run"]
        assert all(row["status"] == "active" for row in rows)
        assert rows[0]["decks"] == [
            {
                "deck_id": lib["decks"]["b"]["id"],
                "deck_name": "Shared Deck Name",
                "subject_id": lib["subjects"]["b"]["id"],
                "subject_name": "Beta",
            }
        ]

    def test_name_is_stored_verbatim(self, client, multi_subject_library):
        name = "Aug 24, 2026, 2:15 PM"
        created = _start(client, name, [multi_subject_library["configs"]["a"]["id"]])
        assert created["name"] == name
        assert client.get(f"/api/practice_sessions/{created['id']}").json()["name"] == name

    def test_session_spanning_two_decks_lists_both(self, client, multi_subject_library):
        lib = multi_subject_library
        _start(
            client,
            "Both decks",
            [lib["configs"]["a"]["id"], lib["configs"]["b"]["id"]],
        )
        rows = client.get("/api/practice_sessions").json()
        assert len(rows) == 1
        assert {deck["subject_name"] for deck in rows[0]["decks"]} == {"Alpha", "Beta"}

    def test_subject_filter(self, client, multi_subject_library):
        lib = multi_subject_library
        _start(client, "Alpha run", [lib["configs"]["a"]["id"]])
        _start(client, "Beta run", [lib["configs"]["b"]["id"]])

        rows = client.get(
            "/api/practice_sessions", params={"subject_id": lib["subjects"]["a"]["id"]}
        ).json()
        assert [row["name"] for row in rows] == ["Alpha run"]

    def test_deck_filter_disambiguates_same_named_decks(self, client, multi_subject_library):
        lib = multi_subject_library
        _start(client, "Alpha run", [lib["configs"]["a"]["id"]])
        _start(client, "Beta run", [lib["configs"]["b"]["id"]])

        rows = client.get(
            "/api/practice_sessions", params={"deck_id": lib["decks"]["b"]["id"]}
        ).json()
        assert [row["name"] for row in rows] == ["Beta run"]

    def test_filters_combine_with_and(self, client, multi_subject_library):
        lib = multi_subject_library
        _start(client, "Alpha run", [lib["configs"]["a"]["id"]])
        _start(client, "Beta run", [lib["configs"]["b"]["id"]])

        rows = client.get(
            "/api/practice_sessions",
            params={
                "subject_id": lib["subjects"]["a"]["id"],
                "deck_id": lib["decks"]["b"]["id"],
            },
        ).json()
        assert rows == []

    def test_another_users_sessions_are_invisible(
        self, client, act_as, other_user, multi_subject_library
    ):
        lib = multi_subject_library
        _start(client, "Alpha run", [lib["configs"]["a"]["id"]])

        act_as(other_user)
        assert client.get("/api/practice_sessions").json() == []
        assert (
            client.get(
                "/api/practice_sessions", params={"subject_id": lib["subjects"]["a"]["id"]}
            ).json()
            == []
        )


class TestSessionStartErrorShape:
    """The creation page selects several configs at once, so a start failure has to name
    the offending config rather than arrive as a bare message."""

    def test_unknown_config_404s_with_the_config_id(self, client):
        missing = str(uuid.uuid4())
        res = client.post(
            "/api/practice_sessions",
            json={"name": "Run", "deck_practice_config_ids": [missing]},
        )
        assert res.status_code == 404
        assert res.json()["detail"]["code"] == "config_not_found"
        assert res.json()["detail"]["config_id"] == missing

    def test_two_configs_for_one_deck_400s_with_the_second_config_id(
        self, client, existing_deck, session_config, session_fields
    ):
        f = session_fields
        second = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": existing_deck["id"],
                "name": "Second Config",
                "prompt_field_ids": [str(f["prompt1"])],
                "answer_field_ids": [str(f["answer1"])],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        )
        assert second.status_code == 201, second.text

        res = client.post(
            "/api/practice_sessions",
            json={
                "name": "Run",
                "deck_practice_config_ids": [session_config["id"], second.json()["id"]],
            },
        )
        assert res.status_code == 400
        assert res.json()["detail"]["code"] == "duplicate_deck"
        assert res.json()["detail"]["config_id"] == second.json()["id"]

    def test_config_gone_stale_since_saving_400s_with_the_config_id(
        self, client, session_cards, session_config, session_fields
    ):
        # Archiving a field the config still references is exactly how a saved config
        # goes stale — validation runs again at session start for this reason.
        archived = client.delete(f"/api/fields/{session_fields['prompt1']}")
        assert archived.status_code == 200, archived.text

        res = client.post(
            "/api/practice_sessions",
            json={"name": "Run", "deck_practice_config_ids": [session_config["id"]]},
        )
        assert res.status_code == 400
        detail = res.json()["detail"]
        assert detail["code"] == "stale_config"
        assert detail["config_id"] == session_config["id"]
        assert "not live" in detail["message"]

    def test_uncounted_pool_config_cannot_start_a_session(
        self, client, db, existing_deck, session_cards, session_fields
    ):
        """Inserted straight into the table, bypassing the endpoint: the create path now
        rejects an uncounted pool, so the only way this shape still reaches session start
        is a row saved before the rule existed. Start revalidates for exactly that reason
        — it must refuse rather than write a session with no practice_cards."""
        from app.models.deck_practice_config import DeckPracticeConfig

        f = session_fields
        legacy = DeckPracticeConfig(
            deck_id=uuid.UUID(existing_deck["id"]),
            name="Uncounted pool",
            prompt_field_ids=[],
            answer_field_ids=[f["answer1"]],
            prompt_pool_ids=[f["pool_p1"], f["pool_p2"]],
            prompt_pool_counts=[],
            answer_pool_ids=[],
            answer_pool_counts=[],
        )
        db.add(legacy)
        db.commit()

        res = client.post(
            "/api/practice_sessions",
            json={"name": "Run", "deck_practice_config_ids": [str(legacy.id)]},
        )
        assert res.status_code == 400
        detail = res.json()["detail"]
        assert detail["code"] == "stale_config"
        assert detail["config_id"] == str(legacy.id)
        assert client.get("/api/practice_sessions").json() == []


class TestPracticeSessionDelete:
    """A session owns its practice_decks and practice_cards outright, so deleting it
    takes them with it (ADR 015, amended). review_log is history and survives — the same
    split ADR 015 drew for deck deletion, applied one level up."""

    def test_delete_removes_the_session_and_its_owned_rows(
        self, client, db, session_cards, session_config
    ):
        from app.models.practice_card import PracticeCard
        from app.models.practice_deck import PracticeDeck
        from app.models.practice_session import PracticeSession

        created = _start(client, "Doomed run", [session_config["id"]])
        session_id = uuid.UUID(created["id"])

        card = client.get(f"/api/practice_sessions/{created['id']}/run").json()["current_card"]
        rated = client.post(
            f"/api/practice_cards/{card['practice_card_id']}/rate",
            json={"ratings": {a["field_def_id"]: 4 for a in card["answers"]}},
        )
        assert rated.status_code == 200, rated.text

        review_log_ids = list(
            db.exec(select(ReviewLog.id).where(ReviewLog.user_id == created["user_id"])).all()
        )
        assert review_log_ids, "rating should have produced a review_log row"

        deleted = client.delete(f"/api/practice_sessions/{created['id']}")
        assert deleted.status_code == 204, deleted.text

        assert db.get(PracticeSession, session_id) is None
        assert (
            db.exec(
                select(PracticeCard).where(PracticeCard.practice_session_id == session_id)
            ).all()
            == []
        )
        assert (
            db.exec(
                select(PracticeDeck).where(PracticeDeck.practice_session_id == session_id)
            ).all()
            == []
        )
        assert client.get(f"/api/practice_sessions/{created['id']}").status_code == 404
        assert client.get("/api/practice_sessions").json() == []

        # History outlives the session: the rows stay, only the practice_card reference
        # nulls out, so rebuild_mastery still replays them.
        surviving = db.exec(select(ReviewLog).where(col(ReviewLog.id).in_(review_log_ids))).all()
        assert len(surviving) == len(review_log_ids)
        assert all(row.practice_card_id is None for row in surviving)
        assert all(row.card_id is not None for row in surviving)
        assert all(row.field_def_id is not None for row in surviving)

    def test_delete_unknown_session_404s(self, client):
        assert client.delete(f"/api/practice_sessions/{uuid.uuid4()}").status_code == 404

    def test_delete_another_users_session_404s(
        self, client, act_as, other_user, session_cards, session_config
    ):
        created = _start(client, "Not yours", [session_config["id"]])

        act_as(other_user)
        assert client.delete(f"/api/practice_sessions/{created['id']}").status_code == 404

        act_as_owner = client.get(f"/api/practice_sessions/{created['id']}")
        assert act_as_owner.status_code == 404  # still acting as other_user


class TestPracticeSessionDetailShape:
    """GET /api/practice_sessions/{id} (T1, MD-3): the detail page needs the same deck
    chips the list already carries, so the single-session read returns
    PracticeSessionSummary too — not a client-side join of the list endpoint."""

    def test_detail_carries_decks_and_deleted_deck_count(self, client, multi_subject_library):
        lib = multi_subject_library
        created = _start(
            client,
            "Both decks",
            [lib["configs"]["a"]["id"], lib["configs"]["b"]["id"]],
        )

        deleted = client.delete(f"/api/decks/{lib['decks']['a']['id']}")
        assert deleted.status_code == 204, deleted.text

        res = client.get(f"/api/practice_sessions/{created['id']}")
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["name"] == "Both decks"
        assert [deck["subject_name"] for deck in data["decks"]] == ["Beta"]
        assert data["deleted_deck_count"] == 1

    def test_detail_with_every_deck_intact_counts_zero(self, client, multi_subject_library):
        created = _start(client, "Alpha run", [multi_subject_library["configs"]["a"]["id"]])

        res = client.get(f"/api/practice_sessions/{created['id']}")
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["deleted_deck_count"] == 0
        assert data["decks"] == [
            {
                "deck_id": multi_subject_library["decks"]["a"]["id"],
                "deck_name": "Shared Deck Name",
                "subject_id": multi_subject_library["subjects"]["a"]["id"],
                "subject_name": "Alpha",
            }
        ]

    def test_detail_for_a_foreign_session_404s(
        self, client, act_as, other_user, multi_subject_library
    ):
        created = _start(client, "Not yours", [multi_subject_library["configs"]["a"]["id"]])

        act_as(other_user)
        assert client.get(f"/api/practice_sessions/{created['id']}").status_code == 404

    def test_detail_for_missing_session_404s(self, client):
        assert client.get(f"/api/practice_sessions/{uuid.uuid4()}").status_code == 404


class TestDeletedDeckChips:
    def test_a_snapshot_whose_deck_was_deleted_is_counted_not_listed(
        self, client, multi_subject_library
    ):
        """The session survives its deck (practice_deck.deck_id SET NULL, ADR 015) but
        has no name or subject left to put in a chip. With `abandoned` gone, this count
        is the only thing distinguishing a session stranded this way from one the user
        actually finished."""
        lib = multi_subject_library
        _start(
            client,
            "Both decks",
            [lib["configs"]["a"]["id"], lib["configs"]["b"]["id"]],
        )

        deleted = client.delete(f"/api/decks/{lib['decks']['a']['id']}")
        assert deleted.status_code == 204, deleted.text

        rows = client.get("/api/practice_sessions").json()
        assert len(rows) == 1
        assert [deck["subject_name"] for deck in rows[0]["decks"]] == ["Beta"]
        assert rows[0]["deleted_deck_count"] == 1

    def test_sessions_with_every_deck_intact_count_zero(self, client, multi_subject_library):
        _start(client, "Alpha run", [multi_subject_library["configs"]["a"]["id"]])
        rows = client.get("/api/practice_sessions").json()
        assert rows[0]["deleted_deck_count"] == 0

    def test_a_deleted_deck_no_longer_matches_its_own_filter(
        self, client, multi_subject_library
    ):
        lib = multi_subject_library
        _start(client, "Alpha run", [lib["configs"]["a"]["id"]])
        assert client.delete(f"/api/decks/{lib['decks']['a']['id']}").status_code == 204

        assert client.get("/api/practice_sessions").json() != []
        assert (
            client.get(
                "/api/practice_sessions", params={"deck_id": lib["decks"]["a"]["id"]}
            ).json()
            == []
        )


class TestSessionProgressFold:
    """session_progress (ADR 028) as a pure function, no DB or generation involved —
    the chain/bucket rule itself, independent of how a chain came to look that way."""

    def test_all_four_buckets_from_each_chains_last_row(self):
        unseen_id, retry_id, passed_id, stuck_id = (uuid.uuid4() for _ in range(4))
        cards = [
            _bare_practice_card(unseen_id, PracticeCardStatus.pending),  # length 1 -> unseen
            _bare_practice_card(retry_id, PracticeCardStatus.failed),
            _bare_practice_card(retry_id, PracticeCardStatus.pending),  # length 2 -> retry_pending
            _bare_practice_card(passed_id, PracticeCardStatus.passed),
            _bare_practice_card(stuck_id, PracticeCardStatus.failed),  # no successor -> still_failed
        ]

        progress = session_progress(cards)

        assert progress.total_cards == 4
        assert progress.unseen == 1
        assert progress.retry_pending == 1
        assert progress.passed == 1
        assert progress.still_failed == 1

    def test_still_failed_regardless_of_chain_length(self):
        card_id = uuid.uuid4()
        cards = [
            _bare_practice_card(card_id, PracticeCardStatus.failed),
            _bare_practice_card(card_id, PracticeCardStatus.pending),
            _bare_practice_card(card_id, PracticeCardStatus.failed),  # last row: no successor
        ]

        progress = session_progress(cards)

        assert progress.total_cards == 1
        assert progress.still_failed == 1
        assert progress.unseen == progress.retry_pending == progress.passed == 0

    def test_empty_session_is_all_zero(self):
        progress = session_progress([])
        assert progress.total_cards == 0
        assert progress.unseen == progress.retry_pending == 0
        assert progress.passed == progress.still_failed == 0


class TestRunState:
    """GET .../run (ADR 028, ADR 031) — replaces GET .../current_card. All server-side
    composition: resolved field values, the fixed-total progress fold, and the
    active->completed transition inherited from get_current_practice_card."""

    def test_resolves_fields_in_position_order_regardless_of_config_array_order(
        self, client, existing_deck
    ):
        # Created in this order, so field_def.position is b=0, a=1, answer=2. The
        # config below lists the prompts in the opposite (a, b) order on purpose: the
        # response must reorder by position, not echo the config's array order.
        b = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "b_prompt", "type": "text"}
        ).json()
        a = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "a_prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()

        card = client.post(
            "/api/cards",
            json={
                "deck_id": existing_deck["id"],
                "values": {b["id"]: "B value", a["id"]: "A value", answer["id"]: "Answer value"},
            },
        )
        assert card.status_code == 201, card.text

        config = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": existing_deck["id"],
                "name": "Order config",
                "prompt_field_ids": [a["id"], b["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()

        session = _start(client, "Order run", [config["id"]])
        run = client.get(f"/api/practice_sessions/{session['id']}/run")
        assert run.status_code == 200, run.text
        data = run.json()

        assert data["session_name"] == "Order run"
        assert data["session_status"] == "active"
        assert data["progress"] == {
            "total_cards": 1,
            "unseen": 1,
            "retry_pending": 0,
            "passed": 0,
            "still_failed": 0,
        }

        prompts = data["current_card"]["prompts"]
        assert [p["field_def_id"] for p in prompts] == [b["id"], a["id"]]
        assert [p["name"] for p in prompts] == ["b_prompt", "a_prompt"]
        assert [p["value"] for p in prompts] == ["B value", "A value"]
        assert all(p["type"] == "text" for p in prompts)

        assert data["current_card"]["answers"] == [
            {"field_def_id": answer["id"], "name": "answer", "type": "text", "value": "Answer value"}
        ]

    def test_value_is_passed_through_blank_if_edited_blank_after_generation(
        self, client, existing_deck
    ):
        """ADR 026 only keeps a blank field out of *candidacy* at generation time; once
        a field has been drawn onto a practice_card, later edits to the card are
        resolved as-is, blank included — the run endpoint doesn't re-filter."""
        prompt = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {prompt["id"]: "Q", answer["id"]: "A"}},
        ).json()
        config = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": existing_deck["id"],
                "name": "Blank-after config",
                "prompt_field_ids": [prompt["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()
        session = _start(client, "Blank-after run", [config["id"]])

        patch = client.patch(f"/api/cards/{card['id']}", json={"values": {answer["id"]: ""}})
        assert patch.status_code == 200, patch.text

        run = client.get(f"/api/practice_sessions/{session['id']}/run").json()
        assert run["current_card"]["answers"] == [
            {"field_def_id": answer["id"], "name": "answer", "type": "text", "value": ""}
        ]

    def test_archived_field_still_resolves(self, client, existing_deck):
        prompt = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()
        # A third active field so archiving `answer` doesn't hit the deck's two-field floor.
        client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "filler", "type": "text"}
        )
        client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {prompt["id"]: "Q", answer["id"]: "A"}},
        )
        config = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": existing_deck["id"],
                "name": "Archive config",
                "prompt_field_ids": [prompt["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()
        session = _start(client, "Archive run", [config["id"]])

        archived = client.delete(f"/api/fields/{answer['id']}")
        assert archived.status_code == 200, archived.text

        run = client.get(f"/api/practice_sessions/{session['id']}/run").json()
        assert run["current_card"]["answers"] == [
            {"field_def_id": answer["id"], "name": "answer", "type": "text", "value": "A"}
        ]

    def test_attempt_increments_on_a_requeued_row(
        self, client, existing_user, session_cards, session_config
    ):
        session = _start(client, "Attempt run", [session_config["id"]])

        first = client.get(f"/api/practice_sessions/{session['id']}/run").json()["current_card"]
        assert first["attempt"] == 1

        ratings = {a["field_def_id"]: 1 for a in first["answers"]}  # rating 1 -> fail
        rate = client.post(
            f"/api/practice_cards/{first['practice_card_id']}/rate", json={"ratings": ratings}
        )
        assert rate.status_code == 200, rate.text
        assert rate.json()["requeued_practice_card"] is not None

        second = client.get(f"/api/practice_sessions/{session['id']}/run").json()["current_card"]
        assert second["card_id"] == first["card_id"]
        assert second["practice_card_id"] != first["practice_card_id"]
        assert second["attempt"] == 2

    def test_current_card_null_and_session_completed_once_nothing_pending(
        self, client, existing_user, session_cards, session_config
    ):
        session = _start(client, "Finish run", [session_config["id"]])

        for _ in range(len(session_cards) + 5):  # generous bound; a pass never requeues
            run = client.get(f"/api/practice_sessions/{session['id']}/run").json()
            if run["current_card"] is None:
                break
            card = run["current_card"]
            ratings = {a["field_def_id"]: 4 for a in card["answers"]}
            rate = client.post(
                f"/api/practice_cards/{card['practice_card_id']}/rate", json={"ratings": ratings}
            )
            assert rate.status_code == 200, rate.text
        else:
            pytest.fail("session never reported current_card: null")

        final = client.get(f"/api/practice_sessions/{session['id']}/run").json()
        assert final["current_card"] is None
        assert final["session_status"] == "completed"

    def test_progress_counts_all_four_buckets_end_to_end(self, client, db, existing_deck):
        """Exercises the ADR 013/029 stale-snapshot case for real: a card fails after
        its only answer field is archived mid-session, so the requeue finds nothing to
        generate from and the chain ends on `failed` with no successor — still_failed,
        alongside one untouched (unseen), one failed-then-requeued (retry_pending), and
        one passed-first-try card, all counted against the same fixed `total_cards`."""
        prompt = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()
        # A third active field so archiving `answer` later doesn't hit the two-field floor.
        client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "filler", "type": "text"}
        )

        def make_card(tag):
            res = client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {prompt["id"]: f"{tag} prompt", answer["id"]: f"{tag} answer"},
                },
            )
            assert res.status_code == 201, res.text
            return res.json()["id"]

        unseen_card = make_card("unseen")
        retry_card = make_card("retry")
        passed_card = make_card("passed")
        stuck_card = make_card("stuck")

        config = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": existing_deck["id"],
                "name": "Progress config",
                "prompt_field_ids": [prompt["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()

        session = _start(client, "Progress run", [config["id"]])
        session_id = uuid.UUID(session["id"])

        by_card_id = {
            str(pc.card_id): pc
            for pc in db.exec(
                select(PracticeCard).where(PracticeCard.practice_session_id == session_id)
            ).all()
        }
        assert set(by_card_id) == {unseen_card, retry_card, passed_card, stuck_card}

        # retry_card: fails while `answer` is still live -> requeues -> retry_pending.
        fail_retry = client.post(
            f"/api/practice_cards/{by_card_id[retry_card].id}/rate",
            json={"ratings": {answer["id"]: 1}},
        )
        assert fail_retry.status_code == 200, fail_retry.text
        assert fail_retry.json()["requeued_practice_card"] is not None

        # passed_card: passes on the first try -> passed.
        pass_res = client.post(
            f"/api/practice_cards/{by_card_id[passed_card].id}/rate",
            json={"ratings": {answer["id"]: 4}},
        )
        assert pass_res.status_code == 200, pass_res.text

        # Archive the only answer field: a future requeue has nothing left to draw from.
        archive_res = client.delete(f"/api/fields/{answer['id']}")
        assert archive_res.status_code == 200, archive_res.text

        # stuck_card: fails after the archival -> zero surviving answer candidates ->
        # no successor -> still_failed.
        fail_stuck = client.post(
            f"/api/practice_cards/{by_card_id[stuck_card].id}/rate",
            json={"ratings": {answer["id"]: 1}},
        )
        assert fail_stuck.status_code == 200, fail_stuck.text
        assert fail_stuck.json()["requeued_practice_card"] is None

        mid_run = client.get(f"/api/practice_sessions/{session['id']}/run")
        assert mid_run.status_code == 200, mid_run.text
        mid_data = mid_run.json()
        assert mid_data["session_status"] == "active"
        assert mid_data["progress"] == {
            "total_cards": 4,
            "unseen": 1,
            "retry_pending": 1,
            "passed": 1,
            "still_failed": 1,
        }
        assert mid_data["current_card"] is not None

        # Clear the two remaining pending rows (unseen_card's original row, and
        # retry_card's requeued row) to drive the session to completion.
        remaining = db.exec(
            select(PracticeCard).where(
                PracticeCard.practice_session_id == session_id,
                PracticeCard.status == PracticeCardStatus.pending,
            )
        ).all()
        assert len(remaining) == 2
        for pc in remaining:
            res = client.post(
                f"/api/practice_cards/{pc.id}/rate", json={"ratings": {answer["id"]: 4}}
            )
            assert res.status_code == 200, res.text

        final = client.get(f"/api/practice_sessions/{session['id']}/run")
        assert final.status_code == 200, final.text
        final_data = final.json()
        assert final_data["current_card"] is None
        assert final_data["session_status"] == "completed"
        assert final_data["progress"] == {
            "total_cards": 4,
            "unseen": 0,
            "retry_pending": 0,
            "passed": 3,
            "still_failed": 1,
        }

    def test_404_for_unknown_session(self, client):
        assert client.get(f"/api/practice_sessions/{uuid.uuid4()}/run").status_code == 404

    def test_404_for_foreign_session(
        self, client, act_as, other_user, session_cards, session_config
    ):
        session = _start(client, "Mine", [session_config["id"]])
        act_as(other_user)
        assert client.get(f"/api/practice_sessions/{session['id']}/run").status_code == 404


class TestBreakdown:
    """GET .../breakdown (ADR 029, ADR 031) — the completion dataset, only ever built
    for a session with nothing pending."""

    def _setup_deck(self, client, existing_deck):
        """A 4-field deck: `title` (position 0, the ADR 032 primary field, kept out of
        the practice config so its value never changes across attempts), `prompt` and
        `answer` (the config's only fixed fields — no pool, so generation is
        deterministic), and `filler` (keeps the deck at 4 active fields so archiving
        `answer` later doesn't hit the two-field floor)."""
        title = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "title", "type": "text"}
        ).json()
        prompt = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()
        client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "filler", "type": "text"}
        )

        config = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": existing_deck["id"],
                "name": "Breakdown config",
                "prompt_field_ids": [prompt["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()
        return title, prompt, answer, config

    def _make_card(self, client, existing_deck, title, prompt, answer, tag, title_value):
        res = client.post(
            "/api/cards",
            json={
                "deck_id": existing_deck["id"],
                "values": {
                    title["id"]: title_value,
                    prompt["id"]: f"{tag} prompt",
                    answer["id"]: f"{tag} answer",
                    # filler intentionally omitted — the create endpoint's dense write
                    # (§2.6) backfills it as "".
                },
            },
        )
        assert res.status_code == 201, res.text
        return res.json()["id"]

    def test_full_breakdown_all_four_buckets(self, client, db, existing_deck):
        title, prompt, answer, config = self._setup_deck(client, existing_deck)

        first_card = self._make_card(client, existing_deck, title, prompt, answer, "first", "")
        retry_card = self._make_card(
            client, existing_deck, title, prompt, answer, "retry", "Retry Card"
        )
        many_card = self._make_card(
            client, existing_deck, title, prompt, answer, "many", "Many Card"
        )
        stuck_card = self._make_card(
            client, existing_deck, title, prompt, answer, "stuck", "Stuck Card"
        )

        session = _start(client, "Breakdown run", [config["id"]])
        session_id = uuid.UUID(session["id"])

        by_card_id = {
            str(pc.card_id): pc.id
            for pc in db.exec(
                select(PracticeCard).where(PracticeCard.practice_session_id == session_id)
            ).all()
        }
        assert set(by_card_id) == {first_card, retry_card, many_card, stuck_card}

        def fail(practice_card_id):
            res = client.post(
                f"/api/practice_cards/{practice_card_id}/rate",
                json={"ratings": {answer["id"]: 1}},
            )
            assert res.status_code == 200, res.text
            requeued = res.json()["requeued_practice_card"]
            assert requeued is not None
            return requeued["id"]

        def rate_pass(practice_card_id):
            res = client.post(
                f"/api/practice_cards/{practice_card_id}/rate",
                json={"ratings": {answer["id"]: 4}},
            )
            assert res.status_code == 200, res.text
            assert res.json()["requeued_practice_card"] is None

        # retry_card: one fail, then pass -> passed_after_one_fail (2 attempts).
        retry_2 = fail(by_card_id[retry_card])
        rate_pass(retry_2)

        # many_card: two fails, then pass -> passed_after_many_fails (3 attempts).
        many_2 = fail(by_card_id[many_card])
        many_3 = fail(many_2)
        rate_pass(many_3)

        # first_card: passes immediately -> passed_first_try (1 attempt).
        rate_pass(by_card_id[first_card])

        # Archive the only answer field so a future requeue has nothing to draw from.
        archived = client.delete(f"/api/fields/{answer['id']}")
        assert archived.status_code == 200, archived.text

        # stuck_card: fails after the archival -> requeue blocked -> still_failed (1 attempt).
        stuck_res = client.post(
            f"/api/practice_cards/{by_card_id[stuck_card]}/rate",
            json={"ratings": {answer["id"]: 1}},
        )
        assert stuck_res.status_code == 200, stuck_res.text
        assert stuck_res.json()["requeued_practice_card"] is None

        # The session must now report completed — nothing pending anywhere.
        run = client.get(f"/api/practice_sessions/{session['id']}/run")
        assert run.json()["session_status"] == "completed"

        res = client.get(f"/api/practice_sessions/{session['id']}/breakdown")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["total_cards"] == 4
        assert data["passed_first_try"] == 1
        assert data["passed_after_one_fail"] == 1
        assert data["passed_after_many_fails"] == 1
        assert data["still_failed"] == 1

        cards_by_id = {c["card_id"]: c for c in data["cards"]}
        assert set(cards_by_id) == {first_card, retry_card, many_card, stuck_card}

        assert cards_by_id[first_card]["bucket"] == "passed_first_try"
        assert cards_by_id[first_card]["attempt_count"] == 1
        # The blank-primary-field case: value is passed through as "", not a fallback.
        assert cards_by_id[first_card]["primary_field"] == {
            "field_def_id": title["id"],
            "name": "title",
            "type": "text",
            "value": "",
        }

        assert cards_by_id[retry_card]["bucket"] == "passed_after_one_fail"
        assert cards_by_id[retry_card]["attempt_count"] == 2
        assert cards_by_id[retry_card]["primary_field"]["value"] == "Retry Card"
        retry_attempts = cards_by_id[retry_card]["attempts"]
        assert [a["status"] for a in retry_attempts] == ["failed", "passed"]
        assert [a["created_at"] for a in retry_attempts] == sorted(
            a["created_at"] for a in retry_attempts
        )
        assert [a["answers"][0]["rating"] for a in retry_attempts] == [1, 4]
        assert all(a["prompts"][0]["value"] == "retry prompt" for a in retry_attempts)
        assert all(a["answers"][0]["value"] == "retry answer" for a in retry_attempts)

        assert cards_by_id[many_card]["bucket"] == "passed_after_many_fails"
        assert cards_by_id[many_card]["attempt_count"] == 3
        many_attempts = cards_by_id[many_card]["attempts"]
        assert [a["status"] for a in many_attempts] == ["failed", "failed", "passed"]
        assert [a["answers"][0]["rating"] for a in many_attempts] == [1, 1, 4]

        assert cards_by_id[stuck_card]["bucket"] == "still_failed"
        assert cards_by_id[stuck_card]["attempt_count"] == 1
        stuck_attempts = cards_by_id[stuck_card]["attempts"]
        assert [a["status"] for a in stuck_attempts] == ["failed"]
        assert stuck_attempts[0]["answers"][0]["rating"] == 1
        # `answer` was archived before this attempt but still resolves (ADR 031).
        assert stuck_attempts[0]["answers"][0]["name"] == "answer"

        # Ordered by first attempt's position ascending.
        first_rows_by_card: dict[str, PracticeCard] = {}
        for pc in db.exec(
            select(PracticeCard)
            .where(PracticeCard.practice_session_id == session_id)
            .order_by(PracticeCard.created_at)
        ).all():
            first_rows_by_card.setdefault(str(pc.card_id), pc)
        expected_order = [
            card_id
            for card_id, _ in sorted(first_rows_by_card.items(), key=lambda item: item[1].position)
        ]
        assert [c["card_id"] for c in data["cards"]] == expected_order

    def test_409_while_active(self, client, existing_deck):
        title, prompt, answer, config = self._setup_deck(client, existing_deck)
        self._make_card(client, existing_deck, title, prompt, answer, "solo", "Solo Card")
        session = _start(client, "Still going", [config["id"]])

        res = client.get(f"/api/practice_sessions/{session['id']}/breakdown")
        assert res.status_code == 409, res.text
        assert res.json()["detail"]["code"] == "session_active"

    def test_404_for_unknown_session(self, client):
        assert client.get(f"/api/practice_sessions/{uuid.uuid4()}/breakdown").status_code == 404

    def test_404_for_foreign_session(
        self, client, act_as, other_user, session_cards, session_config
    ):
        session = _start(client, "Mine", [session_config["id"]])
        for _ in range(len(session_cards) + 5):
            run = client.get(f"/api/practice_sessions/{session['id']}/run").json()
            if run["current_card"] is None:
                break
            card = run["current_card"]
            ratings = {a["field_def_id"]: 4 for a in card["answers"]}
            client.post(
                f"/api/practice_cards/{card['practice_card_id']}/rate",
                json={"ratings": ratings},
            )

        act_as(other_user)
        assert client.get(f"/api/practice_sessions/{session['id']}/breakdown").status_code == 404


class TestRerun:
    """POST .../rerun (ADR 030) — recreates a completed session from its own frozen
    practice_deck snapshots, never a deck_practice_config lookup."""

    def test_rerun_creates_new_session_and_deletes_old(
        self, client, db, existing_user, session_cards, session_config
    ):
        session = _start(client, "Original run", [session_config["id"]])
        _finish_session(client, session["id"])
        assert client.get(f"/api/practice_sessions/{session['id']}").json()["status"] == "completed"

        res = client.post(f"/api/practice_sessions/{session['id']}/rerun")
        assert res.status_code == 201, res.text
        new_session = res.json()
        assert new_session["name"] == "Original run"
        assert new_session["status"] == "active"
        assert new_session["id"] != session["id"]

        # The old session is gone...
        assert client.get(f"/api/practice_sessions/{session['id']}").status_code == 404

        # ...and the new one has fresh, pending practice_cards.
        new_cards = db.exec(
            select(PracticeCard).where(
                PracticeCard.practice_session_id == uuid.UUID(new_session["id"])
            )
        ).all()
        assert len(new_cards) > 0
        assert all(c.status == PracticeCardStatus.pending for c in new_cards)

    def test_rerun_drops_a_deleted_deck_but_keeps_others(self, client, db, multi_subject_library):
        lib = multi_subject_library
        session = _start(
            client, "Both decks", [lib["configs"]["a"]["id"], lib["configs"]["b"]["id"]]
        )
        _finish_session(client, session["id"])

        deleted = client.delete(f"/api/decks/{lib['decks']['a']['id']}")
        assert deleted.status_code == 204, deleted.text

        res = client.post(f"/api/practice_sessions/{session['id']}/rerun")
        assert res.status_code == 201, res.text
        new_session_id = uuid.UUID(res.json()["id"])

        new_decks = db.exec(
            select(PracticeDeck).where(PracticeDeck.practice_session_id == new_session_id)
        ).all()
        assert {d.deck_id for d in new_decks} == {uuid.UUID(lib["decks"]["b"]["id"])}

        assert client.get(f"/api/practice_sessions/{session['id']}").status_code == 404

    def test_rerun_drops_a_stale_deck_but_keeps_others(self, client, db, existing_subject):
        # Deck A: three fields so `answer` can be archived afterward without hitting
        # the deck's two-field floor — this is what makes A's snapshot go stale.
        deck_a = client.post(
            "/api/decks",
            json={
                "name": "Deck A",
                "subject_id": existing_subject["id"],
                "field_defs": [
                    {"name": "prompt", "type": "text"},
                    {"name": "answer", "type": "text"},
                    {"name": "filler", "type": "text"},
                ],
            },
        ).json()
        fields_a = {fd["name"]: fd["id"] for fd in deck_a["field_defs"]}
        card_a = client.post(
            "/api/cards",
            json={
                "deck_id": deck_a["id"],
                "values": {
                    fields_a["prompt"]: "A prompt",
                    fields_a["answer"]: "A answer",
                    fields_a["filler"]: "x",
                },
            },
        )
        assert card_a.status_code == 201, card_a.text
        config_a = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": deck_a["id"],
                "name": "Config A",
                "prompt_field_ids": [fields_a["prompt"]],
                "answer_field_ids": [fields_a["answer"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()

        # Deck B: stays healthy throughout — the survivor.
        deck_b = client.post(
            "/api/decks",
            json={
                "name": "Deck B",
                "subject_id": existing_subject["id"],
                "field_defs": [
                    {"name": "front", "type": "text"},
                    {"name": "back", "type": "text"},
                ],
            },
        ).json()
        fields_b = {fd["name"]: fd["id"] for fd in deck_b["field_defs"]}
        card_b = client.post(
            "/api/cards",
            json={
                "deck_id": deck_b["id"],
                "values": {fields_b["front"]: "B front", fields_b["back"]: "B back"},
            },
        )
        assert card_b.status_code == 201, card_b.text
        config_b = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": deck_b["id"],
                "name": "Config B",
                "prompt_field_ids": [fields_b["front"]],
                "answer_field_ids": [fields_b["back"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        ).json()

        session = _start(client, "Two healthy decks", [config_a["id"], config_b["id"]])
        _finish_session(client, session["id"])

        archived = client.delete(f"/api/fields/{fields_a['answer']}")
        assert archived.status_code == 200, archived.text

        res = client.post(f"/api/practice_sessions/{session['id']}/rerun")
        assert res.status_code == 201, res.text
        new_session_id = uuid.UUID(res.json()["id"])

        new_decks = db.exec(
            select(PracticeDeck).where(PracticeDeck.practice_session_id == new_session_id)
        ).all()
        assert {d.deck_id for d in new_decks} == {uuid.UUID(deck_b["id"])}

    def test_rerun_refuses_when_nothing_survives(
        self, client, existing_user, session_cards, session_config, existing_deck
    ):
        session = _start(client, "Doomed run", [session_config["id"]])
        _finish_session(client, session["id"])

        deleted = client.delete(f"/api/decks/{existing_deck['id']}")
        assert deleted.status_code == 204, deleted.text

        res = client.post(f"/api/practice_sessions/{session['id']}/rerun")
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "nothing_to_rerun"

        # Refusal never deletes the original.
        assert client.get(f"/api/practice_sessions/{session['id']}").status_code == 200

    def test_rerun_refuses_active_session(self, client, session_cards, session_config):
        session = _start(client, "Still going", [session_config["id"]])

        res = client.post(f"/api/practice_sessions/{session['id']}/rerun")
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "session_active"

        assert client.get(f"/api/practice_sessions/{session['id']}").json()["status"] == "active"

    def test_404_for_unknown_session(self, client):
        assert client.post(f"/api/practice_sessions/{uuid.uuid4()}/rerun").status_code == 404

    def test_404_for_foreign_session(
        self, client, act_as, other_user, session_cards, session_config
    ):
        session = _start(client, "Mine", [session_config["id"]])
        _finish_session(client, session["id"])

        act_as(other_user)
        assert client.post(f"/api/practice_sessions/{session['id']}/rerun").status_code == 404
