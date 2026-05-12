from fastapi import APIRouter

router = APIRouter(prefix="/cards", tags=["Cards"])


@router.post("/card")
def create_card():
    pass
