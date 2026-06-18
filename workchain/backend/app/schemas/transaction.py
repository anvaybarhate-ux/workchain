from datetime import datetime
from typing import Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.models.transaction import TransactionType, TransactionStatus

class TransactionBase(BaseModel):
    tx_hash: str = Field(..., max_length=66, min_length=66)
    type: TransactionType
    from_address: str = Field(..., max_length=42, min_length=42)
    to_address: str = Field(..., max_length=42, min_length=42)
    amount_eth: Decimal = Decimal("0.0")
    gas_used: Optional[Decimal] = None
    status: TransactionStatus = TransactionStatus.PENDING
    block_number: Optional[int] = None

class TransactionCreate(TransactionBase):
    project_id: Optional[UUID] = None
    milestone_id: Optional[UUID] = None

class TransactionUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    gas_used: Optional[Decimal] = None
    block_number: Optional[int] = None

class TransactionResponse(TransactionBase):
    id: UUID
    project_id: Optional[UUID] = None
    milestone_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
