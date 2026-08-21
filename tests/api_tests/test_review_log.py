import uuid

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import func, select

from app.database_ops.review_log import db_insert_review_logs
from app.models.review_log import ReviewLog


class TestReviewLogIdempotency:
    def test_duplicate_insert_is_noop(
        self, db, existing_user, existing_card, existing_field_defs
    ):
        review_group_id = uuid.uuid4()
        field_def_id = uuid.UUID(existing_field_defs[0]["id"])
        row = {
            "user_id": existing_user.id,
            "card_id": uuid.UUID(existing_card["id"]),
            "field_def_id": field_def_id,
            "review_group_id": review_group_id,
            "rating": 3,
            "shown_prompt_ids": [uuid.UUID(existing_field_defs[1]["id"])],
        }

        db_insert_review_logs(db, [row])
        db_insert_review_logs(db, [row])

        count = db.exec(
            select(func.count())
            .select_from(ReviewLog)
            .where(
                ReviewLog.review_group_id == review_group_id,
                ReviewLog.field_def_id == field_def_id,
            )
        ).one()
        assert count == 1

    def test_check_constraint_rejects_out_of_range_rating(
        self, db, existing_user, existing_card, existing_field_defs
    ):
        row = {
            "user_id": existing_user.id,
            "card_id": uuid.UUID(existing_card["id"]),
            "field_def_id": uuid.UUID(existing_field_defs[0]["id"]),
            "review_group_id": uuid.uuid4(),
            "rating": 5,
            "shown_prompt_ids": [],
        }

        with pytest.raises(IntegrityError):
            db_insert_review_logs(db, [row])
        db.rollback()
