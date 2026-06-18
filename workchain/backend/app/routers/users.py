from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.user import User, UserRole
from app.models.reputation import Reputation, ReputationTier
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.utils.wallet import is_valid_eth_address, to_checksum

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/explore", response_model=List[UserResponse])
def explore_freelancers(
    tier: Optional[ReputationTier] = None,
    skill: Optional[str] = None,
    min_jobs: Optional[int] = None,
    sort_by: str = "score",  # "score", "rate"
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Explore/filter freelancers based on skills, tiers, hourly rate, and jobs completed.
    """
    query = db.query(User).join(Reputation, User.id == Reputation.user_id)
    
    # Explore freelancers or people who act as "both"
    query = query.filter(User.role.in_([UserRole.FREELANCER, UserRole.BOTH]))
    
    if tier:
        query = query.filter(Reputation.tier == tier)
        
    if min_jobs is not None:
        query = query.filter(Reputation.total_jobs >= min_jobs)
        
    if skill:
        # Check skill using JSON search
        # To remain compatible with SQLite, we filter on the python side or do a standard LIKE query if possible
        # We can perform a robust Python-level or SQLAlchemy JSON query:
        # For simplicity and cross-db compatibility:
        query = query.filter(User.skills.contains(skill))
        
    # Sort
    if sort_by == "rate":
        query = query.order_by(User.hourly_rate_eth.asc())
    else:  # score
        query = query.order_by(desc(Reputation.score))
        
    users = query.offset(offset).limit(limit).all()
    return users

@router.get("/{wallet}", response_model=UserResponse)
def get_user(wallet: str, db: Session = Depends(get_db)):
    if not is_valid_eth_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address format")
    
    checksum_wallet = to_checksum(wallet)
    user = db.query(User).filter(User.wallet_address == checksum_wallet).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("", response_model=UserResponse, status_code=201)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    if not is_valid_eth_address(user_in.wallet_address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address format")
    
    checksum_wallet = to_checksum(user_in.wallet_address)
    
    # Check if user already exists
    existing = db.query(User).filter(User.wallet_address == checksum_wallet).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this wallet address already exists")
    
    user = User(
        wallet_address=checksum_wallet,
        ens_name=user_in.ens_name,
        role=user_in.role,
        bio=user_in.bio,
        skills=user_in.skills,
        hourly_rate_eth=user_in.hourly_rate_eth,
        availability=user_in.availability
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Pre-create default reputation off-chain
    rep = Reputation(
        user_id=user.id,
        score=50,
        tier=ReputationTier.BRONZE,
        total_jobs=0,
        dispute_rate=0.0,
        total_value_eth=0.0
    )
    db.add(rep)
    db.commit()
    
    return user

@router.put("/{wallet}", response_model=UserResponse)
def update_user(wallet: str, user_in: UserUpdate, db: Session = Depends(get_db)):
    if not is_valid_eth_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address format")
        
    checksum_wallet = to_checksum(wallet)
    user = db.query(User).filter(User.wallet_address == checksum_wallet).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update fields if provided
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.commit()
    db.refresh(user)
    return user

