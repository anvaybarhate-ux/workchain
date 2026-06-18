import enum
import uuid
from sqlalchemy import Column, String, Text, Boolean, Numeric, DateTime, Enum, JSON, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class UserRole(str, enum.Enum):
    FREELANCER = "freelancer"
    CLIENT = "client"
    BOTH = "both"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_address = Column(String(42), unique=True, nullable=False, index=True)
    ens_name = Column(String(100), nullable=True)
    role = Column(Enum(UserRole, native_enum=False), default=UserRole.FREELANCER, nullable=False)
    bio = Column(Text, nullable=True)
    skills = Column(JSON, default=list, nullable=False)
    hourly_rate_eth = Column(Numeric(10, 4), nullable=True)
    availability = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    reputation = relationship("Reputation", back_populates="user", uselist=False, cascade="all, delete-orphan")
