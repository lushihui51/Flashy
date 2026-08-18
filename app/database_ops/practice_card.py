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
        prompt_fields, answer_fields, prompt_pool, answer_pool = ({}, {}, {}, {})
        for key in deck_config.prompt_fields:
            prompt_fields[key] = card.fields[key]
        for key in deck_config.answer_fields:
            answer_fields[key] = card.fields[key]

        if len(deck_config.prompt_pool_counts) > 0 and len(deck_config.prompt_pool) > 0:
            num_revealed = random.choice(deck_config.prompt_pool_counts)
            fields_revealed = random.sample(deck_config.prompt_pool, num_revealed)
            for key in fields_revealed:
                prompt_pool[key] = card.fields[key]
        if len(deck_config.answer_pool_counts) > 0 and len(deck_config.answer_pool) > 0:
            num_concealed = random.choice(deck_config.answer_pool_counts)
            fields_concealed = random.sample(deck_config.answer_pool, num_concealed)
            for key in fields_concealed:
                answer_pool[key] = card.fields[key]

        practice_card = PracticeCard(
            card_id=card.id,
            practice_session_id=practice_session_id,
            position=position,
            prompt_fields=prompt_fields,
            answer_fields=answer_fields,
            prompt_pool=prompt_pool,
            answer_pool=answer_pool,
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
