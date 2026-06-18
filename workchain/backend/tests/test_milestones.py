import pytest
from app.models.milestone import MilestoneStatus
from app.models.project import ProjectStatus

@pytest.fixture
def active_project_and_milestone(client, client_user, freelancer_user):
    payload = {
        "title": "Active Milestone Project",
        "description": "Smart contracts",
        "freelancer_wallet": freelancer_user.wallet_address,
        "category": "development",
        "milestones": [
            {
                "title": "M1",
                "description": "Design",
                "amount_eth": 1.0,
                "deadline": "2026-12-31T23:59:59Z"
            },
            {
                "title": "M2",
                "description": "Solidity",
                "amount_eth": 2.0,
                "deadline": "2027-03-31T23:59:59Z"
            }
        ]
    }
    resp = client.post(
        f"/api/projects?client_wallet={client_user.wallet_address}",
        json=payload
    )
    data = resp.json()
    project_id = data["id"]
    
    # Update project status to active
    client.put(f"/api/projects/{project_id}/status", json={"status": "active"})
    
    # First milestone in DB needs to be active for testing
    # Since our DB starts as pending, we'll hit the status endpoint or mock it
    # We can fetch project detail to get the milestone IDs
    proj_resp = client.get(f"/api/projects/{project_id}")
    milestones = proj_resp.json()["milestones"]
    
    return project_id, milestones[0]["id"], milestones[1]["id"]

def test_submit_milestone_success(client, freelancer_user, active_project_and_milestone):
    _, m1_id, _ = active_project_and_milestone
    
    payload = {
        "ipfs_hash": "QmVkD3WkRj64U8T7R9bZ2pE6x6G8t19a4S5c6D7e8F9g0h",
        "proof_links": ["https://github.com/test/repo/pull/1"],
        "notes": "Finished the architecture diagrams and initial specs."
    }
    
    response = client.post(
        f"/api/milestones/{m1_id}/submit?wallet_address={freelancer_user.wallet_address}",
        json=payload
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "submitted"
    assert data["ipfs_hash"] == payload["ipfs_hash"]
    assert data["proof_links"] == payload["proof_links"]

def test_submit_milestone_forbidden_role(client, client_user, active_project_and_milestone):
    _, m1_id, _ = active_project_and_milestone
    
    payload = {
        "ipfs_hash": "QmVkD3WkRj64U8T7R9bZ2pE6x6G8t19a4S5c6D7e8F9g0h",
        "proof_links": [],
        "notes": "Intruder try"
    }
    
    # Submitting as Client instead of Freelancer should raise 403
    response = client.post(
        f"/api/milestones/{m1_id}/submit?wallet_address={client_user.wallet_address}",
        json=payload
    )
    assert response.status_code == 403
    assert "Only the assigned freelancer can submit work" in response.json()["detail"]

def test_approve_milestone_success(client, client_user, freelancer_user, active_project_and_milestone):
    proj_id, m1_id, m2_id = active_project_and_milestone
    
    # 1. Submit first
    client.post(
        f"/api/milestones/{m1_id}/submit?wallet_address={freelancer_user.wallet_address}",
        json={
            "ipfs_hash": "QmVkD3WkRj64U8T7R9bZ2pE6x6G8t19a4S5c6D7e8F9g0h",
            "proof_links": [],
            "notes": "Done"
        }
    )
    
    # 2. Approve
    response = client.post(
        f"/api/milestones/{m1_id}/approve?wallet_address={client_user.wallet_address}"
    )
    assert response.status_code == 200
    assert response.json()["status"] == "released"
    
    # Verify next milestone is now active
    m2_resp = client.get(f"/api/milestones/{m2_id}")
    assert m2_resp.json()["status"] == "active"

def test_reject_milestone_success(client, client_user, freelancer_user, active_project_and_milestone):
    _, m1_id, _ = active_project_and_milestone
    
    # 1. Submit
    client.post(
        f"/api/milestones/{m1_id}/submit?wallet_address={freelancer_user.wallet_address}",
        json={
            "ipfs_hash": "QmVkD3WkRj64U8T7R9bZ2pE6x6G8t19a4S5c6D7e8F9g0h",
            "proof_links": [],
            "notes": "Done"
        }
    )
    
    # 2. Reject
    response = client.post(
        f"/api/milestones/{m1_id}/reject?wallet_address={client_user.wallet_address}",
        json={"feedback": "The UI designs are missing dark mode."}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "active"
    assert "Rejected. Feedback: The UI designs are missing dark mode." in data["submission_notes"]
