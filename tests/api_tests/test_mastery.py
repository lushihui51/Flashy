import random
import re
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import desc
from sqlmodel import col, select

from app.database_ops.review_log import (
    ReviewGroupInconsistent,
    ReviewGroupWriteOutcome,
    db_insert_review_logs,
)
from app.mastery.ema import EmaStrategy
from app.mastery.types import FieldMasteryState, MasteryUpdate, ReviewGroup, ReviewSide
from app.models.card import Card
from app.models.mastery_log import MasteryLog
from app.models.practice_card import PracticeCard, PracticeCardStatus
from app.models.practice_run import PracticeRun, RunStatus
from app.services.mastery import apply_rating, rebuild_mastery, record_review_group

STRATEGIES = [EmaStrategy()]


@pytest.fixture
def mastery_cards(client, existing_deck):
    field_ids = []
    for name in ["f1", "f2", "f3", "f4"]:
        res = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": name, "type": "text"}
        )
        assert res.status_code == 201, res.text
        field_ids.append(uuid.UUID(res.json()["id"]))

    card_ids = []
    for i in range(3):
        values = {str(fid): f"card{i}-{fid}" for fid in field_ids}
        res = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert res.status_code == 201, res.text
        card_ids.append(uuid.UUID(res.json()["id"]))

    return {"field_ids": field_ids, "card_ids": card_ids}


def _snapshot(db):
    """Current mastery = latest row per (card, field) pair (ADR 042) — folds the
    append-only ledger down to the same shape the old single-row-per-pair cache had,
    so every existing assertion below still reads as "current state" without knowing
    the ledger keeps history underneath."""
    rows = db.exec(select(MasteryLog).order_by(MasteryLog.id)).all()
    latest: dict[tuple, tuple] = {}
    for row in rows:
        latest[(row.card_id, row.field_def_id)] = (
            row.prompt_mastery,
            row.answer_mastery,
            row.prompt_review_count,
            row.answer_review_count,
        )
    return latest


def _make_practice_run(db, user_id, status=RunStatus.active):
    run = PracticeRun(user_id=user_id, name="attribution test", status=status)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _make_practice_card(db, practice_run_id, card_id, position=0):
    """review_group_id == practice_card.id is submit_rating's actual construction
    (app/services/practice_run.py); building one directly here, with no generation
    machinery, is enough to exercise the attribution join since it only cares about
    id and practice_run_id."""
    practice_card = PracticeCard(
        practice_run_id=practice_run_id,
        card_id=card_id,
        position=position,
        prompts=[],
        answers=[],
        status=PracticeCardStatus.pending,
    )
    db.add(practice_card)
    db.commit()
    db.refresh(practice_card)
    return practice_card


class TestApplyReviewPurity:
    @pytest.mark.parametrize("strategy", STRATEGIES, ids=lambda s: s.name)
    def test_same_inputs_produce_equal_states(self, strategy):
        state = FieldMasteryState(
            prompt_mastery=40.0, answer_mastery=60.0, prompt_review_count=2, answer_review_count=3
        )
        update = MasteryUpdate(side=ReviewSide.answer, target_score=67.0, breadth=1)

        assert strategy.apply_review(state, update) == strategy.apply_review(state, update)

    @pytest.mark.parametrize("strategy", STRATEGIES, ids=lambda s: s.name)
    def test_lazy_prior_used_when_state_missing(self, strategy):
        update = MasteryUpdate(side=ReviewSide.prompt, target_score=0.0, breadth=1)
        assert strategy.apply_review(None, update) == strategy.apply_review(
            strategy.prior(), update
        )


class TestBreadthNotIndependentUpdates:
    """The bug this redesign fixes: a prompt shown alongside n rated answers in one
    appearance must produce one update with breadth n, not n independent blends."""

    def test_prompt_review_count_increments_once_per_appearance(self):
        strategy = EmaStrategy()
        card_id = uuid.uuid4()
        prompt_id = uuid.uuid4()
        answer_ids = [uuid.uuid4() for _ in range(3)]
        group = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=tuple((fid, 4) for fid in answer_ids),
            shown_prompt_ids=(prompt_id,),
        )

        updates = strategy.expand(group)
        prompt_update = updates[(card_id, prompt_id, ReviewSide.prompt)]
        assert prompt_update.breadth == 3

        new_state = strategy.apply_review(None, prompt_update)
        assert new_state.prompt_review_count == 1  # not 3

    def test_three_answers_outweighs_one_answer_same_rating(self):
        """Same rating on every answer, more answers -> the prompt should move further
        toward the target than a single-answer appearance would, because breadth is
        more evidence, not a different target (the target is identical either way)."""
        strategy = EmaStrategy()
        card_id = uuid.uuid4()
        prompt_id = uuid.uuid4()

        one_answer_group = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=((uuid.uuid4(), 4),),
            shown_prompt_ids=(prompt_id,),
        )
        three_answer_group = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=tuple((uuid.uuid4(), 4) for _ in range(3)),
            shown_prompt_ids=(prompt_id,),
        )

        one_update = strategy.expand(one_answer_group)[(card_id, prompt_id, ReviewSide.prompt)]
        three_update = strategy.expand(three_answer_group)[
            (card_id, prompt_id, ReviewSide.prompt)
        ]
        assert one_update.target_score == three_update.target_score == 100.0

        result_from_one = strategy.apply_review(None, one_update)
        result_from_three = strategy.apply_review(None, three_update)
        assert result_from_three.prompt_mastery > result_from_one.prompt_mastery

    def test_three_low_ratings_do_not_outrank_one_high_rating(self):
        """Guards against the naive "target scales with breadth" alternative: three
        answers rated 2 must not out-rank one answer rated 4."""
        strategy = EmaStrategy()
        card_id = uuid.uuid4()
        prompt_id = uuid.uuid4()

        low_x3 = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=tuple((uuid.uuid4(), 2) for _ in range(3)),
            shown_prompt_ids=(prompt_id,),
        )
        high_x1 = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=((uuid.uuid4(), 4),),
            shown_prompt_ids=(prompt_id,),
        )

        low_update = strategy.expand(low_x3)[(card_id, prompt_id, ReviewSide.prompt)]
        high_update = strategy.expand(high_x1)[(card_id, prompt_id, ReviewSide.prompt)]

        low_result = strategy.apply_review(None, low_update)
        high_result = strategy.apply_review(None, high_update)
        assert high_result.prompt_mastery > low_result.prompt_mastery

    def test_beta_one_matches_n_sequential_plain_alpha_blends(self):
        """The closed-form identity the breadth formula rests on: at beta=1, one blend
        with alpha_eff = 1-(1-alpha)^n equals n sequential plain-alpha blends toward
        the same target — so grouping loses nothing when all ratings agree."""
        strategy = EmaStrategy(beta=1.0)
        card_id = uuid.uuid4()
        prompt_id = uuid.uuid4()
        n = 4
        group = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=tuple((uuid.uuid4(), 4) for _ in range(n)),
            shown_prompt_ids=(prompt_id,),
        )
        update = strategy.expand(group)[(card_id, prompt_id, ReviewSide.prompt)]

        grouped_result = strategy.apply_review(None, update)

        sequential = strategy.prior().prompt_mastery
        for _ in range(n):
            sequential = sequential + strategy.alpha * (update.target_score - sequential)

        assert grouped_result.prompt_mastery == pytest.approx(sequential, abs=1e-9)

    def test_prompt_target_order_independent_within_group(self):
        """Permuting which answer is listed first must not change the prompt's
        resulting state — the whole point of aggregating before blending."""
        strategy = EmaStrategy()
        card_id = uuid.uuid4()
        prompt_id = uuid.uuid4()
        ratings = [(uuid.uuid4(), r) for r in (2, 3, 4)]

        forward = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=tuple(ratings),
            shown_prompt_ids=(prompt_id,),
        )
        backward = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=tuple(reversed(ratings)),
            shown_prompt_ids=(prompt_id,),
        )

        forward_update = strategy.expand(forward)[(card_id, prompt_id, ReviewSide.prompt)]
        backward_update = strategy.expand(backward)[(card_id, prompt_id, ReviewSide.prompt)]

        assert forward_update == backward_update


class TestRecordReviewGroupOutcomes:
    """record_review_group is the retry-safe entry point apply_rating itself isn't:
    calling apply_rating twice for the same group double-blends, so this is what
    actually enforces the review_group atomicity invariant on the write path."""

    def test_new_group_returns_new_and_applies_mastery(self, db, existing_user, mastery_cards):
        strategy = EmaStrategy()
        card_id = mastery_cards["card_ids"][0]
        field_ids = mastery_cards["field_ids"]
        group = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=((field_ids[0], 4),),
            shown_prompt_ids=(field_ids[1],),
        )

        outcome = record_review_group(db, strategy, existing_user.id, group, None)
        db.commit()

        assert outcome is ReviewGroupWriteOutcome.new
        assert (card_id, field_ids[0]) in _snapshot(db)
        assert (card_id, field_ids[1]) in _snapshot(db)

    def test_exact_retry_is_byte_identical_to_applying_once(
        self, db, existing_user, mastery_cards
    ):
        strategy = EmaStrategy()
        card_id = mastery_cards["card_ids"][0]
        field_ids = mastery_cards["field_ids"]
        group = ReviewGroup(
            review_group_id=uuid.uuid4(),
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=((field_ids[0], 4), (field_ids[1], 2)),
            shown_prompt_ids=(field_ids[2],),
        )

        first_outcome = record_review_group(db, strategy, existing_user.id, group, None)
        db.commit()
        once = _snapshot(db)

        second_outcome = record_review_group(db, strategy, existing_user.id, group, None)
        db.commit()
        twice = _snapshot(db)

        assert first_outcome is ReviewGroupWriteOutcome.new
        assert second_outcome is ReviewGroupWriteOutcome.retry
        assert once == twice

    def test_partial_then_complete_raises(self, db, existing_user, mastery_cards):
        strategy = EmaStrategy()
        card_id = mastery_cards["card_ids"][0]
        field_ids = mastery_cards["field_ids"]
        review_group_id = uuid.uuid4()
        reviewed_at = datetime.now(UTC)

        # Seed a partial write directly, bypassing record_review_group — simulating
        # whatever bug or race the invariant guards against.
        db_insert_review_logs(
            db,
            [
                {
                    "user_id": existing_user.id,
                    "card_id": card_id,
                    "field_def_id": field_ids[0],
                    "review_group_id": review_group_id,
                    "rating": 4,
                    "shown_prompt_ids": [field_ids[2]],
                    "reviewed_at": reviewed_at,
                }
            ],
        )
        db.commit()

        full_group = ReviewGroup(
            review_group_id=review_group_id,
            card_id=card_id,
            reviewed_at=reviewed_at,
            ratings=((field_ids[0], 4), (field_ids[1], 2)),
            shown_prompt_ids=(field_ids[2],),
        )

        with pytest.raises(ReviewGroupInconsistent):
            record_review_group(db, strategy, existing_user.id, full_group, None)
        db.rollback()

    def test_subset_of_a_logged_group_raises_not_treated_as_retry(
        self, db, existing_user, mastery_cards
    ):
        """The blind spot a naive INSERT...RETURNING row-count check would miss: {A, B}
        submitted against an on-record {A, B, C} inserts zero new rows (looks like a
        clean retry) but is not the same appearance."""
        strategy = EmaStrategy()
        card_id = mastery_cards["card_ids"][0]
        field_ids = mastery_cards["field_ids"]
        review_group_id = uuid.uuid4()
        reviewed_at = datetime.now(UTC)

        full_group = ReviewGroup(
            review_group_id=review_group_id,
            card_id=card_id,
            reviewed_at=reviewed_at,
            ratings=((field_ids[0], 4), (field_ids[1], 2), (field_ids[2], 3)),
            shown_prompt_ids=(field_ids[3],),
        )
        record_review_group(db, strategy, existing_user.id, full_group, None)
        db.commit()

        subset_group = ReviewGroup(
            review_group_id=review_group_id,
            card_id=card_id,
            reviewed_at=reviewed_at,
            ratings=((field_ids[0], 4), (field_ids[1], 2)),
            shown_prompt_ids=(field_ids[3],),
        )

        with pytest.raises(ReviewGroupInconsistent):
            record_review_group(db, strategy, existing_user.id, subset_group, None)
        db.rollback()


class TestRunAttribution:
    """ADR 042's practice_run_id parameter on the write path: each appended row is
    attributed to the run it happened in, and a retry of an already-logged group
    appends nothing at all — not even an unattributed row."""

    def test_rating_appends_rows_carrying_the_run_id(self, db, existing_user, mastery_cards):
        strategy = EmaStrategy()
        card_id = mastery_cards["card_ids"][0]
        field_ids = mastery_cards["field_ids"]
        run = _make_practice_run(db, existing_user.id)
        practice_card = _make_practice_card(db, run.id, card_id)

        group = ReviewGroup(
            review_group_id=practice_card.id,
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=((field_ids[0], 4),),
            shown_prompt_ids=(field_ids[1],),
        )

        outcome = record_review_group(db, strategy, existing_user.id, group, run.id)
        db.commit()

        assert outcome is ReviewGroupWriteOutcome.new
        rows = db.exec(
            select(MasteryLog).where(
                MasteryLog.card_id == card_id,
                col(MasteryLog.field_def_id).in_([field_ids[0], field_ids[1]]),
            )
        ).all()
        assert rows, "record_review_group should have appended ledger rows"
        assert all(row.practice_run_id == run.id for row in rows)

    def test_exact_retry_appends_no_rows(self, db, existing_user, mastery_cards):
        strategy = EmaStrategy()
        card_id = mastery_cards["card_ids"][0]
        field_ids = mastery_cards["field_ids"]
        run = _make_practice_run(db, existing_user.id)
        practice_card = _make_practice_card(db, run.id, card_id)

        group = ReviewGroup(
            review_group_id=practice_card.id,
            card_id=card_id,
            reviewed_at=datetime.now(UTC),
            ratings=((field_ids[0], 4),),
            shown_prompt_ids=(field_ids[1],),
        )

        first_outcome = record_review_group(db, strategy, existing_user.id, group, run.id)
        db.commit()
        row_count_after_first = len(db.exec(select(MasteryLog)).all())

        second_outcome = record_review_group(db, strategy, existing_user.id, group, run.id)
        db.commit()
        row_count_after_retry = len(db.exec(select(MasteryLog)).all())

        assert first_outcome is ReviewGroupWriteOutcome.new
        assert second_outcome is ReviewGroupWriteOutcome.retry
        assert row_count_after_retry == row_count_after_first


class TestRebuildOracle:
    @pytest.mark.parametrize("strategy", STRATEGIES, ids=lambda s: s.name)
    def test_incremental_matches_rebuild(self, db, existing_user, mastery_cards, strategy):
        random.seed(20260818)
        card_ids = mastery_cards["card_ids"]
        field_ids = mastery_cards["field_ids"]
        base_time = datetime(2026, 1, 1, tzinfo=UTC)

        for i in range(40):
            card_id = random.choice(card_ids)
            n_answers = random.randint(1, 3)
            answer_fields = random.sample(field_ids, k=n_answers)
            remaining = [f for f in field_ids if f not in answer_fields]
            shown_prompt_ids = random.sample(remaining, k=random.randint(0, len(remaining)))
            ratings = tuple((f, random.randint(1, 4)) for f in answer_fields)
            reviewed_at = base_time + timedelta(minutes=i)

            group = ReviewGroup(
                review_group_id=uuid.uuid4(),
                card_id=card_id,
                reviewed_at=reviewed_at,
                ratings=ratings,
                shown_prompt_ids=tuple(shown_prompt_ids),
            )

            db_insert_review_logs(
                db,
                [
                    {
                        "user_id": existing_user.id,
                        "card_id": group.card_id,
                        "field_def_id": field_def_id,
                        "review_group_id": group.review_group_id,
                        "rating": rating,
                        "shown_prompt_ids": list(group.shown_prompt_ids),
                        "reviewed_at": group.reviewed_at,
                    }
                    for field_def_id, rating in group.ratings
                ],
            )
            apply_rating(db, strategy, group, None)
            db.commit()

        incremental = _snapshot(db)
        assert len(incremental) > 0

        rebuild_mastery(db, strategy)
        rebuilt = _snapshot(db)

        assert set(incremental.keys()) == set(rebuilt.keys())
        for key, (inc_prompt, inc_answer, inc_pc, inc_ac) in incremental.items():
            reb_prompt, reb_answer, reb_pc, reb_ac = rebuilt[key]
            assert inc_prompt == pytest.approx(reb_prompt, abs=1e-4)
            assert inc_answer == pytest.approx(reb_answer, abs=1e-4)
            assert inc_pc == reb_pc
            assert inc_ac == reb_ac

    def test_rebuild_reconstructs_attribution_and_preserves_state(
        self, db, existing_user, mastery_cards
    ):
        """The reconstruction ADR 042 calls out: a group's review_group_id is the
        practice_card.id it was submitted against, so rebuild_mastery recovers
        practice_run_id by joining back to still-existing practice_card rows —
        surviving for a run that's still around, nulled for a run that was deleted
        (its practice_card cascades away with it; the reviewed card itself is
        untouched and its ledger state must come out unchanged either way)."""
        strategy = EmaStrategy()
        card_a, card_b = mastery_cards["card_ids"][0], mastery_cards["card_ids"][1]
        answer_field, prompt_field = mastery_cards["field_ids"][0], mastery_cards["field_ids"][1]

        surviving_run = _make_practice_run(db, existing_user.id)
        surviving_card = _make_practice_card(db, surviving_run.id, card_a)
        deleted_run = _make_practice_run(db, existing_user.id)
        deleted_run_card = _make_practice_card(db, deleted_run.id, card_b)
        # captured now — deleted_run_card is about to be cascade-deleted out from
        # under this session, and accessing an expired ORM attribute on a row that's
        # since vanished raises ObjectDeletedError instead of quietly refreshing.
        deleted_run_card_id = deleted_run_card.id

        group_a = ReviewGroup(
            review_group_id=surviving_card.id,
            card_id=card_a,
            reviewed_at=datetime.now(UTC),
            ratings=((answer_field, 4),),
            shown_prompt_ids=(prompt_field,),
        )
        group_b = ReviewGroup(
            review_group_id=deleted_run_card.id,
            card_id=card_b,
            reviewed_at=datetime.now(UTC),
            ratings=((answer_field, 2),),
            shown_prompt_ids=(prompt_field,),
        )
        record_review_group(db, strategy, existing_user.id, group_a, surviving_run.id)
        record_review_group(db, strategy, existing_user.id, group_b, deleted_run.id)
        db.commit()

        pre_rebuild = _snapshot(db)
        assert (card_a, answer_field) in pre_rebuild
        assert (card_b, answer_field) in pre_rebuild

        db.delete(deleted_run)
        db.commit()
        assert (
            db.exec(select(PracticeCard).where(PracticeCard.id == deleted_run_card_id)).first()
            is None
        )
        assert db.get(Card, card_b) is not None  # the card itself outlives its run

        rebuild_mastery(db, strategy)
        post_rebuild = _snapshot(db)

        for key in [
            (card_a, answer_field),
            (card_a, prompt_field),
            (card_b, answer_field),
            (card_b, prompt_field),
        ]:
            assert key in post_rebuild
            pre_prompt, pre_answer, pre_pc, pre_ac = pre_rebuild[key]
            post_prompt, post_answer, post_pc, post_ac = post_rebuild[key]
            assert post_prompt == pytest.approx(pre_prompt, abs=1e-4)
            assert post_answer == pytest.approx(pre_answer, abs=1e-4)
            assert post_pc == pre_pc
            assert post_ac == pre_ac

        latest_a = db.exec(
            select(MasteryLog)
            .where(MasteryLog.card_id == card_a, MasteryLog.field_def_id == answer_field)
            .order_by(desc(MasteryLog.id))
            .limit(1)
        ).first()
        latest_b = db.exec(
            select(MasteryLog)
            .where(MasteryLog.card_id == card_b, MasteryLog.field_def_id == answer_field)
            .order_by(desc(MasteryLog.id))
            .limit(1)
        ).first()
        assert latest_a.practice_run_id == surviving_run.id
        assert latest_b.practice_run_id is None


MASTERY_ARITHMETIC = re.compile(r"(prompt_mastery|answer_mastery)\s*[+\-*/]")
SCANNED_FOR_ARITHMETIC = [
    "app/database_ops/mastery_log.py",
    "app/models/mastery_log.py",
    "app/services/mastery.py",
]


def test_no_mastery_arithmetic_outside_strategy():
    repo_root = Path(__file__).resolve().parents[2]
    for rel_path in SCANNED_FOR_ARITHMETIC:
        text = (repo_root / rel_path).read_text()
        assert not MASTERY_ARITHMETIC.search(text), f"mastery arithmetic found in {rel_path}"
