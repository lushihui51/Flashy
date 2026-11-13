from fastapi import APIRouter

from app.database import SessionDep
from app.dependencies import CurrentUserDep
from app.models.home_payloads import HomeRead
from app.services.home import get_home

router = APIRouter(prefix="/home", tags=["Home"])


@router.get("", response_model=HomeRead, status_code=200)
def read_home(db: SessionDep, current_user: CurrentUserDep):
    return get_home(db, current_user)
