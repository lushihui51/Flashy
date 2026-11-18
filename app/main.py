from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionDep
from app.frontend import add_frontend
from app.routers.api.account import router as api_account_router
from app.routers.api.card import router as api_card_router
from app.routers.api.deck import router as api_deck_router
from app.routers.api.deletion_impact import router as api_deletion_impact_router
from app.routers.api.field_def import router as api_field_def_router
from app.routers.api.health import router as api_health_router
from app.routers.api.home import router as api_home_router
from app.routers.api.practice import router as api_practice_router
from app.routers.api.run import router as api_run_router

# FastAPI's own pages are turned off so that every route but the frontend's stands under
# /api and resolves its user by its method; app.openapi() still builds the schema the
# frontend's types are generated from (ADR 131).
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(api_deck_router, prefix="/api")
app.include_router(api_field_def_router, prefix="/api")
app.include_router(api_card_router, prefix="/api")
app.include_router(api_deletion_impact_router, prefix="/api")
app.include_router(api_practice_router, prefix="/api")
app.include_router(api_run_router, prefix="/api")
app.include_router(api_home_router, prefix="/api")
app.include_router(api_account_router, prefix="/api")
app.include_router(api_health_router, prefix="/api")

# The folder `npm run build` writes. Where none is built, as in development, the app
# serves /api alone, and the frontend's own server serves the pages (ADR 128).
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (FRONTEND_DIST / "index.html").is_file():
    add_frontend(app, FRONTEND_DIST)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.permitted_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Timezone"],
)
