from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import SessionDep, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/")
async def read_root(db: SessionDep):
    return {"Working": "As Expected."}
