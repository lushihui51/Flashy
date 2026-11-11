"""Route tests for GET /api/deletion-impact — the advisory preview behind every delete
confirm. Builds real data through the public API so each scenario is what a real
deck/field/card/practice/run structure produces, not a hand-assembled row set."""

import uuid

from tests.conftest import configuration, start_practice


def _make_deck(client, name="Deck", n_fields=2):
    field_defs = [{"name": f"f{i}", "type": "text"} for i in range(n_fields)]
    res = client.post(
        "/api/decks", json={"name": name, "field_defs": field_defs}
    )
    assert res.status_code == 201, res.text
    return res.json()


def _make_card(client, deck_id, field_ids, prefix="card"):
    values = {fid: f"{prefix}-{fid}" for fid in field_ids}
    res = client.post("/api/cards", json={"deck_id": deck_id, "values": values})
    assert res.status_code == 201, res.text
    return res.json()


def _layout(deck_id, prompt_ids, answer_ids):
    return {deck_id: configuration(prompt_ids, answer_ids)}


def _start_run(client, *layouts):
    """The first run of a new practice of each layout's deck, asked as it gives."""
    decks = {}
    for layout in layouts:
        decks.update(layout)
    return start_practice(client, decks)


def _finish_run(client, run_id):
    for _ in range(50):
        state = client.get(f"/api/runs/{run_id}/state").json()
        if state["current_card"] is None:
            return
        card = state["current_card"]
        ratings = {a["field_def_id"]: 4 for a in card["answers"]}
        res = client.post(f"/api/run_cards/{card['run_card_id']}/rate", json={"ratings": ratings})
        assert res.status_code == 200, res.text
    raise AssertionError(f"run {run_id} never reported current_card: null")


def test_two_decks_closure_counts_them_and_only_the_runs_entirely_inside_them(client):
    deck1 = _make_deck(client, "D1")
    deck2 = _make_deck(client, "D2")
    d1_fields = [fd["id"] for fd in deck1["field_defs"]]
    d2_fields = [fd["id"] for fd in deck2["field_defs"]]
    _make_card(client, deck1["id"], d1_fields, "c1")
    _make_card(client, deck1["id"], d1_fields, "c2")
    _make_card(client, deck2["id"], d2_fields, "c3")
    layout1 = _layout(deck1["id"], [d1_fields[0]], [d1_fields[1]])
    layout2 = _layout(deck2["id"], [d2_fields[0]], [d2_fields[1]])

    # A run entirely inside the two decks (spans both) — counted, its practice too.
    inside_run = _start_run(client, layout1, layout2)

    # A third deck, and a run spanning deck1 and this deck — not entirely inside the
    # deleted decks, so not counted.
    other_deck = _make_deck(client, "D3")
    other_fields = [fd["id"] for fd in other_deck["field_defs"]]
    _make_card(client, other_deck["id"], other_fields, "c4")
    other_layout = _layout(other_deck["id"], [other_fields[0]], [other_fields[1]])
    spanning_run = _start_run(client, layout1, other_layout)
    # A practice of the third deck alone — it loses nothing, so it is not counted.
    _start_run(client, other_layout)

    res = client.get(
        "/api/deletion-impact", params={"deck_ids": [deck1["id"], deck2["id"]]}
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["decks_deleted"] == 2
    assert body["fields_deleted"] == len(d1_fields) + len(d2_fields)
    assert body["cards_deleted"] == 3
    assert body["runs_deleted"] == 1
    assert body["practices_affected"] == 2
    assert body["cards_affected"] == 0

    assert inside_run["id"] and spanning_run["id"]  # both real runs, sanity check


def test_single_field_counts_its_active_runs_not_a_completed_one_and_no_practice(client):
    deck = _make_deck(client, "Deck", n_fields=3)
    p, a, b = (fd["id"] for fd in deck["field_defs"])
    _make_card(client, deck["id"], [p, a, b], "c1")
    _make_card(client, deck["id"], [p, a, b], "c2")

    with_b = _layout(deck["id"], [p], [a, b])
    _start_run(client, _layout(deck["id"], [p], [a]))

    active_with_b = _start_run(client, with_b)
    completed_with_b = _start_run(client, with_b)
    _finish_run(client, completed_with_b["id"])

    res = client.get("/api/deletion-impact", params={"field_ids": [b]})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["fields_deleted"] == 1
    assert body["runs_deleted"] == 1
    assert body["practices_affected"] == 0
    assert body["cards_affected"] == 2
    assert body["decks_deleted"] == 0
    assert body["cards_deleted"] == 0

    active_run_id = active_with_b["id"]
    assert active_run_id  # the counted run is the active one, not the completed one


def test_field_plus_its_own_deck_is_the_deck_cascade_only(client):
    deck = _make_deck(client, "Deck", n_fields=3)
    p, a, b = (fd["id"] for fd in deck["field_defs"])
    _make_card(client, deck["id"], [p, a, b], "c1")
    _make_card(client, deck["id"], [p, a, b], "c2")
    layout = _layout(deck["id"], [p], [a, b])

    # A run of only this deck — inside the deck cascade, counted.
    contained_run = _start_run(client, layout)

    # A run spanning this deck and a surviving deck — not entirely inside the deck
    # cascade, and B isn't "explicit" (its own deck is being deleted), so this run
    # is not counted either way.
    other_deck = _make_deck(client, "Other")
    other_fields = [fd["id"] for fd in other_deck["field_defs"]]
    _make_card(client, other_deck["id"], other_fields, "c3")
    spanning_run = _start_run(
        client, layout, _layout(other_deck["id"], [other_fields[0]], [other_fields[1]])
    )

    res = client.get(
        "/api/deletion-impact", params={"field_ids": [b], "deck_ids": [deck["id"]]}
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["decks_deleted"] == 1
    assert body["fields_deleted"] == 3
    assert body["cards_deleted"] == 2
    assert body["cards_affected"] == 0
    assert body["runs_deleted"] == 1
    assert body["practices_affected"] == 2

    assert contained_run["id"] and spanning_run["id"]  # sanity: both are real runs


def test_a_single_card_reports_only_itself(client, existing_deck, existing_field_defs):
    field_ids = [fd["id"] for fd in existing_field_defs]
    card = _make_card(client, existing_deck["id"], field_ids)

    res = client.get("/api/deletion-impact", params={"card_ids": [card["id"]]})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body == {
        "decks_deleted": 0,
        "fields_deleted": 0,
        "cards_deleted": 1,
        "cards_affected": 0,
        "runs_deleted": 0,
        "practices_affected": 0,
    }


def test_two_fields_named_by_one_active_run_count_it_once(client):
    deck = _make_deck(client, "Deck", n_fields=4)
    w, x, y, z = (fd["id"] for fd in deck["field_defs"])
    _make_card(client, deck["id"], [w, x, y, z])
    _start_run(client, _layout(deck["id"], [w], [x, y]))  # names both x and y

    res = client.get("/api/deletion-impact", params={"field_ids": [x, y]})
    assert res.status_code == 200, res.text
    assert res.json()["runs_deleted"] == 1


def test_foreign_deck_id_404s_naming_it(client, act_as, other_user, existing_deck):
    act_as(other_user)
    res = client.get("/api/deletion-impact", params={"deck_ids": [existing_deck["id"]]})
    assert res.status_code == 404, res.text
    assert existing_deck["id"] in res.json()["detail"]


def test_unknown_deck_id_404s(client):
    foreign_id = str(uuid.uuid4())
    res = client.get("/api/deletion-impact", params={"deck_ids": [foreign_id]})
    assert res.status_code == 404, res.text
    assert foreign_id in res.json()["detail"]


def test_all_lists_empty_422s(client):
    res = client.get("/api/deletion-impact")
    assert res.status_code == 422, res.text
    assert res.json()["detail"] == "at least one id is required"
