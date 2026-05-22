from fastapi import APIRouter, Request

from app.templates_config import templates

router = APIRouter(tags=["Home"])


@router.get("/", status_code=200)
def read_home(request: Request):
    return templates.TemplateResponse(request=request, name="index.jinja")
