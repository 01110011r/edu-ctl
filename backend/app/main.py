from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import create_db_and_tables
from app.routers import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and create all tables on application startup
    create_db_and_tables()
    yield


app = FastAPI(
    title="O'quv Markazi Mini Management API",
    version="1.0.0",
    description="Backend API for managing staff, students, groups, lessons, and attendance.",
    lifespan=lifespan,
)

# CORS configuration allowing frontend at http://localhost:3000
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


@app.get("/api/health", tags=["health"])
def health_check():
    """Health check endpoint to verify service availability."""
    return {"status": "ok"}
