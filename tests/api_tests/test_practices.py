import threading
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlmodel import Session, col, select

from app.database_ops.run import db_try_stage_create_run
from app.mastery.ema import EmaStrategy
from app.models.app_user import AppUser
from app.models.mastery_log import MasteryLog
from app.models.practice import Practice
from app.models.practice_configuration import PracticeConfiguration
from app.models.review_log import ReviewLog
from app.models.run import Run, RunStatus
from app.models.run_card import RunCard, RunCardStatus
from app.models.run_configuration import RunConfiguration
from app.models.run_counted_card import RunCountedCard
from app.services.run import start_run
from tests.conftest import configuration, create_practice, engine, start_practice


def _deck(client, name, fields=("front", "back", "extra"), cards=2):
    """A deck of the client's user with `cards` cards, every field filled."""
    res = client.post(
        "/api/decks",
        json={"name": name, "field_defs": [{"name": f, "type": "text"} for f in fields]},
    )
    assert res.status_code == 201, res.text
    deck = res.json()
    field_ids = [fd["id"] for fd in deck["field_defs"]]
    for i in range(cards):
        card = client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {fid: f"{name}-{i}" for fid in field_ids}},
        )
        assert card.status_code == 201, card.text
    return deck, field_ids


def _configuration_row(db, practice_id, deck_id) -> PracticeConfiguration:
    db.expire_all()
    return db.exec(
        select(PracticeConfiguration).where(
            PracticeConfiguration.practice_id == uuid.UUID(practice_id),
            PracticeConfiguration.deck_id == uuid.UUID(deck_id),
        )
    ).one()


def _finish(client, run_id):
    for _ in range(50):
        state = client.get(f"/api/runs/{run_id}/state").json()
        card = state["current_card"]
        if card is None:
            return
        res = client.post(
            f"/api/run_cards/{card['run_card_id']}/rate",
            json={"ratings": {a["field_def_id"]: 4 for a in card["answers"]}},
        )
        assert res.status_code == 200, res.text
    raise AssertionError("the run never completed")


class TestCreate:
    def test_a_typed_name_is_kept_and_the_decks_are_listed(self, client):
        commands, _ = _deck(client, "Commands")
        ports, _ = _deck(client, "Ports")

        res = client.post(
            "/api/practices",
            json={"name": "  Evening  ", "deck_ids": [commands["id"], ports["id"]]},
        )
        assert res.status_code == 201, res.text
        practice = res.json()
        assert practice["name"] == "Evening"
        assert {d["deck_name"] for d in practice["decks"]} == {"Commands", "Ports"}
        assert practice["active_run_id"] is None

    def test_no_name_takes_the_suggestion_in_the_order_picked(self, client):
        commands, _ = _deck(client, "Commands")
        ports, _ = _deck(client, "Ports")
        ids = [ports["id"], commands["id"]]

        suggested = client.get("/api/practices/suggested-name", params={"deck_ids": ids})
        assert suggested.json() == {"name": "Ports + Commands"}
        for name in (None, "   "):
            res = client.post("/api/practices", json={"name": name, "deck_ids": ids})
            assert res.status_code == 201, res.text
        names = [p["name"] for p in client.get("/api/practices").json()]
        assert sorted(names) == ["Ports + Commands", "Ports + Commands (1)"]
        assert client.get("/api/practices/suggested-name", params={"deck_ids": ids}).json() == {
            "name": "Ports + Commands (2)"
        }

    def test_the_suggestion_numbers_past_every_taken_number(self, client):
        ports, _ = _deck(client, "Ports")
        for name in ("Ports", "Ports (1)", "Ports (3)"):
            create_practice(client, {ports["id"]: None}, name)

        suggested = client.get(
            "/api/practices/suggested-name", params={"deck_ids": [ports["id"]]}
        )
        assert suggested.json() == {"name": "Ports (2)"}

    def test_a_taken_name_is_refused_with_its_code(self, client):
        ports, _ = _deck(client, "Ports")
        create_practice(client, {ports["id"]: None}, "Mine")

        res = client.post("/api/practices", json={"name": "Mine", "deck_ids": [ports["id"]]})
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "practice_name_taken"
        assert len(client.get("/api/practices").json()) == 1

    def test_a_blank_create_losing_its_suggestion_works_the_name_out_once_more(
        self, client, monkeypatch
    ):
        import app.services.practice as practice_service

        ports, _ = _deck(client, "Ports")
        create_practice(client, {ports["id"]: None}, "Ports")
        real = practice_service.suggest_practice_name
        answers = iter(["Ports"])

        # The first suggestion is one another create has just taken.
        def racing(db, user_id, deck_ids):
            return next(answers, None) or real(db, user_id, deck_ids)

        monkeypatch.setattr(practice_service, "suggest_practice_name", racing)

        res = client.post("/api/practices", json={"deck_ids": [ports["id"]]})
        assert res.status_code == 201, res.text
        assert res.json()["name"] == "Ports (1)"

    def test_a_blank_create_losing_both_tries_is_refused_with_its_code(
        self, client, monkeypatch
    ):
        import app.services.practice as practice_service

        ports, _ = _deck(client, "Ports")
        create_practice(client, {ports["id"]: None}, "Ports")
        monkeypatch.setattr(
            practice_service, "suggest_practice_name", lambda db, user_id, deck_ids: "Ports"
        )

        res = client.post("/api/practices", json={"deck_ids": [ports["id"]]})
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "practice_name_taken"

    def test_a_repeated_deck_is_refused_and_writes_nothing(self, client, db):
        ports, _ = _deck(client, "Ports")

        res = client.post("/api/practices", json={"deck_ids": [ports["id"], ports["id"]]})
        assert res.status_code == 400, res.text
        assert isinstance(res.json()["detail"], str)
        assert client.get("/api/practices").json() == []
        assert db.exec(select(PracticeConfiguration)).all() == []

    def test_no_deck_is_refused(self, client):
        res = client.post("/api/practices", json={"deck_ids": []})
        assert res.status_code == 400, res.text

    def test_another_users_deck_is_a_404_naming_it(self, client, act_as, other_user):
        ports, _ = _deck(client, "Ports")

        act_as(other_user)
        res = client.post("/api/practices", json={"deck_ids": [ports["id"]]})
        assert res.status_code == 404
        assert ports["id"] in res.json()["detail"]
        suggested = client.get(
            "/api/practices/suggested-name", params={"deck_ids": [ports["id"]]}
        )
        assert suggested.status_code == 404
        assert ports["id"] in suggested.json()["detail"]

    def test_a_deck_never_rated_takes_the_starting_configuration(self, client, db):
        ports, field_ids = _deck(client, "Ports")
        practice = create_practice(client, {ports["id"]: None})

        row = _configuration_row(db, practice["id"], ports["id"])
        assert [str(i) for i in row.prompt_field_ids] == field_ids[:1]
        assert [str(i) for i in row.answer_field_ids] == field_ids[1:]
        assert row.prompt_pool_ids == row.answer_pool_ids == []
        assert row.prompt_pool_counts == row.answer_pool_counts == []

    def test_a_deck_takes_the_configuration_of_the_run_of_its_last_rated_card(
        self, client, db
    ):
        ports, (front, back, extra) = _deck(client, "Ports")
        rated = start_practice(client, {ports["id"]: configuration([back], [front])}, "Rated")
        _finish(client, rated["id"])
        # A later run that rates nothing: the copy follows the last rating, not the last run.
        start_practice(client, {ports["id"]: configuration([extra], [front, back])}, "Later")

        practice = create_practice(client, {ports["id"]: None})

        row = _configuration_row(db, practice["id"], ports["id"])
        assert [str(i) for i in row.prompt_field_ids] == [back]
        assert [str(i) for i in row.answer_field_ids] == [front]

    def test_each_deck_takes_its_own_source_in_one_create(self, client, db):
        ports, (front, back, extra) = _deck(client, "Ports")
        cells, cell_fields = _deck(client, "Cells")
        rated = start_practice(client, {ports["id"]: configuration([extra], [back])}, "Rated")
        _finish(client, rated["id"])

        practice = create_practice(client, {ports["id"]: None, cells["id"]: None})

        ports_row = _configuration_row(db, practice["id"], ports["id"])
        assert [str(i) for i in ports_row.prompt_field_ids] == [extra]
        cells_row = _configuration_row(db, practice["id"], cells["id"])
        assert [str(i) for i in cells_row.prompt_field_ids] == cell_fields[:1]
        assert [str(i) for i in cells_row.answer_field_ids] == cell_fields[1:]

    def test_a_copy_that_no_longer_validates_gives_way_to_the_starting_configuration(
        self, client, db
    ):
        ports, (front, back, extra) = _deck(client, "Ports")
        run = start_practice(client, {ports["id"]: configuration([extra], [back])}, "First")
        _finish(client, run["id"])
        # A copy is pruned with no reset, so deleting its only prompt field leaves that
        # side naming nothing.
        assert client.delete(f"/api/fields/{extra}").status_code == 204

        practice = create_practice(client, {ports["id"]: None})

        row = _configuration_row(db, practice["id"], ports["id"])
        assert [str(i) for i in row.prompt_field_ids] == [front]
        assert [str(i) for i in row.answer_field_ids] == [back]

    def test_a_rating_whose_run_is_gone_counts_as_never_rated(self, client, db):
        ports, (front, back, extra) = _deck(client, "Ports")
        run = start_practice(client, {ports["id"]: configuration([extra], [back])}, "First")
        _finish(client, run["id"])
        db.delete(db.get(Run, uuid.UUID(run["id"])))
        db.commit()

        practice = create_practice(client, {ports["id"]: None})

        row = _configuration_row(db, practice["id"], ports["id"])
        assert [str(i) for i in row.prompt_field_ids] == [front]

    def test_the_first_practice_is_stamped_once_and_a_run_stamps_nothing(
        self, client, db, existing_user
    ):
        ports, _ = _deck(client, "Ports")

        refused = client.post("/api/practices", json={"deck_ids": [ports["id"], ports["id"]]})
        assert refused.status_code == 400
        db.expire_all()
        assert db.get(AppUser, existing_user.id).first_practice_at is None

        practice = create_practice(client, {ports["id"]: None})
        db.expire_all()
        stamped = db.get(AppUser, existing_user.id).first_practice_at
        assert stamped is not None

        create_practice(client, {ports["id"]: None})
        assert client.post(f"/api/practices/{practice['id']}/runs").status_code == 200
        db.expire_all()
        assert db.get(AppUser, existing_user.id).first_practice_at == stamped


class TestStart:
    def test_start_creates_a_run_and_a_second_start_continues_it(self, client):
        ports, _ = _deck(client, "Ports")
        practice = create_practice(client, {ports["id"]: None})

        first = client.post(f"/api/practices/{practice['id']}/runs")
        assert first.status_code == 200, first.text
        second = client.post(f"/api/practices/{practice['id']}/runs")
        assert second.json()["id"] == first.json()["id"]

        detail = client.get(f"/api/practices/{practice['id']}").json()
        assert detail["active_run_id"] == first.json()["id"]
        assert [r["id"] for r in detail["runs"]] == [first.json()["id"]]
        assert detail["runs"][0]["status"] == "active"

    def test_an_active_run_with_nothing_pending_is_completed_and_a_new_one_started(
        self, client, db
    ):
        ports, _ = _deck(client, "Ports")
        practice = create_practice(client, {ports["id"]: None})
        first = client.post(f"/api/practices/{practice['id']}/runs").json()
        for card in db.exec(select(RunCard).where(RunCard.run_id == uuid.UUID(first["id"]))):
            card.status = RunCardStatus.passed
            db.add(card)
        db.commit()

        second = client.post(f"/api/practices/{practice['id']}/runs").json()
        assert second["id"] != first["id"]
        assert client.get(f"/api/runs/{first['id']}").json()["status"] == "completed"

    def test_two_concurrent_starts_land_on_one_run(self, client, db, existing_user):
        ports, _ = _deck(client, "Ports")
        practice = create_practice(client, {ports["id"]: None})
        practice_id = uuid.UUID(practice["id"])

        # The first start has inserted its run and not yet committed when the second
        # reaches the index, which holds the second until the first commits.
        with Session(engine) as first:
            staged = db_try_stage_create_run(first, practice_id)
            assert staged is not None
            result = {}

            def second_start():
                with Session(engine) as second:
                    result["run"] = start_run(second, EmaStrategy(), existing_user.id, practice_id)

            thread = threading.Thread(target=second_start)
            thread.start()
            thread.join(timeout=1)
            assert thread.is_alive(), "the second start waits on the first's insert"
            first.commit()
            staged_id = staged.id
        thread.join(timeout=10)

        assert result["run"].id == staged_id
        assert len(db.exec(select(Run).where(Run.practice_id == practice_id)).all()) == 1

    def test_another_users_practice_is_a_404(self, client, act_as, other_user):
        ports, _ = _deck(client, "Ports")
        practice = create_practice(client, {ports["id"]: None})

        act_as(other_user)
        assert client.get(f"/api/practices/{practice['id']}").status_code == 404
        assert client.post(f"/api/practices/{practice['id']}/runs").status_code == 404
        assert client.get("/api/practices").json() == []


class TestList:
    def test_a_practices_decks_come_most_recently_changed_first(self, client):
        older, _ = _deck(client, "Older")
        newer, _ = _deck(client, "Newer")
        practice = create_practice(client, {older["id"]: None, newer["id"]: None})

        def deck_names():
            listed = next(p for p in client.get("/api/practices").json() if p["id"] == practice["id"])
            detail = client.get(f"/api/practices/{practice['id']}").json()
            assert listed["decks"] == detail["decks"]
            return [d["deck_name"] for d in detail["decks"]]

        assert deck_names() == ["Newer", "Older"]
        renamed = client.patch(f"/api/decks/{older['id']}", json={"name": "Older renamed"})
        assert renamed.status_code == 200, renamed.text
        assert deck_names() == ["Older renamed", "Newer"]

    def test_practices_are_ordered_by_their_latest_run_then_by_creation(self, client, db):
        ports, _ = _deck(client, "Ports")
        never_run_old = create_practice(client, {ports["id"]: None}, "Never run, old")
        run_long_ago = create_practice(client, {ports["id"]: None}, "Run long ago")
        never_run_new = create_practice(client, {ports["id"]: None}, "Never run, new")
        run_lately = create_practice(client, {ports["id"]: None}, "Run lately")

        now = datetime.now(UTC)
        stamps = {
            never_run_old["id"]: now - timedelta(days=5),
            run_long_ago["id"]: now - timedelta(days=4),
            never_run_new["id"]: now - timedelta(days=2),
            run_lately["id"]: now - timedelta(days=3),
        }
        from app.models.practice import Practice

        for practice_id, stamp in stamps.items():
            row = db.get(Practice, uuid.UUID(practice_id))
            row.created_at = stamp
            db.add(row)
        for practice, last in ((run_long_ago, now - timedelta(days=3)), (run_lately, now)):
            run = Run(
                practice_id=uuid.UUID(practice["id"]),
                status=RunStatus.completed,
                last_activity_at=last,
            )
            db.add(run)
        db.commit()

        names = [p["name"] for p in client.get("/api/practices").json()]
        assert names == ["Run lately", "Never run, new", "Run long ago", "Never run, old"]


class TestReadiness:
    def test_a_practice_carries_the_readiness_of_all_its_decks_cards(self, client):
        small, _ = _deck(client, "Small", cards=1)
        large, _ = _deck(client, "Large", cards=3)
        _finish(client, start_practice(client, {small["id"]: None})["id"])
        (small_card,) = client.get(f"/api/decks/{small['id']}").json()["cards"]
        assert small_card["readiness"] > 0
        practice = create_practice(client, {small["id"]: None, large["id"]: None})

        expected = small_card["readiness"] / 4
        assert practice["readiness"] == pytest.approx(expected)
        detail = client.get(f"/api/practices/{practice['id']}").json()
        assert detail["readiness"] == pytest.approx(expected)
        listed = next(p for p in client.get("/api/practices").json() if p["id"] == practice["id"])
        assert listed["readiness"] == pytest.approx(expected)

    def test_a_practice_whose_decks_hold_no_card_has_none(self, client):
        empty, _ = _deck(client, "Empty", cards=0)
        practice = create_practice(client, {empty["id"]: None})

        assert practice["readiness"] is None
        assert client.get(f"/api/practices/{practice['id']}").json()["readiness"] is None
        assert client.get("/api/practices").json()[0]["readiness"] is None


def _rate_current(client, run_id, rating):
    card = client.get(f"/api/runs/{run_id}/state").json()["current_card"]
    res = client.post(
        f"/api/run_cards/{card['run_card_id']}/rate",
        json={"ratings": {a["field_def_id"]: rating for a in card["answers"]}},
    )
    assert res.status_code == 200, res.text
    return uuid.UUID(card["card_id"])


def _counts(client, practice_id):
    """Each run's id on the practice's page, newest first, with its cards reached and counted."""
    detail = client.get(f"/api/practices/{practice_id}").json()
    return [(r["id"], r["reached_cards"], r["counted_cards"]) for r in detail["runs"]]


class TestRunCounts:
    """A practice's page reads each run's cards reached and counted."""

    def test_a_run_ended_with_cards_unreached_counts_each_reached_card_once(self, client, db):
        ports, _ = _deck(client, "Ports", cards=3)
        practice = create_practice(client, {ports["id"]: None})
        run = client.post(f"/api/practices/{practice['id']}/runs").json()
        assert _counts(client, practice["id"]) == [(run["id"], 0, 3)]

        # Again leaves a failed row and a pending retry; the next card is passed.
        failed = _rate_current(client, run["id"], 1)
        passed = _rate_current(client, run["id"], 4)
        assert failed != passed
        # Ending a run comes later; stand in for it by dropping its pending rows.
        run_id = uuid.UUID(run["id"])
        for row in db.exec(
            select(RunCard).where(
                RunCard.run_id == run_id, RunCard.status == RunCardStatus.pending
            )
        ):
            db.delete(row)
        db.get(Run, run_id).status = RunStatus.completed
        db.commit()

        [(_, reached, counted)] = _counts(client, practice["id"])
        assert (reached, counted) == (2, 3)

    def test_a_run_of_chosen_cards_counts_only_the_chosen(self, client, db):
        ports, _ = _deck(client, "Ports", cards=3)
        practice = create_practice(client, {ports["id"]: None})
        first = client.post(f"/api/practices/{practice['id']}/runs").json()
        _finish(client, first["id"])
        card_id = db.exec(
            select(RunCard.card_id).where(RunCard.run_id == uuid.UUID(first["id"]))
        ).first()

        res = client.post(
            f"/api/runs/{first['id']}/chosen_cards", json={"card_ids": [str(card_id)]}
        )
        assert res.status_code == 201, res.text
        chosen = res.json()

        assert _counts(client, practice["id"]) == [(chosen["id"], 0, 1), (first["id"], 3, 3)]

    def test_a_card_deleted_afterward_leaves_both_counts(self, client):
        ports, _ = _deck(client, "Ports", cards=3)
        practice = create_practice(client, {ports["id"]: None})
        run = client.post(f"/api/practices/{practice['id']}/runs").json()
        _finish(client, run["id"])
        first_card = client.get(f"/api/decks/{ports['id']}").json()["cards"][0]["id"]

        assert client.delete(f"/api/cards/{first_card}").status_code == 204

        assert _counts(client, practice["id"]) == [(run["id"], 2, 2)]


class TestRename:
    def test_a_rename_moves_no_practice_and_touches_no_run(self, client, db):
        ports, _ = _deck(client, "Ports")
        oldest = create_practice(client, {ports["id"]: None}, "Oldest")
        run = start_practice(client, {ports["id"]: None}, "Run")
        newest = create_practice(client, {ports["id"]: None}, "Newest")
        now = datetime.now(UTC)
        for practice_id, stamp in (
            (oldest["id"], now - timedelta(days=3)),
            (newest["id"], now + timedelta(days=1)),
        ):
            row = db.get(Practice, uuid.UUID(practice_id))
            row.created_at = stamp
            db.add(row)
        db.commit()
        before = client.get("/api/practices").json()
        runs_before = client.get(f"/api/practices/{run['practice_id']}").json()["runs"]
        assert [p["name"] for p in before] == ["Newest", "Run", "Oldest"]

        for practice_id in (oldest["id"], run["practice_id"]):
            res = client.patch(
                f"/api/practices/{practice_id}", json={"name": "  Renamed " + practice_id}
            )
            assert res.status_code == 200, res.text
            assert res.json()["name"] == "Renamed " + practice_id

        after = client.get("/api/practices").json()
        assert [p["id"] for p in after] == [p["id"] for p in before]
        assert [p["name"] for p in after] == [
            "Newest",
            "Renamed " + run["practice_id"],
            "Renamed " + oldest["id"],
        ]
        runs_after = client.get(f"/api/practices/{run['practice_id']}").json()["runs"]
        assert runs_after == runs_before

    def test_a_taken_name_is_refused_with_its_code(self, client):
        ports, _ = _deck(client, "Ports")
        create_practice(client, {ports["id"]: None}, "Evening")
        morning = create_practice(client, {ports["id"]: None}, "Morning")

        res = client.patch(f"/api/practices/{morning['id']}", json={"name": "Evening"})
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "practice_name_taken"
        assert client.get(f"/api/practices/{morning['id']}").json()["name"] == "Morning"

    def test_keeping_its_own_name_is_no_conflict(self, client):
        ports, _ = _deck(client, "Ports")
        morning = create_practice(client, {ports["id"]: None}, "Morning")

        res = client.patch(f"/api/practices/{morning['id']}", json={"name": "Morning"})
        assert res.status_code == 200, res.text

    def test_a_blank_name_is_a_plain_400(self, client):
        ports, _ = _deck(client, "Ports")
        morning = create_practice(client, {ports["id"]: None}, "Morning")

        res = client.patch(f"/api/practices/{morning['id']}", json={"name": "   "})
        assert res.status_code == 400, res.text
        assert isinstance(res.json()["detail"], str)
        assert client.get(f"/api/practices/{morning['id']}").json()["name"] == "Morning"


class TestDelete:
    def test_deleting_a_practice_deletes_its_runs_and_leaves_every_cards_readiness(
        self, client, db
    ):
        ports, _ = _deck(client, "Ports", cards=3)
        kept = create_practice(client, {ports["id"]: None}, "Kept")
        finished = start_practice(client, {ports["id"]: None}, "Gone")
        _finish(client, finished["id"])
        practice_id = finished["practice_id"]
        active = client.post(f"/api/practices/{practice_id}/runs").json()
        run_ids = {uuid.UUID(finished["id"]), uuid.UUID(active["id"])}

        def readiness():
            cards = client.get(f"/api/decks/{ports['id']}").json()["cards"]
            return {card["id"]: card["readiness"] for card in cards}

        readiness_before = readiness()
        assert any(value for value in readiness_before.values())
        db.expire_all()
        mastery_rows = db.exec(
            select(MasteryLog.id).where(col(MasteryLog.run_id).in_(run_ids))
        ).all()
        assert mastery_rows
        reviews_before = len(db.exec(select(ReviewLog.id)).all())

        res = client.delete(f"/api/practices/{practice_id}")
        assert res.status_code == 204, res.text

        assert client.get(f"/api/practices/{practice_id}").status_code == 404
        assert [p["id"] for p in client.get("/api/practices").json()] == [kept["id"]]
        assert client.get(f"/api/runs/{finished['id']}").status_code == 404
        db.expire_all()
        for model, column in (
            (Run, Run.id),
            (RunConfiguration, RunConfiguration.run_id),
            (RunCard, RunCard.run_id),
            (RunCountedCard, RunCountedCard.run_id),
        ):
            assert db.exec(select(model).where(col(column).in_(run_ids))).all() == []
        assert (
            db.exec(
                select(PracticeConfiguration).where(
                    PracticeConfiguration.practice_id == uuid.UUID(practice_id)
                )
            ).all()
            == []
        )
        assert [
            row.run_id
            for row in db.exec(select(MasteryLog).where(col(MasteryLog.id).in_(mastery_rows)))
        ] == [None] * len(mastery_rows)
        assert len(db.exec(select(ReviewLog.id)).all()) == reviews_before
        assert readiness() == readiness_before
        assert client.get(f"/api/practices/{kept['id']}").status_code == 200

    def test_another_users_practice_is_a_404_on_both_paths_and_stays(
        self, client, act_as, other_user, existing_user
    ):
        ports, _ = _deck(client, "Ports")
        practice = create_practice(client, {ports["id"]: None}, "Mine")

        act_as(other_user)
        assert (
            client.patch(f"/api/practices/{practice['id']}", json={"name": "Theirs"}).status_code
            == 404
        )
        assert client.delete(f"/api/practices/{practice['id']}").status_code == 404

        act_as(existing_user)
        assert client.get(f"/api/practices/{practice['id']}").json()["name"] == "Mine"
