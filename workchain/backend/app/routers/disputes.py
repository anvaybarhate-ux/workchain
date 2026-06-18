from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.dispute import Dispute, DisputeStatus
from app.models.project import Project, ProjectStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.user import User
from app.schemas.dispute import DisputeCreate, DisputeResponse, VoteCast, EvidenceSubmit
from app.utils.wallet import is_valid_eth_address, to_checksum

router = APIRouter(prefix="/disputes", tags=["Disputes"])

@router.get("", response_model=List[DisputeResponse])
def list_disputes(
    wallet_address: Optional[str] = Query(None, description="Wallet of a party in the project"),
    status: Optional[DisputeStatus] = Query(None, description="Dispute status"),
    db: Session = Depends(get_db)
):
    query = db.query(Dispute)
    
    if status:
        query = query.filter(Dispute.status == status)
        
    if wallet_address:
        if not is_valid_eth_address(wallet_address):
            raise HTTPException(status_code=400, detail="Invalid wallet address format")
        checksum_wallet = to_checksum(wallet_address)
        user = db.query(User).filter(User.wallet_address == checksum_wallet).first()
        if user:
            query = query.join(Project).filter(
                (Project.client_id == user.id) | (Project.freelancer_id == user.id)
            )
        else:
            return []
            
    return query.all()

@router.post("", response_model=DisputeResponse, status_code=201)
def raise_dispute(
    dispute_in: DisputeCreate,
    wallet_address: str = Query(..., description="Wallet address of the party raising the dispute"),
    db: Session = Depends(get_db)
):
    """
    Raises a new dispute on a milestone.
    Sets the voting deadline to now + 7 days.
    """
    if not is_valid_eth_address(wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
        
    checksum_wallet = to_checksum(wallet_address)
    user = db.query(User).filter(User.wallet_address == checksum_wallet).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    project = db.query(Project).filter(Project.id == dispute_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    milestone = db.query(Milestone).filter(Milestone.id == dispute_in.milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    # Verify caller is a party to the project
    is_client = project.client_id == user.id
    is_freelancer = project.freelancer_id == user.id
    if not is_client and not is_freelancer:
        raise HTTPException(status_code=403, detail="Only client or freelancer of the project can raise disputes")
        
    # Verify milestone belongs to project
    if milestone.project_id != project.id:
        raise HTTPException(status_code=400, detail="Milestone does not belong to specified project")
        
    # Verify no active dispute already exists
    existing = db.query(Dispute).filter(
        Dispute.milestone_id == milestone.id,
        Dispute.status != DisputeStatus.RESOLVED
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="An active dispute already exists for this milestone")
        
    deadline = datetime.now(timezone.utc) + timedelta(days=7)
    
    freelancer_ev = dispute_in.evidence_ipfs if is_freelancer else None
    client_ev = dispute_in.evidence_ipfs if is_client else None
    freelancer_stmt = dispute_in.statement if is_freelancer else None
    client_stmt = dispute_in.statement if is_client else None
    
    dispute = Dispute(
        id=uuid4(),
        project_id=project.id,
        milestone_id=milestone.id,
        raised_by=user.id,
        freelancer_evidence_ipfs=freelancer_ev,
        client_evidence_ipfs=client_ev,
        freelancer_statement=freelancer_stmt,
        client_statement=client_stmt,
        votes_freelancer=0,
        votes_client=0,
        status=DisputeStatus.OPEN,
        voting_deadline=deadline
    )
    
    # Update statuses
    milestone.status = MilestoneStatus.DISPUTED
    project.status = ProjectStatus.DISPUTED
    
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    return dispute

@router.get("/{dispute_id}", response_model=DisputeResponse)
def get_dispute_detail(dispute_id: UUID, db: Session = Depends(get_db)):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    return dispute

@router.post("/{dispute_id}/vote", response_model=DisputeResponse)
def cast_vote(dispute_id: UUID, vote_in: VoteCast, db: Session = Depends(get_db)):
    """
    Casts a community vote on a dispute.
    Verifies that the voter is not a party to the dispute.
    """
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
        
    if dispute.status == DisputeStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Dispute is already resolved")
        
    if datetime.now(timezone.utc) >= dispute.voting_deadline.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Voting deadline has passed")
        
    if not is_valid_eth_address(vote_in.wallet_address):
        raise HTTPException(status_code=400, detail="Invalid voter wallet address format")
        
    checksum_voter = to_checksum(vote_in.wallet_address)
    
    project = dispute.project
    # Verify voter is not a party to the dispute
    if (project.client.wallet_address.lower() == checksum_voter.lower() or
        project.freelancer.wallet_address.lower() == checksum_voter.lower()):
        raise HTTPException(status_code=403, detail="Dispute parties are not eligible to vote")
        
    # Check if voter has already voted off-chain (simulated via off-chain logs if needed)
    # Since there's no votes table, we allow voting and increment.
    dispute.status = DisputeStatus.VOTING
    if vote_in.vote == "freelancer":
        dispute.votes_freelancer += 1
    else:
        dispute.votes_client += 1
        
    db.commit()
    db.refresh(dispute)
    return dispute

@router.post("/{dispute_id}/evidence", response_model=DisputeResponse)
def submit_evidence(
    dispute_id: UUID,
    evidence: EvidenceSubmit,
    wallet_address: str = Query(..., description="Wallet submitting evidence"),
    db: Session = Depends(get_db)
):
    """
    Allows dispute parties to submit statements and evidence hashes.
    """
    if not is_valid_eth_address(wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
        
    checksum_wallet = to_checksum(wallet_address)
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
        
    if dispute.status == DisputeStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Dispute is already resolved")
        
    project = dispute.project
    
    if project.freelancer.wallet_address.lower() == checksum_wallet.lower():
        dispute.freelancer_evidence_ipfs = evidence.ipfs_hash
        dispute.freelancer_statement = evidence.statement
    elif project.client.wallet_address.lower() == checksum_wallet.lower():
        dispute.client_evidence_ipfs = evidence.ipfs_hash
        dispute.client_statement = evidence.statement
    else:
        raise HTTPException(status_code=403, detail="Only dispute parties can submit evidence")
        
    db.commit()
    db.refresh(dispute)
    return dispute

