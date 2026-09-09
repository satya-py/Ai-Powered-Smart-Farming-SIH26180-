"""Database setup and session management."""

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from backend.config import get_settings

settings = get_settings()

# Ensure data directory exists
db_path = str(settings.database_url).replace("sqlite:///", "")
if db_path != ":memory:":
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

engine = create_engine(
    settings.database_url, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
