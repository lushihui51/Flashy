import uuid

import pytest
from sqlmodel import select

from app.models.card import Card
from app.models.card_field_value import CardFieldValue
from app.models.field_def import FieldDef
from app.services.deck_copy import copy_deck
from app.services.deck_practice_config import validate_deck_practice_config


@pytest.fixture
def source_setup(client, existing_deck):
    """existing_deck (owned by existing_user), three fields, two cards with values for
    all three, and a config using one fixed field on each side plus a pool field."""
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

    config = client.post(
        "/api/deck_practice_configs",
        json={
            "deck_id": existing_deck["id"],
            "name": "Source Config",
            "prompt_field_ids": [front["id"]],
            "answer_field_ids": [back["id"]],
            "prompt_pool_ids": [extra["id"]],
            "prompt_pool_counts": [1],
            "answer_pool_ids": [],
            "answer_pool_counts": [],
        },
    )
    assert config.status_code == 201, config.text

    return {
        "deck": existing_deck,
        "front": front,
        "back": back,
        "extra": extra,
        "cards": [card1.json(), card2.json()],
        "config": config.json(),
    }


@pytest.fixture
def target_subject(client):
    response = client.post("/api/subjects", json={"name": "Target Subject"})
    assert response.status_code == 201, response.text
    return response.json()


def _new_deck_fields(db, deck_id: uuid.UUID) -> list[FieldDef]:
    return list(db.exec(select(FieldDef).where(FieldDef.deck_id == deck_id)).all())


def _new_deck_cards(db, deck_id: uuid.UUID) -> list[Card]:
    return list(db.exec(select(Card).where(Card.deck_id == deck_id)).all())


def _values_for_card(db, card_id: uuid.UUID) -> list[CardFieldValue]:
    return list(
        db.exec(select(CardFieldValue).where(CardFieldValue.card_id == card_id)).all()
    )


class TestCopyDeckContent:
    def test_copies_fields_cards_and_values_with_new_ids(
        self, db, existing_user, source_setup, target_subject
    ):
        source_deck_id = uuid.UUID(source_setup["deck"]["id"])
        target_subject_id = uuid.UUID(target_subject["id"])

        new_deck = copy_deck(db, existing_user.id, source_deck_id, target_subject_id)
        db.commit()

        assert new_deck.id != source_deck_id
        assert new_deck.subject_id == target_subject_id
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
        assert all(f.archived_at is None for f in new_fields)

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

    def test_does_not_copy_archived_field_or_its_values(
        self, db, client, existing_user, source_setup, target_subject
    ):
        archive_res = client.delete(f"/api/fields/{source_setup['extra']['id']}")
        assert archive_res.status_code == 200, archive_res.text

        new_deck = copy_deck(
            db,
            existing_user.id,
            uuid.UUID(source_setup["deck"]["id"]),
            uuid.UUID(target_subject["id"]),
        )
        db.commit()

        new_fields = _new_deck_fields(db, new_deck.id)
        assert {f.name for f in new_fields} == {"front", "back"}

        new_cards = _new_deck_cards(db, new_deck.id)
        for card in new_cards:
            values = _values_for_card(db, card.id)
            assert len(values) == 2  # not 3 — "extra"'s value wasn't copied

    def test_never_copies_review_log_or_mastery(
        self, db, existing_user, source_setup, target_subject
    ):
        from app.models.card_field_mastery import CardFieldMastery
        from app.models.review_log import ReviewLog

        new_deck = copy_deck(
            db,
            existing_user.id,
            uuid.UUID(source_setup["deck"]["id"]),
            uuid.UUID(target_subject["id"]),
        )
        db.commit()

        new_card_ids = [c.id for c in _new_deck_cards(db, new_deck.id)]
        assert not db.exec(
            select(ReviewLog).where(ReviewLog.card_id.in_(new_card_ids))
        ).all()
        assert not db.exec(
            select(CardFieldMastery).where(CardFieldMastery.card_id.in_(new_card_ids))
        ).all()


class TestCopyDeckPracticeConfig:
    def test_copied_config_resolves_only_to_new_deck_fields(
        self, db, existing_user, source_setup, target_subject
    ):
        source_deck_id = uuid.UUID(source_setup["deck"]["id"])
        source_field_ids = {
            source_setup["front"]["id"],
            source_setup["back"]["id"],
            source_setup["extra"]["id"],
        }

        new_deck = copy_deck(
            db,
            existing_user.id,
            source_deck_id,
            uuid.UUID(target_subject["id"]),
            deck_practice_config_ids=[uuid.UUID(source_setup["config"]["id"])],
        )
        db.commit()

        from app.models.deck_practice_config import DeckPracticeConfig

        new_configs = list(
            db.exec(
                select(DeckPracticeConfig).where(DeckPracticeConfig.deck_id == new_deck.id)
            ).all()
        )
        assert len(new_configs) == 1
        new_config = new_configs[0]
        assert new_config.id != uuid.UUID(source_setup["config"]["id"])
        assert new_config.name == source_setup["config"]["name"]

        all_referenced_ids = {
            *new_config.prompt_field_ids,
            *new_config.answer_field_ids,
            *new_config.prompt_pool_ids,
            *new_config.answer_pool_ids,
        }
        # The acceptance criterion: every id resolves to a field_def on the *new*
        # deck. A single id pointing back at the source deck is a failing test.
        assert all_referenced_ids.isdisjoint(
            {uuid.UUID(i) for i in source_field_ids}
        )
        validate_deck_practice_config(
            db,
            new_deck.id,
            new_config.prompt_field_ids,
            new_config.answer_field_ids,
            new_config.prompt_pool_ids,
            new_config.prompt_pool_counts,
            new_config.answer_pool_ids,
            new_config.answer_pool_counts,
        )  # raises if anything doesn't resolve on the new deck — must not raise

    def test_pool_counts_preserved(self, db, existing_user, source_setup, target_subject):
        new_deck = copy_deck(
            db,
            existing_user.id,
            uuid.UUID(source_setup["deck"]["id"]),
            uuid.UUID(target_subject["id"]),
            deck_practice_config_ids=[uuid.UUID(source_setup["config"]["id"])],
        )
        db.commit()

        from app.models.deck_practice_config import DeckPracticeConfig

        new_config = db.exec(
            select(DeckPracticeConfig).where(DeckPracticeConfig.deck_id == new_deck.id)
        ).first()
        assert new_config.prompt_pool_counts == [1]
        assert new_config.answer_pool_counts == []

    def test_no_configs_copied_when_not_requested(
        self, db, existing_user, source_setup, target_subject
    ):
        new_deck = copy_deck(
            db,
            existing_user.id,
            uuid.UUID(source_setup["deck"]["id"]),
            uuid.UUID(target_subject["id"]),
        )
        db.commit()

        from app.models.deck_practice_config import DeckPracticeConfig

        assert (
            db.exec(
                select(DeckPracticeConfig).where(DeckPracticeConfig.deck_id == new_deck.id)
            ).all()
            == []
        )

    def test_stale_config_rejected(self, db, client, existing_user, source_setup, target_subject):
        """The config's pool references 'extra'; archiving it after the config was
        saved makes the config stale — copy must not silently drop the id, it must
        refuse the whole copy."""
        client.delete(f"/api/fields/{source_setup['extra']['id']}")

        with pytest.raises(ValueError):
            copy_deck(
                db,
                existing_user.id,
                uuid.UUID(source_setup["deck"]["id"]),
                uuid.UUID(target_subject["id"]),
                deck_practice_config_ids=[uuid.UUID(source_setup["config"]["id"])],
            )
        db.rollback()

    def test_config_from_a_different_deck_rejected(
        self, db, existing_user, client, source_setup, target_subject
    ):
        # A config that legitimately belongs to a *different* deck than the one being
        # copied must be rejected, not silently accepted.
        other_deck = client.post(
            "/api/decks",
            json={
                "subject_id": target_subject["id"],
                "name": "Unrelated Deck",
                "field_defs": [{"name": "seed", "type": "text"}, {"name": "seed2", "type": "text"}],
                "cards": [],
            },
        )
        assert other_deck.status_code == 201, other_deck.text
        other_field = client.post(
            f"/api/decks/{other_deck.json()['id']}/fields",
            json={"name": "f1", "type": "text"},
        )
        other_field2 = client.post(
            f"/api/decks/{other_deck.json()['id']}/fields",
            json={"name": "f2", "type": "text"},
        )
        other_config = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": other_deck.json()["id"],
                "name": "Unrelated Config",
                "prompt_field_ids": [other_field.json()["id"]],
                "answer_field_ids": [other_field2.json()["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        )
        assert other_config.status_code == 201, other_config.text

        with pytest.raises(LookupError):
            copy_deck(
                db,
                existing_user.id,
                uuid.UUID(source_setup["deck"]["id"]),
                uuid.UUID(target_subject["id"]),
                deck_practice_config_ids=[uuid.UUID(other_config.json()["id"])],
            )
        db.rollback()


class TestCopyDeckErrors:
    def test_source_deck_not_found(self, db, existing_user, target_subject):
        with pytest.raises(LookupError):
            copy_deck(db, existing_user.id, uuid.uuid4(), uuid.UUID(target_subject["id"]))

    def test_target_subject_not_found(self, db, existing_user, source_setup):
        with pytest.raises(LookupError):
            copy_deck(db, existing_user.id, uuid.UUID(source_setup["deck"]["id"]), uuid.uuid4())

    def test_target_subject_not_owned_by_caller(
        self, db, existing_user, other_user, source_setup
    ):
        from app.models.subject import Subject

        foreign_subject = Subject(user_id=other_user.id, name="Not Yours")
        db.add(foreign_subject)
        db.commit()
        db.refresh(foreign_subject)

        with pytest.raises(LookupError):
            copy_deck(
                db, existing_user.id, uuid.UUID(source_setup["deck"]["id"]), foreign_subject.id
            )

    def test_deck_name_collision_on_target_subject_rejected(
        self, db, client, existing_user, source_setup, target_subject
    ):
        collide = client.post(
            "/api/decks",
            json={
                "subject_id": target_subject["id"],
                "name": source_setup["deck"]["name"],
                "field_defs": [{"name": "seed", "type": "text"}, {"name": "seed2", "type": "text"}],
                "cards": [],
            },
        )
        assert collide.status_code == 201, collide.text

        with pytest.raises(ValueError):
            copy_deck(
                db,
                existing_user.id,
                uuid.UUID(source_setup["deck"]["id"]),
                uuid.UUID(target_subject["id"]),
            )
        db.rollback()

    def test_failed_copy_leaves_no_partial_state(
        self, db, client, existing_user, source_setup, target_subject
    ):
        """Single transactional function: a failure partway through must roll back
        everything, not just the failed step."""
        client.delete(f"/api/fields/{source_setup['extra']['id']}")  # makes config stale

        with pytest.raises(ValueError):
            copy_deck(
                db,
                existing_user.id,
                uuid.UUID(source_setup["deck"]["id"]),
                uuid.UUID(target_subject["id"]),
                deck_practice_config_ids=[uuid.UUID(source_setup["config"]["id"])],
            )
        db.rollback()

        from app.models.deck import Deck

        decks_in_target = db.exec(
            select(Deck).where(Deck.subject_id == uuid.UUID(target_subject["id"]))
        ).all()
        assert decks_in_target == []  # the new deck, fields, and cards never persisted
