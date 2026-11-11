"""last_activity_at is the server-side recency sort key for every list of decks, cards
and configurations; the frontend never re-sorts. It equals created_at on insert and is
bumped, in the transaction of the write that caused it, by a row's own edits and by
activity below it. A card write, a create, an edit or a delete, reaches the deck, and an
edit of one card by id reaches the card. A configuration write reaches the
configuration and the deck. A field create, rename, reorder or delete reaches the deck.
A write over every card of a deck, a field created or deleted, moves no card."""

import uuid
from datetime import datetime


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def _make_deck(client) -> dict:
    response = client.post(
        "/api/decks",
        json={
            "name": f"Deck {uuid.uuid4()}",
            "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _field_ids(deck: dict) -> tuple[str, str]:
    return deck["field_defs"][0]["id"], deck["field_defs"][1]["id"]


def _make_card(client, deck: dict, front: str = "Bonjour") -> dict:
    front_id, back_id = _field_ids(deck)
    response = client.post(
        "/api/cards", json={"deck_id": deck["id"], "values": {front_id: front, back_id: "Hello"}}
    )
    assert response.status_code == 201, response.text
    return response.json()


def _config_payload(deck: dict, name: str = "Config") -> dict:
    front_id, back_id = _field_ids(deck)
    return {
        "deck_id": deck["id"],
        "name": name,
        "prompt_field_ids": [front_id],
        "answer_field_ids": [back_id],
        "prompt_pool_ids": [],
        "prompt_pool_counts": [],
        "answer_pool_ids": [],
        "answer_pool_counts": [],
    }


def _make_config(client, deck: dict, name: str = "Config") -> dict:
    response = client.post("/api/deck_practice_configs", json=_config_payload(deck, name))
    assert response.status_code == 201, response.text
    return response.json()


def _card_stamps(client, deck: dict) -> dict[str, datetime]:
    cards = client.get("/api/cards", params={"deck_id": deck["id"]}).json()
    return {card["id"]: _parse(card["last_activity_at"]) for card in cards}


class TestTimestampsOnInsert:
    def test_deck_timestamps_equal_created_at_on_insert(self, client):
        response = client.post(
            "/api/decks",
            json={
                "name": "Fresh Deck",
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        )
        data = response.json()
        assert _parse(data["created_at"]) == _parse(data["last_activity_at"])

    def test_card_and_configuration_timestamps_equal_created_at_on_insert(self, client):
        deck = _make_deck(client)
        card = _make_card(client, deck)
        assert _parse(card["created_at"]) == _parse(card["last_activity_at"])
        config = _make_config(client, deck)
        assert _parse(config["created_at"]) == _parse(config["last_activity_at"])


class TestOwnColumnEdit:
    def test_deck_edit_bumps_last_activity(self, client):
        created = client.post(
            "/api/decks",
            json={
                "name": "Original Name",
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        ).json()

        response = client.patch(f"/api/decks/{created['id']}", json={"name": "Renamed"})
        data = response.json()
        assert _parse(data["last_activity_at"]) > _parse(created["last_activity_at"])


class TestFieldWritesTouchDeck:
    def _deck(self, client, **field_overrides):
        field_defs = [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}]
        return client.post(
            "/api/decks",
            json={
                "name": f"Field Test Deck {uuid.uuid4()}",
                "field_defs": field_defs,
            },
        ).json()

    def test_field_create_touches_deck_last_activity(self, client):
        deck = self._deck(client)
        client.post(f"/api/decks/{deck['id']}/fields", json={"name": "Extra", "type": "text"})
        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(deck["last_activity_at"])

    def test_field_rename_touches_deck_last_activity(self, client):
        deck = self._deck(client)
        field_id = deck["field_defs"][0]["id"]
        client.patch(f"/api/fields/{field_id}", json={"name": "Renamed"})
        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(deck["last_activity_at"])

    def test_field_delete_touches_deck_last_activity(self, client):
        deck = self._deck(client)
        client.post(f"/api/decks/{deck['id']}/fields", json={"name": "Extra", "type": "text"})
        before = client.get(f"/api/decks/{deck['id']}").json()

        field_id = deck["field_defs"][0]["id"]
        client.delete(f"/api/fields/{field_id}")

        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(before["last_activity_at"])

    def test_field_reorder_touches_deck_last_activity(self, client):
        deck = self._deck(client)
        ids = [fd["id"] for fd in deck["field_defs"]]
        client.post(f"/api/decks/{deck['id']}/fields/reorder", json=list(reversed(ids)))
        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(deck["last_activity_at"])


class TestCardWritesTouchDeck:
    def _deck_and_field(self, client):
        deck = client.post(
            "/api/decks",
            json={
                "name": f"Card Test Deck {uuid.uuid4()}",
                "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
            },
        ).json()
        return deck, deck["field_defs"][0]["id"], deck["field_defs"][1]["id"]

    def test_card_create_touches_deck_last_activity(self, client):
        deck, front_id, back_id = self._deck_and_field(client)
        client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        )
        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(deck["last_activity_at"])

    def test_card_patch_touches_deck_last_activity(self, client):
        deck, front_id, back_id = self._deck_and_field(client)
        card = client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()
        before = client.get(f"/api/decks/{deck['id']}").json()

        client.patch(f"/api/cards/{card['id']}", json={"values": {front_id: "Salut"}})

        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(before["last_activity_at"])

    def test_card_delete_touches_deck_last_activity(self, client):
        deck, front_id, back_id = self._deck_and_field(client)
        card = client.post(
            "/api/cards",
            json={"deck_id": deck["id"], "values": {front_id: "Bonjour", back_id: "Hello"}},
        ).json()
        before = client.get(f"/api/decks/{deck['id']}").json()

        client.delete(f"/api/cards/{card['id']}")

        after = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(before["last_activity_at"])


class TestCardWritesTouchCard:
    def test_card_patch_bumps_card(self, client):
        deck = _make_deck(client)
        front_id, _ = _field_ids(deck)
        card = _make_card(client, deck)

        response = client.patch(f"/api/cards/{card['id']}", json={"values": {front_id: "Salut"}})
        assert response.status_code == 200, response.text

        after = client.get(f"/api/cards/{card['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(card["last_activity_at"])

    def test_batch_edit_card_update_bumps_card(self, client):
        deck = _make_deck(client)
        _, back_id = _field_ids(deck)
        card = _make_card(client, deck)

        response = client.patch(
            f"/api/decks/{deck['id']}",
            json={
                "cards": {
                    "create": [],
                    "update": [{"id": card["id"], "values": {back_id: "Salut"}}],
                    "delete": [],
                }
            },
        )
        assert response.status_code == 200, response.text

        after = client.get(f"/api/cards/{card['id']}").json()
        assert _parse(after["last_activity_at"]) > _parse(card["last_activity_at"])

    def test_field_create_leaves_every_card(self, client):
        deck = _make_deck(client)
        _make_card(client, deck, "A")
        _make_card(client, deck, "B")
        before = _card_stamps(client, deck)

        response = client.post(
            f"/api/decks/{deck['id']}/fields", json={"name": "Extra", "type": "text"}
        )
        assert response.status_code == 201, response.text

        assert _card_stamps(client, deck) == before

    def test_field_delete_leaves_every_remaining_card(self, client):
        deck = _make_deck(client)
        extra = client.post(
            f"/api/decks/{deck['id']}/fields", json={"name": "Extra", "type": "text"}
        ).json()
        _make_card(client, deck, "A")
        _make_card(client, deck, "B")
        before = _card_stamps(client, deck)

        response = client.delete(f"/api/fields/{extra['id']}")
        assert response.status_code == 204, response.text

        assert _card_stamps(client, deck) == before


class TestConfigurationWrites:
    def test_configuration_patch_bumps_configuration_and_deck(self, client):
        deck = _make_deck(client)
        config = _make_config(client, deck)
        before_deck = client.get(f"/api/decks/{deck['id']}").json()

        response = client.patch(
            f"/api/deck_practice_configs/{config['id']}", json={"name": "Renamed"}
        )
        assert response.status_code == 200, response.text

        after_config = client.get(f"/api/deck_practice_configs/{config['id']}").json()
        after_deck = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after_config["last_activity_at"]) > _parse(config["last_activity_at"])
        assert _parse(after_deck["last_activity_at"]) > _parse(before_deck["last_activity_at"])

    def test_configuration_create_bumps_deck(self, client):
        deck = _make_deck(client)
        before_deck = client.get(f"/api/decks/{deck['id']}").json()

        _make_config(client, deck)

        after_deck = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after_deck["last_activity_at"]) > _parse(before_deck["last_activity_at"])

    def test_configuration_delete_bumps_deck(self, client):
        deck = _make_deck(client)
        config = _make_config(client, deck)
        before_deck = client.get(f"/api/decks/{deck['id']}").json()

        response = client.delete(f"/api/deck_practice_configs/{config['id']}")
        assert response.status_code == 204, response.text

        after_deck = client.get(f"/api/decks/{deck['id']}").json()
        assert _parse(after_deck["last_activity_at"]) > _parse(before_deck["last_activity_at"])


class TestRecencyOrdering:
    def test_deck_list_ordered_by_last_activity_desc(self, client):
        payload = lambda name: {  # noqa: E731
            "name": name,
            "field_defs": [{"name": "Front", "type": "text"}, {"name": "Back", "type": "text"}],
        }
        first = client.post("/api/decks", json=payload("First Deck")).json()
        second = client.post("/api/decks", json=payload("Second Deck")).json()

        client.patch(f"/api/decks/{first['id']}", json={"name": "First Deck Renamed"})

        ids = [d["id"] for d in client.get("/api/decks").json()]
        assert ids.index(first["id"]) < ids.index(second["id"])

    def test_deck_cards_ordered_by_last_activity_desc(self, client):
        deck = _make_deck(client)
        front_id, _ = _field_ids(deck)
        first = _make_card(client, deck, "A")
        second = _make_card(client, deck, "B")
        third = _make_card(client, deck, "C")

        response = client.patch(f"/api/cards/{first['id']}", json={"values": {front_id: "A2"}})
        assert response.status_code == 200, response.text

        ids = [c["id"] for c in client.get("/api/cards", params={"deck_id": deck["id"]}).json()]
        assert ids == [first["id"], third["id"], second["id"]]

    def test_configurations_ordered_by_deck_recency_then_own(self, client):
        first_deck = _make_deck(client)
        first_a = _make_config(client, first_deck, "First A")
        first_b = _make_config(client, first_deck, "First B")
        second_deck = _make_deck(client)
        second_a = _make_config(client, second_deck, "Second A")
        second_b = _make_config(client, second_deck, "Second B")

        response = client.patch(
            f"/api/deck_practice_configs/{first_a['id']}", json={"name": "First A renamed"}
        )
        assert response.status_code == 200, response.text

        ids = [c["id"] for c in client.get("/api/deck_practice_configs").json()]
        assert ids == [first_a["id"], first_b["id"], second_b["id"], second_a["id"]]

    def test_deck_configurations_ordered_by_last_activity_desc(self, client):
        deck = _make_deck(client)
        first = _make_config(client, deck, "First")
        second = _make_config(client, deck, "Second")

        response = client.patch(
            f"/api/deck_practice_configs/{first['id']}", json={"name": "First renamed"}
        )
        assert response.status_code == 200, response.text

        response = client.get("/api/deck_practice_configs", params={"deck_id": deck["id"]})
        assert [c["id"] for c in response.json()] == [first["id"], second["id"]]
