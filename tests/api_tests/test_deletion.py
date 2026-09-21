"""Service tests for compute_deletion_impact + apply_deletion (task 013 T3/T4, ADR
047, ADR 051) — calling the pair directly and committing, the same way
delete_subject/delete_deck/delete_card do internally. review_log.card_id/
field_def_id are NOT NULL ON DELETE CASCADE (ADR 048): a deleted card's or field's
review rows are gone entirely, never left behind with a nulled reference."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import desc
from sqlmodel import col, select

from app.mastery.ema import EmaStrategy
from app.mastery.types import FieldMasteryState, MasteryUpdate, ReviewGroup, ReviewSide
from app.models.card import Card
from app.models.card_field_value import CardFieldValue
from app.models.deck import Deck
from app.models.deck_practice_config import DeckPracticeConfig
from app.models.field_def import FieldDef, FieldType
from app.models.mastery_log import MasteryLog
from app.models.practice_deck import PracticeDeck
from app.models.practice_run import PracticeRun, RunStatus
from app.models.review_log import ReviewLog
from app.models.subject import Subject
from app.services.deletion import apply_deletion, compute_deletion_impact
from app.services.mastery import record_review_group


def _field(db, deck_id, name, position, field_type=FieldType.text):
    fd = FieldDef(deck_id=deck_id, name=name, type=field_type, position=position)
    db.add(fd)
    db.commit()
    db.refresh(fd)
    return fd


def _card(db, deck_id, field_ids, prefix="card"):
    card = Card(deck_id=deck_id)
    db.add(card)
    db.flush()
    for fid in field_ids:
        db.add(CardFieldValue(card_id=card.id, field_def_id=fid, value=f"{prefix}-{fid}"))
    db.commit()
    db.refresh(card)
    return card


def _config(db, deck_id, name, prompt_ids, answer_ids, pool_p_ids=(), pool_a_ids=()):
    config = DeckPracticeConfig(
        deck_id=deck_id,
        name=name,
        prompt_field_ids=list(prompt_ids),
        answer_field_ids=list(answer_ids),
        prompt_pool_ids=list(pool_p_ids),
        prompt_pool_counts=[1] if pool_p_ids else [],
        answer_pool_ids=list(pool_a_ids),
        answer_pool_counts=[1] if pool_a_ids else [],
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def _run(db, user_id, name, status=RunStatus.active):
    run = PracticeRun(user_id=user_id, name=name, status=status)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _snapshot(
    db, run_id, deck_id, prompt_ids, answer_ids, pool_p_ids=(), pool_a_ids=()
):
    snap = PracticeDeck(
        practice_run_id=run_id,
        deck_id=deck_id,
        prompt_field_ids=list(prompt_ids),
        answer_field_ids=list(answer_ids),
        prompt_pool_ids=list(pool_p_ids),
        prompt_pool_counts=[1] if pool_p_ids else [],
        answer_pool_ids=list(pool_a_ids),
        answer_pool_counts=[1] if pool_a_ids else [],
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap


def test_subject_deletion_closure_and_a_two_deck_run_keeps_its_other_snapshot(
    db, existing_user
):
    strategy = EmaStrategy()

    subject = Subject(user_id=existing_user.id, name="Doomed subject")
    db.add(subject)
    db.commit()
    db.refresh(subject)
    subject_id = subject.id
    deck1 = Deck(subject_id=subject_id, name="D1")
    deck2 = Deck(subject_id=subject_id, name="D2")
    db.add_all([deck1, deck2])
    db.commit()
    db.refresh(deck1)
    db.refresh(deck2)
    deck1_id, deck2_id = deck1.id, deck2.id
    d1_front = _field(db, deck1_id, "front", 0)
    d1_back = _field(db, deck1_id, "back", 1)
    d1_card = _card(db, deck1_id, [d1_front.id, d1_back.id])
    d1_card_id = d1_card.id
    record_review_group(
        db,
        strategy,
        existing_user.id,
        ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=d1_card_id,
            reviewed_at=datetime.now(UTC),
            ratings=((d1_back.id, 4),),
            shown_prompt_ids=(d1_front.id,),
        ),
        None,
    )
    db.commit()
    d2_front = _field(db, deck2_id, "front", 0)
    d2_back = _field(db, deck2_id, "back", 1)
    _card(db, deck2_id, [d2_front.id, d2_back.id])
    config = _config(db, deck1_id, "cfg", [d1_front.id], [d1_back.id])
    config_id = config.id

    # A survivor subject with its own deck, and a run spanning deck1 (about to be
    # deleted) and this survivor deck — not entirely inside the doomed subject, so it
    # must not be deleted; its survivor snapshot must be untouched.
    other_subject = Subject(user_id=existing_user.id, name="Survivor subject")
    db.add(other_subject)
    db.commit()
    db.refresh(other_subject)
    other_deck = Deck(subject_id=other_subject.id, name="D3")
    db.add(other_deck)
    db.commit()
    db.refresh(other_deck)
    other_deck_id = other_deck.id
    o_front = _field(db, other_deck_id, "front", 0)
    o_back = _field(db, other_deck_id, "back", 1)
    _card(db, other_deck_id, [o_front.id, o_back.id])

    spanning_run = _run(db, existing_user.id, "spanning")
    spanning_run_id = spanning_run.id
    survivor_snapshot = _snapshot(
        db, spanning_run_id, other_deck_id, [o_front.id], [o_back.id]
    )
    survivor_snapshot_id = survivor_snapshot.id
    _snapshot(db, spanning_run_id, deck1_id, [d1_front.id], [d1_back.id])

    impact = compute_deletion_impact(db, existing_user.id, subject_ids=[subject_id])
    apply_deletion(db, strategy, impact)
    db.commit()

    assert db.get(Subject, subject_id) is None
    assert db.get(Deck, deck1_id) is None
    assert db.get(Deck, deck2_id) is None
    assert db.get(DeckPracticeConfig, config_id) is None
    assert (
        db.exec(select(Card).where(col(Card.deck_id).in_([deck1_id, deck2_id]))).first()
        is None
    )

    # The spanning run itself survives (not entirely inside the doomed subject).
    assert db.get(PracticeRun, spanning_run_id) is not None
    surviving_snapshot = db.get(PracticeDeck, survivor_snapshot_id)
    assert surviving_snapshot is not None
    assert surviving_snapshot.deck_id == other_deck_id
    assert surviving_snapshot.prompt_field_ids == [o_front.id]

    # No review row references the deleted card either (ADR 048's cascade).
    assert db.exec(select(ReviewLog).where(ReviewLog.card_id == d1_card_id)).first() is None


def test_field_deletion_drops_prompt_influence_scopes_the_scrub_and_updates_configs_and_runs(
    db, existing_user
):
    strategy = EmaStrategy()

    subject = Subject(user_id=existing_user.id, name="S")
    db.add(subject)
    db.commit()
    db.refresh(subject)
    subject_id = subject.id
    deck1 = Deck(subject_id=subject_id, name="D1")
    db.add(deck1)
    db.commit()
    db.refresh(deck1)
    deck1_id = deck1.id
    p = _field(db, deck1_id, "P", 0)
    a = _field(db, deck1_id, "A", 1)
    b = _field(db, deck1_id, "B", 2)
    p_id, a_id, b_id = p.id, a.id, b.id
    card1 = _card(db, deck1_id, [p_id, a_id, b_id])
    card1_id = card1.id

    base_time = datetime(2026, 3, 1, tzinfo=UTC)

    # Appearance 1 (the one appearance the mastery assertions are about): prompt P
    # shown with answers A rated 3 and B rated 1.
    appearance1 = ReviewGroup(
        review_group_id=uuid.uuid4(),
        card_id=card1_id,
        reviewed_at=base_time,
        ratings=((a_id, 3), (b_id, 1)),
        shown_prompt_ids=(p_id,),
    )
    record_review_group(db, strategy, existing_user.id, appearance1, None)
    db.commit()

    # Appearance 2, same card, later: A rated again, with B shown as a *prompt* this
    # time — sets up the shown_prompt_ids scrub assertion below.
    appearance2 = ReviewGroup(
        review_group_id=uuid.uuid4(),
        card_id=card1_id,
        reviewed_at=base_time + timedelta(minutes=1),
        ratings=((a_id, 4),),
        shown_prompt_ids=(b_id,),
    )
    record_review_group(db, strategy, existing_user.id, appearance2, None)
    db.commit()

    a_before = db.exec(
        select(MasteryLog)
        .where(MasteryLog.card_id == card1_id, MasteryLog.field_def_id == a_id)
        .order_by(desc(MasteryLog.reviewed_at))
    ).first()
    assert a_before is not None
    a_state_before = (a_before.answer_mastery, a_before.answer_review_count)

    # A second, unrelated deck whose review_log row's shown_prompt_ids array is
    # deliberately made to also name B's id — proves the scrub is scoped to deck1's
    # own cards, not to every row anywhere that happens to name B.
    deck2 = Deck(subject_id=subject_id, name="D2")
    db.add(deck2)
    db.commit()
    db.refresh(deck2)
    deck2_id = deck2.id
    x = _field(db, deck2_id, "X", 0)
    y = _field(db, deck2_id, "Y", 1)
    card2 = _card(db, deck2_id, [x.id, y.id])
    card2_id = card2.id
    other_deck_appearance = ReviewGroup(
        review_group_id=uuid.uuid4(),
        card_id=card2_id,
        reviewed_at=base_time,
        ratings=((y.id, 4),),
        shown_prompt_ids=(b_id,),
    )
    record_review_group(db, strategy, existing_user.id, other_deck_appearance, None)
    db.commit()

    config_with_b = _config(db, deck1_id, "with-b", [p_id], [a_id, b_id])
    config_without_b = _config(db, deck1_id, "without-b", [p_id], [a_id])
    config_with_b_id, config_without_b_id = config_with_b.id, config_without_b.id

    active_run_with_b = _run(db, existing_user.id, "active-with-b")
    active_run_with_b_id = active_run_with_b.id
    _snapshot(db, active_run_with_b_id, deck1_id, [p_id], [a_id, b_id])
    active_run_without_b = _run(db, existing_user.id, "active-without-b")
    active_run_without_b_id = active_run_without_b.id
    _snapshot(db, active_run_without_b_id, deck1_id, [p_id], [a_id])
    completed_run_with_b = _run(db, existing_user.id, "completed-with-b", RunStatus.completed)
    completed_run_with_b_id = completed_run_with_b.id
    _snapshot(db, completed_run_with_b_id, deck1_id, [p_id], [a_id, b_id])

    impact = compute_deletion_impact(db, existing_user.id, field_ids=[b_id])
    apply_deletion(db, strategy, impact)
    db.commit()

    # P's latest prompt_mastery is exactly what a single appearance with just A's
    # rating would have produced — B's influence on the shared prompt is gone.
    p_row = db.exec(
        select(MasteryLog)
        .where(MasteryLog.card_id == card1_id, MasteryLog.field_def_id == p_id)
        .order_by(desc(MasteryLog.reviewed_at))
    ).first()
    assert p_row is not None
    expected_prompt = strategy.apply_review(
        None,
        MasteryUpdate(side=ReviewSide.prompt, target_score=strategy.rating_scores[3], breadth=1),
    ).prompt_mastery
    assert p_row.prompt_mastery == pytest.approx(expected_prompt, abs=1e-4)

    # A's own row is unchanged — its answer-side update never depended on B.
    a_after = db.exec(
        select(MasteryLog)
        .where(MasteryLog.card_id == card1_id, MasteryLog.field_def_id == a_id)
        .order_by(desc(MasteryLog.reviewed_at))
    ).first()
    assert a_after is not None
    assert (a_after.answer_mastery, a_after.answer_review_count) == pytest.approx(
        a_state_before
    )

    # B has no mastery_log rows left at all, and no review_log rows either — its
    # own rating from appearance 1 cascaded away with the field (ADR 048).
    assert db.exec(select(MasteryLog).where(MasteryLog.field_def_id == b_id)).first() is None
    assert db.exec(select(ReviewLog).where(ReviewLog.field_def_id == b_id)).first() is None

    # The scrub: deck1's own row no longer names B, deck2's identical array still does.
    d1_row = db.exec(
        select(ReviewLog).where(
            ReviewLog.card_id == card1_id,
            ReviewLog.review_group_id == appearance2.review_group_id,
        )
    ).first()
    assert d1_row is not None
    assert b_id not in d1_row.shown_prompt_ids

    d2_row = db.exec(select(ReviewLog).where(ReviewLog.card_id == card2_id)).first()
    assert d2_row is not None
    assert d2_row.shown_prompt_ids == [b_id]

    # Configurations: the one naming B is gone, the one that doesn't survives.
    assert db.get(DeckPracticeConfig, config_with_b_id) is None
    assert db.get(DeckPracticeConfig, config_without_b_id) is not None

    # Runs: the active run naming B is gone; the active run not naming it, and the
    # completed run that does name it, both survive.
    assert db.get(PracticeRun, active_run_with_b_id) is None
    assert db.get(PracticeRun, active_run_without_b_id) is not None
    assert db.get(PracticeRun, completed_run_with_b_id) is not None


def test_card_deletion_issues_no_mastery_log_statements_beyond_its_own_cascade(
    db, existing_user, mastery_log_statement_counter
):
    strategy = EmaStrategy()

    subject = Subject(user_id=existing_user.id, name="S")
    db.add(subject)
    db.commit()
    db.refresh(subject)
    deck = Deck(subject_id=subject.id, name="D")
    db.add(deck)
    db.commit()
    db.refresh(deck)
    front = _field(db, deck.id, "front", 0)
    back = _field(db, deck.id, "back", 1)
    card = _card(db, deck.id, [front.id, back.id])

    group = ReviewGroup(
        review_group_id=uuid.uuid4(),
        card_id=card.id,
        reviewed_at=datetime.now(UTC),
        ratings=((back.id, 4),),
        shown_prompt_ids=(front.id,),
    )
    record_review_group(db, strategy, existing_user.id, group, None)
    db.commit()
    assert (
        db.exec(select(MasteryLog).where(MasteryLog.card_id == card.id)).first() is not None
    )

    impact = compute_deletion_impact(db, existing_user.id, card_ids=[card.id])
    mastery_log_statement_counter.reset()
    apply_deletion(db, strategy, impact)
    db.commit()

    assert mastery_log_statement_counter.count == 0
    assert db.get(Card, card.id) is None
    assert db.exec(select(ReviewLog).where(ReviewLog.card_id == card.id)).first() is None
