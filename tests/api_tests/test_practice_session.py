import random
import uuid

import pytest
from sqlmodel import col, select

from app.database_ops.practice_card import db_read_current_practice_card
from app.mastery.ema import EmaStrategy
from app.models.practice_card import PracticeCard, PracticeCardStatus
from app.models.review_log import ReviewLog
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

    def test_current_card_and_rate_pass(
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
                "name": "Evening run",
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
                "name": "Evening run",
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
                "name": "Evening run",
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


def _start(client, name, config_ids):
    res = client.post(
        "/api/practice_sessions",
        json={"name": name, "deck_practice_config_ids": config_ids},
    )
    assert res.status_code == 201, res.text
    return res.json()


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

        card = client.get(f"/api/practice_sessions/{created['id']}/current_card").json()
        rated = client.post(
            f"/api/practice_cards/{card['id']}/rate",
            json={"ratings": {aid: 4 for aid in card["answers"]}},
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
