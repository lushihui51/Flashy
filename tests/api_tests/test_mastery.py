import random
import re
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlmodel import select

from app.database_ops.review_log import (
    ReviewGroupInconsistent,
    ReviewGroupWriteOutcome,
    db_insert_review_logs,
)
from app.mastery.ema import EmaStrategy
from app.mastery.types import FieldMasteryState, MasteryUpdate, ReviewGroup, ReviewSide
from app.models.card_field_mastery import CardFieldMastery
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
    rows = db.exec(select(CardFieldMastery)).all()
    return {
        (row.card_id, row.field_def_id): (
            row.prompt_mastery,
            row.answer_mastery,
            row.prompt_review_count,
            row.answer_review_count,
        )
        for row in rows
    }


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

        outcome = record_review_group(db, strategy, existing_user.id, group)
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

        first_outcome = record_review_group(db, strategy, existing_user.id, group)
        db.commit()
        once = _snapshot(db)

        second_outcome = record_review_group(db, strategy, existing_user.id, group)
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
            record_review_group(db, strategy, existing_user.id, full_group)
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
        record_review_group(db, strategy, existing_user.id, full_group)
        db.commit()

        subset_group = ReviewGroup(
            review_group_id=review_group_id,
            card_id=card_id,
            reviewed_at=reviewed_at,
            ratings=((field_ids[0], 4), (field_ids[1], 2)),
            shown_prompt_ids=(field_ids[3],),
        )

        with pytest.raises(ReviewGroupInconsistent):
            record_review_group(db, strategy, existing_user.id, subset_group)
        db.rollback()


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
            apply_rating(db, strategy, group)
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


MASTERY_ARITHMETIC = re.compile(r"(prompt_mastery|answer_mastery)\s*[+\-*/]")
SCANNED_FOR_ARITHMETIC = [
    "app/database_ops/card_field_mastery.py",
    "app/models/card_field_mastery.py",
    "app/services/mastery.py",
]


def test_no_mastery_arithmetic_outside_strategy():
    repo_root = Path(__file__).resolve().parents[2]
    for rel_path in SCANNED_FOR_ARITHMETIC:
        text = (repo_root / rel_path).read_text()
        assert not MASTERY_ARITHMETIC.search(text), f"mastery arithmetic found in {rel_path}"
