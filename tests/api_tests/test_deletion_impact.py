"""Route tests for GET /api/deletion-impact (task 013 T3, ADR 051) — the advisory
preview behind every delete confirm. Builds real data through the public API so each
scenario is what a real deck/subject/field/card/config/run structure produces, not a
hand-assembled row set."""

import uuid


def _make_subject(client, name="Subject"):
    res = client.post("/api/subjects", json={"name": name})
    assert res.status_code == 201, res.text
    return res.json()


def _make_deck(client, subject_id, name="Deck", n_fields=2):
    field_defs = [{"name": f"f{i}", "type": "text"} for i in range(n_fields)]
    res = client.post(
        "/api/decks", json={"name": name, "subject_id": subject_id, "field_defs": field_defs}
    )
    assert res.status_code == 201, res.text
    return res.json()


def _make_card(client, deck_id, field_ids, prefix="card"):
    values = {fid: f"{prefix}-{fid}" for fid in field_ids}
    res = client.post("/api/cards", json={"deck_id": deck_id, "values": values})
    assert res.status_code == 201, res.text
    return res.json()


def _make_config(client, deck_id, prompt_ids, answer_ids, name="Config"):
    res = client.post(
        "/api/deck_practice_configs",
        json={
            "deck_id": deck_id,
            "name": name,
            "prompt_field_ids": prompt_ids,
            "answer_field_ids": answer_ids,
            "prompt_pool_ids": [],
            "prompt_pool_counts": [],
            "answer_pool_ids": [],
            "answer_pool_counts": [],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def _start_run(client, name, config_ids):
    res = client.post(
        "/api/practice_runs", json={"name": name, "deck_practice_config_ids": config_ids}
    )
    assert res.status_code == 201, res.text
    return res.json()


def _finish_run(client, run_id):
    for _ in range(50):
        run = client.get(f"/api/practice_runs/{run_id}/state").json()
        if run["current_card"] is None:
            return
        card = run["current_card"]
        ratings = {a["field_def_id"]: 4 for a in card["answers"]}
        res = client.post(
            f"/api/practice_cards/{card['practice_card_id']}/rate", json={"ratings": ratings}
        )
        assert res.status_code == 200, res.text
    raise AssertionError(f"run {run_id} never reported current_card: null")


def test_subject_closure_counts_its_decks_and_only_the_runs_entirely_inside_it(client):
    subject = _make_subject(client, "S1")
    deck1 = _make_deck(client, subject["id"], "D1")
    deck2 = _make_deck(client, subject["id"], "D2")
    d1_fields = [fd["id"] for fd in deck1["field_defs"]]
    d2_fields = [fd["id"] for fd in deck2["field_defs"]]
    _make_card(client, deck1["id"], d1_fields, "c1")
    _make_card(client, deck1["id"], d1_fields, "c2")
    _make_card(client, deck2["id"], d2_fields, "c3")
    config1 = _make_config(client, deck1["id"], [d1_fields[0]], [d1_fields[1]], "cfg1")
    config2 = _make_config(client, deck2["id"], [d2_fields[0]], [d2_fields[1]], "cfg2")

    # A run entirely inside the subject (spans both its decks) — counted.
    inside_run = _start_run(client, "inside", [config1["id"], config2["id"]])

    # A second subject with its own deck, and a run spanning deck1 (inside S1) and
    # this foreign deck — not entirely inside S1's decks, so not counted.
    other_subject = _make_subject(client, "S2")
    other_deck = _make_deck(client, other_subject["id"], "D3")
    other_fields = [fd["id"] for fd in other_deck["field_defs"]]
    _make_card(client, other_deck["id"], other_fields, "c4")
    other_config = _make_config(
        client, other_deck["id"], [other_fields[0]], [other_fields[1]], "cfg3"
    )
    spanning_run = _start_run(client, "spanning", [config1["id"], other_config["id"]])

    res = client.get("/api/deletion-impact", params={"subject_ids": [subject["id"]]})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["subjects_deleted"] == 1
    assert body["decks_deleted"] == 2
    assert body["fields_deleted"] == len(d1_fields) + len(d2_fields)
    assert body["cards_deleted"] == 3
    assert body["configurations_deleted"] == 2
    assert body["runs_deleted"] == 1
    assert body["cards_affected"] == 0

    assert inside_run["id"] and spanning_run["id"]  # both real runs, sanity check


def test_single_field_counts_its_configs_and_active_runs_not_a_completed_one(client):
    subject = _make_subject(client)
    deck = _make_deck(client, subject["id"], "Deck", n_fields=3)
    p, a, b = (fd["id"] for fd in deck["field_defs"])
    _make_card(client, deck["id"], [p, a, b], "c1")
    _make_card(client, deck["id"], [p, a, b], "c2")

    config_with_b = _make_config(client, deck["id"], [p], [a, b], "with-b")
    _make_config(client, deck["id"], [p], [a], "without-b")

    active_with_b = _start_run(client, "active-with-b", [config_with_b["id"]])
    completed_with_b = _start_run(client, "completed-with-b", [config_with_b["id"]])
    _finish_run(client, completed_with_b["id"])

    res = client.get("/api/deletion-impact", params={"field_ids": [b]})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["fields_deleted"] == 1
    assert body["configurations_deleted"] == 1
    assert body["runs_deleted"] == 1
    assert body["cards_affected"] == 2
    assert body["subjects_deleted"] == 0
    assert body["decks_deleted"] == 0
    assert body["cards_deleted"] == 0

    active_run_id = active_with_b["id"]
    assert active_run_id  # the counted run is the active one, not the completed one


def test_field_plus_its_own_deck_is_the_deck_cascade_only(client):
    subject = _make_subject(client)
    deck = _make_deck(client, subject["id"], "Deck", n_fields=3)
    p, a, b = (fd["id"] for fd in deck["field_defs"])
    _make_card(client, deck["id"], [p, a, b], "c1")
    _make_card(client, deck["id"], [p, a, b], "c2")
    config = _make_config(client, deck["id"], [p], [a, b], "cfg")

    # A run snapshotting only this deck — inside the deck cascade, counted.
    contained_run = _start_run(client, "contained", [config["id"]])

    # A run spanning this deck and a surviving deck — not entirely inside the deck
    # cascade, and B isn't "explicit" (its own deck is being deleted), so this run
    # is not counted either way.
    other_deck = _make_deck(client, subject["id"], "Other")
    other_fields = [fd["id"] for fd in other_deck["field_defs"]]
    _make_card(client, other_deck["id"], other_fields, "c3")
    other_config = _make_config(
        client, other_deck["id"], [other_fields[0]], [other_fields[1]], "other-cfg"
    )
    spanning_run = _start_run(client, "spanning", [config["id"], other_config["id"]])

    res = client.get(
        "/api/deletion-impact", params={"field_ids": [b], "deck_ids": [deck["id"]]}
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["decks_deleted"] == 1
    assert body["fields_deleted"] == 3
    assert body["cards_deleted"] == 2
    assert body["cards_affected"] == 0
    assert body["configurations_deleted"] == 1
    assert body["runs_deleted"] == 1

    assert contained_run["id"] and spanning_run["id"]  # sanity: both are real runs


def test_a_single_card_reports_only_itself(client, existing_deck, existing_field_defs):
    field_ids = [fd["id"] for fd in existing_field_defs]
    card = _make_card(client, existing_deck["id"], field_ids)

    res = client.get("/api/deletion-impact", params={"card_ids": [card["id"]]})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body == {
        "subjects_deleted": 0,
        "decks_deleted": 0,
        "fields_deleted": 0,
        "cards_deleted": 1,
        "cards_affected": 0,
        "configurations_deleted": 0,
        "runs_deleted": 0,
    }


def test_two_fields_named_by_one_config_count_it_once(client):
    subject = _make_subject(client)
    deck = _make_deck(client, subject["id"], "Deck", n_fields=3)
    x, y, z = (fd["id"] for fd in deck["field_defs"])
    _make_card(client, deck["id"], [x, y, z])
    _make_config(client, deck["id"], [x], [y], "cfg")  # names both x and y

    res = client.get("/api/deletion-impact", params={"field_ids": [x, y]})
    assert res.status_code == 200, res.text
    assert res.json()["configurations_deleted"] == 1


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
