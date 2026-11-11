import uuid

import pytest
from sqlmodel import select

from app.models.card import Card
from app.models.card_field_value import CardFieldValue
from app.models.deck import Deck
from app.models.field_def import FieldDef
from app.models.practice_configuration import PracticeConfiguration
from app.services.deck_copy import copy_deck


@pytest.fixture
def source_setup(client, existing_deck):
    """existing_deck (owned by existing_user), three fields, two cards with values for
    all three, and a practice of the deck."""
    front = client.post(
        f"/api/decks/{existing_deck['id']}/fields", json={"name": "front", "type": "text"}
    )
    back = client.post(
        f"/api/decks/{existing_deck['id']}/fields", json={"name": "back", "type": "text"}
    )
    extra = client.post(
        f"/api/decks/{existing_deck['id']}/fields", json={"name": "extra", "type": "text"}
    )
    assert front.status_code == 201, front.text
    assert back.status_code == 201, back.text
    assert extra.status_code == 201, extra.text
    front, back, extra = front.json(), back.json(), extra.json()

    values1 = {front["id"]: "F1", back["id"]: "B1", extra["id"]: "E1"}
    card1 = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values1})
    assert card1.status_code == 201, card1.text
    values2 = {front["id"]: "F2", back["id"]: "B2", extra["id"]: "E2"}
    card2 = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values2})
    assert card2.status_code == 201, card2.text

    practice = client.post("/api/practices", json={"deck_ids": [existing_deck["id"]]})
    assert practice.status_code == 201, practice.text

    return {
        "deck": existing_deck,
        "front": front,
        "back": back,
        "extra": extra,
        "cards": [card1.json(), card2.json()],
        "practice": practice.json(),
    }


def _new_deck_fields(db, deck_id: uuid.UUID) -> list[FieldDef]:
    return list(db.exec(select(FieldDef).where(FieldDef.deck_id == deck_id)).all())


def _new_deck_cards(db, deck_id: uuid.UUID) -> list[Card]:
    return list(db.exec(select(Card).where(Card.deck_id == deck_id)).all())


def _values_for_card(db, card_id: uuid.UUID) -> list[CardFieldValue]:
    return list(
        db.exec(select(CardFieldValue).where(CardFieldValue.card_id == card_id)).all()
    )


def _decks_of(db, user_id: uuid.UUID) -> list[Deck]:
    return list(db.exec(select(Deck).where(Deck.user_id == user_id)).all())


class TestCopyDeckContent:
    """other_user copies existing_user's deck: the copy lands among other_user's own
    decks, under the source's name."""

    def test_copies_fields_cards_and_values_into_a_new_deck_of_the_caller(
        self, db, other_user, source_setup
    ):
        source_deck_id = uuid.UUID(source_setup["deck"]["id"])
        caller_id = other_user.id

        new_deck = copy_deck(db, caller_id, source_deck_id)

        assert new_deck.id != source_deck_id
        assert new_deck.user_id == caller_id
        assert new_deck.name == source_setup["deck"]["name"]

        new_fields = _new_deck_fields(db, new_deck.id)
        source_field_ids = {
            source_setup["front"]["id"],
            source_setup["back"]["id"],
            source_setup["extra"]["id"],
        }
        assert len(new_fields) == 3
        assert {str(f.id) for f in new_fields}.isdisjoint(source_field_ids)
        assert {f.name for f in new_fields} == {"front", "back", "extra"}
        assert {f.position for f in new_fields} == {
            source_setup["front"]["position"],
            source_setup["back"]["position"],
            source_setup["extra"]["position"],
        }

        new_cards = _new_deck_cards(db, new_deck.id)
        source_card_ids = {c["id"] for c in source_setup["cards"]}
        assert len(new_cards) == 2
        assert {str(c.id) for c in new_cards}.isdisjoint(source_card_ids)

        new_field_ids_by_name = {f.name: f.id for f in new_fields}
        for card in new_cards:
            values = _values_for_card(db, card.id)
            assert len(values) == 3
            assert {v.field_def_id for v in values} == set(new_field_ids_by_name.values())
            # values themselves carried over unchanged
            assert {v.value for v in values} <= {"F1", "B1", "E1", "F2", "B2", "E2"}

    def test_does_not_copy_a_deleted_field_or_its_values(
        self, db, client, other_user, source_setup
    ):
        delete_res = client.delete(f"/api/fields/{source_setup['extra']['id']}")
        assert delete_res.status_code == 204, delete_res.text

        new_deck = copy_deck(db, other_user.id, uuid.UUID(source_setup["deck"]["id"]))

        new_fields = _new_deck_fields(db, new_deck.id)
        assert {f.name for f in new_fields} == {"front", "back"}

        new_cards = _new_deck_cards(db, new_deck.id)
        for card in new_cards:
            values = _values_for_card(db, card.id)
            assert len(values) == 2  # not 3 — "extra"'s value wasn't copied

    def test_never_copies_a_configuration(self, db, other_user, source_setup):
        new_deck = copy_deck(db, other_user.id, uuid.UUID(source_setup["deck"]["id"]))

        assert (
            db.exec(
                select(PracticeConfiguration).where(
                    PracticeConfiguration.deck_id == new_deck.id
                )
            ).all()
            == []
        )

    def test_never_copies_review_log_or_mastery(self, db, other_user, source_setup):
        from app.models.mastery_log import MasteryLog
        from app.models.review_log import ReviewLog

        new_deck = copy_deck(db, other_user.id, uuid.UUID(source_setup["deck"]["id"]))

        new_card_ids = [c.id for c in _new_deck_cards(db, new_deck.id)]
        assert not db.exec(
            select(ReviewLog).where(ReviewLog.card_id.in_(new_card_ids))
        ).all()
        assert not db.exec(
            select(MasteryLog).where(MasteryLog.card_id.in_(new_card_ids))
        ).all()


class TestCopyDeckErrors:
    def test_source_deck_not_found(self, db, other_user):
        with pytest.raises(LookupError):
            copy_deck(db, other_user.id, uuid.uuid4())

    def test_a_name_the_callers_decks_hold_is_refused_and_rolled_back(
        self, db, client, act_as, other_user, source_setup
    ):
        """The copy takes the source's name, and a deck's name is unique among its
        user's decks: when the caller already has a deck of that name, the copy raises
        and leaves nothing written, the new deck, fields and cards included."""
        caller_id = other_user.id
        act_as(other_user)
        collide = client.post(
            "/api/decks",
            json={
                "name": source_setup["deck"]["name"],
                "field_defs": [{"name": "seed", "type": "text"}, {"name": "seed2", "type": "text"}],
            },
        )
        assert collide.status_code == 201, collide.text

        with pytest.raises(ValueError, match="A deck with this name already exists"):
            copy_deck(db, caller_id, uuid.UUID(source_setup["deck"]["id"]))

        assert [str(d.id) for d in _decks_of(db, caller_id)] == [collide.json()["id"]]

    def test_copying_ones_own_deck_clashes_with_it(self, db, existing_user, source_setup):
        owner_id = existing_user.id
        with pytest.raises(ValueError):
            copy_deck(db, owner_id, uuid.UUID(source_setup["deck"]["id"]))

        assert [str(d.id) for d in _decks_of(db, owner_id)] == [source_setup["deck"]["id"]]
