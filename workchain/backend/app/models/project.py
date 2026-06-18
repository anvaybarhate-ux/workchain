import enum
import uuid
from sqlalchemy import Column, String, Text, Numeric, DateTime, Enum, ForeignKey, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ProjectCategory(str, enum.Enum):
    DEVELOPMENT = "development"
    DESIGN = "design"
    AUDIT = "audit"
    CONSULTING = "consulting"
    OTHER = "other"

class ProjectStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETE = "complete"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_address = Column(String(42), unique=True, nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    freelancer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    total_value_eth = Column(Numeric(18, 8), nullable=False)
    category = Column(Enum(ProjectCategory, native_enum=False), nullable=False)
    status = Column(Enum(ProjectStatus, native_enum=False), default=ProjectStatus.PENDING, nullable=False)
    
    tx_hash_deploy = Column(String(66), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="client_projects")
    freelancer = relationship("User", foreign_keys=[freelancer_id], backref="freelancer_projects")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    disputes = relationship("Dispute", back_populates="project", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="project", cascade="all, delete-orphan")

    @property
    def client_wallet(self) -> str:
        return self.client.wallet_address if self.client else ""

    @property
    def freelancer_wallet(self) -> str:
        return self.freelancer.wallet_address if self.freelancer else ""
