import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def notify_milestone_submitted(self, project_title: str, freelancer_wallet: str, client_wallet: str, index: int):
        msg = f"[NOTIFICATION] Milestone #{index} in project '{project_title}' was submitted by freelancer {freelancer_wallet}. Awaiting client {client_wallet} approval."
        logger.info(msg)
        print(msg)

    def notify_milestone_approved(self, project_title: str, client_wallet: str, freelancer_wallet: str, index: int, amount: float):
        msg = f"[NOTIFICATION] Milestone #{index} in project '{project_title}' was approved by client {client_wallet}. Released {amount} ETH to freelancer {freelancer_wallet}."
        logger.info(msg)
        print(msg)

    def notify_dispute_raised(self, project_title: str, raised_by_wallet: str, other_party_wallet: str, index: int):
        msg = f"[NOTIFICATION] Dispute raised on Milestone #{index} of project '{project_title}' by {raised_by_wallet}. Other party: {other_party_wallet}. Arbitration is open."
        logger.info(msg)
        print(msg)

    def notify_dispute_resolved(self, project_title: str, winner_wallet: str, amount: float):
        msg = f"[NOTIFICATION] Dispute on project '{project_title}' resolved! Winner: {winner_wallet}. Payout released: {amount} ETH."
        logger.info(msg)
        print(msg)

notification_service = NotificationService()
