import random
import uuid

from sqlmodel import Session, col, select

from app.models.card import Card
from app.models.deck_config import DeckConfig
from app.models.practice_card import PracticeCard
from app.models.practice_session import PracticeSession


def db_create_practice_cards(
    db: Session, deck_config: DeckConfig, practice_session_id: uuid.UUID
):
    gap = 1 << 40
    curr_position = 1
    cards = list(db.exec(select(Card).where(Card.deck_id == deck_config.deck_id)).all())
    random.shuffle(cards)

    for card in cards:
        position = curr_position * gap
        static_reveals, static_conceals, dynamic_reveals, dynamic_conceals = (
            dict(),
            dict(),
            dict(),
            dict(),
        )
        for key in deck_config.static_reveals:
            static_reveals[key] = card.fields[key]
        for key in deck_config.static_conceals:
            static_conceals[key] = card.fields[key]

        if (
            len(deck_config.dynamic_reveal_quantity) > 0
            and len(deck_config.dynamic_reveals) > 0
        ):
            num_revealed = random.choice(deck_config.dynamic_reveal_quantity)
            fields_revealed = random.sample(deck_config.dynamic_reveals, num_revealed)
            for key in fields_revealed:
                dynamic_reveals[key] = card.fields[key]
        if (
            len(deck_config.dynamic_conceal_quantity) > 0
            and len(deck_config.dynamic_conceals) > 0
        ):
            num_concealed = random.choice(deck_config.dynamic_conceal_quantity)
            fields_concealed = random.sample(
                deck_config.dynamic_conceals, num_concealed
            )
            for key in fields_concealed:
                dynamic_conceals[key] = card.fields[key]

        practice_card = PracticeCard(
            card_id=card.id,
            practice_session_id=practice_session_id,
            position=position,
            static_reveals=static_reveals,
            static_conceals=static_conceals,
            dynamic_reveals=dynamic_reveals,
            dynamic_conceals=dynamic_conceals,
        )

        db.add(practice_card)
        curr_position += 1

    db.commit()


def db_read_practice_card(
    db: Session, practice_session: PracticeSession, forward: bool
) -> PracticeCard | None:

    if forward:
        practice_card = db.exec(
            select(PracticeCard)
            .where(PracticeCard.practice_session_id == practice_session.id)
            .where(PracticeCard.position > practice_session.curr)
            .order_by(col(PracticeCard.position))
            .limit(1)
        ).first()
        if practice_card:
            practice_session.curr = practice_card.position

    else:
        practice_card = db.exec(
            select(PracticeCard)
            .where(PracticeCard.practice_session_id == practice_session.id)
            .where(PracticeCard.position < practice_session.curr)
            .order_by(col(PracticeCard.position).desc())
            .limit(1)
        ).first()
        if practice_card:
            practice_session.curr = practice_card.position

    db.add(practice_session)
    db.commit()
    db.refresh(practice_session)
    return practice_card
