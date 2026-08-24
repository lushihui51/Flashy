"""Phase 5 acceptance test: a fixture with two users; every endpoint returns 404 (not
403) for the other user's resources, because ownership is enforced in the query, not
by fetching then checking in Python."""

import uuid

import pytest


@pytest.fixture
def owned(client, existing_subject, existing_deck, existing_field_defs, existing_card):
    """A full resource tree built as existing_user (the default client identity):
    subject -> deck -> field_defs -> card, plus a deck_practice_config and a started
    practice_session with a rateable current card."""
    field_ids = [fd["id"] for fd in existing_field_defs]
    config_res = client.post(
        "/api/deck_practice_configs",
        json={
            "deck_id": existing_deck["id"],
            "name": "Owner Config",
            "prompt_field_ids": [field_ids[0]],
            "answer_field_ids": [field_ids[1]],
            "prompt_pool_ids": [],
            "prompt_pool_counts": [],
            "answer_pool_ids": [],
            "answer_pool_counts": [],
        },
    )
    assert config_res.status_code == 201, config_res.text
    config = config_res.json()

    session_res = client.post(
        "/api/practice_sessions", json={"deck_practice_config_ids": [config["id"]]}
    )
    assert session_res.status_code == 201, session_res.text
    session = session_res.json()

    current_card_res = client.get(f"/api/practice_sessions/{session['id']}/current_card")
    assert current_card_res.status_code == 200, current_card_res.text
    current_card = current_card_res.json()

    return {
        "subject": existing_subject,
        "deck": existing_deck,
        "field_defs": existing_field_defs,
        "card": existing_card,
        "config": config,
        "session": session,
        "current_card": current_card,
    }


class TestForeignResourcesAreNotFound:
    def test_subject_endpoints(self, client, other_user, act_as, owned):
        act_as(other_user)
        subject_id = owned["subject"]["id"]

        assert client.get(f"/api/subjects/{subject_id}").status_code == 404
        assert (
            client.patch(f"/api/subjects/{subject_id}", json={"name": "x"}).status_code
            == 404
        )
        assert client.delete(f"/api/subjects/{subject_id}").status_code == 404

    def test_deck_endpoints(self, client, other_user, act_as, owned):
        act_as(other_user)
        deck_id = owned["deck"]["id"]

        assert client.get(f"/api/decks/{deck_id}").status_code == 404
        assert client.patch(f"/api/decks/{deck_id}", json={"name": "x"}).status_code == 404
        assert client.delete(f"/api/decks/{deck_id}").status_code == 404

    def test_deck_create_with_foreign_subject_id_not_found(self, client, other_user, act_as, owned):
        act_as(other_user)
        response = client.post(
            "/api/decks",
            json={
                "subject_id": owned["subject"]["id"],
                "name": "Intruder",
                "field_defs": [{"name": "Front", "type": "text"}],
                "cards": [],
            },
        )
        assert response.status_code == 422

    def test_field_def_endpoints(self, client, other_user, act_as, owned):
        deck_id = owned["deck"]["id"]
        field_id = owned["field_defs"][0]["id"]
        act_as(other_user)

        assert client.get(f"/api/decks/{deck_id}/fields").status_code == 404
        assert (
            client.post(
                f"/api/decks/{deck_id}/fields", json={"name": "intruder", "type": "text"}
            ).status_code
            == 404
        )
        assert (
            client.post(f"/api/decks/{deck_id}/fields/reorder", json=[field_id]).status_code
            == 404
        )
        assert client.get(f"/api/fields/{field_id}").status_code == 404
        assert client.patch(f"/api/fields/{field_id}", json={"name": "x"}).status_code == 404
        assert client.delete(f"/api/fields/{field_id}").status_code == 404
        assert client.delete(f"/api/fields/{field_id}/hard").status_code == 404

    def test_card_endpoints(self, client, other_user, act_as, owned):
        deck_id = owned["deck"]["id"]
        card_id = owned["card"]["id"]
        field_ids = [fd["id"] for fd in owned["field_defs"]]
        act_as(other_user)

        assert (
            client.post(
                "/api/cards",
                json={"deck_id": deck_id, "values": {fid: "v" for fid in field_ids}},
            ).status_code
            == 404
        )
        assert client.get(f"/api/cards/{card_id}").status_code == 404
        assert (
            client.patch(f"/api/cards/{card_id}", json={"values": {}}).status_code == 404
        )
        assert client.delete(f"/api/cards/{card_id}").status_code == 404

    def test_deck_practice_config_endpoints(self, client, other_user, act_as, owned):
        deck_id = owned["deck"]["id"]
        config_id = owned["config"]["id"]
        field_ids = [fd["id"] for fd in owned["field_defs"]]
        act_as(other_user)

        assert (
            client.post(
                "/api/deck_practice_configs",
                json={
                    "deck_id": deck_id,
                    "name": "Intruder Config",
                    "prompt_field_ids": [field_ids[0]],
                    "answer_field_ids": [field_ids[1]],
                    "prompt_pool_ids": [],
                    "prompt_pool_counts": [],
                    "answer_pool_ids": [],
                    "answer_pool_counts": [],
                },
            ).status_code
            == 404
        )
        assert client.get("/api/deck_practice_configs", params={"deck_id": deck_id}).json() == []
        assert client.get(f"/api/deck_practice_configs/{config_id}").status_code == 404
        assert (
            client.patch(
                f"/api/deck_practice_configs/{config_id}", json={"name": "x"}
            ).status_code
            == 404
        )
        assert client.delete(f"/api/deck_practice_configs/{config_id}").status_code == 404

    def test_practice_session_endpoints(self, client, other_user, act_as, owned):
        config_id = owned["config"]["id"]
        session_id = owned["session"]["id"]
        current_card_id = owned["current_card"]["id"]
        act_as(other_user)

        assert (
            client.post(
                "/api/practice_sessions", json={"deck_practice_config_ids": [config_id]}
            ).status_code
            == 404
        )
        assert client.get(f"/api/practice_sessions/{session_id}").status_code == 404
        assert (
            client.get(f"/api/practice_sessions/{session_id}/current_card").status_code
            == 404
        )
        assert (
            client.post(
                f"/api/practice_cards/{current_card_id}/rate", json={"ratings": {}}
            ).status_code
            == 404
        )

    def test_list_endpoints_do_not_leak_across_users(self, client, other_user, act_as, owned):
        """Not a 404 case (lists aren't by-id), but the same invariant: the other
        user's resources must not appear."""
        deck_id = owned["deck"]["id"]
        act_as(other_user)

        assert client.get("/api/subjects").json() == []
        assert client.get("/api/decks", params={"subject_id": deck_id}).json() == []


class TestOwnerStillHasAccess:
    """Sanity check the scoping isn't accidentally blocking the actual owner too."""

    def test_owner_can_still_read_everything(self, client, owned):
        assert client.get(f"/api/subjects/{owned['subject']['id']}").status_code == 200
        assert client.get(f"/api/decks/{owned['deck']['id']}").status_code == 200
        assert client.get(f"/api/cards/{owned['card']['id']}").status_code == 200
        assert (
            client.get(f"/api/deck_practice_configs/{owned['config']['id']}").status_code
            == 200
        )
        assert client.get(f"/api/practice_sessions/{owned['session']['id']}").status_code == 200


def test_unauthenticated_request_is_rejected(client):
    """Clears the test's dependency-override bypass so the request hits the real
    get_current_app_user — with no Authorization header, it must 401, not 404 or 500."""
    from app.dependencies import get_current_app_user
    from app.main import app

    app.dependency_overrides.pop(get_current_app_user, None)
    response = client.get(f"/api/subjects/{uuid.uuid4()}")
    assert response.status_code == 401
