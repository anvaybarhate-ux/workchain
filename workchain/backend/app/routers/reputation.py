from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.reputation import Reputation, ReputationTier
from app.models.user import User
from app.schemas.reputation import ReputationResponse
from app.services.reputation import reputation_service
from app.utils.wallet import is_valid_eth_address, to_checksum

router = APIRouter(prefix="/reputation", tags=["Reputation"])

@router.get("/leaderboard", response_model=List[ReputationResponse])
def get_leaderboard(
    limit: int = Query(20, ge=1, le=100),
    tier: Optional[ReputationTier] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get the top freelancers ordered by reputation score.
    """
    leaderboard = reputation_service.get_leaderboard(db, limit, tier)
    return leaderboard

@router.get("/{wallet}", response_model=ReputationResponse)
def get_reputation(wallet: str, db: Session = Depends(get_db)):
    """
    Get full reputation data for a wallet address.
    """
    if not is_valid_eth_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
        
    checksum_wallet = to_checksum(wallet)
    user = db.query(User).filter(User.wallet_address == checksum_wallet).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    rep = db.query(Reputation).filter(Reputation.user_id == user.id).first()
    if not rep:
        # Pre-create/initialize default score if it doesn't exist yet
        rep = reputation_service.update_reputation(checksum_wallet, db)
        
    return rep

@router.post("/{wallet}/recalculate", response_model=ReputationResponse)
def recalculate_reputation(wallet: str, db: Session = Depends(get_db)):
    """
    Triggers off-chain score recalculation and database update.
    Saves and returns updated Reputation schema.
    """
    if not is_valid_eth_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
        
    checksum_wallet = to_checksum(wallet)
    user = db.query(User).filter(User.wallet_address == checksum_wallet).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    try:
        rep = reputation_service.update_reputation(checksum_wallet, db)
        return rep
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to recalculate reputation: {str(e)}")
