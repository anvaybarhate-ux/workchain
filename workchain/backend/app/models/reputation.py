import enum
import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, Enum, ForeignKey, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ReputationTier(str, enum.Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"

class Reputation(Base):
    __tablename__ = "reputations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    score = Column(Integer, default=50, nullable=False)
    tier = Column(Enum(ReputationTier, native_enum=False), default=ReputationTier.BRONZE, nullable=False)
    total_jobs = Column(Integer, default=0, nullable=False)
    dispute_rate = Column(Numeric(5, 2), default=0.0, nullable=False)
    total_value_eth = Column(Numeric(18, 8), default=0.0, nullable=False)
    
    nft_token_id = Column(Integer, nullable=True)
    nft_contract_address = Column(String(42), nullable=True)
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="reputation")
