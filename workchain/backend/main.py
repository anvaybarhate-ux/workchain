import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.services.events import event_indexer
from app.routers import (
    users_router,
    projects_router,
    milestones_router,
    disputes_router,
    reputation_router,
    ipfs_router,
    transactions_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing database tables...")
    create_tables()
    
    indexer_task = None
    if settings.ENVIRONMENT != "testing":
        logger.info("Starting background event indexer...")
        indexer_task = asyncio.create_task(event_indexer.start())
    else:
        logger.info("Skipping background event indexer in testing environment.")
    
    yield
    
    # Shutdown actions
    if indexer_task:
        logger.info("Stopping background event indexer...")
        indexer_task.cancel()
        try:
            await indexer_task
        except asyncio.CancelledError:
            logger.info("Background event indexer stopped successfully.")
        except Exception as e:
            logger.error(f"Error during indexer task shutdown: {e}")

app = FastAPI(
    title="Workchain Backend",
    description="Off-chain orchestration and indexing layer for Workchain escrow protocol",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under the API prefix
app.include_router(users_router, prefix=settings.API_V1_PREFIX)
app.include_router(projects_router, prefix=settings.API_V1_PREFIX)
app.include_router(milestones_router, prefix=settings.API_V1_PREFIX)
app.include_router(disputes_router, prefix=settings.API_V1_PREFIX)
app.include_router(reputation_router, prefix=settings.API_V1_PREFIX)
app.include_router(ipfs_router, prefix=settings.API_V1_PREFIX)
app.include_router(transactions_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def read_root():
    return {
        "name": "Workchain API",
        "description": "Off-chain orchestration layer for Ethereum Sepolia",
        "docs_url": "/docs",
        "health": "/health"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }
