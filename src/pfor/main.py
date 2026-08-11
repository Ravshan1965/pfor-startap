"""
PFOR Platform — FastAPI Application Entry Point
Initializes the database, registers routers, and configures CORS.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
from pfor.api.auth import router as auth_router
from pfor.api.strategy import router as strategy_router
from pfor.core.config import get_settings
from pfor.db.database import init_db

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App initialization
# ---------------------------------------------------------------------------
settings = get_settings()

app = FastAPI(
    title="PFOR — Operational Solutions Platform",
    description=(
        "B2B SaaS API that transforms business problems into structured "
        "strategic reports using a multi-agent AI pipeline (Google Gemini)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins in development; restrict in production
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Разрешаем доступ со всех IP, включая 178.218.207.173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(strategy_router)


# ---------------------------------------------------------------------------
# Startup / Shutdown events
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup() -> None:
    """Initialize the SQLite database tables on application startup."""
    logger.info("PFOR API starting up...")
    init_db()
    gemini_status = "ENABLED" if settings.gemini_enabled else "DISABLED (mock mode)"
    logger.info("Gemini API: %s", gemini_status)
    logger.info("Database: %s", settings.database_url)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["System"], summary="Health check")
def health_check():
    """Return service health status and configuration summary."""
    return JSONResponse(
        {
            "status": "ok",
            "gemini_enabled": settings.gemini_enabled,
            "version": "1.0.0",
        }
    )


frontend_path = os.path.join(os.path.dirname(__file__), "../../frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/", tags=["System"], summary="Root endpoint")
def root():
    """Serve the frontend index.html on the root path."""
    return FileResponse(os.path.join(frontend_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("pfor.main:app", host="0.0.0.0", port=8000, reload=True)

