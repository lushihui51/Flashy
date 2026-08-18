from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionDep, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    # reset_db()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.permitted_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/")
async def read_root(db: SessionDep):
    return {"Working": "As Expected."}
