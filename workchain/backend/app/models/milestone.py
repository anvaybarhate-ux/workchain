import enum
import uuid
from sqlalchemy import Column, String, Text, Integer, Numeric, DateTime, Enum, ForeignKey, JSON, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class MilestoneStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    DISPUTED = "disputed"
    RELEASED = "released"

class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    milestone_index = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    amount_eth = Column(Numeric(18, 8), nullable=False)
    deadline = Column(DateTime(timezone=True), nullable=False)
    
    status = Column(Enum(MilestoneStatus, native_enum=False), default=MilestoneStatus.PENDING, nullable=False)
    ipfs_hash = Column(String(100), nullable=True)
    proof_links = Column(JSON, default=list, nullable=False)
    submission_notes = Column(Text, nullable=True)
    
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    tx_hash_release = Column(String(66), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="milestones")
