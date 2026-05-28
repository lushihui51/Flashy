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
                "static_reveals": [key],
                "static_conceals": [key],
                "dynamic_reveals": [key],
                "dynamic_conceals": [key],
            }
        )

        res = client.post(deck_config_path, json=valid_create_deck_config_payload)

        assert res.status_code == 400
        assert res.json()["detail"] == "Duplicated deck fields"

    def test_create_deck_config_unknown_fields(
        self, client, deck_config_path, valid_create_deck_config_payload
    ):
        valid_create_deck_config_payload["static_reveals"] = ["__unknown_field__"]

        res = client.post(deck_config_path, json=valid_create_deck_config_payload)

        assert res.status_code == 400
        assert res.json()["detail"] == "Unknown deck fields"

    def test_create_deck_config_invalid_dynamic_reveal_quantities(
        self, client, deck_config_path, existing_deck, valid_create_deck_config_payload
    ):
        key = next(iter(existing_deck["deck_schema"]))
        valid_create_deck_config_payload["dynamic_reveals"] = [key]
        valid_create_deck_config_payload["dynamic_reveal_quantities"] = [2]

        res = client.post(deck_config_path, json=valid_create_deck_config_payload)

        assert res.status_code == 400
        assert res.json()["detail"] == "Invalid dynamic reveal quantity"

    def test_create_deck_config_invalid_dynamic_conceal_quantities(
        self, client, deck_config_path, existing_deck, valid_create_deck_config_payload
    ):
        key = next(iter(existing_deck["deck_schema"]))
        valid_create_deck_config_payload["dynamic_reveals"] = [
            key,
            key,
        ]  # len=2, still valid keys
        valid_create_deck_config_payload["dynamic_reveal_quantities"] = [
            0,
            1,
            2,
        ]  # passes reveal check, triggers conceal check
        valid_create_deck_config_payload["dynamic_conceals"] = [key]
        valid_create_deck_config_payload["dynamic_conceal_quantities"] = [0]

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
            "static_reveals": [key],
            "static_conceals": [],
            "dynamic_reveals": [],
            "dynamic_reveal_quantities": [],
            "dynamic_conceals": [],
            "dynamic_conceal_quantities": [],
        }
        res = client.patch(
            f"{deck_config_path}/{existing_deck_config['id']}", json=payload
        )

        assert res.status_code == 200, res.text
        body = res.json()
        assert body["id"] == existing_deck_config["id"]
        assert body["static_reveals"] == [key]

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
                "static_reveals": [key],
                "static_conceals": [key],
                "dynamic_reveals": [key],
                "dynamic_conceals": [key],
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

        valid_create_deck_config_payload["static_reveals"] = ["__unknown_field__"]

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
        valid_create_deck_config_payload["dynamic_reveals"] = [key]
        valid_create_deck_config_payload["dynamic_reveal_quantities"] = [2]

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
        valid_create_deck_config_payload["dynamic_reveals"] = [key, key]
        valid_create_deck_config_payload["dynamic_reveal_quantities"] = [2]
        valid_create_deck_config_payload["dynamic_conceals"] = [key]
        valid_create_deck_config_payload["dynamic_conceal_quantities"] = [0]

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
