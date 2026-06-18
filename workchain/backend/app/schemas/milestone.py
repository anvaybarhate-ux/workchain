from datetime import datetime
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.models.milestone import MilestoneStatus

class MilestoneBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    amount_eth: Decimal
    deadline: datetime

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneSubmit(BaseModel):
    ipfs_hash: str = Field(..., max_length=100)
    proof_links: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount_eth: Optional[Decimal] = None
    deadline: Optional[datetime] = None
    status: Optional[MilestoneStatus] = None
    ipfs_hash: Optional[str] = None
    proof_links: Optional[List[str]] = None
    submission_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    tx_hash_release: Optional[str] = None

class MilestoneResponse(MilestoneBase):
    id: UUID
    project_id: UUID
    milestone_index: int
    status: MilestoneStatus
    ipfs_hash: Optional[str] = None
    proof_links: List[str] = Field(default_factory=list)
    submission_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    tx_hash_release: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
