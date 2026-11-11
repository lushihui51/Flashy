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
