import random
import re
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlmodel import select

from app.database_ops.review_log import db_insert_review_logs
from app.mastery.ema import EmaStrategy
from app.mastery.types import FieldMasteryState, ReviewEvent, ReviewSide
from app.models.card_field_mastery import CardFieldMastery
from app.services.mastery import apply_rating, rebuild_mastery

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
        event = ReviewEvent(side=ReviewSide.answer, rating=3, reviewed_at=datetime.now(UTC))

        assert strategy.apply_review(state, event) == strategy.apply_review(state, event)

    @pytest.mark.parametrize("strategy", STRATEGIES, ids=lambda s: s.name)
    def test_lazy_prior_used_when_state_missing(self, strategy):
        event = ReviewEvent(side=ReviewSide.prompt, rating=1, reviewed_at=datetime.now(UTC))
        assert strategy.apply_review(None, event) == strategy.apply_review(
            strategy.prior(), event
        )


class TestRebuildOracle:
    @pytest.mark.parametrize("strategy", STRATEGIES, ids=lambda s: s.name)
    def test_incremental_matches_rebuild(self, db, existing_user, mastery_cards, strategy):
        random.seed(20260818)
        card_ids = mastery_cards["card_ids"]
        field_ids = mastery_cards["field_ids"]
        base_time = datetime(2026, 1, 1, tzinfo=UTC)

        for i in range(60):
            card_id = random.choice(card_ids)
            answer_field = random.choice(field_ids)
            remaining = [f for f in field_ids if f != answer_field]
            shown_prompt_ids = random.sample(remaining, k=random.randint(0, len(remaining)))
            rating = random.randint(1, 4)
            reviewed_at = base_time + timedelta(minutes=i)

            db_insert_review_logs(
                db,
                [
                    {
                        "user_id": existing_user.id,
                        "card_id": card_id,
                        "field_def_id": answer_field,
                        "review_group_id": uuid.uuid4(),
                        "rating": rating,
                        "shown_prompt_ids": shown_prompt_ids,
                        "reviewed_at": reviewed_at,
                    }
                ],
            )
            apply_rating(
                db,
                strategy,
                card_id=card_id,
                field_def_id=answer_field,
                shown_prompt_ids=shown_prompt_ids,
                rating=rating,
                reviewed_at=reviewed_at,
            )
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
