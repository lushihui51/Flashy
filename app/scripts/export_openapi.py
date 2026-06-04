import json

from app.main import app

with open("frontend/src/api/openapi.json", "w") as f:
    json.dump(app.openapi(), f, indent=2)
