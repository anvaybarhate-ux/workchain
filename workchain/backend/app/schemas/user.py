from datetime import datetime
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.models.user import UserRole

class UserBase(BaseModel):
    wallet_address: str = Field(..., description="Ethereum wallet address (0x...)")
    ens_name: Optional[str] = Field(None, max_length=100)
    role: UserRole = UserRole.FREELANCER
    bio: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    hourly_rate_eth: Optional[Decimal] = None
    availability: bool = True

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    ens_name: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    hourly_rate_eth: Optional[Decimal] = None
    availability: Optional[bool] = None

class ReputationEmbedded(BaseModel):
    score: int
    tier: str
    total_jobs: int
    dispute_rate: Decimal
    total_value_eth: Decimal
    nft_token_id: Optional[int] = None
    nft_contract_address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserResponse(UserBase):
    id: UUID
    reputation: Optional[ReputationEmbedded] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
