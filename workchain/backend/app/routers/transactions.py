from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.project import Project
from app.schemas.transaction import TransactionResponse
from app.services.blockchain import blockchain_service

# Define router without default prefix to handle both /tx and /transactions cleanly
router = APIRouter(tags=["Transactions"])

@router.get("/tx/{tx_hash}", response_model=TransactionResponse)
def get_transaction_status(tx_hash: str, db: Session = Depends(get_db)):
    """
    Retrieves the transaction status. If pending in the DB, checks on-chain to update it.
    """
    if not tx_hash or len(tx_hash) != 66:
        raise HTTPException(status_code=400, detail="Invalid transaction hash format")
        
    tx = db.query(Transaction).filter(Transaction.tx_hash.ilike(tx_hash)).first()
    
    # If not found in DB, let's try to fetch it directly from the blockchain
    if not tx:
        logger_info = blockchain_service.verify_transaction(tx_hash)
        if logger_info.get("status") == "pending":
            raise HTTPException(status_code=404, detail="Transaction not found in database and is pending on-chain")
            
        # Create a transient record or raise 404
        raise HTTPException(status_code=404, detail="Transaction not indexed in database")
        
    # If pending in database, poll blockchain to update status
    if tx.status == TransactionStatus.PENDING:
        on_chain = blockchain_service.verify_transaction(tx_hash)
        if on_chain.get("status") != "pending":
            tx.status = TransactionStatus.CONFIRMED if on_chain["status"] == "confirmed" else TransactionStatus.FAILED
            tx.block_number = on_chain["block"]
            tx.gas_used = Decimal(str(on_chain["gas_used"]))
            db.commit()
            db.refresh(tx)
            
    return tx

@router.get("/transactions", response_model=List[TransactionResponse])
def list_transactions(
    project_id: Optional[UUID] = Query(None),
    wallet: Optional[str] = Query(None, description="Filter by sender or receiver wallet address"),
    type: Optional[TransactionType] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List transactions, with options to filter by project, wallet address, or type.
    """
    query = db.query(Transaction)
    
    if project_id:
        query = query.filter(Transaction.project_id == project_id)
        
    if type:
        query = query.filter(Transaction.type == type)
        
    if wallet:
        query = query.filter(
            or_(
                Transaction.from_address.ilike(wallet),
                Transaction.to_address.ilike(wallet)
            )
        )
        
    return query.all()
