from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionDep, init_db
from app.routers.api.card import router as api_card_router
from app.routers.api.deck import router as api_deck_router
from app.routers.api.deck_practice_config import router as api_deck_practice_config_router
from app.routers.api.field_def import router as api_field_def_router
from app.routers.api.practice_session import router as api_practice_session_router
from app.routers.api.subject import router as api_subject_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    # reset_db()


app = FastAPI(lifespan=lifespan)
app.include_router(api_subject_router, prefix="/api")
app.include_router(api_deck_router, prefix="/api")
app.include_router(api_field_def_router, prefix="/api")
app.include_router(api_card_router, prefix="/api")
app.include_router(api_deck_practice_config_router, prefix="/api")
app.include_router(api_practice_session_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.permitted_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Timezone"],
)


@app.get("/")
async def read_root(db: SessionDep):
    return {"Working": "As Expected."}
