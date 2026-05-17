from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import SessionDep, init_db
from app.routers.api.card import router as card_router
from app.routers.api.deck import router as deck_router
from app.routers.api.deck_config import router as deck_config_router
from app.routers.api.practice import router as practice_router
from app.routers.api.subject import router as subject_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    # reset_db()


app = FastAPI(lifespan=lifespan)
app.include_router(subject_router, prefix="/api")
app.include_router(deck_router, prefix="/api")
app.include_router(card_router, prefix="/api")
app.include_router(deck_config_router, prefix="/api")
app.include_router(practice_router, prefix="/api")


@app.get("/")
async def read_root(db: SessionDep):
    return {"Working": "As Expected."}
