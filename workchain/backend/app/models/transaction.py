import enum
import uuid
from sqlalchemy import Column, String, Numeric, DateTime, Enum, ForeignKey, BigInteger, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class TransactionType(str, enum.Enum):
    DEPLOY = "deploy"
    LOCK = "lock"
    RELEASE = "release"
    DISPUTE = "dispute"
    VOTE = "vote"

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tx_hash = Column(String(66), unique=True, nullable=False, index=True)
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    milestone_id = Column(UUID(as_uuid=True), ForeignKey("milestones.id"), nullable=True)
    
    type = Column(Enum(TransactionType, native_enum=False), nullable=False)
    from_address = Column(String(42), nullable=False)
    to_address = Column(String(42), nullable=False)
    
    amount_eth = Column(Numeric(18, 8), default=0.0, nullable=False)
    gas_used = Column(Numeric(18, 8), nullable=True)
    status = Column(Enum(TransactionStatus, native_enum=False), default=TransactionStatus.PENDING, nullable=False)
    
    block_number = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="transactions")
    milestone = relationship("Milestone", backref="transactions")
