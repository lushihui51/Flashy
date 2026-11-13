import random
import uuid
from datetime import UTC, datetime

import pytest
from sqlmodel import col, select

from app.database_ops.run_card import db_read_current_run_card
from app.mastery.ema import EmaStrategy
from app.mastery.readiness import classify_change
from app.mastery.types import FieldMasteryState, ReviewGroup
from app.models.card import Card
from app.models.field_def import FieldDef, FieldType
from app.models.run_card import RunCard, RunCardStatus
from app.models.run_configuration import RunConfiguration
from app.models.run_counted_card import RunCountedCard
from app.models.practice import Practice
from app.models.practice_configuration import PracticeConfiguration
from app.models.run import Run, RunStatus
from app.models.review_log import ReviewLog
from app.services.mastery import record_review_group
from app.services.run_generation import (
    generate_run_card_fields,
    resolve_prompts_or_answers,
)
from app.services.run import (
    _POSITION_GAP,
    RETRY_SPACING_FLOOR,
    _end_of_queue_position,
    _insertion_position,
    _resolve_field_values,
    read_run_breakdown,
    run_progress,
    start_run,
    submit_rating,
)
from tests.conftest import configuration, create_practice, start_practice


@pytest.fixture
def deck_fields(client, existing_deck):
    names = [
        "prompt1",
        "answer1",
        "pool_p1",
        "pool_p2",
        "pool_p3",
        "pool_a1",
        "pool_a2",
        "pool_a3",
    ]
    ids = {}
    for name in names:
        res = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": name, "type": "text"}
        )
        assert res.status_code == 201, res.text
        ids[name] = uuid.UUID(res.json()["id"])
    return ids


@pytest.fixture
def deck_cards(client, existing_deck, deck_fields):
    card_ids = []
    for i in range(3):
        values = {str(fid): f"card{i}-{name}" for name, fid in deck_fields.items()}
        res = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert res.status_code == 201, res.text
        card_ids.append(uuid.UUID(res.json()["id"]))
    return card_ids


@pytest.fixture
def deck_configuration(existing_deck, deck_fields):
    """How the run's tests ask existing_deck: one fixed field and a pool of three drawing
    one on each side."""
    f = deck_fields
    return {
        "deck_id": existing_deck["id"],
        "prompt_field_ids": [str(f["prompt1"])],
        "answer_field_ids": [str(f["answer1"])],
        "prompt_pool_ids": [str(f["pool_p1"]), str(f["pool_p2"]), str(f["pool_p3"])],
        "prompt_pool_counts": [1],
        "answer_pool_ids": [str(f["pool_a1"]), str(f["pool_a2"]), str(f["pool_a3"])],
        "answer_pool_counts": [1],
    }


@pytest.fixture
def deck_practice(client, deck_configuration):
    """A practice of existing_deck asking it by deck_configuration."""
    return create_practice(client, _decks([deck_configuration]))

class TestRunHTTPFlow:
    def test_start_run(self, client, deck_cards, deck_practice):
        res = client.post(f"/api/practices/{deck_practice['id']}/runs")
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "active"
        assert data["practice_id"] == deck_practice["id"]

    def test_start_run_of_an_unknown_practice_404s(self, client):
        assert client.post(f"/api/practices/{uuid.uuid4()}/runs").status_code == 404

    def test_run_state_and_rate_pass(self, client, existing_user, deck_cards, deck_practice):
        start_res = client.post(f"/api/practices/{deck_practice['id']}/runs")
        run_id = start_res.json()["id"]

        run_res = client.get(f"/api/runs/{run_id}/state")
        assert run_res.status_code == 200, run_res.text
        card = run_res.json()["current_card"]
        assert card["attempt"] == 1
        assert len(card["answers"]) >= 1

        ratings = {a["field_def_id"]: 4 for a in card["answers"]}
        rate_res = client.post(
            f"/api/run_cards/{card['run_card_id']}/rate", json={"ratings": ratings}
        )
        assert rate_res.status_code == 200, rate_res.text
        result = rate_res.json()
        assert result["rated_run_card"]["status"] == "passed"
        assert result["requeued_run_card"] is None

    def test_rate_wrong_answer_fields_rejected(
        self, client, existing_user, deck_cards, deck_practice
    ):
        start_res = client.post(f"/api/practices/{deck_practice['id']}/runs")
        run_id = start_res.json()["id"]
        card = client.get(f"/api/runs/{run_id}/state").json()["current_card"]

        res = client.post(
            f"/api/run_cards/{card['run_card_id']}/rate",
            json={"ratings": {str(uuid.uuid4()): 4}},
        )
        assert res.status_code == 400

    def test_rating_a_rated_card_answers_card_already_rated(
        self, client, existing_user, deck_cards, deck_practice
    ):
        start_res = client.post(f"/api/practices/{deck_practice['id']}/runs")
        run_id = start_res.json()["id"]
        card = client.get(f"/api/runs/{run_id}/state").json()["current_card"]
        ratings = {a["field_def_id"]: 4 for a in card["answers"]}

        first = client.post(
            f"/api/run_cards/{card['run_card_id']}/rate", json={"ratings": ratings}
        )
        assert first.status_code == 200

        second = client.post(
            f"/api/run_cards/{card['run_card_id']}/rate", json={"ratings": ratings}
        )
        assert second.status_code == 400
        assert second.json()["detail"]["code"] == "card_already_rated"

    def test_rate_non_current_pending_card_rejected(
        self, client, db, existing_user, deck_cards, deck_practice
    ):
        """Only the run's current card (its lowest-position pending row) can be rated;
        any other pending card is a 400 and nothing is written."""
        start_res = client.post(f"/api/practices/{deck_practice['id']}/runs")
        run_id = uuid.UUID(start_res.json()["id"])
        pending = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run_id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).all()
        assert len(pending) >= 2

        not_current = pending[1]
        res = client.post(
            f"/api/run_cards/{not_current.id}/rate",
            json={"ratings": {str(fid): 4 for fid in not_current.answers}},
        )
        assert res.status_code == 400
        assert res.json()["detail"]["code"] == "not_current_card"

        db.refresh(not_current)
        assert not_current.status == RunCardStatus.pending
        assert (
            db.exec(select(ReviewLog).where(ReviewLog.review_group_id == not_current.id)).all()
            == []
        )

        current = pending[0]
        res = client.post(
            f"/api/run_cards/{current.id}/rate",
            json={"ratings": {str(fid): 4 for fid in current.answers}},
        )
        assert res.status_code == 200, res.text

    def test_fail_and_requeue_via_http(
        self, client, existing_user, deck_cards, deck_practice
    ):
        start_res = client.post(f"/api/practices/{deck_practice['id']}/runs")
        run_id = start_res.json()["id"]
        card = client.get(f"/api/runs/{run_id}/state").json()["current_card"]

        ratings = {a["field_def_id"]: 1 for a in card["answers"]}  # rating 1 -> fail
        rate_res = client.post(
            f"/api/run_cards/{card['run_card_id']}/rate", json={"ratings": ratings}
        )
        assert rate_res.status_code == 200, rate_res.text
        result = rate_res.json()

        assert result["rated_run_card"]["status"] == "failed"
        requeued = result["requeued_run_card"]
        assert requeued is not None
        assert requeued["id"] != card["run_card_id"]
        assert requeued["card_id"] == card["card_id"]
        assert requeued["status"] == "pending"


class TestRunAcceptance:
    """Start, rate, fail, requeue — the requeued card is a new row with a different
    prompt/answer combination and a position consistent with its updated readiness; the
    original row stays failed."""

    def test_full_fail_requeue_cycle(
        self, db, existing_user, deck_cards, deck_practice, deck_fields
    ):
        strategy = EmaStrategy()
        practice_id = uuid.UUID(deck_practice["id"])

        run = start_run(db, strategy, existing_user.id, practice_id, rng=random.Random(1)
        )
        db.commit()

        original = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).first()
        assert original is not None
        original_id = original.id
        original_position = original.position
        original_prompts = set(original.prompts)
        original_answers = set(original.answers)

        ratings = {answer_id: 1 for answer_id in original.answers}  # force a fail
        rated, requeued = submit_rating(
            db, strategy, existing_user.id, original_id, ratings, rng=random.Random(101)
        )
        db.commit()

        assert rated.id == original_id
        assert rated.status == RunCardStatus.failed

        assert requeued is not None
        assert requeued.id != original_id
        assert requeued.card_id == original.card_id
        assert requeued.status == RunCardStatus.pending
        assert (set(requeued.prompts), set(requeued.answers)) != (
            original_prompts,
            original_answers,
        )

        # Every other card in this fixture is still unreviewed, reading 0, and a forced
        # fail leaves the requeued card at 0 too, so it sits at index 0 — the front of
        # the readiness order. But only 2 other pending cards remain once the original
        # is marked failed, so the retry spacing floor (RETRY_SPACING_FLOOR=3) clamps
        # that index up to min(3, len(pending)) = 2: the end of the queue, not the
        # front. This is a hard guarantee of the clamp, not an approximation — assert
        # the guarantee itself (new back of the pending queue), not just "position
        # changed". TestRetrySpacingFloor covers the floor directly with ≥4 pending
        # cards, where the clamp and the readiness index can disagree either way.
        assert requeued.position != original_position
        pending_positions = db.exec(
            select(RunCard.position).where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
        ).all()
        assert len(pending_positions) == len(set(pending_positions))  # all unique
        assert requeued.position == max(pending_positions)

        current = db_read_current_run_card(db, run.id, existing_user.id)
        assert current is not None
        assert current.id != requeued.id

        db.refresh(original)
        assert original.status == RunCardStatus.failed
        assert set(original.prompts) == original_prompts
        assert set(original.answers) == original_answers


class TestForcedFailedAnswerFields:
    """The retry of a failed card force-includes every answer field rated "Again" that
    is still live and non-blank, ahead of pool sampling. With the fixture's
    answer_pool_counts=[1], the forced fields fill (or overflow) the whole draw, so
    every assertion here is deterministic for any rng seed — the seed never gets a
    chance to make the test pass by luck."""

    def _start_and_first_pending(self, db, existing_user, practice, seed):
        strategy = EmaStrategy()
        run = start_run(
            db, strategy, existing_user.id, uuid.UUID(practice["id"]), rng=random.Random(seed)
        )
        db.commit()
        card = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).first()
        assert card is not None
        return strategy, card

    def test_failed_pool_answer_field_is_reasked(
        self, db, existing_user, deck_cards, deck_practice, deck_fields
    ):
        strategy, original = self._start_and_first_pending(
            db, existing_user, deck_practice, seed=1
        )
        fixed = deck_fields["answer1"]
        [failed_pool] = [fid for fid in original.answers if fid != fixed]

        _, requeued = submit_rating(
            db,
            strategy,
            existing_user.id,
            original.id,
            {fixed: 4, failed_pool: 1},
            rng=random.Random(2),
        )
        db.commit()

        assert requeued is not None
        # The drawn count is 1 and the forced field fills it, so the answer side is
        # exactly fixed + forced — no sampled remainder for the seed to vary.
        assert requeued.answers == [fixed, failed_pool]

    def test_two_failed_pool_fields_both_reasked_when_count_is_one(
        self, db, existing_user, deck_cards, deck_practice, deck_fields
    ):
        strategy, original = self._start_and_first_pending(
            db, existing_user, deck_practice, seed=1
        )
        f = deck_fields
        # Craft a prior appearance carrying two pool answers even though this
        # snapshot's drawn count is 1 — the state a chained retry can reach — to hit
        # the overflow rule: forced fields exceed the draw and dropping one is never
        # permitted.
        original.answers = [f["answer1"], f["pool_a1"], f["pool_a2"]]
        db.add(original)
        db.commit()

        _, requeued = submit_rating(
            db,
            strategy,
            existing_user.id,
            original.id,
            {f["answer1"]: 4, f["pool_a1"]: 1, f["pool_a2"]: 1},
            rng=random.Random(5),
        )
        db.commit()

        assert requeued is not None
        # Both forced (in answer_pool_ids order), zero sampled: max(0, 1 - 2) slots.
        assert requeued.answers == [f["answer1"], f["pool_a1"], f["pool_a2"]]

    def test_failed_fixed_answer_field_still_reasked(
        self, db, existing_user, deck_cards, deck_practice, deck_fields
    ):
        strategy, original = self._start_and_first_pending(
            db, existing_user, deck_practice, seed=1
        )
        f = deck_fields
        fixed = f["answer1"]
        [pool_field] = [fid for fid in original.answers if fid != fixed]

        # Fail only the fixed field; the pool field passes.
        _, requeued = submit_rating(
            db,
            strategy,
            existing_user.id,
            original.id,
            {fixed: 1, pool_field: 4},
            rng=random.Random(11),
        )
        db.commit()

        assert requeued is not None
        # A fixed field was never at risk — always included — but guard that the
        # forcing change didn't disturb it, and that a failed fixed field is not
        # double-included by the forced-pool path (it's fixed, not pool): exactly one
        # fixed slot plus the one drawn pool slot.
        assert requeued.answers[0] == fixed
        assert len(requeued.answers) == 2
        assert requeued.answers[1] in {f["pool_a1"], f["pool_a2"], f["pool_a3"]}

    def test_blanked_failed_pool_field_drops_out_and_card_still_requeues(
        self, db, client, existing_user, deck_cards, deck_practice, deck_fields
    ):
        """The force-include is conditional on the failed field being live and
        non-blank, so a value cleared after it was shown drops out of the retry."""
        strategy, original = self._start_and_first_pending(
            db, existing_user, deck_practice, seed=1
        )
        fixed = deck_fields["answer1"]
        [failed_pool] = [fid for fid in original.answers if fid != fixed]

        blanked = client.patch(
            f"/api/cards/{original.card_id}", json={"values": {str(failed_pool): ""}}
        )
        assert blanked.status_code == 200, blanked.text

        _, requeued = submit_rating(
            db,
            strategy,
            existing_user.id,
            original.id,
            {fixed: 4, failed_pool: 1},
            rng=random.Random(4),
        )
        db.commit()

        assert requeued is not None
        assert failed_pool not in requeued.answers
        # The card still generates: the fixed answer survives, and the pool draw fills
        # its one slot from the two remaining live pool fields.
        assert requeued.answers[0] == fixed
        assert len(requeued.answers) == 2
        assert requeued.answers[1] in {
            fid for name, fid in deck_fields.items() if name.startswith("pool_a")
        } - {failed_pool}


class TestRetrySpacingFloor:
    """RETRY_SPACING_FLOOR=3 clamps the readiness-ordered insertion index up, never down
    — a retry surfaces only after that many other pending cards have had their turn,
    or at the end of the queue with fewer than that remaining. The "2 pending cards ->
    retry is last" case is already covered by
    TestRunAcceptance.test_full_fail_requeue_cycle (its own scenario, not
    duplicated here)."""

    @staticmethod
    def _add_cards(client, existing_deck, deck_fields, n, start_at):
        ids = []
        for i in range(start_at, start_at + n):
            values = {str(fid): f"extra{i}-{name}" for name, fid in deck_fields.items()}
            res = client.post(
                "/api/cards", json={"deck_id": existing_deck["id"], "values": values}
            )
            assert res.status_code == 201, res.text
            ids.append(uuid.UUID(res.json()["id"]))
        return ids

    @staticmethod
    def _card_at(position: int) -> RunCard:
        """A detached RunCard carrying only the `.position` _insertion_position
        ever reads — never persisted, so the other NOT NULL columns are placeholders."""
        return RunCard(
            run_id=uuid.uuid4(),
            card_id=uuid.uuid4(),
            position=position,
            prompts=[],
            answers=[],
        )

    def test_last_pending_card_requeues_via_http(
        self, client, db, existing_user, deck_cards, deck_practice
    ):
        """Rating "Again" on a run's only pending card requeues it above every row the
        run has placed (run max + 500) instead of raising, and a retry of that retry
        chains above it. Positions are exact because the fixture generates 3 cards at
        0, 1000, 2000 and nothing else moves them."""
        start_res = client.post(f"/api/practices/{deck_practice['id']}/runs")
        assert start_res.status_code == 200, start_res.text
        run_id = start_res.json()["id"]

        def current():
            state = client.get(f"/api/runs/{run_id}/state")
            assert state.status_code == 200, state.text
            return state.json()

        def rate(card_id, answers, rating):
            res = client.post(
                f"/api/run_cards/{card_id}/rate",
                json={"ratings": {a["field_def_id"]: rating for a in answers}},
            )
            assert res.status_code == 200, res.text
            return res.json()

        for _ in range(2):
            card = current()["current_card"]
            result = rate(card["run_card_id"], card["answers"], 4)
            assert result["requeued_run_card"] is None

        last = current()["current_card"]
        result = rate(last["run_card_id"], last["answers"], 1)
        requeued = result["requeued_run_card"]
        assert requeued is not None
        assert requeued["status"] == "pending"
        assert requeued["position"] == 2500

        state = current()
        assert state["status"] == "active"
        assert state["current_card"]["run_card_id"] == requeued["id"]
        assert state["current_card"]["attempt"] == 2

        retry = state["current_card"]
        result = rate(retry["run_card_id"], retry["answers"], 1)
        second = result["requeued_run_card"]
        assert second is not None
        assert second["position"] == 3000

        retry = current()["current_card"]
        assert retry["run_card_id"] == second["id"]
        result = rate(retry["run_card_id"], retry["answers"], 4)
        assert result["requeued_run_card"] is None

        state = current()
        assert state["status"] == "completed"
        assert state["current_card"] is None
        assert state["progress"]["passed"] == 3

    def test_hard_fail_lands_after_exactly_three_pending_with_four_or_more(
        self,
        db,
        client,
        existing_user,
        existing_deck,
        deck_cards,
        deck_practice,
        deck_fields,
    ):
        self._add_cards(client, existing_deck, deck_fields, 2, start_at=3)  # 5 cards total
        strategy = EmaStrategy()
        practice_id = uuid.UUID(deck_practice["id"])
        run = start_run(db, strategy, existing_user.id, practice_id, rng=random.Random(1)
        )
        db.commit()

        original = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).first()
        assert original is not None

        ratings = {answer_id: 1 for answer_id in original.answers}  # hard fail: index 0
        _, requeued = submit_rating(
            db, strategy, existing_user.id, original.id, ratings, rng=random.Random(2)
        )
        db.commit()
        assert requeued is not None

        pending = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).all()
        # 5 started; the original leaves pending (now failed) and the requeue takes
        # its place, so the pending count is unchanged — but the floor keeps the
        # requeue from necessarily being first.
        assert len(pending) == 5
        assert pending[3].id == requeued.id  # exactly 3 pending cards ahead of it

    def test_readiness_index_deeper_than_the_floor_wins(self):
        """Direct test of `_insertion_position`: six pending cards at strictly
        ascending readiness, a new_readiness above every one of them (readiness_index=6, well
        past RETRY_SPACING_FLOOR=3) must land after all six — the clamp only ever
        raises the floor, it never caps a deeper index back down to it (a clamp, not a
        fixed placement)."""
        pending = [(self._card_at(i * _POSITION_GAP), i / 10) for i in range(6)]

        position = _insertion_position(pending, new_readiness=1.0)

        assert position > pending[-1][0].position

    def test_end_of_queue_position_is_run_max_plus_half_gap(self):
        assert _end_of_queue_position(53000) == 53500

    def test_insertion_position_requires_the_floors_worth_of_pending(self):
        with pytest.raises(AssertionError):
            _insertion_position([(self._card_at(0), 0.5)], 0.0)

    def test_retry_spacing_floor_is_at_least_one(self):
        """`_insertion_position` indexes `pending[final_index - 1]` whenever it runs,
        which needs the floor to be at least 1; a floor of 0 would need a
        no-predecessor branch."""
        assert RETRY_SPACING_FLOOR >= 1

    def test_failing_the_same_card_again_reapplies_the_floor(
        self,
        db,
        client,
        existing_user,
        existing_deck,
        deck_cards,
        deck_practice,
        deck_fields,
    ):
        # 8 cards at 0..7000: after the retry reaches the front, enough remain pending
        # for its second failure to go through the floor again.
        self._add_cards(client, existing_deck, deck_fields, 5, start_at=3)
        strategy = EmaStrategy()
        practice_id = uuid.UUID(deck_practice["id"])
        run = start_run(db, strategy, existing_user.id, practice_id, rng=random.Random(1)
        )
        db.commit()

        original = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).first()
        assert original is not None

        ratings = {answer_id: 1 for answer_id in original.answers}
        _, first_requeue = submit_rating(
            db, strategy, existing_user.id, original.id, ratings, rng=random.Random(2)
        )
        db.commit()
        assert first_requeue is not None

        pending_after_first = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).all()
        assert pending_after_first[3].id == first_requeue.id
        # Midpoint of 3000 and 4000: the failed card scores below every unreviewed
        # card, so the floor alone sets the index.
        assert first_requeue.position == 3500

        # Only the current card can be rated: pass the three cards ahead of the retry
        # so it reaches the front.
        for _ in range(3):
            front = db_read_current_run_card(db, run.id, existing_user.id)
            assert front is not None and front.id != first_requeue.id
            submit_rating(
                db,
                strategy,
                existing_user.id,
                front.id,
                {answer_id: 4 for answer_id in front.answers},
                rng=random.Random(4),
            )
            db.commit()
        current = db_read_current_run_card(db, run.id, existing_user.id)
        assert current is not None and current.id == first_requeue.id

        # Fail the requeued row itself, now at the front: a second attempt at the same
        # card_id.
        ratings_2 = {answer_id: 1 for answer_id in first_requeue.answers}
        _, second_requeue = submit_rating(
            db, strategy, existing_user.id, first_requeue.id, ratings_2, rng=random.Random(3)
        )
        db.commit()
        assert second_requeue is not None
        assert second_requeue.card_id == original.card_id

        pending_after_second = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).all()
        # Re-applied fresh against whatever's pending now, not carried over from the
        # first requeue's own placement: 4000, 5000, 6000, then the retry, then 7000.
        assert pending_after_second[3].id == second_requeue.id
        assert second_requeue.position == 6500


class TestPositionCollisionFallback:
    def test_renumber_and_retry_on_collision(
        self,
        db,
        client,
        existing_user,
        existing_deck,
        deck_cards,
        deck_practice,
        deck_fields,
        monkeypatch,
    ):
        """Forces the computed insertion position to collide with an existing pending
        card's position, so the requeue must hit db_stage_renumber_pending_run_cards
        and succeed on the retry. The natural (non-stubbed) insertion formula never
        collides on its own with the gaps a fresh run leaves, so the stub makes the
        collision deterministic instead of trying to engineer readiness precisely
        enough to collide. Five cards, so four stay pending after the fail and the
        requeue takes the enough-cards branch that calls `_insertion_position`."""
        import app.services.run as run_module

        TestRetrySpacingFloor._add_cards(client, existing_deck, deck_fields, 2, start_at=3)
        strategy = EmaStrategy()
        practice_id = uuid.UUID(deck_practice["id"])

        run = start_run(db, strategy, existing_user.id, practice_id, rng=random.Random(7)
        )
        db.commit()

        pending = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).all()
        assert len(pending) == 5

        target, occupied = pending[0], pending[1]
        collision = occupied.position
        assert collision == 1000

        monkeypatch.setattr(
            run_module, "_insertion_position", lambda *a, **k: collision
        )

        ratings = {answer_id: 1 for answer_id in target.answers}
        rated, requeued = submit_rating(
            db, strategy, existing_user.id, target.id, ratings, rng=random.Random(3)
        )
        db.commit()

        assert rated.status == RunCardStatus.failed
        assert requeued is not None
        assert requeued.status == RunCardStatus.pending
        # Succeeded only because renumbering moved `occupied` off of 1000, freeing the
        # position the (stubbed) insertion logic keeps insisting on.
        assert requeued.position == collision
        db.refresh(occupied)
        assert occupied.position != collision

        positions = db.exec(
            select(RunCard.position).where(
                RunCard.run_id == run.id,
                RunCard.status == RunCardStatus.pending,
            )
        ).all()
        assert len(positions) == len(set(positions))


class TestBlankValueGenerationFilter:
    """A field a card left blank (``""``, the dense-with-empty-string state every
    active field always has) can never be selected as that card's prompt or answer,
    fixed or pool, on either side — `db_fetch_generation_candidates` drops it from
    the join entirely, so no amount of resampling can surface it."""

    def test_blank_pool_field_never_drawn(self, client, db, existing_deck, deck_fields):
        f = deck_fields
        values = {str(fid): f"filled-{name}" for name, fid in f.items()}
        values[str(f["pool_a1"])] = ""
        res = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert res.status_code == 201, res.text
        card_id = uuid.UUID(res.json()["id"])

        strategy = EmaStrategy()
        # Two non-blank pool survivors (pool_a2, pool_a3) requested in full: if the
        # blank pool_a1 were still a candidate, drawing all survivors would sometimes
        # include it. It never does, because it was never a candidate.
        answers = resolve_prompts_or_answers(
            db,
            strategy,
            card_id,
            fixed_ids=[],
            pool_ids=[f["pool_a1"], f["pool_a2"], f["pool_a3"]],
            pool_counts=[2],
            rng=random.Random(1),
        )
        assert set(answers) == {f["pool_a2"], f["pool_a3"]}
        assert f["pool_a1"] not in answers

    def test_blank_fixed_answer_excluded_card_still_generates(
        self, client, db, existing_deck, deck_fields
    ):
        f = deck_fields
        values = {str(fid): f"filled-{name}" for name, fid in f.items()}
        values[str(f["answer1"])] = ""  # blank fixed answer field
        res = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert res.status_code == 201, res.text
        card_id = uuid.UUID(res.json()["id"])

        strategy = EmaStrategy()
        resolved = generate_run_card_fields(
            db,
            strategy,
            card_id,
            prompt_field_ids=[f["prompt1"]],
            answer_field_ids=[f["answer1"]],
            prompt_pool_ids=[],
            prompt_pool_counts=[],
            answer_pool_ids=[f["pool_a1"], f["pool_a2"], f["pool_a3"]],
            answer_pool_counts=[1],
            rng=random.Random(1),
        )
        assert resolved is not None
        prompts, answers = resolved
        assert prompts == [f["prompt1"]]
        assert f["answer1"] not in answers
        assert len(answers) == 1
        assert answers[0] in {f["pool_a1"], f["pool_a2"], f["pool_a3"]}

    def test_all_blank_answer_side_skips_card_generation(
        self, client, db, existing_deck, deck_fields
    ):
        f = deck_fields
        values = {str(fid): f"filled-{name}" for name, fid in f.items()}
        for name in ("answer1", "pool_a1", "pool_a2", "pool_a3"):
            values[str(f[name])] = ""  # every candidate answer field left blank
        res = client.post("/api/cards", json={"deck_id": existing_deck["id"], "values": values})
        assert res.status_code == 201, res.text
        card_id = uuid.UUID(res.json()["id"])

        strategy = EmaStrategy()
        resolved = generate_run_card_fields(
            db,
            strategy,
            card_id,
            prompt_field_ids=[f["prompt1"]],
            answer_field_ids=[f["answer1"]],
            prompt_pool_ids=[],
            prompt_pool_counts=[],
            answer_pool_ids=[f["pool_a1"], f["pool_a2"], f["pool_a3"]],
            answer_pool_counts=[1],
            rng=random.Random(1),
        )
        assert resolved is None


_ARRAYS = (
    "prompt_field_ids",
    "answer_field_ids",
    "prompt_pool_ids",
    "prompt_pool_counts",
    "answer_pool_ids",
    "answer_pool_counts",
)


def _decks(configurations: list[dict]) -> dict:
    """create_practice's decks from configurations, each its deck_id and six columns."""
    return {
        c["deck_id"]: configuration(
            c["prompt_field_ids"],
            c["answer_field_ids"],
            c["prompt_pool_ids"],
            c["prompt_pool_counts"],
            c["answer_pool_ids"],
            c["answer_pool_counts"],
        )
        for c in configurations
    }


def _start(client, configurations: list[dict]) -> dict:
    """Starts the first run of a new practice asking each deck by its configuration."""
    return start_practice(client, _decks(configurations))


def _finish_run(client, run_id):
    """Drives a run to completion by passing every card as it comes up (rating 4
    on every answer field) — a pass never requeues, so this always terminates once the
    run's run_cards run out."""
    for _ in range(50):
        state = client.get(f"/api/runs/{run_id}/state").json()
        if state["current_card"] is None:
            return
        card = state["current_card"]
        ratings = {a["field_def_id"]: 4 for a in card["answers"]}
        res = client.post(
            f"/api/run_cards/{card['run_card_id']}/rate", json={"ratings": ratings}
        )
        assert res.status_code == 200, res.text
    raise AssertionError(f"run {run_id} never reported current_card: null")


def _bare_run_card(card_id, status):
    """An unpersisted RunCard for run_progress's pure-function tests below —
    the fold only reads card_id and status, and requires callers to already hand it
    cards in created_at-ascending order (list position stands in for that here)."""
    return RunCard(
        run_id=uuid.uuid4(),
        card_id=card_id,
        position=0,
        prompts=[],
        answers=[],
        status=status,
    )


class TestNoCards:
    """A run that generates nothing is refused rather than created empty. Emptiness is a
    property of the whole practice — one cardless deck alongside a deck that generates is
    fine — and it is only knowable after generation has run, because a card that is legal
    can still be blank in every field one side shows."""

    def test_start_refuses_a_deck_with_no_cards(self, client, db, existing_deck, existing_field_defs):
        practice = create_practice(client, {existing_deck["id"]: None})

        res = client.post(f"/api/practices/{practice['id']}/runs")
        assert res.status_code == 400, res.text
        assert res.json()["detail"] == {
            "code": "no_cards",
            "message": "the run's copies generated no run card",
        }
        # Nothing persisted: the refusal precedes the only commit, so the run and its
        # copies go out with the discarded transaction.
        assert db.exec(select(Run)).all() == []
        assert client.get(f"/api/practices/{practice['id']}").json()["runs"] == []

    def test_start_succeeds_when_any_deck_has_cards(
        self, client, deck_cards, deck_configuration
    ):
        empty_deck = client.post(
            "/api/decks",
            json={
                "name": "Empty deck",
                "field_defs": [{"name": "q", "type": "text"}, {"name": "a", "type": "text"}],
            },
        )
        assert empty_deck.status_code == 201, empty_deck.text
        assert empty_deck.json()["cards"] == []

        run = start_practice(
            client,
            {**_decks([deck_configuration]), empty_deck.json()["id"]: None},
        )

        state = client.get(f"/api/runs/{run['id']}/state")
        assert state.status_code == 200, state.text
        assert state.json()["progress"]["total_cards"] == 3

    def test_start_refuses_when_every_card_is_blank_on_one_side(
        self, client, existing_deck, existing_field_defs
    ):
        """The second cause, invisible to a card count: the deck has a card, but its
        answer side is blank, and a blank field is excluded from generation."""
        front, back = existing_field_defs
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {front["id"]: "a", back["id"]: ""}},
        )
        assert card.status_code == 201, card.text
        practice = create_practice(
            client, {existing_deck["id"]: configuration([front["id"]], [back["id"]])}
        )

        res = client.post(f"/api/practices/{practice['id']}/runs")
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "no_cards"

    def test_rerun_refuses_when_no_card_generates(self, client, deck_cards, deck_configuration):
        """Every configuration still validates — its fields are all live — so only the
        post-generation count catches the emptied deck."""
        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])

        for card_id in deck_cards:
            deleted = client.delete(f"/api/cards/{card_id}")
            assert deleted.status_code == 204, deleted.text

        res = _rerun(client, run["id"])
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "no_cards"
        assert client.get(f"/api/runs/{run['id']}").status_code == 200


class TestRunEmptiedByDeckDeletion:
    """A run left with no run_configuration at all is deleted alongside its last deck,
    and its practice stays. A run that still has another deck's copy survives the loss of
    just one."""

    def test_run_is_gone_after_its_only_deck_is_deleted(self, client, two_deck_library):
        lib = two_deck_library
        run = start_practice(client, {lib["decks"]["a"]["id"]: None})

        deleted = client.delete(f"/api/decks/{lib['decks']['a']['id']}")
        assert deleted.status_code == 204, deleted.text

        assert client.get(f"/api/runs/{run['id']}").status_code == 404
        practice = client.get(f"/api/practices/{run['practice_id']}").json()
        assert practice["decks"] == []
        assert practice["runs"] == []

    def test_a_run_losing_one_of_two_decks_survives_without_it(self, client, two_deck_library):
        lib = two_deck_library
        run = start_practice(
            client, {lib["decks"]["a"]["id"]: None, lib["decks"]["b"]["id"]: None}
        )
        assert client.delete(f"/api/decks/{lib['decks']['a']['id']}").status_code == 204

        assert client.get(f"/api/runs/{run['id']}").status_code == 200
        practice = client.get(f"/api/practices/{run['practice_id']}").json()
        assert [deck["deck_name"] for deck in practice["decks"]] == ["Beta"]


class TestRunProgressFold:
    """run_progress as a pure function, no DB or generation involved — the
    chain/bucket rule itself, independent of how a chain came to look that way."""

    def test_all_four_buckets_from_each_chains_last_row(self):
        unseen_id, retry_id, passed_id, stuck_id = (uuid.uuid4() for _ in range(4))
        cards = [
            _bare_run_card(unseen_id, RunCardStatus.pending),  # length 1 -> unseen
            _bare_run_card(retry_id, RunCardStatus.failed),
            _bare_run_card(retry_id, RunCardStatus.pending),  # length 2 -> retry_pending
            _bare_run_card(passed_id, RunCardStatus.passed),
            _bare_run_card(stuck_id, RunCardStatus.failed),  # no successor -> still_failed
        ]

        progress = run_progress(cards)

        assert progress.total_cards == 4
        assert progress.unseen == 1
        assert progress.retry_pending == 1
        assert progress.passed == 1
        assert progress.still_failed == 1

    def test_still_failed_regardless_of_chain_length(self):
        card_id = uuid.uuid4()
        cards = [
            _bare_run_card(card_id, RunCardStatus.failed),
            _bare_run_card(card_id, RunCardStatus.pending),
            _bare_run_card(card_id, RunCardStatus.failed),  # last row: no successor
        ]

        progress = run_progress(cards)

        assert progress.total_cards == 1
        assert progress.still_failed == 1
        assert progress.unseen == progress.retry_pending == progress.passed == 0

    def test_empty_session_is_all_zero(self):
        progress = run_progress([])
        assert progress.total_cards == 0
        assert progress.unseen == progress.retry_pending == 0
        assert progress.passed == progress.still_failed == 0


class TestRunState:
    """GET .../state — all server-side composition: resolved field values, the
    fixed-total progress fold, and the active->completed transition inherited from
    get_current_run_card."""

    def test_resolves_fields_in_position_order_regardless_of_config_array_order(
        self, client, existing_deck
    ):
        # Created in this order, so field_def.position is b=0, a=1, answer=2. The
        # config below lists the prompts in the opposite (a, b) order on purpose: the
        # response must reorder by position, not echo the config's array order.
        b = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "b_prompt", "type": "text"}
        ).json()
        a = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "a_prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()

        card = client.post(
            "/api/cards",
            json={
                "deck_id": existing_deck["id"],
                "values": {b["id"]: "B value", a["id"]: "A value", answer["id"]: "Answer value"},
            },
        )
        assert card.status_code == 201, card.text

        config = {
                "deck_id": existing_deck["id"],
                "prompt_field_ids": [a["id"], b["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            }

        run = _start(client, [config])
        state = client.get(f"/api/runs/{run['id']}/state")
        assert state.status_code == 200, state.text
        data = state.json()

        assert data["practice_id"] == run["practice_id"]
        practice = client.get(f"/api/practices/{run['practice_id']}").json()
        assert data["practice_name"] == practice["name"]
        assert data["day"] == run["day"]
        assert data["day_index"] == 0
        assert data["status"] == "active"
        assert data["progress"] == {
            "total_cards": 1,
            "unseen": 1,
            "retry_pending": 0,
            "passed": 0,
            "still_failed": 0,
        }

        prompts = data["current_card"]["prompts"]
        assert [p["field_def_id"] for p in prompts] == [b["id"], a["id"]]
        assert [p["name"] for p in prompts] == ["b_prompt", "a_prompt"]
        assert [p["value"] for p in prompts] == ["B value", "A value"]
        assert all(p["type"] == "text" for p in prompts)

        assert data["current_card"]["answers"] == [
            {
                "field_def_id": answer["id"],
                "name": "answer",
                "type": "text",
                "value": "Answer value",
            }
        ]

    def test_value_is_passed_through_blank_if_edited_blank_after_generation(
        self, client, existing_deck
    ):
        """A blank field is only kept out of *candidacy* at generation time; once a
        field has been drawn onto a run_card, later edits to the card are
        resolved as-is, blank included — the run endpoint doesn't re-filter."""
        prompt = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()
        card = client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {prompt["id"]: "Q", answer["id"]: "A"}},
        ).json()
        config = {
                "deck_id": existing_deck["id"],
                "prompt_field_ids": [prompt["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            }
        run = _start(client, [config])

        patch = client.patch(f"/api/cards/{card['id']}", json={"values": {answer["id"]: ""}})
        assert patch.status_code == 200, patch.text

        state = client.get(f"/api/runs/{run['id']}/state").json()
        assert state["current_card"]["answers"] == [
            {
                "field_def_id": answer["id"],
                "name": "answer",
                "type": "text",
                "value": "",
            }
        ]

    def test_deleting_a_field_deletes_the_active_practice_naming_it(self, client, existing_deck):
        prompt = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()
        # A third field so deleting `answer` doesn't hit the deck's two-field floor.
        client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "filler", "type": "text"}
        )
        client.post(
            "/api/cards",
            json={"deck_id": existing_deck["id"], "values": {prompt["id"]: "Q", answer["id"]: "A"}},
        )
        config = {
                "deck_id": existing_deck["id"],
                "prompt_field_ids": [prompt["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            }
        run = _start(client, [config])
        assert client.get(f"/api/runs/{run['id']}/state").status_code == 200

        deleted = client.delete(f"/api/fields/{answer['id']}")
        assert deleted.status_code == 204, deleted.text

        assert client.get(f"/api/runs/{run['id']}/state").status_code == 404

    def test_attempt_increments_on_a_requeued_row(
        self, client, existing_user, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])

        first = client.get(f"/api/runs/{run['id']}/state").json()["current_card"]
        assert first["attempt"] == 1

        ratings = {a["field_def_id"]: 1 for a in first["answers"]}  # rating 1 -> fail
        rate = client.post(
            f"/api/run_cards/{first['run_card_id']}/rate", json={"ratings": ratings}
        )
        assert rate.status_code == 200, rate.text
        assert rate.json()["requeued_run_card"] is not None

        # With only 2 other pending cards left, the retry's spacing floor
        # (RETRY_SPACING_FLOOR=3) clamps it to the end of the queue — pass both of the
        # others before the requeued row resurfaces as the current card.
        for _ in range(2):
            current = client.get(f"/api/runs/{run['id']}/state").json()[
                "current_card"
            ]
            assert current["card_id"] != first["card_id"]
            pass_ratings = {a["field_def_id"]: 4 for a in current["answers"]}
            passed = client.post(
                f"/api/run_cards/{current['run_card_id']}/rate",
                json={"ratings": pass_ratings},
            )
            assert passed.status_code == 200, passed.text

        second = client.get(f"/api/runs/{run['id']}/state").json()["current_card"]
        assert second["card_id"] == first["card_id"]
        assert second["run_card_id"] != first["run_card_id"]
        assert second["attempt"] == 2

    def test_current_card_null_and_session_completed_once_nothing_pending(
        self, client, existing_user, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])

        for _ in range(len(deck_cards) + 5):  # generous bound; a pass never requeues
            state = client.get(f"/api/runs/{run['id']}/state").json()
            if state["current_card"] is None:
                break
            card = state["current_card"]
            ratings = {a["field_def_id"]: 4 for a in card["answers"]}
            rate = client.post(
                f"/api/run_cards/{card['run_card_id']}/rate", json={"ratings": ratings}
            )
            assert rate.status_code == 200, rate.text
        else:
            pytest.fail("run never reported current_card: null")

        final = client.get(f"/api/runs/{run['id']}/state").json()
        assert final["current_card"] is None
        assert final["status"] == "completed"

    def test_progress_counts_all_four_buckets_end_to_end(self, client, db, existing_deck):
        """Exercises the stranded-card case for real: a card fails after its only
        answer value is blanked mid-run, so the requeue finds nothing to generate
        from and the chain ends on `failed` with no successor — still_failed, alongside
        one untouched (unseen), one failed-then-requeued (retry_pending), and one
        passed-first-try card, all counted against the same fixed `total_cards`. Roles
        go by queue position, since only the current card can be rated: the front card
        fails and requeues, the second passes, the third fails after the blanking, the
        fourth is never seen mid-run."""
        prompt = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()

        def make_card(tag):
            res = client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {prompt["id"]: f"{tag} prompt", answer["id"]: f"{tag} answer"},
                },
            )
            assert res.status_code == 201, res.text
            return res.json()["id"]

        card_ids = [make_card(f"card{i}") for i in range(4)]

        config = {
                "deck_id": existing_deck["id"],
                "prompt_field_ids": [prompt["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            }

        run = _start(client, [config])
        run_id = uuid.UUID(run["id"])

        rows = db.exec(select(RunCard).where(RunCard.run_id == run_id)).all()
        assert {str(pc.card_id) for pc in rows} == set(card_ids)
        queue = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run_id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).all()
        assert [pc.position for pc in queue] == [0, 1000, 2000, 3000]

        # queue[0]: fails while `answer` is still live -> requeues -> retry_pending.
        fail_retry = client.post(
            f"/api/run_cards/{queue[0].id}/rate",
            json={"ratings": {answer["id"]: 1}},
        )
        assert fail_retry.status_code == 200, fail_retry.text
        requeued = fail_retry.json()["requeued_run_card"]
        assert requeued is not None
        assert requeued["position"] == 3500

        # queue[1]: passes on the first try -> passed.
        pass_res = client.post(
            f"/api/run_cards/{queue[1].id}/rate",
            json={"ratings": {answer["id"]: 4}},
        )
        assert pass_res.status_code == 200, pass_res.text

        # Blank the third card's only answer value: its requeue has nothing left to
        # draw from.
        blank_res = client.patch(
            f"/api/cards/{queue[2].card_id}", json={"values": {answer["id"]: ""}}
        )
        assert blank_res.status_code == 200, blank_res.text

        # queue[2]: fails after the blanking -> zero surviving answer candidates ->
        # no successor -> still_failed.
        fail_stuck = client.post(
            f"/api/run_cards/{queue[2].id}/rate",
            json={"ratings": {answer["id"]: 1}},
        )
        assert fail_stuck.status_code == 200, fail_stuck.text
        assert fail_stuck.json()["requeued_run_card"] is None

        mid_run = client.get(f"/api/runs/{run['id']}/state")
        assert mid_run.status_code == 200, mid_run.text
        mid_data = mid_run.json()
        assert mid_data["status"] == "active"
        assert mid_data["progress"] == {
            "total_cards": 4,
            "unseen": 1,
            "retry_pending": 1,
            "passed": 1,
            "still_failed": 1,
        }
        assert mid_data["current_card"]["run_card_id"] == str(queue[3].id)

        # Clear the two remaining pending rows in queue order (queue[3]'s original row,
        # then queue[0]'s requeued row) to drive the run to completion.
        for run_card_id in (str(queue[3].id), requeued["id"]):
            res = client.post(
                f"/api/run_cards/{run_card_id}/rate",
                json={"ratings": {answer["id"]: 4}},
            )
            assert res.status_code == 200, res.text

        final = client.get(f"/api/runs/{run['id']}/state")
        assert final.status_code == 200, final.text
        final_data = final.json()
        assert final_data["current_card"] is None
        assert final_data["status"] == "completed"
        assert final_data["progress"] == {
            "total_cards": 4,
            "unseen": 0,
            "retry_pending": 0,
            "passed": 3,
            "still_failed": 1,
        }

    def test_404_for_unknown_session(self, client):
        assert client.get(f"/api/runs/{uuid.uuid4()}/state").status_code == 404

    def test_404_for_foreign_session(
        self, client, act_as, other_user, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        act_as(other_user)
        assert client.get(f"/api/runs/{run['id']}/state").status_code == 404


class TestBreakdown:
    """GET .../breakdown — the completion dataset, only ever built for a run with
    nothing pending."""

    def _setup_deck(self, client, existing_deck):
        """A 4-field deck: `title` (position 0, the primary field, kept out of the
        practice config so its value never changes across attempts), `prompt` and
        `answer` (the config's only fixed fields — no pool, so generation is
        deterministic), and `filler` (never named by the config and never set on a
        card)."""
        title = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "title", "type": "text"}
        ).json()
        prompt = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "prompt", "type": "text"}
        ).json()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()
        client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "filler", "type": "text"}
        )

        config = {
                "deck_id": existing_deck["id"],
                "prompt_field_ids": [prompt["id"]],
                "answer_field_ids": [answer["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            }
        return title, prompt, answer, config

    def _make_card(self, client, existing_deck, title, prompt, answer, tag, title_value):
        res = client.post(
            "/api/cards",
            json={
                "deck_id": existing_deck["id"],
                "values": {
                    title["id"]: title_value,
                    prompt["id"]: f"{tag} prompt",
                    answer["id"]: f"{tag} answer",
                    # filler intentionally omitted — the create endpoint's dense write
                    # backfills it as "".
                },
            },
        )
        assert res.status_code == 201, res.text
        return res.json()["id"]

    def test_full_breakdown_lists_every_card_once(self, client, db, existing_deck):
        """The stuck card lives in a second deck, and its only answer value is blanked
        right after the run starts: only the current card can be rated, and a single
        deck of four cannot fail one card twice before the blanking and still leave
        another unrated until after it. The run is driven from the state endpoint with
        a per-card rating script, so any starting order gives the same outcome."""
        title, prompt, answer, config = self._setup_deck(client, existing_deck)

        first_card = self._make_card(client, existing_deck, title, prompt, answer, "first", "")
        retry_card = self._make_card(
            client, existing_deck, title, prompt, answer, "retry", "Retry Card"
        )
        many_card = self._make_card(
            client, existing_deck, title, prompt, answer, "many", "Many Card"
        )

        stuck_deck = client.post(
            "/api/decks",
            json={
                "name": "Stuck deck",
                "field_defs": [
                    {"name": "prompt", "type": "text"},
                    {"name": "answer", "type": "text"},
                    {"name": "filler", "type": "text"},
                ],
            },
        )
        assert stuck_deck.status_code == 201, stuck_deck.text
        stuck_deck = stuck_deck.json()
        stuck_fields = {fd["name"]: fd["id"] for fd in stuck_deck["field_defs"]}
        stuck_res = client.post(
            "/api/cards",
            json={
                "deck_id": stuck_deck["id"],
                "values": {
                    stuck_fields["prompt"]: "stuck prompt",
                    stuck_fields["answer"]: "stuck answer",
                    stuck_fields["filler"]: "x",
                },
            },
        )
        assert stuck_res.status_code == 201, stuck_res.text
        stuck_card = stuck_res.json()["id"]
        stuck_config = {
                "deck_id": stuck_deck["id"],
                "prompt_field_ids": [stuck_fields["prompt"]],
                "answer_field_ids": [stuck_fields["answer"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            }

        run = _start(client, [config, stuck_config])
        run_id = uuid.UUID(run["id"])

        # Blank the stuck card's only answer value: its requeue has nothing to draw
        # from, while the first deck's requeues are unaffected.
        blanked = client.patch(
            f"/api/cards/{stuck_card}", json={"values": {stuck_fields["answer"]: ""}}
        )
        assert blanked.status_code == 200, blanked.text

        by_card_id = {
            str(pc.card_id): pc.id
            for pc in db.exec(
                select(RunCard).where(RunCard.run_id == run_id)
            ).all()
        }
        assert set(by_card_id) == {first_card, retry_card, many_card, stuck_card}

        # Each card's ratings in turn; the stuck card's requeue is blocked.
        script = {
            first_card: [4],
            retry_card: [1, 4],
            many_card: [1, 1, 4],
            stuck_card: [1],
        }
        for _ in range(7):
            state = client.get(f"/api/runs/{run['id']}/state")
            assert state.status_code == 200, state.text
            card = state.json()["current_card"]
            assert card is not None
            rating = script[card["card_id"]].pop(0)
            res = client.post(
                f"/api/run_cards/{card['run_card_id']}/rate",
                json={"ratings": {a["field_def_id"]: rating for a in card["answers"]}},
            )
            assert res.status_code == 200, res.text
            requeued = res.json()["requeued_run_card"]
            if rating == 1 and card["card_id"] != stuck_card:
                assert requeued is not None
            else:
                assert requeued is None
        assert all(ratings == [] for ratings in script.values())

        # The run must now report completed — nothing pending anywhere.
        state = client.get(f"/api/runs/{run['id']}/state")
        assert state.json()["current_card"] is None
        assert state.json()["status"] == "completed"

        res = client.get(f"/api/runs/{run['id']}/breakdown")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["total_cards"] == 4
        assert set(data) == {"total_cards", "cards"}

        cards_by_id = {c["card_id"]: c for c in data["cards"]}
        assert len(data["cards"]) == 4
        assert set(cards_by_id) == {first_card, retry_card, many_card, stuck_card}

        # Nothing says how many attempts a card took or whether it passed.
        for card in data["cards"]:
            assert set(card) == {
                "card_id",
                "primary_field",
                "readiness",
                "delta",
                "change",
                "fields",
                "attempts",
            }
            for attempt in card["attempts"]:
                assert set(attempt) == {"run_card_id", "prompts", "answers"}

        # The blank-primary-field case: value is passed through as "", not a fallback.
        assert cards_by_id[first_card]["primary_field"] == {
            "field_def_id": title["id"],
            "name": "title",
            "type": "text",
            "value": "",
        }

        assert cards_by_id[retry_card]["primary_field"]["value"] == "Retry Card"
        retry_attempts = cards_by_id[retry_card]["attempts"]
        retry_rows = db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run_id,
                RunCard.card_id == uuid.UUID(retry_card),
            )
            .order_by(RunCard.created_at)
        ).all()
        assert [a["run_card_id"] for a in retry_attempts] == [str(r.id) for r in retry_rows]
        assert [a["answers"][0]["rating"] for a in retry_attempts] == [1, 4]
        assert all(a["prompts"][0]["value"] == "retry prompt" for a in retry_attempts)
        assert all(a["answers"][0]["value"] == "retry answer" for a in retry_attempts)

        # Only the fields an attempt named, with their sides: never `title` or `filler`.
        for card_id in (first_card, retry_card, many_card):
            assert [(f["name"], f["side"]) for f in cards_by_id[card_id]["fields"]] == [
                ("prompt", "prompt"),
                ("answer", "answer"),
            ]

        many_attempts = cards_by_id[many_card]["attempts"]
        assert [a["answers"][0]["rating"] for a in many_attempts] == [1, 1, 4]

        stuck_attempts = cards_by_id[stuck_card]["attempts"]
        assert stuck_attempts[0]["answers"][0]["rating"] == 1
        # `answer` was blanked before this attempt; the field still resolves.
        assert stuck_attempts[0]["answers"][0]["name"] == "answer"
        assert [(f["name"], f["side"]) for f in cards_by_id[stuck_card]["fields"]] == [
            ("prompt", "prompt"),
            ("answer", "answer"),
        ]

        # Ordered by first attempt's position ascending.
        first_rows_by_card: dict[str, RunCard] = {}
        for pc in db.exec(
            select(RunCard)
            .where(RunCard.run_id == run_id)
            .order_by(RunCard.created_at)
        ).all():
            first_rows_by_card.setdefault(str(pc.card_id), pc)
        expected_order = [
            card_id
            for card_id, _ in sorted(first_rows_by_card.items(), key=lambda item: item[1].position)
        ]
        assert [c["card_id"] for c in data["cards"]] == expected_order

    def test_409_while_active(self, client, existing_deck):
        title, prompt, answer, config = self._setup_deck(client, existing_deck)
        self._make_card(client, existing_deck, title, prompt, answer, "solo", "Solo Card")
        run = _start(client, [config])

        res = client.get(f"/api/runs/{run['id']}/breakdown")
        assert res.status_code == 409, res.text
        assert res.json()["detail"]["code"] == "run_active"

    def test_404_for_unknown_session(self, client):
        assert client.get(f"/api/runs/{uuid.uuid4()}/breakdown").status_code == 404

    def test_404_for_foreign_session(
        self, client, act_as, other_user, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        for _ in range(len(deck_cards) + 5):
            state = client.get(f"/api/runs/{run['id']}/state").json()
            if state["current_card"] is None:
                break
            card = state["current_card"]
            ratings = {a["field_def_id"]: 4 for a in card["answers"]}
            client.post(
                f"/api/run_cards/{card['run_card_id']}/rate",
                json={"ratings": ratings},
            )

        act_as(other_user)
        assert client.get(f"/api/runs/{run['id']}/breakdown").status_code == 404

    def test_breakdown_statement_count_is_fixed(
        self,
        client,
        existing_user,
        deck_cards,
        deck_configuration,
        statement_counter,
    ):
        """The breakdown's statements against card, field_def and mastery_log are fixed:
        they must not grow with the run's cards, its decks or their fields. One card on a
        fresh two-field deck, and that deck's card with three more on deck_fields'
        eight-field deck, must report the same nonzero counts."""
        small_deck = client.post(
            "/api/decks",
            json={
                "name": "Small breakdown deck",
                "field_defs": [
                    {"name": "front", "type": "text"},
                    {"name": "back", "type": "text"},
                ],
            },
        ).json()
        front_id, back_id = (fd["id"] for fd in small_deck["field_defs"])
        client.post(
            "/api/cards",
            json={"deck_id": small_deck["id"], "values": {front_id: "Q", back_id: "A"}},
        )
        small_config = {
                "deck_id": small_deck["id"],
                "prompt_field_ids": [front_id],
                "answer_field_ids": [back_id],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            }

        def _complete(run_id):
            for _ in range(50):
                run = client.get(f"/api/runs/{run_id}/state").json()
                if run["current_card"] is None:
                    break
                current = run["current_card"]
                ratings = {a["field_def_id"]: 4 for a in current["answers"]}
                res = client.post(
                    f"/api/run_cards/{current['run_card_id']}/rate",
                    json={"ratings": ratings},
                )
                assert res.status_code == 200, res.text

        small_run = _start(client, [small_config])
        _complete(small_run["id"])

        large_run = _start(client, [deck_configuration, small_config]
        )
        _complete(large_run["id"])

        counters = {table: statement_counter(table) for table in ("card", "field_def", "mastery_log")}

        def _counts(run_id):
            for counter in counters.values():
                counter.reset()
            res = client.get(f"/api/runs/{run_id}/breakdown")
            assert res.status_code == 200, res.text
            return res, {table: counter.count for table, counter in counters.items()}

        small_res, small_counts = _counts(small_run["id"])
        large_res, large_counts = _counts(large_run["id"])

        assert len(small_res.json()["cards"]) < len(large_res.json()["cards"])
        assert all(count > 0 for count in small_counts.values())
        assert small_counts == large_counts

    def test_deleted_fields_leave_every_attempt(self, client, existing_deck):
        """A field deleted after a practice completed leaves the breakdown's attempts
        on both sides, because the delete scrubs its id from every practice card."""
        title = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "title", "type": "text"}
        ).json()
        p1 = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "p1", "type": "text"}
        ).json()
        p2 = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "p2", "type": "text"}
        ).json()
        a1 = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "a1", "type": "text"}
        ).json()
        a2 = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "a2", "type": "text"}
        ).json()

        config = {
                "deck_id": existing_deck["id"],
                "prompt_field_ids": [p1["id"], p2["id"]],
                "answer_field_ids": [a1["id"], a2["id"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            }

        def make_card(tag):
            res = client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {
                        title["id"]: f"{tag} title",
                        p1["id"]: f"{tag} p1",
                        p2["id"]: f"{tag} p2",
                        a1["id"]: f"{tag} a1",
                        a2["id"]: f"{tag} a2",
                    },
                },
            )
            assert res.status_code == 201, res.text
            return res.json()["id"]

        card_one = make_card("one")
        card_two = make_card("two")

        run = _start(client, [config])
        _finish_run(client, run["id"])

        patch = client.patch(
            f"/api/decks/{existing_deck['id']}",
            json={
                "field_defs": {
                    "create": [],
                    "update": [],
                    "delete": [p2["id"], a2["id"]],
                    "order": [],
                }
            },
        )
        assert patch.status_code == 200, patch.text
        assert {fd["name"] for fd in patch.json()["field_defs"]} == {"title", "p1", "a1"}

        res = client.get(f"/api/runs/{run['id']}/breakdown")
        assert res.status_code == 200, res.text
        data = res.json()

        def every_key(node):
            if isinstance(node, dict):
                for key, value in node.items():
                    yield key
                    yield from every_key(value)
            elif isinstance(node, list):
                for value in node:
                    yield from every_key(value)

        assert 'removed' not in set(every_key(data))

        cards_by_id = {c["card_id"]: c for c in data["cards"]}
        assert set(cards_by_id) == {card_one, card_two}

        for card_id, card in cards_by_id.items():
            tag = "one" if card_id == card_one else "two"
            assert [fd["name"] for fd in card["fields"]] == ["p1", "a1"]
            for attempt in card["attempts"]:
                assert attempt["prompts"] == [
                    {"field_def_id": p1["id"], "name": "p1", "type": "text", "value": f"{tag} p1"}
                ]
                assert attempt["answers"] == [
                    {
                        "field_def_id": a1["id"],
                        "name": "a1",
                        "type": "text",
                        "value": f"{tag} a1",
                        "rating": 4,
                    }
                ]

    def test_resolver_drops_unknown_ids(self):
        """_resolve_field_values exercised directly: an id with no field_def row is
        dropped, and the live entries come out by position."""
        unknown = uuid.uuid4()
        assert _resolve_field_values({}, {}, [unknown]) == []

        first = FieldDef(
            id=uuid.uuid4(), deck_id=uuid.uuid4(), name="first", type=FieldType.text, position=0
        )
        second = FieldDef(
            id=uuid.uuid4(), deck_id=first.deck_id, name="second", type=FieldType.text, position=1
        )
        field_defs_by_id = {first.id: first, second.id: second}
        field_ids = [second.id, uuid.uuid4(), first.id, uuid.uuid4()]

        resolved = _resolve_field_values(field_defs_by_id, {}, field_ids)
        assert [r.field_def_id for r in resolved] == [first.id, second.id]

    def test_blanked_only_answer_field_ends_the_card_failed(self, client, existing_deck):
        """The one path a user reaches to a card that ends failed: a field delete
        removes the active practices naming the field, so clearing a card's only
        answer value while a practice uses it is what leaves the requeue nothing to
        generate from. The blank value passes through unlabelled in the breakdown's
        attempt detail."""
        fields = {}
        for name in ("prompt", "answer", "filler"):
            res = client.post(
                f"/api/decks/{existing_deck['id']}/fields", json={"name": name, "type": "text"}
            )
            assert res.status_code == 201, res.text
            fields[name] = res.json()["id"]

        card_ids = []
        for tag in ("one", "two"):
            res = client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {
                        fields["prompt"]: f"{tag} prompt",
                        fields["answer"]: f"{tag} answer",
                        fields["filler"]: f"{tag} filler",
                    },
                },
            )
            assert res.status_code == 201, res.text
            card_ids.append(res.json()["id"])

        config = {
                "deck_id": existing_deck["id"],
                "prompt_field_ids": [fields["prompt"]],
                "answer_field_ids": [fields["answer"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            }
        run = _start(client, [config])

        state = client.get(f"/api/runs/{run['id']}/state")
        assert state.status_code == 200, state.text
        blanked_card = state.json()["current_card"]
        assert blanked_card is not None
        assert [a["field_def_id"] for a in blanked_card["answers"]] == [fields["answer"]]

        patch = client.patch(
            f"/api/cards/{blanked_card['card_id']}", json={"values": {fields["answer"]: ""}}
        )
        assert patch.status_code == 200, patch.text

        rated = client.post(
            f"/api/run_cards/{blanked_card['run_card_id']}/rate",
            json={"ratings": {fields["answer"]: 1}},
        )
        assert rated.status_code == 200, rated.text
        assert rated.json()["requeued_run_card"] is None

        state = client.get(f"/api/runs/{run['id']}/state")
        assert state.status_code == 200, state.text
        assert state.json()["progress"] == {
            "total_cards": 2,
            "unseen": 1,
            "retry_pending": 0,
            "passed": 0,
            "still_failed": 1,
        }

        remaining = state.json()["current_card"]
        assert remaining is not None
        assert remaining["card_id"] != blanked_card["card_id"]
        rated = client.post(
            f"/api/run_cards/{remaining['run_card_id']}/rate",
            json={"ratings": {fields["answer"]: 4}},
        )
        assert rated.status_code == 200, rated.text

        state = client.get(f"/api/runs/{run['id']}/state")
        assert state.status_code == 200, state.text
        assert state.json()["status"] == "completed"
        assert state.json()["current_card"] is None

        res = client.get(f"/api/runs/{run['id']}/breakdown")
        assert res.status_code == 200, res.text
        data = res.json()

        cards_by_id = {c["card_id"]: c for c in data["cards"]}
        assert set(cards_by_id) == set(card_ids)
        entry = cards_by_id[blanked_card["card_id"]]
        assert [c["card_id"] for c in data["cards"]].count(blanked_card["card_id"]) == 1
        assert "bucket" not in entry
        [attempt] = entry["attempts"]
        assert "status" not in attempt
        [answer] = attempt["answers"]
        assert answer["value"] == ""
        assert answer["rating"] == 1


def _make_run(db, user_id, status=RunStatus.completed):
    practice = Practice(user_id=user_id, name=f"mastery delta test {uuid.uuid4()}")
    db.add(practice)
    db.commit()
    run = Run(practice_id=practice.id, status=status)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _make_appearance(
    db, run_id, card_id, answers, prompts=(), status=RunCardStatus.passed, position=0
):
    """A run_card row built directly, bypassing generation — the delta tests
    below need exact control over which run touches which field when, not a
    realistic run."""
    pc = RunCard(
        run_id=run_id,
        card_id=card_id,
        position=position,
        prompts=list(prompts),
        answers=list(answers),
        status=status,
    )
    db.add(pc)
    db.commit()
    db.refresh(pc)
    return pc


def _rate(db, strategy, user_id, run_id, run_card, ratings, shown_prompt_ids=()):
    """record_review_group with review_group_id == run_card.id, mirroring
    submit_rating's own construction (app/services/run.py)."""
    group = ReviewGroup(
        review_group_id=run_card.id,
        card_id=run_card.card_id,
        reviewed_at=datetime.now(UTC),
        ratings=tuple(ratings.items()),
        shown_prompt_ids=tuple(shown_prompt_ids),
    )
    record_review_group(db, strategy, user_id, group, run_id)
    db.commit()


def _expected_after(strategy, ratings, shown_prompt_ids=(), prior_states=None):
    """The FieldMasteryState each rated/shown field reaches after one appearance,
    blended on top of `prior_states` ({field_def_id: FieldMasteryState}, default
    empty — apply_review's own None-prior fallback covers a field with nothing yet).
    The oracle these tests check the breakdown's reported after-state against: it
    calls the same MasteryStrategy.expand/apply_review apply_rating itself calls, so
    it verifies the breakdown's bound/attribution logic — the thing actually under
    test — without hand-computing EMA arithmetic that would silently drift from the
    strategy's real constants."""
    group = ReviewGroup(
        review_group_id=uuid.uuid4(),
        card_id=uuid.uuid4(),
        reviewed_at=datetime.now(UTC),
        ratings=tuple(ratings.items()),
        shown_prompt_ids=tuple(shown_prompt_ids),
    )
    states: dict[uuid.UUID, FieldMasteryState] = dict(prior_states or {})
    for (_, field_def_id, _side), update in strategy.expand(group).items():
        states[field_def_id] = strategy.apply_review(states.get(field_def_id), update)
    return states


class TestBreakdownReadiness:
    """GET .../breakdown's readiness and delta fields. Built directly against
    run/run_card/mastery_log rather than through the generation/rating
    HTTP flow — the delta-semantics contract is specifically about row ordering and
    attribution, which this gives exact control over."""

    def test_first_review_delta_and_untouched_field_dilutes_card_fold(
        self, db, client, existing_user, existing_deck
    ):
        strategy = EmaStrategy()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()
        other = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "other", "type": "text"}
        ).json()
        answer_id, other_id = uuid.UUID(answer["id"]), uuid.UUID(other["id"])
        card_id = uuid.UUID(
            client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {answer["id"]: "a", other["id"]: "o"},
                },
            ).json()["id"]
        )

        run = _make_run(db, existing_user.id)
        pc = _make_appearance(db, run.id, card_id, answers=[answer_id])
        _rate(db, strategy, existing_user.id, run.id, pc, {answer_id: 4})

        expected = strategy.readiness(_expected_after(strategy, {answer_id: 4})[answer_id])

        breakdown = read_run_breakdown(db, strategy, run.id, existing_user.id)
        card = next(c for c in breakdown.cards if c.card_id == card_id)

        # Only the field an attempt named is listed; `other_id` counts in the fold alone.
        [field] = card.fields
        assert field.field_def_id == answer_id

        # Reviewed for the first time inside this run: delta is against 0.
        assert field.readiness == pytest.approx(expected)
        assert field.delta == pytest.approx(expected)

        # The accepted cost of folding over every active field: the untouched field
        # dilutes the card fold — half the per-field movement here, since one of the
        # two active fields moved.
        assert card.readiness == pytest.approx(expected / 2)
        assert card.delta == pytest.approx(expected / 2)

    def test_payload_carries_readiness_within_the_scale_and_no_mastery_key(
        self, db, client, existing_user, existing_deck
    ):
        strategy = EmaStrategy()
        answer = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer", "type": "text"}
        ).json()
        other = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "other", "type": "text"}
        ).json()
        answer_id = uuid.UUID(answer["id"])
        card_id = uuid.UUID(
            client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {answer["id"]: "a", other["id"]: "o"},
                },
            ).json()["id"]
        )
        run = _make_run(db, existing_user.id)
        pc = _make_appearance(db, run.id, card_id, answers=[answer_id])
        _rate(db, strategy, existing_user.id, run.id, pc, {answer_id: 4})

        response = client.get(f"/api/runs/{run.id}/breakdown")

        assert response.status_code == 200, response.text
        cards = response.json()["cards"]
        assert cards
        for card in cards:
            assert 0 <= card["readiness"] <= 1
            assert "mastery" not in card
            assert card["change"] == classify_change(card["delta"], strategy.reach).value
            assert card["fields"]
            for field in card["fields"]:
                assert 0 <= field["readiness"] <= 1
                assert "mastery" not in field
                assert field["change"] == classify_change(field["delta"], strategy.reach).value

    def test_field_shown_by_one_attempt_and_asked_by_another_reads_prompt(
        self, db, client, existing_user, existing_deck
    ):
        strategy = EmaStrategy()
        names = ("first", "second", "unnamed")
        ids = [
            uuid.UUID(
                client.post(
                    f"/api/decks/{existing_deck['id']}/fields", json={"name": name, "type": "text"}
                ).json()["id"]
            )
            for name in names
        ]
        first_id, second_id, _unnamed_id = ids
        card_id = uuid.UUID(
            client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {str(field_id): "v" for field_id in ids},
                },
            ).json()["id"]
        )
        run = _make_run(db, existing_user.id)
        asked_first = _make_appearance(db, run.id, card_id, answers=[first_id], prompts=[second_id])
        _rate(db, strategy, existing_user.id, run.id, asked_first, {first_id: 1}, (second_id,))
        asked_again = _make_appearance(
            db, run.id, card_id, answers=[second_id], prompts=[first_id], position=1
        )
        _rate(db, strategy, existing_user.id, run.id, asked_again, {second_id: 4}, (first_id,))

        breakdown = read_run_breakdown(db, strategy, run.id, existing_user.id)
        card = next(c for c in breakdown.cards if c.card_id == card_id)

        assert [(f.field_def_id, f.side.value) for f in card.fields] == [
            (first_id, "prompt"),
            (second_id, "prompt"),
        ]

    def test_per_field_bound_excludes_a_different_runs_intervening_write(
        self, db, client, existing_user, existing_deck
    ):
        strategy = EmaStrategy()
        answer_a = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer_a", "type": "text"}
        ).json()
        answer_b = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "answer_b", "type": "text"}
        ).json()
        a_id, b_id = uuid.UUID(answer_a["id"]), uuid.UUID(answer_b["id"])
        card_id = uuid.UUID(
            client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {answer_a["id"]: "x", answer_b["id"]: "y"},
                },
            ).json()["id"]
        )

        run1 = _make_run(db, existing_user.id, status=RunStatus.active)
        pc1_a = _make_appearance(db, run1.id, card_id, answers=[a_id])
        # run1's own first-ever row: bound(card, A) starts here. If the breakdown ever
        # used this as a single run-wide bound for every pair instead of each pair's
        # own, field B below would wrongly look "never touched before run1" too.
        _rate(db, strategy, existing_user.id, run1.id, pc1_a, {a_id: 4})

        # A different, concurrently active run touches field B in between.
        run2 = _make_run(db, existing_user.id, status=RunStatus.active)
        pc2 = _make_appearance(db, run2.id, card_id, answers=[b_id])
        _rate(db, strategy, existing_user.id, run2.id, pc2, {b_id: 2})
        run2.status = RunStatus.completed
        db.add(run2)
        db.commit()

        # run1 later touches field B too — its own bound for (card, B) must be its OWN
        # row here, not run1's overall first row (field A, above).
        pc1_b = _make_appearance(db, run1.id, card_id, answers=[b_id], position=1)
        _rate(db, strategy, existing_user.id, run1.id, pc1_b, {b_id: 4})
        run1.status = RunStatus.completed
        db.add(run1)
        db.commit()

        run2_after_b = _expected_after(strategy, {b_id: 2})
        run1_after_b = _expected_after(strategy, {b_id: 4}, prior_states=run2_after_b)
        expected_before = strategy.readiness(run2_after_b[b_id])
        expected_after = strategy.readiness(run1_after_b[b_id])

        breakdown = read_run_breakdown(db, strategy, run1.id, existing_user.id)
        card = next(c for c in breakdown.cards if c.card_id == card_id)
        fields_by_id = {f.field_def_id: f for f in card.fields}

        assert fields_by_id[b_id].readiness == pytest.approx(expected_after)
        assert fields_by_id[b_id].delta == pytest.approx(expected_after - expected_before)
        # The wrong answer a single run-wide bound would give: treating field B as if
        # run1 never saw any prior state for it at all.
        assert fields_by_id[b_id].delta != pytest.approx(expected_after)

    def test_deleted_run_attribution_survives_as_before_state(
        self, db, client, existing_user, existing_deck
    ):
        strategy = EmaStrategy()
        field_x = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "field_x", "type": "text"}
        ).json()
        field_y = client.post(
            f"/api/decks/{existing_deck['id']}/fields", json={"name": "field_y", "type": "text"}
        ).json()
        x_id, y_id = uuid.UUID(field_x["id"]), uuid.UUID(field_y["id"])
        card_id = uuid.UUID(
            client.post(
                "/api/cards",
                json={
                    "deck_id": existing_deck["id"],
                    "values": {field_x["id"]: "x", field_y["id"]: "y"},
                },
            ).json()["id"]
        )

        old_run = _make_run(db, existing_user.id)
        old_pc = _make_appearance(db, old_run.id, card_id, answers=[x_id])
        _rate(db, strategy, existing_user.id, old_run.id, old_pc, {x_id: 2})
        expected_orphaned = strategy.readiness(_expected_after(strategy, {x_id: 2})[x_id])

        # Deleting the run cascades its run_card; mastery_log's row for field_x
        # survives with run_id SET NULL — orphaned, but still real state.
        db.delete(old_run)
        db.commit()

        new_run = _make_run(db, existing_user.id, status=RunStatus.active)
        new_pc = _make_appearance(db, new_run.id, card_id, answers=[y_id])
        _rate(db, strategy, existing_user.id, new_run.id, new_pc, {y_id: 4})
        new_run.status = RunStatus.completed
        db.add(new_run)
        db.commit()

        breakdown = read_run_breakdown(db, strategy, new_run.id, existing_user.id)
        card = next(c for c in breakdown.cards if c.card_id == card_id)
        expected_y = strategy.readiness(_expected_after(strategy, {y_id: 4})[y_id])

        # field_x: untouched by new_run, so unlisted, and its only history's run is gone —
        # the card's fold must count the orphaned row's real value on both sides rather
        # than erroring or going missing.
        assert [f.field_def_id for f in card.fields] == [y_id]
        assert card.readiness == pytest.approx((expected_orphaned + expected_y) / 2)
        assert card.delta == pytest.approx(expected_y / 2)


def _rerun(client, run_id):
    return client.post(f"/api/runs/{run_id}/rerun")


class TestRerun:
    """POST /api/runs/{id}/rerun — a new run of the completed run's whole practice, cut from
    the practice's configurations as they stand. The original run is never touched."""

    def test_rerun_creates_a_new_run_of_the_practice_and_keeps_the_original(
        self, client, db, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])
        assert client.get(f"/api/runs/{run['id']}").json()["status"] == "completed"

        res = _rerun(client, run["id"])
        assert res.status_code == 201, res.text
        new_run = res.json()
        assert new_run["status"] == "active"
        assert new_run["id"] != run["id"]
        assert new_run["practice_id"] == run["practice_id"]
        assert new_run["day"] == run["day"]
        assert new_run["day_index"] == 1

        original = client.get(f"/api/runs/{run['id']}")
        assert original.status_code == 200, original.text
        assert original.json()["status"] == "completed"
        listed = [r["id"] for r in client.get(f"/api/practices/{run['practice_id']}").json()["runs"]]
        assert listed == [new_run["id"], run["id"]]

        new_cards = db.exec(select(RunCard).where(RunCard.run_id == uuid.UUID(new_run["id"]))).all()
        assert len(new_cards) == len(deck_cards)
        assert all(c.status == RunCardStatus.pending for c in new_cards)

    def test_rerun_is_cut_from_the_practices_configurations_as_they_stand(
        self, client, db, existing_deck, deck_fields, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])

        f = deck_fields
        row = db.exec(
            select(PracticeConfiguration).where(
                PracticeConfiguration.practice_id == uuid.UUID(run["practice_id"])
            )
        ).one()
        row.prompt_pool_ids = []
        row.prompt_pool_counts = []
        row.answer_pool_ids = []
        row.answer_pool_counts = []
        row.answer_field_ids = [f["answer1"], f["pool_a1"]]
        db.add(row)
        db.commit()

        res = _rerun(client, run["id"])
        assert res.status_code == 201, res.text
        [copy] = _snapshots(db, res.json()["id"])
        assert copy.answer_field_ids == [f["answer1"], f["pool_a1"]]
        assert copy.prompt_pool_ids == []
        [original] = _snapshots(db, run["id"])
        assert original.answer_field_ids == [f["answer1"]]

    def test_rerun_of_a_run_that_lost_a_deck_holds_the_practices_remaining_decks(
        self, client, db, two_deck_library
    ):
        lib = two_deck_library
        run = start_practice(
            client, {lib["decks"]["a"]["id"]: None, lib["decks"]["b"]["id"]: None}
        )
        _finish_run(client, run["id"])

        deleted = client.delete(f"/api/decks/{lib['decks']['a']['id']}")
        assert deleted.status_code == 204, deleted.text

        res = _rerun(client, run["id"])
        assert res.status_code == 201, res.text
        assert {d.deck_id for d in _snapshots(db, res.json()["id"])} == {
            uuid.UUID(lib["decks"]["b"]["id"])
        }

    def test_rerun_refuses_an_active_run(self, client, deck_cards, deck_configuration):
        run = _start(client, [deck_configuration])

        res = _rerun(client, run["id"])
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "run_active"
        assert client.get(f"/api/runs/{run['id']}").json()["status"] == "active"

    def test_rerun_refuses_while_the_practice_has_an_active_run(
        self, client, db, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])
        first = _rerun(client, run["id"])
        assert first.status_code == 201, first.text

        res = _rerun(client, run["id"])
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "practice_has_active_run"
        runs = client.get(f"/api/practices/{run['practice_id']}").json()["runs"]
        assert len(runs) == 2

    def test_404_for_unknown_run(self, client):
        assert _rerun(client, uuid.uuid4()).status_code == 404

    def test_404_for_foreign_run(
        self, client, act_as, other_user, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])

        act_as(other_user)
        assert _rerun(client, run["id"]).status_code == 404


def _chosen(client, run_id, card_ids):
    return client.post(
        f"/api/runs/{run_id}/chosen_cards", json={"card_ids": [str(c) for c in card_ids]}
    )


def _snapshots(db, run_id):
    return db.exec(
        select(RunConfiguration).where(RunConfiguration.run_id == uuid.UUID(run_id))
    ).all()


def _run_card_ids(db, run_id):
    return {
        c.card_id
        for c in db.exec(
            select(RunCard).where(RunCard.run_id == uuid.UUID(run_id))
        ).all()
    }


def _add_card(client, deck, fields):
    values = {str(fid): f"late-{name}" for name, fid in fields.items()}
    res = client.post("/api/cards", json={"deck_id": deck["id"], "values": values})
    assert res.status_code == 201, res.text
    return uuid.UUID(res.json()["id"])


def _two_field_deck(client, name):
    """A deck of one card, with a configuration asking `front` and answering `back`."""
    deck = client.post(
        "/api/decks",
        json={
            "name": name,
            "field_defs": [{"name": field, "type": "text"} for field in ("front", "back")],
        },
    ).json()
    fields = {fd["name"]: fd["id"] for fd in deck["field_defs"]}
    card = client.post(
        "/api/cards",
        json={"deck_id": deck["id"], "values": {fid: "v" for fid in fields.values()}},
    )
    assert card.status_code == 201, card.text
    config = {
        "deck_id": deck["id"],
        "prompt_field_ids": [fields["front"]],
        "answer_field_ids": [fields["back"]],
        "prompt_pool_ids": [],
        "prompt_pool_counts": [],
        "answer_pool_ids": [],
        "answer_pool_counts": [],
    }
    return fields, uuid.UUID(card.json()["id"]), config


class TestChosenCards:
    """POST /api/runs/{id}/chosen_cards: a new run of exactly the chosen cards of a
    completed run, cut from its practice's configurations as they stand."""

    def _completed(self, client, deck_configuration):
        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])
        return run

    def test_holds_exactly_the_chosen_cards_on_a_copy_of_the_practices_configuration(
        self, client, db, deck_cards, deck_configuration
    ):
        run = self._completed(client, deck_configuration)
        chosen = deck_cards[:2]

        res = _chosen(client, run["id"], chosen)
        assert res.status_code == 201, res.text
        new_run = res.json()
        assert new_run["status"] == "active"
        assert new_run["practice_id"] == run["practice_id"]

        assert _run_card_ids(db, new_run["id"]) == set(chosen)
        assert _counted_card_ids(db, new_run["id"]) == set(chosen)

        [original] = _snapshots(db, run["id"])
        [copy] = _snapshots(db, new_run["id"])
        assert copy.card_ids == chosen
        for column in _ARRAYS:
            assert getattr(copy, column) == getattr(original, column)
        assert original.card_ids is None

    def test_a_rerun_of_a_run_of_chosen_cards_runs_the_whole_practice(
        self, client, db, existing_deck, deck_fields, deck_cards, deck_configuration
    ):
        run = self._completed(client, deck_configuration)
        chosen_run = _chosen(client, run["id"], deck_cards[:2]).json()
        _finish_run(client, chosen_run["id"])
        added_since = _add_card(client, existing_deck, deck_fields)

        res = _rerun(client, chosen_run["id"])
        assert res.status_code == 201, res.text
        assert _run_card_ids(db, res.json()["id"]) == {*deck_cards, added_since}
        [copy] = _snapshots(db, res.json()["id"])
        assert copy.card_ids is None

    def test_a_chosen_card_deleted_since_stays_in_card_ids(
        self, client, db, deck_cards, deck_configuration
    ):
        run = self._completed(client, deck_configuration)
        chosen = deck_cards[:2]
        chosen_run = _chosen(client, run["id"], chosen).json()

        deleted = client.delete(f"/api/cards/{chosen[0]}")
        assert deleted.status_code == 204, deleted.text

        [frozen] = _snapshots(db, chosen_run["id"])
        db.refresh(frozen)
        assert frozen.card_ids == chosen
        assert _counted_card_ids(db, chosen_run["id"]) == {chosen[1]}

    def test_an_active_run_is_refused(self, client, deck_cards, deck_configuration):
        run = _start(client, [deck_configuration])

        res = _chosen(client, run["id"], deck_cards[:1])
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "run_active"

    def test_refused_while_the_practice_has_an_active_run(
        self, client, db, deck_cards, deck_configuration
    ):
        run = self._completed(client, deck_configuration)
        assert _rerun(client, run["id"]).status_code == 201
        before = len(db.exec(select(Run)).all())

        res = _chosen(client, run["id"], deck_cards[:1])
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "practice_has_active_run"
        assert len(db.exec(select(Run)).all()) == before

    def test_every_deck_of_the_practice_gets_a_copy_one_without_a_chosen_card_empty(
        self, client, db
    ):
        _, card_a, config_a = _two_field_deck(client, "Deck A")
        _, _, config_b = _two_field_deck(client, "Deck B")
        run = _start(client, [config_a, config_b])
        _finish_run(client, run["id"])

        res = _chosen(client, run["id"], [card_a])
        assert res.status_code == 201, res.text
        copies = {c.deck_id: c.card_ids for c in _snapshots(db, res.json()["id"])}
        assert copies == {
            uuid.UUID(config_a["deck_id"]): [card_a],
            uuid.UUID(config_b["deck_id"]): [],
        }
        assert _run_card_ids(db, res.json()["id"]) == {card_a}

    def test_chosen_cards_blank_on_their_answer_side_are_refused_and_write_no_run(
        self, client, db, deck_fields, deck_cards, deck_configuration
    ):
        run = self._completed(client, deck_configuration)
        chosen = deck_cards[:2]
        blank_answers = {
            str(deck_fields[name]): "" for name in ("answer1", "pool_a1", "pool_a2", "pool_a3")
        }
        for card_id in chosen:
            patched = client.patch(f"/api/cards/{card_id}", json={"values": blank_answers})
            assert patched.status_code == 200, patched.text
        before = len(db.exec(select(Run)).all())

        res = _chosen(client, run["id"], chosen)
        assert res.status_code == 400, res.text
        assert res.json()["detail"]["code"] == "no_cards"
        assert len(db.exec(select(Run)).all()) == before

    def test_an_empty_list_is_refused(self, client, deck_cards, deck_configuration):
        run = self._completed(client, deck_configuration)

        res = _chosen(client, run["id"], [])
        assert res.status_code == 400, res.text

    def test_a_card_the_run_never_held_is_refused(
        self, client, existing_deck, deck_fields, deck_cards, deck_configuration
    ):
        run = self._completed(client, deck_configuration)
        added_since = _add_card(client, existing_deck, deck_fields)

        for outside in (added_since, uuid.uuid4()):
            res = _chosen(client, run["id"], [deck_cards[0], outside])
            assert res.status_code == 400, res.text


class TestRunDetail:
    """GET /api/runs/{id}: the run with its practice's name, its decks and how it asked
    each."""

    @staticmethod
    def _as_read(copy):
        return {
            "deck_id": str(copy.deck_id),
            **{
                column: [str(v) if isinstance(v, uuid.UUID) else v for v in getattr(copy, column)]
                for column in _ARRAYS
            },
        }

    def test_carries_the_practices_name_its_decks_and_their_copies(self, client, db):
        _, _, config_a = _two_field_deck(client, "Deck A")
        _, _, config_b = _two_field_deck(client, "Deck B")
        run = start_practice(client, _decks([config_a, config_b]), "Two decks")

        detail = client.get(f"/api/runs/{run['id']}")

        assert detail.status_code == 200, detail.text
        body = detail.json()
        assert body["practice_name"] == "Two decks"
        assert [d["deck_name"] for d in body["decks"]] == ["Deck B", "Deck A"]
        assert [c["deck_id"] for c in body["configurations"]] == [
            config_b["deck_id"],
            config_a["deck_id"],
        ]
        copies = {str(c.deck_id): self._as_read(c) for c in _snapshots(db, run["id"])}
        assert body["configurations"] == [copies[config_b["deck_id"]], copies[config_a["deck_id"]]]
        assert body["configurations"][1] == {
            k: v for k, v in config_a.items() if k == "deck_id" or k in _ARRAYS
        }

    def test_a_run_of_chosen_cards_carries_a_deck_holding_no_chosen_card(self, client):
        _, card_a, config_a = _two_field_deck(client, "Deck A")
        _, _, config_b = _two_field_deck(client, "Deck B")
        run = _start(client, [config_a, config_b])
        _finish_run(client, run["id"])
        chosen = _chosen(client, run["id"], [card_a])
        assert chosen.status_code == 201, chosen.text

        body = client.get(f"/api/runs/{chosen.json()['id']}").json()

        assert {d["deck_id"] for d in body["decks"]} == {
            config_a["deck_id"],
            config_b["deck_id"],
        }
        assert {c["deck_id"] for c in body["configurations"]} == {
            config_a["deck_id"],
            config_b["deck_id"],
        }

    def test_404_for_unknown_run(self, client):
        assert client.get(f"/api/runs/{uuid.uuid4()}").status_code == 404


def _counted_card_ids(db, run_id):
    return set(
        db.exec(
            select(RunCountedCard.card_id).where(RunCountedCard.run_id == uuid.UUID(run_id))
        ).all()
    )


class TestCountedCards:
    """Cutting a run writes one run_counted_card per card its copies could ask."""

    def test_the_cut_counts_every_askable_card_and_no_blank_one(
        self, client, db, existing_deck, deck_fields, deck_cards, deck_configuration
    ):
        blank = {str(deck_fields[n]): "" for n in ("answer1", "pool_a1", "pool_a2", "pool_a3")}
        patched = client.patch(f"/api/cards/{deck_cards[0]}", json={"values": blank})
        assert patched.status_code == 200, patched.text

        run = _start(client, [deck_configuration])

        assert _counted_card_ids(db, run["id"]) == set(deck_cards[1:])
        assert _run_card_ids(db, run["id"]) == set(deck_cards[1:])

    def test_a_card_added_during_the_run_is_not_counted(
        self, client, db, existing_deck, deck_fields, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        _add_card(client, existing_deck, deck_fields)

        assert _counted_card_ids(db, run["id"]) == set(deck_cards)

    def test_a_deleted_card_leaves_the_count(self, client, db, deck_cards, deck_configuration):
        run = _start(client, [deck_configuration])
        assert client.delete(f"/api/cards/{deck_cards[0]}").status_code == 204

        assert _counted_card_ids(db, run["id"]) == set(deck_cards[1:])


def _end(client, run_id):
    return client.post(f"/api/runs/{run_id}/end")


def _rate_current(client, run_id, rating):
    """Rates the run's current card `rating` on every answer field; returns its run card's
    id."""
    card = client.get(f"/api/runs/{run_id}/state").json()["current_card"]
    res = client.post(
        f"/api/run_cards/{card['run_card_id']}/rate",
        json={"ratings": {a["field_def_id"]: rating for a in card["answers"]}},
    )
    assert res.status_code == 200, res.text
    return uuid.UUID(card["run_card_id"])


def _review_ids(db, run_card_ids):
    return set(
        db.exec(
            select(ReviewLog.id).where(col(ReviewLog.review_group_id).in_(run_card_ids))
        ).all()
    )


class TestEndRun:
    """POST /api/runs/{id}/end: the run completed as it stands, its unreached cards gone."""

    def test_ending_deletes_the_pending_rows_and_keeps_every_rated_one_and_every_review(
        self, client, db, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        # A pass, then an Again whose retry waits pending beside the unreached third card.
        rated = {_rate_current(client, run["id"], 4), _rate_current(client, run["id"], 1)}
        reviews = _review_ids(db, rated)
        assert reviews

        res = _end(client, run["id"])

        assert res.status_code == 200, res.text
        assert res.json()["id"] == run["id"]
        assert res.json()["status"] == "completed"
        rows = db.exec(select(RunCard).where(RunCard.run_id == uuid.UUID(run["id"]))).all()
        assert {r.id for r in rows} == rated
        assert RunCardStatus.pending not in {r.status for r in rows}
        assert _review_ids(db, rated) == reviews
        state = client.get(f"/api/runs/{run['id']}/state").json()
        assert state["status"] == "completed"
        assert state["current_card"] is None

    def test_the_runs_count_reads_the_cards_reached(
        self, client, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        _rate_current(client, run["id"], 4)
        _rate_current(client, run["id"], 1)

        assert _end(client, run["id"]).status_code == 200

        detail = client.get(f"/api/runs/{run['id']}").json()
        assert (detail["reached_cards"], detail["counted_cards"]) == (2, 3)
        [listed] = client.get(f"/api/practices/{run['practice_id']}").json()["runs"]
        assert (listed["reached_cards"], listed["counted_cards"]) == (2, 3)

    def test_a_run_of_chosen_cards_ends_alike(self, client, db, deck_cards, deck_configuration):
        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])
        chosen = _chosen(client, run["id"], deck_cards[:2])
        assert chosen.status_code == 201, chosen.text

        res = _end(client, chosen.json()["id"])

        assert res.status_code == 200, res.text
        assert res.json()["status"] == "completed"
        assert _run_card_ids(db, chosen.json()["id"]) == set()
        detail = client.get(f"/api/runs/{chosen.json()['id']}").json()
        assert (detail["reached_cards"], detail["counted_cards"]) == (0, 2)

    def test_404_for_unknown_run(self, client):
        assert _end(client, uuid.uuid4()).status_code == 404


class TestRunDay:
    """A run's day is the date of its start in the user's zone, numbered within its
    practice's runs of that day, worked out on read."""

    def test_day_and_index_follow_the_users_zone_when_it_changes(
        self, client, db, existing_user, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])
        second = _rerun(client, run["id"]).json()

        # 14:30 and 15:30 UTC on 2026-11-03 are one day in UTC, and two in Tokyo, where
        # the second is already 00:30 on the 4th.
        for run_id, hour in ((run["id"], 14), (second["id"], 15)):
            row = db.get(Run, uuid.UUID(run_id))
            row.created_at = datetime(2026, 11, 3, hour, 30, tzinfo=UTC)
            db.add(row)
        db.commit()

        def day_of(run_id):
            read = client.get(f"/api/runs/{run_id}").json()
            return read["day"], read["day_index"]

        assert day_of(run["id"]) == ("2026-11-03", 0)
        assert day_of(second["id"]) == ("2026-11-03", 1)

        existing_user.timezone = "Asia/Tokyo"
        db.add(existing_user)
        db.commit()

        assert day_of(run["id"]) == ("2026-11-03", 0)
        assert day_of(second["id"]) == ("2026-11-04", 0)
        state = client.get(f"/api/runs/{second['id']}/state").json()
        assert (state["day"], state["day_index"]) == ("2026-11-04", 0)

    def test_a_rerun_racing_a_start_is_refused_with_its_code(
        self, client, db, existing_user, deck_cards, deck_configuration
    ):
        """The re-run finds no active run, then a start's insert, not yet committed, holds
        the index; once it commits, the re-run is refused rather than failing."""
        import threading

        from sqlmodel import Session

        from app.database_ops.run import db_try_stage_create_run
        from app.refusals import Refusal
        from app.services.run import rerun
        from tests.conftest import engine

        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])
        practice_id = uuid.UUID(run["practice_id"])
        result = {}

        with Session(engine) as starting:
            assert db_try_stage_create_run(starting, practice_id) is not None

            def rerun_in_thread():
                with Session(engine) as session:
                    try:
                        rerun(session, EmaStrategy(), existing_user.id, uuid.UUID(run["id"]))
                    except Refusal as e:
                        result["code"] = e.code

            thread = threading.Thread(target=rerun_in_thread)
            thread.start()
            thread.join(timeout=1)
            assert thread.is_alive(), "the re-run waits on the start's insert"
            starting.commit()
        thread.join(timeout=10)

        assert result == {"code": "practice_has_active_run"}

    def test_runs_of_different_days_each_start_at_zero(
        self, client, db, deck_cards, deck_configuration
    ):
        run = _start(client, [deck_configuration])
        _finish_run(client, run["id"])
        second = _rerun(client, run["id"]).json()

        row = db.get(Run, uuid.UUID(run["id"]))
        row.created_at = datetime(2026, 11, 1, 12, tzinfo=UTC)
        db.add(row)
        db.commit()

        runs = client.get(f"/api/practices/{run['practice_id']}").json()["runs"]
        assert [(r["id"], r["day_index"]) for r in runs] == [(second["id"], 0), (run["id"], 0)]
        assert runs[1]["day"] == "2026-11-01"
