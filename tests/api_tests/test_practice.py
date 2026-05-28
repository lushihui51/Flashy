from sqlmodel import select

from app.models.practice_card import PracticeCard


class TestPractice:
    def test_create_session_basic(self, client, practice_path, existing_deck_config):
        response = client.post(
            practice_path, json={"deck_config_ids": [existing_deck_config["id"]]}
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["curr"] == -1

    def test_read_practice_cards_forward(
        self, client, practice_path, existing_practice_session
    ):
        response = client.get(
            f"{practice_path}/{existing_practice_session['id']}/practice_card?forward=True"
        )
        assert response.status_code == 200

        response1 = client.get(
            f"{practice_path}/{existing_practice_session['id']}/practice_card?forward=True"
        )
        assert response1.status_code == 404

    def test_read_practice_cards_backward(
        self, db, client, practice_path, existing_practice_session
    ):
        card_id = db.exec(
            select(PracticeCard.card_id).where(
                PracticeCard.practice_session_id == existing_practice_session["id"]
            )
        ).first()
        new_practice_card = PracticeCard(
            card_id=card_id,
            practice_session_id=existing_practice_session["id"],
            position=(1 << 40) * 2,
            static_reveals=dict(),
            static_conceals=dict(),
            dynamic_reveals=dict(),
            dynamic_conceals=dict(),
        )

        db.add(new_practice_card)
        db.commit()
        db.refresh(new_practice_card)

        # 0
        response = client.get(
            f"{practice_path}/{existing_practice_session['id']}/practice_card?forward=True"
        )
        assert response.status_code == 200

        # "1"
        response1 = client.get(
            f"{practice_path}/{existing_practice_session['id']}/practice_card?forward=True"
        )
        assert response1.status_code == 200

        # "2"
        response2 = client.get(
            f"{practice_path}/{existing_practice_session['id']}/practice_card?forward=False"
        )
        assert response2.status_code == 200

        # "1"
        response3 = client.get(
            f"{practice_path}/{existing_practice_session['id']}/practice_card?forward=False"
        )
        assert response3.status_code == 404
