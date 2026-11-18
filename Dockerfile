# The one image the service deploys: the API's process serves the built frontend and the
# API at one origin. Build with --build-arg VITE_CLERK_PUBLISHABLE_KEY=<key>.

FROM node:24-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Vite writes the key into the built files, so it is needed when they are built.
ARG VITE_CLERK_PUBLISHABLE_KEY
RUN npm run build

FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:0.12.19 /uv /bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PATH="/app/.venv/bin:$PATH"
# The dependencies are installed before the code is copied, so a change to the code
# alone reuses their layer.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini ./
RUN uv sync --frozen --no-dev
COPY --from=frontend /frontend/dist frontend/dist
CMD ["sh", "-c", "exec fastapi run --host 0.0.0.0 --port ${PORT:-8000}"]
