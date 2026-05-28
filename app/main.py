from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import SessionDep, init_db, reset_db
from app.routers.api.card import router as api_card_router
from app.routers.api.deck import router as api_deck_router
from app.routers.api.deck_config import router as api_deck_config_router
from app.routers.api.practice_session import router as api_practice_session_router
from app.routers.api.subject import router as api_subject_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    reset_db()


app = FastAPI(lifespan=lifespan)
app.include_router(api_subject_router, prefix="/api")
app.include_router(api_deck_router, prefix="/api")
app.include_router(api_card_router, prefix="/api")
app.include_router(api_deck_config_router, prefix="/api")
app.include_router(api_practice_session_router, prefix="/api")

# app.include_router(page_index_router, prefix="/page")
# app.include_router(page_subject_router, prefix="/page")
# app.include_router(page_deck_router, prefix="/page")
# app.include_router(page_card_router, prefix="/page")
# app.include_router(page_deck_config_router, prefix="/page")
# app.include_router(page_practice_session_router, prefix="/page")


@app.get("/")
async def read_root(db: SessionDep):
    return {"Working": "As Expected."}
