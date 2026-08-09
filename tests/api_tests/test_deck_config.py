import uuid


class TestDeckConfigCRUD:
    def test_create_deck_config(
        self, client, deck_config_path, valid_create_deck_config_payload
    ):
        res = client.post(deck_config_path, json=valid_create_deck_config_payload)

        assert res.status_code == 201, res.text
        body = res.json()
        assert "id" in body
        assert body["deck_id"] == valid_create_deck_config_payload["deck_id"]

    def test_create_deck_config_deck_not_found(
        self, client, deck_config_path, valid_create_deck_config_payload
    ):
        valid_create_deck_config_payload["deck_id"] = str(uuid.uuid4())
        res = client.post(deck_config_path, json=valid_create_deck_config_payload)

        assert res.status_code == 404
        assert res.json()["detail"] == "Deck not found"

    def test_create_deck_config_duplicated_fields(
        self, client, deck_config_path, existing_deck, valid_create_deck_config_payload
    ):
        key = next(iter(existing_deck["deck_schema"]))
        valid_create_deck_config_payload.update(
            {
                "prompt_fields": [key],
                "answer_fields": [key],
                "prompt_pool": [key],
                "answer_pool": [key],
            }
        )

        res = client.post(deck_config_path, json=valid_create_deck_config_payload)

        assert res.status_code == 400
        assert res.json()["detail"] == "Duplicated deck fields"

    def test_create_deck_config_unknown_fields(
        self, client, deck_config_path, valid_create_deck_config_payload
    ):
        valid_create_deck_config_payload["prompt_fields"] = ["__unknown_field__"]

        res = client.post(deck_config_path, json=valid_create_deck_config_payload)

        assert res.status_code == 400
        assert res.json()["detail"] == "Unknown deck fields"

    def test_create_deck_config_invalid_dynamic_reveal_quantities(
        self, client, deck_config_path, existing_deck, valid_create_deck_config_payload
    ):
        key = next(iter(existing_deck["deck_schema"]))
        valid_create_deck_config_payload["prompt_pool"] = [key]
        valid_create_deck_config_payload["prompt_pool_counts"] = [2]

        res = client.post(deck_config_path, json=valid_create_deck_config_payload)

        assert res.status_code == 400
        assert res.json()["detail"] == "Invalid dynamic reveal quantity"

    def test_create_deck_config_invalid_dynamic_conceal_quantities(
        self, client, deck_config_path, existing_deck, valid_create_deck_config_payload
    ):
        key = next(iter(existing_deck["deck_schema"]))
        valid_create_deck_config_payload["prompt_pool"] = [key]
        valid_create_deck_config_payload["prompt_pool_counts"] = [1]
        valid_create_deck_config_payload["answer_pool"] = [key]
        valid_create_deck_config_payload["answer_pool_counts"] = [2]

        res = client.post(deck_config_path, json=valid_create_deck_config_payload)

        assert res.status_code == 400
        assert res.json()["detail"] == "Invalid dynamic conceal quantity"

    def test_read_deck_config(self, client, deck_config_path, existing_deck_config):

        res = client.get(f"{deck_config_path}/{existing_deck_config['id']}")

        assert res.status_code == 200, res.text
        assert res.json()["id"] == existing_deck_config["id"]

    def test_read_deck_config_not_found(self, client, deck_config_path):
        res = client.get(f"{deck_config_path}/{uuid.uuid4()}")

        assert res.status_code == 404
        assert res.json()["detail"] == "Deck Configuration not found"

    def test_update_deck_config(
        self, client, deck_config_path, existing_deck, existing_deck_config
    ):
        key = next(iter(existing_deck["deck_schema"]))

        payload = {
            "deck_id": existing_deck["id"],
            "prompt_fields": [key],
            "answer_fields": [],
            "prompt_pool": [],
            "prompt_pool_counts": [],
            "answer_pool": [],
            "answer_pool_counts": [],
        }
        res = client.patch(
            f"{deck_config_path}/{existing_deck_config['id']}", json=payload
        )

        assert res.status_code == 200, res.text
        body = res.json()
        assert body["id"] == existing_deck_config["id"]
        assert body["prompt_fields"] == [key]

    def test_update_deck_config_not_found(
        self, client, deck_config_path, valid_create_deck_config_payload
    ):
        res = client.patch(
            f"{deck_config_path}/{uuid.uuid4()}", json=valid_create_deck_config_payload
        )

        assert res.status_code == 404
        assert res.json()["detail"] == "Deck Configuration not found"

    def test_update_deck_config_deck_not_found(
        self,
        client,
        deck_config_path,
        valid_create_deck_config_payload,
        existing_deck_config,
    ):
        valid_create_deck_config_payload["deck_id"] = str(uuid.uuid4())

        res = client.patch(
            f"{deck_config_path}/{existing_deck_config['id']}",
            json=valid_create_deck_config_payload,
        )

        assert res.status_code == 404
        assert res.json()["detail"] == "Deck not found"

    def test_update_deck_config_duplicated_fields(
        self,
        client,
        deck_config_path,
        existing_deck,
        valid_create_deck_config_payload,
        existing_deck_config,
    ):
        key = next(iter(existing_deck["deck_schema"]))

        valid_create_deck_config_payload.update(
            {
                "prompt_fields": [key],
                "answer_fields": [key],
                "prompt_pool": [key],
                "answer_pool": [key],
            }
        )

        res = client.patch(
            f"{deck_config_path}/{existing_deck_config['id']}",
            json=valid_create_deck_config_payload,
        )

        assert res.status_code == 400
        assert res.json()["detail"] == "Duplicated deck fields"

    def test_update_deck_config_unknown_fields(
        self,
        client,
        deck_config_path,
        valid_create_deck_config_payload,
        existing_deck_config,
    ):

        valid_create_deck_config_payload["prompt_fields"] = ["__unknown_field__"]

        res = client.patch(
            f"{deck_config_path}/{existing_deck_config['id']}",
            json=valid_create_deck_config_payload,
        )

        assert res.status_code == 400
        assert res.json()["detail"] == "Unknown deck fields"

    def test_update_deck_config_invalid_dynamic_reveal_quantities(
        self,
        client,
        deck_config_path,
        existing_deck,
        valid_create_deck_config_payload,
        existing_deck_config,
    ):
        key = next(iter(existing_deck["deck_schema"]))
        valid_create_deck_config_payload["prompt_pool"] = [key]
        valid_create_deck_config_payload["prompt_pool_counts"] = [2]

        res = client.patch(
            f"{deck_config_path}/{existing_deck_config['id']}",
            json=valid_create_deck_config_payload,
        )

        assert res.status_code == 400
        assert res.json()["detail"] == "Invalid dynamic reveal quantity"

    def test_update_deck_config_invalid_dynamic_conceal_quantities(
        self,
        client,
        deck_config_path,
        existing_deck,
        valid_create_deck_config_payload,
        existing_deck_config,
    ):
        key = next(iter(existing_deck["deck_schema"]))
        valid_create_deck_config_payload["prompt_pool"] = [key]
        valid_create_deck_config_payload["prompt_pool_counts"] = [1]
        valid_create_deck_config_payload["answer_pool"] = [key]
        valid_create_deck_config_payload["answer_pool_counts"] = [2]

        res = client.patch(
            f"{deck_config_path}/{existing_deck_config['id']}",
            json=valid_create_deck_config_payload,
        )

        assert res.status_code == 400
        assert res.json()["detail"] == "Invalid dynamic conceal quantity"

    def test_delete_deck_config(self, client, deck_config_path, existing_deck_config):

        res = client.delete(f"{deck_config_path}/{existing_deck_config['id']}")
        assert res.status_code == 204, res.text

        read_res = client.get(f"{deck_config_path}/{existing_deck_config['id']}")
        assert read_res.status_code == 404
        assert read_res.json()["detail"] == "Deck Configuration not found"

    def test_delete_deck_config_not_found(self, client, deck_config_path):
        res = client.delete(f"{deck_config_path}/{uuid.uuid4()}")

        assert res.status_code == 404
        assert res.json()["detail"] == "Deck Configuration not found"
