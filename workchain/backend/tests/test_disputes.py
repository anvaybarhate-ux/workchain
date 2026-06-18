import pytest
from app.models.dispute import DisputeStatus
from app.models.milestone import MilestoneStatus
from app.models.project import ProjectStatus

@pytest.fixture
def active_project_details(client, client_user, freelancer_user):
    payload = {
        "title": "Dispute Test Project",
        "description": "Smart contracts",
        "freelancer_wallet": freelancer_user.wallet_address,
        "category": "development",
        "milestones": [
            {
                "title": "M1",
                "description": "Design",
                "amount_eth": 1.0,
                "deadline": "2026-12-31T23:59:59Z"
            }
        ]
    }
    resp = client.post(
        f"/api/projects?client_wallet={client_user.wallet_address}",
        json=payload
    )
    project_id = resp.json()["id"]
    
    # Activate
    client.put(f"/api/projects/{project_id}/status", json={"status": "active"})
    
    proj_resp = client.get(f"/api/projects/{project_id}")
    milestone_id = proj_resp.json()["milestones"][0]["id"]
    return project_id, milestone_id

def test_raise_dispute_success(client, client_user, active_project_details):
    project_id, milestone_id = active_project_details
    
    payload = {
        "project_id": project_id,
        "milestone_id": milestone_id,
        "statement": "The freelancer disappeared after receiving feedback.",
        "evidence_ipfs": "QmTestEvidenceHashHere"
    }
    
    response = client.post(
        f"/api/disputes?wallet_address={client_user.wallet_address}",
        json=payload
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "open"
    assert data["client_statement"] == payload["statement"]
    assert data["client_evidence_ipfs"] == payload["evidence_ipfs"]
    
    # Verify project and milestone status transitions
    proj_resp = client.get(f"/api/projects/{project_id}")
    assert proj_resp.json()["status"] == "disputed"
    
    m_resp = client.get(f"/api/milestones/{milestone_id}")
    assert m_resp.json()["status"] == "disputed"

def test_raise_dispute_forbidden_party(client, voter_user, active_project_details):
    project_id, milestone_id = active_project_details
    
    payload = {
        "project_id": project_id,
        "milestone_id": milestone_id,
        "statement": "I am an outsider raising a dispute.",
        "evidence_ipfs": ""
    }
    
    response = client.post(
        f"/api/disputes?wallet_address={voter_user.wallet_address}",
        json=payload
    )
    assert response.status_code == 403
    assert "Only client or freelancer of the project can raise disputes" in response.json()["detail"]

def test_cast_vote_success(client, voter_user, client_user, active_project_details):
    project_id, milestone_id = active_project_details
    
    # Raise dispute first
    disp_resp = client.post(
        f"/api/disputes?wallet_address={client_user.wallet_address}",
        json={
            "project_id": project_id,
            "milestone_id": milestone_id,
            "statement": "Statement",
            "evidence_ipfs": ""
        }
    )
    dispute_id = disp_resp.json()["id"]
    
    # Cast vote
    response = client.post(
        f"/api/disputes/{dispute_id}/vote",
        json={
            "wallet_address": voter_user.wallet_address,
            "vote": "client"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "voting"
    assert data["votes_client"] == 1
    assert data["votes_freelancer"] == 0

def test_cast_vote_forbidden_parties(client, client_user, active_project_details):
    project_id, milestone_id = active_project_details
    
    disp_resp = client.post(
        f"/api/disputes?wallet_address={client_user.wallet_address}",
        json={
            "project_id": project_id,
            "milestone_id": milestone_id,
            "statement": "Statement",
            "evidence_ipfs": ""
        }
    )
    dispute_id = disp_resp.json()["id"]
    
    # Client trying to vote on their own dispute should fail
    response = client.post(
        f"/api/disputes/{dispute_id}/vote",
        json={
            "wallet_address": client_user.wallet_address,
            "vote": "client"
        }
    )
    assert response.status_code == 403
    assert "Dispute parties are not eligible to vote" in response.json()["detail"]

def test_submit_evidence_success(client, freelancer_user, client_user, active_project_details):
    project_id, milestone_id = active_project_details
    
    disp_resp = client.post(
        f"/api/disputes?wallet_address={client_user.wallet_address}",
        json={
            "project_id": project_id,
            "milestone_id": milestone_id,
            "statement": "Statement",
            "evidence_ipfs": ""
        }
    )
    dispute_id = disp_resp.json()["id"]
    
    # Freelancer submits their side of evidence
    response = client.post(
        f"/api/disputes/{dispute_id}/evidence?wallet_address={freelancer_user.wallet_address}",
        json={
            "ipfs_hash": "QmFreelancerEvidenceHash",
            "statement": "I have completed 90% of the milestone work, see repo commits."
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["freelancer_evidence_ipfs"] == "QmFreelancerEvidenceHash"
    assert data["freelancer_statement"] == "I have completed 90% of the milestone work, see repo commits."
