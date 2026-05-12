from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import SessionDep, init_db
from app.routers.flashcards import router as flashcards_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(flashcards_router)


@app.get("/")
async def read_root(db: SessionDep):
    return {"Working": "As Expected."}
