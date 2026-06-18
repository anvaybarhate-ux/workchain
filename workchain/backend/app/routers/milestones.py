from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.milestone import Milestone, MilestoneStatus
from app.models.project import Project, ProjectStatus
from app.schemas.milestone import MilestoneResponse, MilestoneSubmit
from app.services.reputation import reputation_service
from app.utils.wallet import is_valid_eth_address, to_checksum

router = APIRouter(prefix="/milestones", tags=["Milestones"])

@router.get("/{milestone_id}", response_model=MilestoneResponse)
def get_milestone_detail(milestone_id: UUID, db: Session = Depends(get_db)):
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return milestone

@router.post("/{milestone_id}/submit", response_model=MilestoneResponse)
def submit_milestone(
    milestone_id: UUID,
    submission: MilestoneSubmit,
    wallet_address: str = Query(..., description="Wallet address of the submitter"),
    db: Session = Depends(get_db)
):
    """
    Submits milestone proof of work. Verifies caller is the freelancer.
    """
    if not is_valid_eth_address(wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
        
    checksum_wallet = to_checksum(wallet_address)
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    # Verify caller is freelancer
    project = milestone.project
    if project.freelancer.wallet_address.lower() != checksum_wallet.lower():
        raise HTTPException(status_code=403, detail="Only the assigned freelancer can submit work")
        
    if milestone.status not in [MilestoneStatus.ACTIVE, MilestoneStatus.PENDING]:
        raise HTTPException(status_code=400, detail=f"Milestone cannot be submitted in state: {milestone.status}")
        
    milestone.status = MilestoneStatus.SUBMITTED
    milestone.ipfs_hash = submission.ipfs_hash
    milestone.proof_links = submission.proof_links
    milestone.submission_notes = submission.notes
    milestone.submitted_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(milestone)
    return milestone

@router.post("/{milestone_id}/approve", response_model=MilestoneResponse)
def approve_milestone(
    milestone_id: UUID,
    wallet_address: str = Query(..., description="Wallet address of the client approving"),
    db: Session = Depends(get_db)
):
    """
    Approves a milestone, releases funds, and triggers reputation updates.
    """
    if not is_valid_eth_address(wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
        
    checksum_wallet = to_checksum(wallet_address)
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    project = milestone.project
    if project.client.wallet_address.lower() != checksum_wallet.lower():
        raise HTTPException(status_code=403, detail="Only the project client can approve milestones")
        
    if milestone.status != MilestoneStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Milestone has not been submitted for approval")
        
    milestone.status = MilestoneStatus.RELEASED
    milestone.approved_at = datetime.now(timezone.utc)
    
    # Activate next milestone, if any
    all_milestones = sorted(project.milestones, key=lambda m: m.milestone_index)
    current_idx = milestone.milestone_index
    
    if current_idx == len(all_milestones) - 1:
        project.status = ProjectStatus.COMPLETE
        project.end_date = datetime.now(timezone.utc)
    else:
        next_milestone = all_milestones[current_idx + 1]
        next_milestone.status = MilestoneStatus.ACTIVE
        
    db.commit()
    db.refresh(milestone)
    
    # Recalculate and update reputation
    reputation_service.update_reputation(project.freelancer.wallet_address, db)
    
    return milestone

@router.post("/{milestone_id}/reject", response_model=MilestoneResponse)
def reject_milestone(
    milestone_id: UUID,
    feedback: dict,  # Body: { feedback: str }
    wallet_address: str = Query(..., description="Wallet address of the client rejecting"),
    db: Session = Depends(get_db)
):
    """
    Rejects submitted milestone work, resetting status to active.
    """
    if not is_valid_eth_address(wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
        
    checksum_wallet = to_checksum(wallet_address)
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    project = milestone.project
    if project.client.wallet_address.lower() != checksum_wallet.lower():
        raise HTTPException(status_code=403, detail="Only the project client can reject milestones")
        
    if milestone.status != MilestoneStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Milestone is not in a submitted state")
        
    msg = feedback.get("feedback", "")
    milestone.status = MilestoneStatus.ACTIVE
    milestone.ipfs_hash = None
    milestone.proof_links = []
    milestone.submission_notes = f"Rejected. Feedback: {msg}"
    
    db.commit()
    db.refresh(milestone)
    return milestone
