from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# SQLite needs special connection arguments to avoid multi-thread errors.
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Ensure any postgres url handles driver names correctly if needed
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    engine = create_engine(db_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    # Import all models to ensure they are registered before creating tables
    from app.models.user import User
    from app.models.project import Project
    from app.models.milestone import Milestone
    from app.models.dispute import Dispute
    from app.models.reputation import Reputation
    from app.models.transaction import Transaction
    from app.models.indexer import IndexerState
    
    Base.metadata.create_all(bind=engine)
