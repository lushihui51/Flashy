"""A fixture with two users; every endpoint returns 404 (not 403) for the other user's
resources, because ownership is enforced in the query, not by fetching then checking
in Python."""

import uuid

import pytest


@pytest.fixture
def owned(client, existing_deck, existing_field_defs, existing_card):
    """A full resource tree built as existing_user (the default client identity):
    deck -> field_defs -> card, plus a practice of the deck and its started run with a
    rateable current card."""
    practice_res = client.post("/api/practices", json={"deck_ids": [existing_deck["id"]]})
    assert practice_res.status_code == 201, practice_res.text
    practice = practice_res.json()

    run_res = client.post(f"/api/practices/{practice['id']}/runs")
    assert run_res.status_code == 200, run_res.text
    run = run_res.json()

    state_res = client.get(f"/api/runs/{run['id']}/state")
    assert state_res.status_code == 200, state_res.text
    current_card = state_res.json()["current_card"]
    assert current_card is not None

    return {
        "deck": existing_deck,
        "field_defs": existing_field_defs,
        "card": existing_card,
        "practice": practice,
        "run": run,
        "current_card": current_card,
    }


class TestForeignResourcesAreNotFound:
    def test_deck_endpoints(self, client, other_user, act_as, owned):
        act_as(other_user)
        deck_id = owned["deck"]["id"]

        assert client.get(f"/api/decks/{deck_id}").status_code == 404
        assert client.patch(f"/api/decks/{deck_id}", json={"name": "x"}).status_code == 404
        assert client.delete(f"/api/decks/{deck_id}").status_code == 404

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

    def test_practice_endpoints(self, client, other_user, act_as, owned):
        deck_id = owned["deck"]["id"]
        practice_id = owned["practice"]["id"]
        [asked] = client.get(f"/api/practices/{practice_id}").json()["configurations"]
        act_as(other_user)

        assert client.post("/api/practices", json={"deck_ids": [deck_id]}).status_code == 404
        assert (
            client.get(
                "/api/practices/suggested-name", params={"deck_ids": [deck_id]}
            ).status_code
            == 404
        )
        assert client.get(f"/api/practices/{practice_id}").status_code == 404
        assert client.post(f"/api/practices/{practice_id}/runs").status_code == 404
        assert (
            client.patch(f"/api/practices/{practice_id}", json={"name": "x"}).status_code == 404
        )
        assert (
            client.put(
                f"/api/practices/{practice_id}/configurations/{deck_id}", json=asked
            ).status_code
            == 404
        )
        assert client.delete(f"/api/practices/{practice_id}").status_code == 404

    def test_run_endpoints(self, client, other_user, act_as, owned):
        run_id = owned["run"]["id"]
        current_card_id = owned["current_card"]["run_card_id"]
        card_id = owned["card"]["id"]
        act_as(other_user)

        assert client.get(f"/api/runs/{run_id}").status_code == 404
        assert client.get(f"/api/runs/{run_id}/state").status_code == 404
        assert client.get(f"/api/runs/{run_id}/breakdown").status_code == 404
        assert client.post(f"/api/runs/{run_id}/rerun").status_code == 404
        assert client.post(f"/api/runs/{run_id}/end").status_code == 404
        assert (
            client.post(
                f"/api/runs/{run_id}/chosen_cards", json={"card_ids": [card_id]}
            ).status_code
            == 404
        )
        assert (
            client.post(f"/api/run_cards/{current_card_id}/rate", json={"ratings": {}}).status_code
            == 404
        )

    def test_list_endpoints_do_not_leak_across_users(self, client, other_user, act_as, owned):
        """Not a 404 case (lists aren't by-id), but the same invariant: the other
        user's resources must not appear."""
        act_as(other_user)

        assert client.get("/api/decks").json() == []
        assert client.get("/api/practices").json() == []
        assert client.get("/api/home").json() == {
            "steps": {
                "has_deck": False,
                "has_card": False,
            },
            "active_runs": [],
            "recent_runs": [],
        }


class TestOwnerStillHasAccess:
    """Sanity check the scoping isn't accidentally blocking the actual owner too."""

    def test_owner_can_still_read_everything(self, client, owned):
        assert client.get(f"/api/decks/{owned['deck']['id']}").status_code == 200
        assert client.get(f"/api/cards/{owned['card']['id']}").status_code == 200
        assert client.get(f"/api/practices/{owned['practice']['id']}").status_code == 200
        assert client.get(f"/api/runs/{owned['run']['id']}").status_code == 200
        assert client.get(f"/api/runs/{owned['run']['id']}/state").status_code == 200

    def test_another_users_end_leaves_the_run_active(
        self, client, existing_user, other_user, act_as, owned
    ):
        act_as(other_user)
        assert client.post(f"/api/runs/{owned['run']['id']}/end").status_code == 404
        act_as(existing_user)

        assert client.get(f"/api/runs/{owned['run']['id']}").json()["status"] == "active"


def test_unauthenticated_request_is_rejected(client):
    """Clears the test's dependency-override bypass so the request hits the real
    get_current_app_user — with no Authorization header, it must 401, not 404 or 500."""
    from app.dependencies import get_current_app_user
    from app.main import app

    app.dependency_overrides.pop(get_current_app_user, None)
    response = client.get(f"/api/decks/{uuid.uuid4()}")
    assert response.status_code == 401
