class TestCardCRUD:
    def test_create_card(self, client, card_path, existing_deck):
        response = client.post(
            card_path,
            json={
                "deck_id": existing_deck["id"],
                "fields": {"front": "Create Test Front", "back": "Create Test Back"},
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["deck_id"] == existing_deck["id"]
        assert data["fields"] == {
            "front": "Create Test Front",
            "back": "Create Test Back",
        }
        assert "id" in data
        assert "last_modified" in data

    def test_read_card(self, client, card_path, existing_card):
        card_id = existing_card["id"]

        response = client.get(f"{card_path}/{card_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == card_id
        assert data["deck_id"] == existing_card["deck_id"]
        assert data["fields"] == {"front": "Q", "back": "A"}

    def test_update_card(self, client, card_path, existing_card, existing_deck):
        card_id = existing_card["id"]

        response = client.put(
            f"{card_path}/{card_id}",
            json={
                "deck_id": existing_deck["id"],
                "fields": {"front": "Updated Front", "back": "Updated Back"},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == card_id
        assert data["deck_id"] == existing_deck["id"]
        assert data["fields"] == {
            "front": "Updated Front",
            "back": "Updated Back",
        }

    def test_delete_card(self, client, card_path, existing_card):
        card_id = existing_card["id"]

        response = client.delete(f"{card_path}/{card_id}")
        assert response.status_code == 204

        get_response = client.get(f"{card_path}/{card_id}")
        assert get_response.status_code == 404
