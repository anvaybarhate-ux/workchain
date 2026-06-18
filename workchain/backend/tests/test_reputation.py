import pytest
from app.models.reputation import ReputationTier
from app.models.project import Project, ProjectStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.dispute import Dispute, DisputeStatus, DisputeWinner

def test_get_reputation_success(client, freelancer_user):
    response = client.get(f"/api/reputation/{freelancer_user.wallet_address}")
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 75
    assert data["tier"] == "silver"
    assert data["total_jobs"] == 5

def test_get_reputation_not_found(client):
    response = client.get("/api/reputation/0x0000000000000000000000000000000000000000")
    assert response.status_code == 404

def test_leaderboard(client, freelancer_user, voter_user):
    response = client.get("/api/reputation/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    # Voter has score 90, Freelancer has 75. Voter should be first!
    assert data[0]["user"]["wallet_address"] == voter_user.wallet_address
    assert data[1]["user"]["wallet_address"] == freelancer_user.wallet_address

def test_recalculate_reputation_completed_jobs(client, db_session, freelancer_user, client_user):
    # Register another project under freelancer_user and set to COMPLETE
    proj = Project(
        title="Completed Job Project",
        description="Great work completed",
        client_id=client_user.id,
        freelancer_id=freelancer_user.id,
        total_value_eth=10.0,
        category="development",
        status=ProjectStatus.COMPLETE
    )
    db_session.add(proj)
    db_session.commit()

    # Recalculate
    response = client.post(f"/api/reputation/{freelancer_user.wallet_address}/recalculate")
    assert response.status_code == 200
    data = response.json()
    
    # Freelancer had 5 completed jobs originally. Now they have 6.
    # Score should increase!
    assert data["total_jobs"] == 1 # Since we created 1 COMPLETE project in our SQLite DB (originally 5 was set manually in mockup Reputation)
    # The new score should reflect 1 completed job.
    # Let's verify base (50) + jobs_bonus (2) + rating_bonus (20) + time_bonus (10) = 82!
    assert data["score"] == 82
    assert data["tier"] == "gold"

def test_recalculate_reputation_lost_dispute(client, db_session, freelancer_user, client_user):
    # Register project
    proj = Project(
        title="Disputed Project",
        description="Problematic contract",
        client_id=client_user.id,
        freelancer_id=freelancer_user.id,
        total_value_eth=5.0,
        category="audit",
        status=ProjectStatus.CANCELLED
    )
    db_session.add(proj)
    db_session.commit()

    from datetime import datetime, timezone
    # Create a milestone that is disputed
    m = Milestone(
        project_id=proj.id,
        milestone_index=0,
        title="M1",
        description="D1",
        amount_eth=5.0,
        deadline=datetime.now(timezone.utc),
        status=MilestoneStatus.DISPUTED
    )
    db_session.add(m)
    db_session.commit()

    # Create a resolved dispute won by the CLIENT (freelancer loses)
    disp = Dispute(
        project_id=proj.id,
        milestone_id=m.id,
        raised_by=client_user.id,
        status=DisputeStatus.RESOLVED,
        winner=DisputeWinner.CLIENT,
        voting_deadline=datetime.now(timezone.utc)
    )
    db_session.add(disp)
    db_session.commit()

    # Recalculate
    response = client.post(f"/api/reputation/{freelancer_user.wallet_address}/recalculate")
    assert response.status_code == 200
    data = response.json()
    
    # 0 completed jobs in DB. Lost dispute penalty is 15.
    # Base (50) + rating_bonus (0) + jobs_bonus (0) + time_bonus (10) - dispute_penalty (15) = 45!
    # Let's see: on_time_rate = 1.0 because 0 completed milestones. So time_bonus = 10.
    # Total score = 50 + 10 - 15 = 45.
    assert data["score"] == 45
    assert data["tier"] == "silver" # tier silver is for 41 - 65
