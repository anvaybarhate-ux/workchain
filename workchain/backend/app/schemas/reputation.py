from datetime import datetime
from typing import Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.models.reputation import ReputationTier
from app.schemas.user import UserResponse

class ReputationBase(BaseModel):
    score: int = Field(50, ge=0, le=100)
    tier: ReputationTier = ReputationTier.BRONZE
    total_jobs: int = 0
    dispute_rate: Decimal = Decimal("0.0")
    total_value_eth: Decimal = Decimal("0.0")
    nft_token_id: Optional[int] = None
    nft_contract_address: Optional[str] = None

class ReputationCreate(ReputationBase):
    user_id: UUID

class ReputationUpdate(BaseModel):
    score: Optional[int] = Field(None, ge=0, le=100)
    tier: Optional[ReputationTier] = None
    total_jobs: Optional[int] = None
    dispute_rate: Optional[Decimal] = None
    total_value_eth: Optional[Decimal] = None
    nft_token_id: Optional[int] = None
    nft_contract_address: Optional[str] = None

class ReputationResponse(ReputationBase):
    id: UUID
    user_id: UUID
    user: Optional[UserResponse] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
