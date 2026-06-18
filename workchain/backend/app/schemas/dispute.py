from datetime import datetime
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from app.models.dispute import DisputeStatus, DisputeWinner
from app.schemas.project import ProjectResponse
from app.schemas.milestone import MilestoneResponse

class DisputeBase(BaseModel):
    project_id: UUID
    milestone_id: UUID
    status: DisputeStatus = DisputeStatus.OPEN

class DisputeCreate(BaseModel):
    project_id: UUID
    milestone_id: UUID
    statement: str
    evidence_ipfs: str = ""

class VoteCast(BaseModel):
    wallet_address: str = Field(..., max_length=42, min_length=42)
    vote: Literal["freelancer", "client"]

class EvidenceSubmit(BaseModel):
    ipfs_hash: str = Field(..., max_length=100)
    statement: str

class DisputeResponse(DisputeBase):
    id: UUID
    raised_by: UUID
    freelancer_evidence_ipfs: Optional[str] = None
    client_evidence_ipfs: Optional[str] = None
    freelancer_statement: Optional[str] = None
    client_statement: Optional[str] = None
    votes_freelancer: int
    votes_client: int
    winner: Optional[DisputeWinner] = None
    voting_deadline: datetime
    resolved_at: Optional[datetime] = None
    tx_hash_resolution: Optional[str] = None
    created_at: datetime
    
    project: Optional[ProjectResponse] = None
    milestone: Optional[MilestoneResponse] = None

    model_config = ConfigDict(from_attributes=True)
