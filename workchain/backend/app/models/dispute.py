import enum
import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, Enum, ForeignKey, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DisputeStatus(str, enum.Enum):
    OPEN = "open"
    VOTING = "voting"
    RESOLVED = "resolved"

class DisputeWinner(str, enum.Enum):
    FREELANCER = "freelancer"
    CLIENT = "client"

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    milestone_id = Column(UUID(as_uuid=True), ForeignKey("milestones.id"), nullable=False)
    raised_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    freelancer_evidence_ipfs = Column(String(100), nullable=True)
    client_evidence_ipfs = Column(String(100), nullable=True)
    freelancer_statement = Column(Text, nullable=True)
    client_statement = Column(Text, nullable=True)
    
    votes_freelancer = Column(Integer, default=0, nullable=False)
    votes_client = Column(Integer, default=0, nullable=False)
    
    status = Column(Enum(DisputeStatus, native_enum=False), default=DisputeStatus.OPEN, nullable=False)
    winner = Column(Enum(DisputeWinner, native_enum=False), nullable=True)
    
    voting_deadline = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    tx_hash_resolution = Column(String(66), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="disputes")
    milestone = relationship("Milestone", backref="disputes")
    raised_by_user = relationship("User", foreign_keys=[raised_by], backref="raised_disputes")
