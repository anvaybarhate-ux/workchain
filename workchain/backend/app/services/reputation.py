import logging
from typing import Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from web3 import Web3
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.dispute import Dispute, DisputeStatus, DisputeWinner
from app.models.reputation import Reputation, ReputationTier
from app.services.blockchain import blockchain_service

logger = logging.getLogger(__name__)

class ReputationService:
    
    def calculate_score(self, wallet: str, db: Session) -> int:
        """
        Dynamically calculates user score (0-100) based on project delivery history.
        """
        # Find user
        user = db.query(User).filter(User.wallet_address.ilike(wallet)).first()
        if not user:
            return 50  # Default base score if user not found

        # 1. Completed jobs
        completed_projects = db.query(Project).filter(
            Project.freelancer_id == user.id,
            Project.status == ProjectStatus.COMPLETE
        ).all()
        completed_jobs = len(completed_projects)

        # 2. Dispute history
        all_disputes = db.query(Dispute).join(Project).filter(
            Project.freelancer_id == user.id,
            Dispute.status == DisputeStatus.RESOLVED
        ).all()
        disputes_lost = sum(1 for d in all_disputes if d.winner == DisputeWinner.CLIENT)

        # 3. Late deliveries and on-time rate
        # Find all milestones of this freelancer that have been released/completed
        released_milestones = db.query(Milestone).join(Project).filter(
            Project.freelancer_id == user.id,
            Milestone.status == MilestoneStatus.RELEASED
        ).all()
        
        total_completed_milestones = len(released_milestones)
        late_deliveries = 0
        on_time_deliveries = 0

        for m in released_milestones:
            if m.submitted_at and m.deadline:
                if m.submitted_at <= m.deadline:
                    on_time_deliveries += 1
                else:
                    late_deliveries += 1
            else:
                # If approved directly or missing submission logs, count as on-time
                on_time_deliveries += 1

        on_time_rate = 1.0
        if total_completed_milestones > 0:
            on_time_rate = on_time_deliveries / total_completed_milestones

        # Formula parameters
        base = 50
        jobs_bonus = min(completed_jobs * 2, 20)
        
        # Default avg rating to 5.0 for completed projects (since no rating column is requested)
        avg_rating = 5.0 if completed_jobs > 0 else 0.0
        rating_bonus = min(avg_rating * 4, 20)
        
        time_bonus = min(on_time_rate * 10, 10)
        dispute_penalty = disputes_lost * 15
        late_penalty = late_deliveries * 3
        
        score = base + jobs_bonus + rating_bonus + time_bonus - dispute_penalty - late_penalty
        return max(0, min(100, int(score)))

    def get_tier(self, score: int) -> ReputationTier:
        if score <= 40:
            return ReputationTier.BRONZE
        elif score <= 65:
            return ReputationTier.SILVER
        elif score <= 88:
            return ReputationTier.GOLD
        else:
            return ReputationTier.PLATINUM

    def update_reputation(self, wallet: str, db: Session) -> Reputation:
        user = db.query(User).filter(User.wallet_address.ilike(wallet)).first()
        if not user:
            raise ValueError(f"User with wallet {wallet} not found.")

        # Calculate off-chain stats
        score = self.calculate_score(wallet, db)
        tier = self.get_tier(score)
        
        # Calculate completed jobs count
        completed_projects = db.query(Project).filter(
            Project.freelancer_id == user.id,
            Project.status == ProjectStatus.COMPLETE
        ).all()
        total_jobs = len(completed_projects)
        
        # Calculate total value in ether
        total_value_eth = sum(p.total_value_eth for p in completed_projects)
        
        # Calculate dispute rate
        all_disputes = db.query(Dispute).join(Project).filter(
            Project.freelancer_id == user.id
        ).all()
        total_disputes = len(all_disputes)
        dispute_rate = (total_disputes / total_jobs * 100) if total_jobs > 0 else 0.0

        # Update or create Reputation DB record
        rep = db.query(Reputation).filter(Reputation.user_id == user.id).first()
        if not rep:
            rep = Reputation(
                user_id=user.id,
                score=score,
                tier=tier,
                total_jobs=total_jobs,
                dispute_rate=Decimal(str(dispute_rate)),
                total_value_eth=Decimal(str(total_value_eth))
            )
            db.add(rep)
        else:
            rep.score = score
            rep.tier = tier
            rep.total_jobs = total_jobs
            rep.dispute_rate = Decimal(str(dispute_rate))
            rep.total_value_eth = Decimal(str(total_value_eth))
            
        db.commit()
        db.refresh(rep)

        # Sync with Ethereum Sepolia Smart Contract if Private Key is present
        if settings.PRIVATE_KEY and len(settings.PRIVATE_KEY) > 0:
            try:
                self._sync_on_chain(wallet, score, total_jobs, dispute_rate, total_value_eth)
            except Exception as e:
                logger.error(f"Failed to sync reputation on-chain for {wallet}: {e}")

        return rep

    def _sync_on_chain(self, wallet: str, score: int, total_jobs: int, dispute_rate: float, total_value_eth: Decimal):
        """
        Sends an on-chain transaction calling updateReputation() in the Reputation contract.
        """
        w3 = blockchain_service.w3
        if not w3.is_connected():
            logger.warning("Web3 is not connected. Skipping on-chain reputation sync.")
            return

        try:
            account = w3.eth.account.from_key(settings.PRIVATE_KEY)
            contract = blockchain_service.get_contract(settings.CONTRACT_REPUTATION, blockchain_service.reputation_abi)
            if not contract:
                logger.error("Could not load reputation contract.")
                return

            checksum_wallet = Web3.to_checksum_address(wallet)
            
            # Check if user has minted their Reputation NFT first. If not, mint it!
            has_minted = False
            try:
                has_minted = contract.functions.hasMinted(checksum_wallet).call()
            except Exception as ex:
                logger.warning(f"Error checking hasMinted for {wallet}: {ex}")
                has_minted = False

            if not has_minted:
                # Mint Soulbound Reputation NFT
                logger.info(f"Minting reputation NFT for {wallet} on-chain...")
                mint_tx = contract.functions.mintReputation(checksum_wallet).build_transaction({
                    'from': account.address,
                    'nonce': w3.eth.get_transaction_count(account.address),
                    'gas': 300000,
                    'gasPrice': w3.eth.gas_price
                })
                signed_mint = w3.eth.account.sign_transaction(mint_tx, settings.PRIVATE_KEY)
                mint_hash = w3.eth.send_raw_transaction(signed_mint.rawTransaction)
                w3.eth.wait_for_transaction_receipt(mint_hash, timeout=120)
                logger.info(f"Minted NFT successfully. TX Hash: {mint_hash.hex()}")

            # Call updateReputation(freelancer, newScore, totalJobs, disputeRate, totalValueWei)
            total_value_wei = w3.to_wei(total_value_eth, 'ether')
            
            tx = contract.functions.updateReputation(
                checksum_wallet,
                score,
                total_jobs,
                int(dispute_rate),
                total_value_wei
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 300000,
                'gasPrice': w3.eth.gas_price
            })
            
            signed_tx = w3.eth.account.sign_transaction(tx, settings.PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            logger.info(f"Sent reputation update transaction on-chain: {tx_hash.hex()}")
        except Exception as e:
            logger.error(f"On-chain reputation sync transaction failed: {e}")

    def get_leaderboard(self, db: Session, limit: int = 20, tier: Optional[ReputationTier] = None) -> list:
        query = db.query(Reputation).join(User)
        if tier:
            query = query.filter(Reputation.tier == tier)
        
        # Order by score desc
        reputations = query.order_by(Reputation.score.desc()).limit(limit).all()
        return reputations

# Initialize singleton service
reputation_service = ReputationService()
