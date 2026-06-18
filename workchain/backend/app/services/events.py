import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from web3 import Web3
from app.config import settings
from app.database import SessionLocal
from app.models.project import Project, ProjectStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.dispute import Dispute, DisputeStatus, DisputeWinner
from app.models.reputation import Reputation
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.models.user import User
from app.models.indexer import IndexerState
from app.services.blockchain import blockchain_service
from app.services.reputation import reputation_service
from app.services.notifications import notification_service

logger = logging.getLogger(__name__)

class EventIndexer:
    def __init__(self):
        self.deployment_block = 10895967  # Deployed block on Sepolia
        self.last_indexed_block = self.deployment_block

    async def start(self):
        logger.info("Starting background blockchain event indexer...")
        # Get start block from DB to resume gracefully
        db = SessionLocal()
        try:
            # First, check if IndexerState has a saved block
            indexer_state = db.query(IndexerState).filter(IndexerState.key == "last_indexed_block").first()
            if indexer_state:
                self.last_indexed_block = indexer_state.value
                logger.info(f"Resuming indexing from saved IndexerState block {self.last_indexed_block}")
            else:
                # Fallback to max Transaction block_number
                max_block = db.query(func.max(Transaction.block_number)).scalar()
                if max_block:
                    self.last_indexed_block = max_block
                    logger.info(f"Resuming indexing from max Transaction block {self.last_indexed_block}")
                else:
                    self.last_indexed_block = self.deployment_block
                    logger.info(f"No previous state found. Starting from deployment block {self.deployment_block}")
                
                # Store the initial indexer state
                new_state = IndexerState(key="last_indexed_block", value=self.last_indexed_block)
                db.add(new_state)
                db.commit()
        except Exception as e:
            logger.error(f"Error fetching/initializing indexer state from DB: {e}")
        finally:
            db.close()

        while True:
            try:
                await self.poll_new_events()
            except Exception as e:
                logger.error(f"Unhandled error in event indexer loop: {e}", exc_info=True)
            await asyncio.sleep(15)

    async def poll_new_events(self):
        w3 = blockchain_service.w3
        try:
            if not w3.is_connected():
                logger.warning("Web3 is not connected. Skipping event index loop.")
                return
        except Exception as e:
            logger.error(f"Error checking Web3 connection: {e}")
            return

        try:
            # 6-block safety lag behind the chain head
            latest_block = w3.eth.block_number - 6
        except Exception as e:
            logger.error(f"Error fetching latest block number: {e}")
            return

        if latest_block <= self.last_indexed_block:
            return

        from_block = self.last_indexed_block + 1
        # Process in chunks of 10 blocks to avoid Alchemy Free tier eth_getLogs restrictions (max 10 block range)
        to_block = min(from_block + 9, latest_block)

        logger.debug(f"Polling block range {from_block} to {to_block} (Latest stable block: {latest_block})")

        db = SessionLocal()
        try:
            # 1. First, check Central Factory events (ProjectCreated)
            await self._index_factory_events(from_block, to_block, db)

            # 2. Get all active project escrow addresses to check events
            projects = db.query(Project).filter(Project.contract_address.isnot(None)).all()
            for project in projects:
                await self._index_escrow_events(project, from_block, to_block, db)

            # Update indexing pointer in DB
            self.last_indexed_block = to_block
            indexer_state = db.query(IndexerState).filter(IndexerState.key == "last_indexed_block").first()
            if indexer_state:
                indexer_state.value = to_block
            else:
                indexer_state = IndexerState(key="last_indexed_block", value=to_block)
                db.add(indexer_state)
            db.commit()
            logger.debug(f"Successfully updated IndexerState value to {to_block}")
        except Exception as e:
            logger.error(f"Error during event polling: {e}")
            db.rollback()
        finally:
            db.close()

    async def _index_factory_events(self, from_block: int, to_block: int, db: Session):
        factory_contract = blockchain_service.get_contract(settings.CONTRACT_FACTORY, blockchain_service.factory_abi)
        if not factory_contract:
            return

        try:
            # Filter central Factory project creations
            logs = factory_contract.events.ProjectCreated.get_logs(fromBlock=from_block, toBlock=to_block)
            for log in logs:
                tx_hash = log["transactionHash"].hex()
                # Check duplicate/idempotency first
                existing_tx = db.query(Transaction).filter(Transaction.tx_hash == tx_hash).first()
                if existing_tx:
                    logger.debug(f"Factory event in tx {tx_hash} already indexed. Skipping.")
                    continue

                args = log["args"]
                escrow_contract = args["escrowContract"].lower()
                client_wallet = args["client"].lower()
                freelancer_wallet = args["freelancer"].lower()
                total_value = blockchain_service.w3.from_wei(args["totalValue"], 'ether')

                logger.info(f"Event captured [ProjectCreated]: Deployed {escrow_contract} for Client {client_wallet} -> Freelancer {freelancer_wallet} ({total_value} ETH)")

                # Find the pending project in DB by tx_hash_deploy, or client/freelancer addresses
                project = db.query(Project).filter(
                    (Project.tx_hash_deploy == tx_hash) | 
                    ((Project.contract_address.is_(None)) & 
                     (Project.total_value_eth == total_value))
                ).first()

                if project:
                    project.contract_address = escrow_contract
                    project.status = ProjectStatus.ACTIVE
                    project.start_date = datetime.now(timezone.utc)
                    
                    # Activate the first milestone
                    if project.milestones:
                        project.milestones[0].status = MilestoneStatus.ACTIVE
                    
                    # Record the deployment transaction in DB
                    tx_record = Transaction(
                        tx_hash=tx_hash,
                        project_id=project.id,
                        type=TransactionType.DEPLOY,
                        from_address=client_wallet,
                        to_address=escrow_contract,
                        amount_eth=total_value,
                        status=TransactionStatus.CONFIRMED,
                        block_number=log["blockNumber"]
                    )
                    db.add(tx_record)
                    db.commit()
                    logger.info(f"Database project '{project.title}' updated with escrow contract address: {escrow_contract}")
        except Exception as e:
            logger.error(f"Error indexing factory events: {e}")

    async def _index_escrow_events(self, project: Project, from_block: int, to_block: int, db: Session):
        escrow_contract = blockchain_service.get_contract(project.contract_address, blockchain_service.escrow_abi)
        if not escrow_contract:
            return

        # List of events to index on each active escrow
        events_to_index = [
            ("MilestoneSubmitted", self._index_milestone_submitted),
            ("MilestoneApproved", self._index_milestone_approved),
            ("MilestoneRejected", self._index_milestone_rejected),
            ("DisputeRaised", self._index_dispute_raised),
            ("VoteCast", self._index_vote_cast),
            ("DisputeResolved", self._index_dispute_resolved),
            ("ProjectCancelled", self._index_project_cancelled),
            ("ProjectCompleted", self._index_project_completed)
        ]

        for event_name, handler in events_to_index:
            try:
                event_obj = getattr(escrow_contract.events, event_name)
                logs = event_obj.get_logs(fromBlock=from_block, toBlock=to_block)
                for log in logs:
                    await handler(project, log, db)
            except Exception as e:
                logger.error(f"Error querying event {event_name} on project {project.contract_address}: {e}")

    async def _index_milestone_submitted(self, project: Project, log: dict, db: Session):
        tx_hash = log["transactionHash"].hex()
        # Pre-check for duplicate/idempotency
        existing_tx = db.query(Transaction).filter(Transaction.tx_hash == tx_hash).first()
        if existing_tx:
            logger.debug(f"MilestoneSubmitted event in tx {tx_hash} already indexed. Skipping.")
            return

        args = log["args"]
        milestone_index = args["milestoneIndex"]
        ipfs_hash = args["ipfsHash"]
        
        logger.info(f"Event captured [MilestoneSubmitted] index: {milestone_index} on {project.contract_address}")

        milestone = db.query(Milestone).filter(
            Milestone.project_id == project.id,
            Milestone.milestone_index == milestone_index
        ).first()

        if milestone:
            milestone.status = MilestoneStatus.SUBMITTED
            milestone.ipfs_hash = ipfs_hash
            milestone.submitted_at = datetime.now(timezone.utc)
            
            # Record transition log or transaction
            tx_record = Transaction(
                tx_hash=tx_hash,
                project_id=project.id,
                milestone_id=milestone.id,
                type=TransactionType.RELEASE,  # or submission
                from_address=project.freelancer.wallet_address,
                to_address=project.contract_address,
                status=TransactionStatus.CONFIRMED,
                block_number=log["blockNumber"]
            )
            db.add(tx_record)
            db.commit()
            
            notification_service.notify_milestone_submitted(
                project.title, 
                project.freelancer.wallet_address, 
                project.client.wallet_address, 
                milestone_index
            )

    async def _index_milestone_approved(self, project: Project, log: dict, db: Session):
        tx_hash = log["transactionHash"].hex()
        # Pre-check for duplicate/idempotency
        existing_tx = db.query(Transaction).filter(Transaction.tx_hash == tx_hash).first()
        if existing_tx:
            logger.debug(f"MilestoneApproved event in tx {tx_hash} already indexed. Skipping.")
            return

        args = log["args"]
        milestone_index = args["milestoneIndex"]
        amount = blockchain_service.w3.from_wei(args["amount"], 'ether')

        logger.info(f"Event captured [MilestoneApproved] index: {milestone_index} on {project.contract_address}")

        milestone = db.query(Milestone).filter(
            Milestone.project_id == project.id,
            Milestone.milestone_index == milestone_index
        ).first()

        if milestone:
            milestone.status = MilestoneStatus.RELEASED
            milestone.approved_at = datetime.now(timezone.utc)
            milestone.tx_hash_release = tx_hash
            
            # Record approval transaction
            tx_record = Transaction(
                tx_hash=tx_hash,
                project_id=project.id,
                milestone_id=milestone.id,
                type=TransactionType.RELEASE,
                from_address=project.contract_address,
                to_address=project.freelancer.wallet_address,
                amount_eth=amount,
                status=TransactionStatus.CONFIRMED,
                block_number=log["blockNumber"]
            )
            db.add(tx_record)
            
            # Increment project index or trigger updates if not last milestone
            if milestone_index == len(project.milestones) - 1:
                # Handled also by ProjectCompleted event
                pass
            else:
                next_index = milestone_index + 1
                next_milestone = db.query(Milestone).filter(
                    Milestone.project_id == project.id,
                    Milestone.milestone_index == next_index
                ).first()
                if next_milestone:
                    next_milestone.status = MilestoneStatus.ACTIVE
            
            db.commit()

            notification_service.notify_milestone_approved(
                project.title, 
                project.client.wallet_address, 
                project.freelancer.wallet_address, 
                milestone_index, 
                float(amount)
            )

    async def _index_milestone_rejected(self, project: Project, log: dict, db: Session):
        tx_hash = log["transactionHash"].hex()
        # Pre-check for duplicate/idempotency
        existing_tx = db.query(Transaction).filter(Transaction.tx_hash == tx_hash).first()
        if existing_tx:
            logger.debug(f"MilestoneRejected event in tx {tx_hash} already indexed. Skipping.")
            return

        args = log["args"]
        milestone_index = args["milestoneIndex"]
        feedback = args["feedback"]

        logger.info(f"Event captured [MilestoneRejected] index: {milestone_index} on {project.contract_address}")

        milestone = db.query(Milestone).filter(
            Milestone.project_id == project.id,
            Milestone.milestone_index == milestone_index
        ).first()

        if milestone:
            milestone.status = MilestoneStatus.ACTIVE
            milestone.ipfs_hash = None
            milestone.proof_links = []
            milestone.submission_notes = f"Rejected. Feedback: {feedback}"
            
            # Record rejection as a Transaction record for idempotency audit trail
            tx_record = Transaction(
                tx_hash=tx_hash,
                project_id=project.id,
                milestone_id=milestone.id,
                type=TransactionType.RELEASE,  # using RELEASE as fallback
                from_address=project.client.wallet_address,
                to_address=project.contract_address,
                status=TransactionStatus.CONFIRMED,
                block_number=log["blockNumber"]
            )
            db.add(tx_record)
            db.commit()

    async def _index_dispute_raised(self, project: Project, log: dict, db: Session):
        tx_hash = log["transactionHash"].hex()
        # Pre-check for duplicate/idempotency
        existing_tx = db.query(Transaction).filter(Transaction.tx_hash == tx_hash).first()
        if existing_tx:
            logger.debug(f"DisputeRaised event in tx {tx_hash} already indexed. Skipping.")
            return

        args = log["args"]
        milestone_index = args["milestoneIndex"]
        raised_by = args["raisedBy"].lower()
        voting_deadline_epoch = args["votingDeadline"]
        voting_deadline = datetime.fromtimestamp(voting_deadline_epoch, tz=timezone.utc)

        logger.info(f"Event captured [DisputeRaised] index: {milestone_index} raised by {raised_by} on {project.contract_address}")

        milestone = db.query(Milestone).filter(
            Milestone.project_id == project.id,
            Milestone.milestone_index == milestone_index
        ).first()

        if milestone:
            milestone.status = MilestoneStatus.DISPUTED
            project.status = ProjectStatus.DISPUTED
            
            raised_by_user = db.query(User).filter(User.wallet_address.ilike(raised_by)).first()
            raised_by_id = raised_by_user.id if raised_by_user else project.client_id # fallback

            # Create or update dispute in DB
            dispute = db.query(Dispute).filter(Dispute.milestone_id == milestone.id).first()
            if not dispute:
                dispute = Dispute(
                    project_id=project.id,
                    milestone_id=milestone.id,
                    raised_by=raised_by_id,
                    status=DisputeStatus.OPEN,
                    voting_deadline=voting_deadline
                )
                db.add(dispute)
            else:
                dispute.status = DisputeStatus.OPEN
                dispute.voting_deadline = voting_deadline
            
            # Record dispute transaction
            tx_record = Transaction(
                tx_hash=tx_hash,
                project_id=project.id,
                milestone_id=milestone.id,
                type=TransactionType.DISPUTE,
                from_address=raised_by,
                to_address=project.contract_address,
                status=TransactionStatus.CONFIRMED,
                block_number=log["blockNumber"]
            )
            db.add(tx_record)
            db.commit()

            other_party = project.client.wallet_address if raised_by == project.freelancer.wallet_address else project.freelancer.wallet_address
            notification_service.notify_dispute_raised(
                project.title, 
                raised_by, 
                other_party, 
                milestone_index
            )

    async def _index_vote_cast(self, project: Project, log: dict, db: Session):
        tx_hash = log["transactionHash"].hex()
        # Pre-check for duplicate/idempotency
        existing_tx = db.query(Transaction).filter(Transaction.tx_hash == tx_hash).first()
        if existing_tx:
            logger.debug(f"VoteCast event in tx {tx_hash} already indexed. Skipping.")
            return

        args = log["args"]
        voter = args["voter"].lower()
        votes_freelancer = args["votesFreelancer"]
        votes_client = args["votesClient"]

        logger.info(f"Event captured [VoteCast] voter {voter} -> freelancer: {votes_freelancer}, client: {votes_client}")

        # Find active dispute for this project
        dispute = db.query(Dispute).filter(
            Dispute.project_id == project.id,
            Dispute.status != DisputeStatus.RESOLVED
        ).first()

        if dispute:
            dispute.status = DisputeStatus.VOTING
            dispute.votes_freelancer = votes_freelancer
            dispute.votes_client = votes_client
            
            # Record vote transaction
            tx_record = Transaction(
                tx_hash=tx_hash,
                project_id=project.id,
                milestone_id=dispute.milestone_id,
                type=TransactionType.VOTE,
                from_address=voter,
                to_address=project.contract_address,
                status=TransactionStatus.CONFIRMED,
                block_number=log["blockNumber"]
            )
            db.add(tx_record)
            db.commit()

    async def _index_dispute_resolved(self, project: Project, log: dict, db: Session):
        tx_hash = log["transactionHash"].hex()
        # Pre-check for duplicate/idempotency
        existing_tx = db.query(Transaction).filter(Transaction.tx_hash == tx_hash).first()
        if existing_tx:
            logger.debug(f"DisputeResolved event in tx {tx_hash} already indexed. Skipping.")
            return

        args = log["args"]
        winner = args["winner"].lower()
        amount = blockchain_service.w3.from_wei(args["amount"], 'ether')

        logger.info(f"Event captured [DisputeResolved] winner: {winner} on {project.contract_address}")

        dispute = db.query(Dispute).filter(
            Dispute.project_id == project.id,
            Dispute.status != DisputeStatus.RESOLVED
        ).first()

        if dispute:
            dispute.status = DisputeStatus.RESOLVED
            dispute.resolved_at = datetime.now(timezone.utc)
            dispute.tx_hash_resolution = tx_hash
            
            freelancer_addr = project.freelancer.wallet_address.lower()
            if winner == freelancer_addr:
                dispute.winner = DisputeWinner.FREELANCER
                project.status = ProjectStatus.ACTIVE # back to active or completed if last milestone
            else:
                dispute.winner = DisputeWinner.CLIENT
                project.status = ProjectStatus.CANCELLED # dispute won by client cancels remaining project
                
            # Record dispute resolution transaction
            tx_record = Transaction(
                tx_hash=tx_hash,
                project_id=project.id,
                milestone_id=dispute.milestone_id,
                type=TransactionType.DISPUTE,
                from_address=project.contract_address,
                to_address=winner,
                amount_eth=amount,
                status=TransactionStatus.CONFIRMED,
                block_number=log["blockNumber"]
            )
            db.add(tx_record)
            db.commit()
            
            # Trigger reputation updates for both parties (freelancer gets penalty if client wins)
            reputation_service.update_reputation(project.freelancer.wallet_address, db)
            
            notification_service.notify_dispute_resolved(project.title, winner, float(amount))

    async def _index_project_cancelled(self, project: Project, log: dict, db: Session):
        tx_hash = log["transactionHash"].hex()
        # Pre-check for duplicate/idempotency
        existing_tx = db.query(Transaction).filter(Transaction.tx_hash == tx_hash).first()
        if existing_tx:
            logger.debug(f"ProjectCancelled event in tx {tx_hash} already indexed. Skipping.")
            return

        logger.info(f"Event captured [ProjectCancelled] on {project.contract_address}")
        project.status = ProjectStatus.CANCELLED
        
        # Record cancellation transaction
        tx_record = Transaction(
            tx_hash=tx_hash,
            project_id=project.id,
            type=TransactionType.RELEASE,
            from_address=project.client.wallet_address,
            to_address=project.contract_address,
            status=TransactionStatus.CONFIRMED,
            block_number=log["blockNumber"]
        )
        db.add(tx_record)
        db.commit()

    async def _index_project_completed(self, project: Project, log: dict, db: Session):
        tx_hash = log["transactionHash"].hex()
        # Pre-check for duplicate/idempotency
        existing_tx = db.query(Transaction).filter(Transaction.tx_hash == tx_hash).first()
        if existing_tx:
            logger.debug(f"ProjectCompleted event in tx {tx_hash} already indexed. Skipping.")
            return

        logger.info(f"Event captured [ProjectCompleted] on {project.contract_address}")
        project.status = ProjectStatus.COMPLETE
        project.end_date = datetime.now(timezone.utc)
        
        # Record completed transaction
        tx_record = Transaction(
            tx_hash=tx_hash,
            project_id=project.id,
            type=TransactionType.RELEASE,
            from_address=project.contract_address,
            to_address=project.freelancer.wallet_address,
            status=TransactionStatus.CONFIRMED,
            block_number=log["blockNumber"]
        )
        db.add(tx_record)
        db.commit()

        # Update reputation for the freelancer!
        reputation_service.update_reputation(project.freelancer.wallet_address, db)

# Initialize singleton indexer
event_indexer = EventIndexer()
