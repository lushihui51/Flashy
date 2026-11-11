import uuid

import pytest
from sqlmodel import select

from app.models.run import Run, RunStatus

NO_STEPS_DONE = {
    "has_deck": False,
    "has_card": False,
}


def _home(client, db, user):
    """Home as `user` reads it. The route is handed this already-loaded row, so it is
    reloaded first to carry what earlier requests stamped on it."""
    db.refresh(user)
    res = client.get("/api/home")
    assert res.status_code == 200, res.text
    return res.json()


def _deck(client, name):
    res = client.post(
        "/api/decks",
        json={
            "name": name,
            "field_defs": [{"name": "front", "type": "text"}, {"name": "back", "type": "text"}],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def _card(client, deck, front="q", back="a"):
    fields = {fd["name"]: fd["id"] for fd in deck["field_defs"]}
    res = client.post(
        "/api/cards",
        json={"deck_id": deck["id"], "values": {fields["front"]: front, fields["back"]: back}},
    )
    assert res.status_code == 201, res.text
    return res.json()


def _practice(client, deck, name=None):
    res = client.post("/api/practices", json={"name": name, "deck_ids": [deck["id"]]})
    assert res.status_code == 201, res.text
    return res.json()


def _practisable_deck(client, name, cards=1):
    """A deck with `cards` cards and a practice of it: `(deck, practice)`."""
    deck = _deck(client, name)
    for i in range(cards):
        _card(client, deck, front=f"q{i}", back=f"a{i}")
    return deck, _practice(client, deck)


def _start(client, practice):
    res = client.post(f"/api/practices/{practice['id']}/runs")
    assert res.status_code == 200, res.text
    return res.json()


def _rate_current(client, run_id):
    """Passes the run's current card; False when none is left."""
    current = client.get(f"/api/runs/{run_id}/state").json()["current_card"]
    if current is None:
        return False
    res = client.post(
        f"/api/run_cards/{current['run_card_id']}/rate",
        json={"ratings": {a["field_def_id"]: 4 for a in current["answers"]}},
    )
    assert res.status_code == 200, res.text
    return True


def _finish(client, run_id):
    while _rate_current(client, run_id):
        pass


def _complete_run_of(client, practice):
    run = _start(client, practice)
    _finish(client, run["id"])
    return run


class TestSteps:
    def test_a_new_user_reads_every_step_undone_and_empty_lists(
        self, client, db, existing_user
    ):
        assert _home(client, db, existing_user) == {
            "steps": NO_STEPS_DONE,
            "active_runs": [],
            "recent_decks": [],
        }

    def test_each_thing_made_flips_its_flag(self, client, db, existing_user):
        deck = _deck(client, "Deck")
        assert _home(client, db, existing_user)["steps"] == {
            **NO_STEPS_DONE,
            "has_deck": True,
        }

        _card(client, deck)
        assert _home(client, db, existing_user)["steps"] == {
            "has_deck": True,
            "has_card": True,
        }

    def test_steps_are_null_once_a_practice_is_made_before_it_is_run(
        self, client, db, existing_user
    ):
        _practisable_deck(client, "Deck")

        assert _home(client, db, existing_user)["steps"] is None

    def test_a_refused_practice_leaves_the_steps(self, client, db, existing_user):
        deck = _deck(client, "Deck")
        res = client.post("/api/practices", json={"deck_ids": [deck["id"], deck["id"]]})
        assert res.status_code == 400, res.text

        home = _home(client, db, existing_user)
        assert home["steps"] is not None
        assert existing_user.first_practice_at is None

    def test_the_stamp_and_null_steps_survive_deleting_everything(
        self, client, db, existing_user
    ):
        deck, practice = _practisable_deck(client, "Deck")
        _start(client, practice)
        db.refresh(existing_user)
        stamped = existing_user.first_practice_at
        assert stamped is not None

        assert client.delete(f"/api/decks/{deck['id']}").status_code == 204

        home = _home(client, db, existing_user)
        assert home == {"steps": None, "active_runs": [], "recent_decks": []}
        assert existing_user.first_practice_at == stamped


class TestActiveRuns:
    def test_three_of_four_most_recent_first_each_with_its_progress(self, client, db, existing_user):
        deck, first = _practisable_deck(client, "Deck", cards=2)
        practices = [first] + [_practice(client, deck) for _ in range(3)]
        runs = [_start(client, practice) for practice in practices]
        # Rating in the first run makes it the most recent.
        _rate_current(client, runs[0]["id"])

        active = _home(client, db, existing_user)["active_runs"]

        assert [a["id"] for a in active] == [runs[0]["id"], runs[3]["id"], runs[2]["id"]]
        assert active[0]["practice_name"] == first["name"]
        assert active[0]["practice_id"] == first["id"]
        assert (active[0]["day"], active[0]["day_index"]) == (runs[0]["day"], 0)
        assert active[0]["progress"] == {
            "total_cards": 2,
            "unseen": 1,
            "retry_pending": 0,
            "passed": 1,
            "still_failed": 0,
        }
        assert active[1]["progress"]["unseen"] == 2
        assert [d["deck_name"] for d in active[0]["decks"]] == ["Deck"]

    def test_a_completed_run_is_not_active(self, client, db, existing_user):
        _, practice = _practisable_deck(client, "Deck")
        _complete_run_of(client, practice)

        assert _home(client, db, existing_user)["active_runs"] == []


class TestRecentDecks:
    def test_a_completed_runs_deck_is_listed_as_a_deck_row(self, client, db, existing_user):
        deck, practice = _practisable_deck(client, "Cells", cards=2)
        _complete_run_of(client, practice)

        [row] = _home(client, db, existing_user)["recent_decks"]

        assert row["id"] == deck["id"]
        assert row["name"] == "Cells"
        assert row["card_count"] == 2
        assert row["field_names"] == ["front", "back"]
        assert row["readiness"] is not None

    def test_a_completed_run_with_no_rating_is_absent(self, client, db, existing_user):
        _, practice = _practisable_deck(client, "Deck")
        run = _start(client, practice)
        row = db.exec(select(Run).where(Run.id == uuid.UUID(run["id"]))).one()
        row.status = RunStatus.completed
        db.add(row)
        db.commit()

        home = _home(client, db, existing_user)

        assert home["active_runs"] == []
        assert home["recent_decks"] == []

    def test_a_deck_of_an_active_run_is_absent(self, client, db, existing_user):
        _, practice = _practisable_deck(client, "Deck", cards=2)
        run = _start(client, practice)
        _rate_current(client, run["id"])

        assert _home(client, db, existing_user)["recent_decks"] == []

    def test_a_deck_in_two_completed_runs_is_listed_once_by_its_newest_rating(
        self, client, db, existing_user
    ):
        first, first_practice = _practisable_deck(client, "First")
        second, second_practice = _practisable_deck(client, "Second")
        _complete_run_of(client, first_practice)
        _complete_run_of(client, second_practice)
        _complete_run_of(client, first_practice)

        recent = _home(client, db, existing_user)["recent_decks"]

        assert [row["id"] for row in recent] == [first["id"], second["id"]]

    def test_the_newest_rating_comes_first_and_the_fourth_deck_is_absent(
        self, client, db, existing_user
    ):
        decks = []
        for i in range(4):
            deck, practice = _practisable_deck(client, f"Deck {i}")
            _complete_run_of(client, practice)
            decks.append(deck)

        recent = _home(client, db, existing_user)["recent_decks"]

        assert [row["id"] for row in recent] == [decks[3]["id"], decks[2]["id"], decks[1]["id"]]


def test_another_users_runs_and_decks_are_absent(
    client, db, existing_user, other_user, act_as
):
    _, practice = _practisable_deck(client, "Deck", cards=2)
    _complete_run_of(client, practice)
    _start(client, practice)

    act_as(other_user)

    assert _home(client, db, other_user) == {
        "steps": NO_STEPS_DONE,
        "active_runs": [],
        "recent_decks": [],
    }


@pytest.fixture
def home_statement_counters(statement_counter):
    # The empty name matches every statement, so a per-row read of any table shows too.
    return [statement_counter(name) for name in ("run", "deck", "mastery_log", "")]


def test_the_statement_count_is_equal_for_one_run_and_for_five(
    client, db, existing_user, home_statement_counters
):
    def counts():
        db.refresh(existing_user)
        for counter in home_statement_counters:
            counter.reset()
        res = client.get("/api/home")
        assert res.status_code == 200, res.text
        return res.json(), [counter.count for counter in home_statement_counters]


    def add_deck_with_runs(name):
        _, practice = _practisable_deck(client, name, cards=2)
        _complete_run_of(client, practice)
        _start(client, practice)

    add_deck_with_runs("Deck 0")
    home, for_one = counts()
    assert len(home["active_runs"]) == 1
    assert len(home["recent_decks"]) == 1

    for i in range(1, 5):
        add_deck_with_runs(f"Deck {i}")
    home, for_five = counts()
    assert len(home["active_runs"]) == 3
    assert len(home["recent_decks"]) == 3

    assert for_one == for_five
    assert all(count > 0 for count in for_one)
