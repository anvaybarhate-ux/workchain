from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.dispute import Dispute, DisputeStatus
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectStatusUpdate
from app.utils.wallet import is_valid_eth_address, to_checksum

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    wallet_address: Optional[str] = Query(None, description="Wallet address to list projects for"),
    role: Optional[str] = Query(None, description="client or freelancer"),
    status: Optional[ProjectStatus] = Query(None, description="Project status filter"),
    db: Session = Depends(get_db)
):
    query = db.query(Project)
    
    if wallet_address:
        if not is_valid_eth_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid Ethereum address format")
            
        checksum_wallet = to_checksum(wallet_address)
        
        # Resolve user
        user = db.query(User).filter(User.wallet_address == checksum_wallet).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Filter by role
        if role == "client":
            query = query.filter(Project.client_id == user.id)
        elif role == "freelancer":
            query = query.filter(Project.freelancer_id == user.id)
        else:
            # Match either role
            query = query.filter((Project.client_id == user.id) | (Project.freelancer_id == user.id))
        
    # Filter by status
    if status:
        query = query.filter(Project.status == status)
        
    return query.all()

@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    project_in: ProjectCreate,
    client_wallet: str = Query(..., description="Client wallet creating the project"),
    tx_hash_deploy: Optional[str] = Query(None, description="Transaction hash of the factory deployment if already sent"),
    db: Session = Depends(get_db)
):
    """
    Creates a project and its milestones off-chain.
    Validates both client and freelancer wallets exist in the database.
    """
    if not is_valid_eth_address(client_wallet):
        raise HTTPException(status_code=400, detail="Invalid client wallet address format")
    if not is_valid_eth_address(project_in.freelancer_wallet):
        raise HTTPException(status_code=400, detail="Invalid freelancer wallet address format")
        
    checksum_client = to_checksum(client_wallet)
    checksum_freelancer = to_checksum(project_in.freelancer_wallet)
    
    if checksum_client.lower() == checksum_freelancer.lower():
        raise HTTPException(status_code=400, detail="Client and Freelancer wallets must be different")
        
    # Verify both wallets exist
    client = db.query(User).filter(User.wallet_address == checksum_client).first()
    if not client:
        raise HTTPException(status_code=400, detail="Client wallet is not registered in Workchain")
        
    freelancer = db.query(User).filter(User.wallet_address == checksum_freelancer).first()
    if not freelancer:
        raise HTTPException(status_code=400, detail="Freelancer wallet is not registered in Workchain")
        
    # Create project record
    total_val = sum(m.amount_eth for m in project_in.milestones)
    
    project = Project(
        title=project_in.title,
        description=project_in.description,
        client_id=client.id,
        freelancer_id=freelancer.id,
        total_value_eth=total_val,
        category=project_in.category,
        status=ProjectStatus.PENDING,
        tx_hash_deploy=tx_hash_deploy
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Create milestones
    for idx, m_in in enumerate(project_in.milestones):
        milestone = Milestone(
            project_id=project.id,
            milestone_index=idx,
            title=m_in.title,
            description=m_in.description,
            amount_eth=m_in.amount_eth,
            deadline=m_in.deadline,
            status=MilestoneStatus.PENDING
        )
        db.add(milestone)
        
    db.commit()
    db.refresh(project)
    
    return project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_detail(project_id: UUID, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}/status", response_model=ProjectResponse)
def update_project_status(project_id: UUID, status_in: ProjectStatusUpdate, db: Session = Depends(get_db)):
    """
    Updates the project status. Typically called by the blockchain event indexer.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.status = status_in.status
    
    if status_in.status == ProjectStatus.ACTIVE:
        if not project.contract_address:
            import secrets
            project.contract_address = to_checksum("0x" + secrets.token_hex(20))
        if project.milestones and all(m.status == MilestoneStatus.PENDING for m in project.milestones):
            project.milestones[0].status = MilestoneStatus.ACTIVE
            
    db.commit()
    db.refresh(project)
    return project
