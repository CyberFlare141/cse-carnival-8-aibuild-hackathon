from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from backend.config import settings
from backend.routers import (
    schedules, rooms, events, announcements, assignments, chat
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("campusos")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CampusOS REST API and AI Agent Engine connecting directly to SQL Server."
)

# CORS Middleware for React / Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(schedules.router, prefix=f"{settings.API_PREFIX}/schedules")
app.include_router(schedules.router, prefix=f"{settings.API_PREFIX}/schedule")
# These routers already own their resource prefix (for example ``/rooms``).
# Add only the common API prefix here so their public paths remain
# ``/api/rooms``, ``/api/events``, etc.  Adding both prefixes produced paths
# such as ``/api/rooms/rooms`` that did not match the frontend contract.
app.include_router(rooms.router, prefix=settings.API_PREFIX)
app.include_router(events.router, prefix=settings.API_PREFIX)
app.include_router(announcements.router, prefix=settings.API_PREFIX)
app.include_router(assignments.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error handling {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please check server logs."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
