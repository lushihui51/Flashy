import uuid

import pytest


@pytest.fixture
def config_fields(client, existing_deck):
    names = ["prompt1", "answer1", "pool_p1", "pool_p2", "pool_a1", "pool_a2"]
    ids = {}
    for name in names:
        res = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": name, "type": "text"}
        )
        assert res.status_code == 201, res.text
        ids[name] = res.json()["id"]
    return ids


@pytest.fixture
def valid_config_payload(existing_deck, config_fields):
    f = config_fields
    return {
        "deck_id": existing_deck["id"],
        "name": "Test Config",
        "prompt_field_ids": [f["prompt1"]],
        "answer_field_ids": [f["answer1"]],
        "prompt_pool_ids": [f["pool_p1"], f["pool_p2"]],
        "prompt_pool_counts": [1, 2],
        "answer_pool_ids": [f["pool_a1"], f["pool_a2"]],
        "answer_pool_counts": [1],
    }


@pytest.fixture
def existing_config(client, valid_config_payload):
    res = client.post("/api/deck_practice_configs", json=valid_config_payload)
    assert res.status_code == 201, res.text
    return res.json()


class TestDeckPracticeConfigCRUD:
    def test_create_valid_config(self, client, valid_config_payload):
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["name"] == "Test Config"
        assert "id" in data

    def test_create_deck_not_found(self, client, valid_config_payload):
        valid_config_payload["deck_id"] = str(uuid.uuid4())
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 404

    def test_read_config(self, client, existing_config):
        res = client.get(f"/api/deck_practice_configs/{existing_config['id']}")
        assert res.status_code == 200
        assert res.json()["id"] == existing_config["id"]

    def test_read_config_not_found(self, client):
        res = client.get(f"/api/deck_practice_configs/{uuid.uuid4()}")
        assert res.status_code == 404

    def test_read_configs_by_deck(self, client, existing_deck, existing_config):
        res = client.get(
            "/api/deck_practice_configs", params={"deck_id": existing_deck["id"]}
        )
        assert res.status_code == 200
        assert [c["id"] for c in res.json()] == [existing_config["id"]]

    def test_update_config_name(self, client, existing_config):
        res = client.patch(
            f"/api/deck_practice_configs/{existing_config['id']}", json={"name": "Renamed"}
        )
        assert res.status_code == 200, res.text
        assert res.json()["name"] == "Renamed"

    def test_update_config_not_found(self, client):
        res = client.patch(f"/api/deck_practice_configs/{uuid.uuid4()}", json={"name": "x"})
        assert res.status_code == 404

    def test_delete_config(self, client, existing_config):
        res = client.delete(f"/api/deck_practice_configs/{existing_config['id']}")
        assert res.status_code == 204

        get_res = client.get(f"/api/deck_practice_configs/{existing_config['id']}")
        assert get_res.status_code == 404

    def test_duplicate_name_rejected(self, client, valid_config_payload, existing_config):
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 400


class TestDeckPracticeConfigValidation:
    def test_overlapping_fields_rejected(self, client, valid_config_payload, config_fields):
        # prompt1 is both a prompt field and (now) an answer field — not disjoint.
        valid_config_payload["answer_field_ids"].append(config_fields["prompt1"])
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 400

    def test_unknown_field_id_rejected(self, client, valid_config_payload):
        valid_config_payload["prompt_field_ids"] = [str(uuid.uuid4())]
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 400

    def test_archived_field_id_rejected(
        self, client, valid_config_payload, config_fields
    ):
        client.delete(f"/api/fields/{config_fields['prompt1']}")
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 400

    def test_prompt_pool_count_too_high_rejected(self, client, valid_config_payload):
        valid_config_payload["prompt_pool_counts"] = [1, 3]  # pool only has 2 ids
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 400

    def test_prompt_pool_count_zero_rejected(self, client, valid_config_payload):
        valid_config_payload["prompt_pool_counts"] = [0]
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 400

    def test_answer_pool_count_too_high_rejected(self, client, valid_config_payload):
        valid_config_payload["answer_pool_counts"] = [3]  # pool only has 2 ids
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 400

    def test_no_producible_prompt_rejected(self, client, valid_config_payload):
        valid_config_payload["prompt_field_ids"] = []
        valid_config_payload["prompt_pool_ids"] = []
        valid_config_payload["prompt_pool_counts"] = []
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 400

    def test_no_producible_answer_rejected(self, client, valid_config_payload):
        valid_config_payload["answer_field_ids"] = []
        valid_config_payload["answer_pool_ids"] = []
        valid_config_payload["answer_pool_counts"] = []
        res = client.post("/api/deck_practice_configs", json=valid_config_payload)
        assert res.status_code == 400

    def test_only_pool_no_fixed_field_is_valid(
        self, client, existing_deck, config_fields
    ):
        f = config_fields
        payload = {
            "deck_id": existing_deck["id"],
            "name": "Pool Only Config",
            "prompt_field_ids": [],
            "answer_field_ids": [],
            "prompt_pool_ids": [f["prompt1"], f["pool_p1"]],
            "prompt_pool_counts": [1],
            "answer_pool_ids": [f["answer1"], f["pool_a1"]],
            "answer_pool_counts": [2],
        }
        res = client.post("/api/deck_practice_configs", json=payload)
        assert res.status_code == 201, res.text

    def test_update_reintroducing_overlap_rejected(
        self, client, existing_config, config_fields
    ):
        res = client.patch(
            f"/api/deck_practice_configs/{existing_config['id']}",
            json={"answer_field_ids": [config_fields["prompt1"]]},
        )
        assert res.status_code == 400

    def test_update_validates_against_merged_config_not_just_patch(
        self, client, existing_config, config_fields
    ):
        """Patching only prompt_pool_counts must still validate against the *existing*
        prompt_pool_ids, not an empty/default array."""
        res = client.patch(
            f"/api/deck_practice_configs/{existing_config['id']}",
            json={"prompt_pool_counts": [1, 2, 3]},  # existing pool only has 2 ids
        )
        assert res.status_code == 400


class TestDeckPracticeConfigList:
    """GET /api/deck_practice_configs — the config picker's read. Rows carry their deck
    and subject so the picker can group by deck without a client-side join, and so two
    same-named decks in different subjects stay distinguishable."""

    def test_lists_every_config_with_deck_and_subject_context(
        self, client, multi_subject_library
    ):
        lib = multi_subject_library
        rows = client.get("/api/deck_practice_configs").json()

        assert [row["name"] for row in rows] == ["Config A", "Config B"]
        assert rows[0]["deck_id"] == lib["decks"]["a"]["id"]
        assert rows[0]["deck_name"] == "Shared Deck Name"
        assert rows[0]["subject_id"] == lib["subjects"]["a"]["id"]
        assert rows[0]["subject_name"] == "Alpha"
        assert rows[0]["prompt_field_ids"] == [lib["fields"]["a"]["front"]]

    def test_subject_filter(self, client, multi_subject_library):
        lib = multi_subject_library
        rows = client.get(
            "/api/deck_practice_configs", params={"subject_id": lib["subjects"]["b"]["id"]}
        ).json()
        assert [row["name"] for row in rows] == ["Config B"]

    def test_deck_filter_disambiguates_same_named_decks(self, client, multi_subject_library):
        lib = multi_subject_library
        rows = client.get(
            "/api/deck_practice_configs", params={"deck_id": lib["decks"]["a"]["id"]}
        ).json()
        assert [row["name"] for row in rows] == ["Config A"]

    def test_filters_combine_with_and(self, client, multi_subject_library):
        lib = multi_subject_library
        rows = client.get(
            "/api/deck_practice_configs",
            params={
                "subject_id": lib["subjects"]["a"]["id"],
                "deck_id": lib["decks"]["b"]["id"],
            },
        ).json()
        assert rows == []

    def test_another_users_configs_are_invisible(
        self, client, act_as, other_user, multi_subject_library
    ):
        lib = multi_subject_library
        act_as(other_user)
        assert client.get("/api/deck_practice_configs").json() == []
        assert (
            client.get(
                "/api/deck_practice_configs", params={"deck_id": lib["decks"]["a"]["id"]}
            ).json()
            == []
        )
