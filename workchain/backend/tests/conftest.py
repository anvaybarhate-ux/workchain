import os
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["WEB3_RPC_URL"] = "https://mocked.rpc"
os.environ["PINATA_JWT"] = "mocked_jwt"
os.environ["CONTRACT_FACTORY"] = "0x0000000000000000000000000000000000000000"
os.environ["CONTRACT_REPUTATION"] = "0x0000000000000000000000000000000000000000"

import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Mock blockchain service before importing app or routers
import sys
from unittest.mock import Mock

mock_w3 = MagicMock()
mock_w3.is_connected.return_value = True
mock_w3.eth.block_number = 10896000

# Mock class for blockchain service
class MockBlockchainService:
    def __init__(self):
        self.w3 = mock_w3
        self.factory_abi = []
        self.escrow_abi = []
        self.reputation_abi = []

    def get_contract(self, address, abi):
        mock_contract = MagicMock()
        mock_contract.address = address
        return mock_contract

    def get_escrow_balance(self, contract_addr):
        return 5.0

    def get_project_state(self, contract_addr):
        return [
            "0x1111111111111111111111111111111111111111", # client
            "0x2222222222222222222222222222222222222222", # freelancer
            5 * 10**18, # totalValue
            1, # state (Active)
            0, # currentMilestone
            10895967 # creationBlock
        ]

    def get_milestone(self, contract_addr, index):
        return [
            f"Milestone {index}",
            1 * 10**18,
            1800000000, # deadline
            0, # state (Pending)
            "" # ipfsHash
        ]

    def verify_transaction(self, tx_hash):
        return {
            "status": "confirmed",
            "block": 10895999,
            "gas_used": 21000
        }

    def get_wallet_balance(self, address):
        return 10.0

    def verify_signature(self, message, signature, expected_address):
        return True

# Apply the mock to the module
from app.services import blockchain
blockchain.blockchain_service = MockBlockchainService()

# Now we can import database, models, and FastAPI app safely
from app.database import Base, get_db
from app.models.user import User, UserRole
from app.models.reputation import Reputation, ReputationTier
from main import app

# Setup test in-memory database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop tables
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def mock_blockchain():
    return blockchain.blockchain_service

@pytest.fixture(scope="function")
def client_user(db_session):
    user = User(
        wallet_address="0x1111111111111111111111111111111111111111",
        ens_name="client.eth",
        role=UserRole.CLIENT,
        bio="I hire top talent",
        skills=[],
        hourly_rate_eth=0.0,
        availability=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def freelancer_user(db_session):
    user = User(
        wallet_address="0x2222222222222222222222222222222222222222",
        ens_name="freelancer.eth",
        role=UserRole.FREELANCER,
        bio="Expert Solidity Dev",
        skills=["Solidity", "FastAPI", "React"],
        hourly_rate_eth=0.05,
        availability=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    rep = Reputation(
        user_id=user.id,
        score=75,
        tier=ReputationTier.SILVER,
        total_jobs=5,
        dispute_rate=0.0,
        total_value_eth=15.5
    )
    db_session.add(rep)
    db_session.commit()
    return user

@pytest.fixture(scope="function")
def voter_user(db_session):
    user = User(
        wallet_address="0x3333333333333333333333333333333333333333",
        ens_name="voter.eth",
        role=UserRole.BOTH,
        bio="Experienced protocol voter",
        skills=["Governance"],
        hourly_rate_eth=0.1,
        availability=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    rep = Reputation(
        user_id=user.id,
        score=90,
        tier=ReputationTier.GOLD,
        total_jobs=20,
        dispute_rate=0.02,
        total_value_eth=100.0
    )
    db_session.add(rep)
    db_session.commit()
    return user
