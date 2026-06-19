from datetime import datetime
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from app.models.project import ProjectCategory, ProjectStatus
from app.schemas.milestone import MilestoneCreate, MilestoneResponse

class ProjectBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: ProjectCategory
    total_value_eth: Decimal

class ProjectCreate(BaseModel):
    freelancer_wallet: str = Field(..., description="Freelancer wallet address")
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: ProjectCategory
    milestones: List[MilestoneCreate]
    contract_address: Optional[str] = Field(None, description="Deployed escrow contract address")
    total_value_eth: Optional[Decimal] = Field(None, description="Total ETH locked in escrow")
    tx_hash_deploy: Optional[str] = Field(None, description="Factory createProject tx hash")

class ProjectUpdate(BaseModel):
    contract_address: Optional[str] = Field(None, description="Escrow contract address")
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ProjectCategory] = None
    status: Optional[ProjectStatus] = None
    tx_hash_deploy: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectStatusUpdate(BaseModel):
    status: ProjectStatus

class ProjectResponse(ProjectBase):
    id: UUID
    contract_address: Optional[str] = None
    client_id: UUID
    freelancer_id: UUID
    client_wallet: Optional[str] = None
    freelancer_wallet: Optional[str] = None
    status: ProjectStatus
    tx_hash_deploy: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    milestones: List[MilestoneResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
