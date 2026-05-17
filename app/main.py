from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import SessionDep, init_db
from app.routers.card import router as card_router
from app.routers.deck import router as deck_router
from app.routers.deck_config import router as deck_config_router
from app.routers.practice import router as practice_router
from app.routers.subject import router as subject_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    # reset_db()


app = FastAPI(lifespan=lifespan)
app.include_router(subject_router)
app.include_router(deck_router)
app.include_router(card_router)
app.include_router(deck_config_router)
app.include_router(practice_router)


@app.get("/")
async def read_root(db: SessionDep):
    return {"Working": "As Expected."}
