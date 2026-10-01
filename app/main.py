from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionDep
from app.routers.api.card import router as api_card_router
from app.routers.api.deck import router as api_deck_router
from app.routers.api.deck_practice_config import router as api_deck_practice_config_router
from app.routers.api.deletion_impact import router as api_deletion_impact_router
from app.routers.api.field_def import router as api_field_def_router
from app.routers.api.health import router as api_health_router
from app.routers.api.practice_run import router as api_practice_run_router
from app.routers.api.subject import router as api_subject_router

app = FastAPI()
app.include_router(api_subject_router, prefix="/api")
app.include_router(api_deck_router, prefix="/api")
app.include_router(api_field_def_router, prefix="/api")
app.include_router(api_card_router, prefix="/api")
app.include_router(api_deck_practice_config_router, prefix="/api")
app.include_router(api_deletion_impact_router, prefix="/api")
app.include_router(api_practice_run_router, prefix="/api")
app.include_router(api_health_router, prefix="/api")

# TODO(defer:db-unavailable-503) map database-connection errors on every endpoint to 503 database_unavailable once the frontend and API are cross-origin (hosting cycle): an unhandled error's 500 carries no CORS headers, so a cross-origin browser reads it as a network failure (task 020 MD-1).
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
