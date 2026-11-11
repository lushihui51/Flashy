import uuid

import pytest

from app.services.practice_configuration import (
    has_empty_side,
    starting_configuration,
    validate_configuration,
    without_fields,
)


@pytest.fixture
def config_fields(client, existing_deck):
    names = ["prompt1", "answer1", "pool_p1", "pool_p2", "pool_a1", "pool_a2"]
    ids = {}
    for name in names:
        res = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": name, "type": "text"}
        )
        assert res.status_code == 201, res.text
        ids[name] = uuid.UUID(res.json()["id"])
    return ids


@pytest.fixture
def valid_arrays(config_fields):
    f = config_fields
    return {
        "prompt_field_ids": [f["prompt1"]],
        "answer_field_ids": [f["answer1"]],
        "prompt_pool_ids": [f["pool_p1"], f["pool_p2"]],
        "prompt_pool_counts": [1, 2],
        "answer_pool_ids": [f["pool_a1"], f["pool_a2"]],
        "answer_pool_counts": [1],
    }


class TestValidateConfiguration:
    def _check(self, db, existing_deck, arrays):
        validate_configuration(db, uuid.UUID(existing_deck["id"]), arrays)

    def test_a_valid_configuration_passes(self, db, existing_deck, valid_arrays):
        self._check(db, existing_deck, valid_arrays)

    def test_overlapping_fields_rejected(self, db, existing_deck, valid_arrays, config_fields):
        valid_arrays["answer_field_ids"].append(config_fields["prompt1"])
        with pytest.raises(ValueError, match="overlap"):
            self._check(db, existing_deck, valid_arrays)

    def test_unknown_field_id_rejected(self, db, existing_deck, valid_arrays):
        valid_arrays["prompt_field_ids"] = [uuid.uuid4()]
        with pytest.raises(ValueError, match="not live"):
            self._check(db, existing_deck, valid_arrays)

    def test_deleted_field_id_rejected(self, client, db, existing_deck, valid_arrays, config_fields):
        assert client.delete(f"/api/fields/{config_fields['prompt1']}").status_code == 204
        with pytest.raises(ValueError, match="not live"):
            self._check(db, existing_deck, valid_arrays)

    def test_another_decks_field_rejected(self, client, db, existing_deck, valid_arrays):
        other = client.post(
            "/api/decks",
            json={
                "name": "Other",
                "field_defs": [{"name": "a", "type": "text"}, {"name": "b", "type": "text"}],
            },
        ).json()
        valid_arrays["prompt_field_ids"] = [uuid.UUID(other["field_defs"][0]["id"])]
        with pytest.raises(ValueError, match="not live"):
            self._check(db, existing_deck, valid_arrays)

    @pytest.mark.parametrize(
        "column, counts",
        [
            ("prompt_pool_counts", [1, 3]),
            ("prompt_pool_counts", [0]),
            ("answer_pool_counts", [3]),
        ],
    )
    def test_a_count_outside_its_pool_rejected(
        self, db, existing_deck, valid_arrays, column, counts
    ):
        valid_arrays[column] = counts
        with pytest.raises(ValueError, match="out of range"):
            self._check(db, existing_deck, valid_arrays)

    @pytest.mark.parametrize("pool, counts", [("prompt", "prompt"), ("answer", "answer")])
    def test_a_pool_without_counts_rejected(self, db, existing_deck, valid_arrays, pool, counts):
        valid_arrays[f"{counts}_pool_counts"] = []
        with pytest.raises(ValueError, match=f"{pool}_pool_counts"):
            self._check(db, existing_deck, valid_arrays)

    @pytest.mark.parametrize("side", ["prompt", "answer"])
    def test_a_side_naming_no_field_rejected(self, db, existing_deck, valid_arrays, side):
        valid_arrays[f"{side}_field_ids"] = []
        valid_arrays[f"{side}_pool_ids"] = []
        valid_arrays[f"{side}_pool_counts"] = []
        with pytest.raises(ValueError, match=f"{side}"):
            self._check(db, existing_deck, valid_arrays)

    def test_no_pool_at_all_is_valid(self, db, existing_deck, valid_arrays):
        for column in ("prompt_pool_ids", "prompt_pool_counts", "answer_pool_ids", "answer_pool_counts"):
            valid_arrays[column] = []
        self._check(db, existing_deck, valid_arrays)

    def test_only_pools_and_no_fixed_field_is_valid(self, db, existing_deck, config_fields):
        f = config_fields
        self._check(
            db,
            existing_deck,
            {
                "prompt_field_ids": [],
                "answer_field_ids": [],
                "prompt_pool_ids": [f["prompt1"], f["pool_p1"]],
                "prompt_pool_counts": [1],
                "answer_pool_ids": [f["answer1"], f["pool_a1"]],
                "answer_pool_counts": [2],
            },
        )


class TestStartingConfiguration:
    def test_the_first_field_is_the_prompt_and_the_rest_the_answer(self):
        first, second, third = (uuid.uuid4() for _ in range(3))
        assert starting_configuration([first, second, third]) == {
            "prompt_field_ids": [first],
            "answer_field_ids": [second, third],
            "prompt_pool_ids": [],
            "prompt_pool_counts": [],
            "answer_pool_ids": [],
            "answer_pool_counts": [],
        }

    def test_a_decks_starting_configuration_is_valid(self, db, existing_deck, config_fields):
        from app.database_ops.field_def import db_read_field_defs_for_decks

        deck_id = uuid.UUID(existing_deck["id"])
        live = [fd.id for fd in db_read_field_defs_for_decks(db, [deck_id])]
        validate_configuration(db, deck_id, starting_configuration(live))


class TestWithoutFields:
    def test_removes_the_ids_lowers_counts_and_drops_an_emptied_pools_counts(self):
        a, b, c, d = (uuid.uuid4() for _ in range(4))
        arrays = {
            "prompt_field_ids": [a],
            "answer_field_ids": [b],
            "prompt_pool_ids": [c, d],
            "prompt_pool_counts": [1, 2],
            "answer_pool_ids": [d],
            "answer_pool_counts": [1],
        }
        # d is in two pools here only to check both lose it in one call.
        assert without_fields(arrays, {d}) == {
            "prompt_field_ids": [a],
            "answer_field_ids": [b],
            "prompt_pool_ids": [c],
            "prompt_pool_counts": [1, 1],
            "answer_pool_ids": [],
            "answer_pool_counts": [],
        }

    def test_a_side_left_naming_no_field_is_reported(self):
        a, b = uuid.uuid4(), uuid.uuid4()
        arrays = {
            "prompt_field_ids": [a],
            "answer_field_ids": [b],
            "prompt_pool_ids": [],
            "prompt_pool_counts": [],
            "answer_pool_ids": [],
            "answer_pool_counts": [],
        }
        assert not has_empty_side(arrays)
        assert has_empty_side(without_fields(arrays, {b}))


def _deck_of_four_fields(client, name="Ports"):
    """A deck with fields a, b, c and d and one card filling each, and its field ids by
    name."""
    deck = client.post(
        "/api/decks",
        json={"name": name, "field_defs": [{"name": f, "type": "text"} for f in "abcd"]},
    )
    assert deck.status_code == 201, deck.text
    fields = {fd["name"]: fd["id"] for fd in deck.json()["field_defs"]}
    card = client.post(
        "/api/cards",
        json={"deck_id": deck.json()["id"], "values": {fid: "v" for fid in fields.values()}},
    )
    assert card.status_code == 201, card.text
    return deck.json(), fields


def _arrays(prompt=(), answer=(), prompt_pool=(), prompt_counts=(), answer_pool=(), answer_counts=()):
    return {
        "prompt_field_ids": list(prompt),
        "answer_field_ids": list(answer),
        "prompt_pool_ids": list(prompt_pool),
        "prompt_pool_counts": list(prompt_counts),
        "answer_pool_ids": list(answer_pool),
        "answer_pool_counts": list(answer_counts),
    }


def _practice(client, deck_ids):
    res = client.post("/api/practices", json={"deck_ids": deck_ids})
    assert res.status_code == 201, res.text
    return res.json()


def _save(client, practice_id, deck_id, arrays):
    return client.put(f"/api/practices/{practice_id}/configurations/{deck_id}", json=arrays)


def _practice_configurations(client, practice_id):
    res = client.get(f"/api/practices/{practice_id}")
    assert res.status_code == 200, res.text
    return {c["deck_id"]: c for c in res.json()["configurations"]}


def _run_configurations(client, run_id):
    res = client.get(f"/api/runs/{run_id}")
    assert res.status_code == 200, res.text
    return {c["deck_id"]: c for c in res.json()["configurations"]}


def _finish(client, run_id):
    for _ in range(50):
        card = client.get(f"/api/runs/{run_id}/state").json()["current_card"]
        if card is None:
            return
        res = client.post(
            f"/api/run_cards/{card['run_card_id']}/rate",
            json={"ratings": {a["field_def_id"]: 4 for a in card["answers"]}},
        )
        assert res.status_code == 200, res.text
    raise AssertionError("the run never completed")


class TestSave:
    """PUT /api/practices/{id}/configurations/{deck_id}."""

    def test_a_save_replaces_the_whole_configuration_and_answers_it(self, client):
        deck, f = _deck_of_four_fields(client)
        practice = _practice(client, [deck["id"]])
        arrays = _arrays([f["b"]], [], [], [], [f["a"], f["c"], f["d"]], [1, 3])

        res = _save(client, practice["id"], deck["id"], arrays)

        assert res.status_code == 200, res.text
        assert res.json() == {"deck_id": deck["id"], **arrays}
        assert _practice_configurations(client, practice["id"]) == {deck["id"]: res.json()}

    def test_a_save_reaches_the_next_run_and_leaves_the_active_runs_copy(self, client):
        deck, f = _deck_of_four_fields(client)
        practice = _practice(client, [deck["id"]])
        active = client.post(f"/api/practices/{practice['id']}/runs").json()
        cut = _run_configurations(client, active["id"])
        saved = _arrays([f["d"]], [f["c"]], [], [], [f["a"], f["b"]], [2])

        res = _save(client, practice["id"], deck["id"], saved)
        assert res.status_code == 200, res.text

        assert _run_configurations(client, active["id"]) == cut
        _finish(client, active["id"])
        next_run = client.post(f"/api/practices/{practice['id']}/runs").json()
        assert next_run["id"] != active["id"]
        assert _run_configurations(client, next_run["id"]) == {
            deck["id"]: {"deck_id": deck["id"], **saved}
        }
        assert _run_configurations(client, active["id"]) == cut

    @pytest.mark.parametrize(
        "broken",
        ["a field of another deck", "a field on both sides", "a count above its pool"],
    )
    def test_a_configuration_breaking_a_rule_is_refused_and_writes_nothing(
        self, client, broken
    ):
        deck, f = _deck_of_four_fields(client)
        _, other = _deck_of_four_fields(client, "Commands")
        practice = _practice(client, [deck["id"]])
        before = _practice_configurations(client, practice["id"])
        arrays = {
            "a field of another deck": _arrays([f["a"]], [other["b"]]),
            "a field on both sides": _arrays([f["a"]], [f["a"], f["b"]]),
            "a count above its pool": _arrays([f["a"]], [], [], [], [f["b"], f["c"]], [3]),
        }[broken]

        res = _save(client, practice["id"], deck["id"], arrays)

        assert res.status_code == 400, res.text
        assert isinstance(res.json()["detail"], str)
        assert _practice_configurations(client, practice["id"]) == before

    def test_a_deck_that_is_not_the_practices_is_a_404(self, client):
        deck, f = _deck_of_four_fields(client)
        outside, g = _deck_of_four_fields(client, "Commands")
        practice = _practice(client, [deck["id"]])

        res = _save(client, practice["id"], outside["id"], _arrays([g["a"]], [g["b"]]))

        assert res.status_code == 404, res.text

    def test_an_unknown_practice_is_a_404(self, client):
        deck, f = _deck_of_four_fields(client)

        res = _save(client, uuid.uuid4(), deck["id"], _arrays([f["a"]], [f["b"]]))

        assert res.status_code == 404, res.text
