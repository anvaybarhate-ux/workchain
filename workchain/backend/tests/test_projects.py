import pytest

def test_create_project_success(client, client_user, freelancer_user):
    payload = {
        "title": "Build decentralized marketplace",
        "description": "Smart contract development for a decentralized marketplace",
        "freelancer_wallet": freelancer_user.wallet_address,
        "category": "development",
        "milestones": [
            {
                "title": "Milestone 1: Design and Architecture",
                "description": "Design schema and verify requirements",
                "amount_eth": 1.5,
                "deadline": "2026-12-31T23:59:59Z"
            },
            {
                "title": "Milestone 2: Solidity Contracts",
                "description": "Implement marketplace core contracts",
                "amount_eth": 2.5,
                "deadline": "2027-03-31T23:59:59Z"
            }
        ]
    }
    response = client.post(
        f"/api/projects?client_wallet={client_user.wallet_address}",
        json=payload
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Build decentralized marketplace"
    assert float(data["total_value_eth"]) == 4.0
    assert data["status"] == "pending"
    assert len(data["milestones"]) == 2
    assert float(data["milestones"][0]["amount_eth"]) == 1.5
    assert float(data["milestones"][1]["amount_eth"]) == 2.5

def test_create_project_same_wallets(client, client_user):
    payload = {
        "title": "Self contract",
        "description": "Cannot contract with yourself",
        "freelancer_wallet": client_user.wallet_address,
        "category": "other",
        "milestones": [
            {
                "title": "M1",
                "description": "M1 desc",
                "amount_eth": 1.0,
                "deadline": "2026-12-31T23:59:59Z"
            }
        ]
    }
    response = client.post(
        f"/api/projects?client_wallet={client_user.wallet_address}",
        json=payload
    )
    assert response.status_code == 400
    assert "Client and Freelancer wallets must be different" in response.json()["detail"]

def test_create_project_missing_user(client, client_user):
    payload = {
        "title": "No freelancer exists",
        "description": "Cannot contract with non-existent freelancer",
        "freelancer_wallet": "0x9999999999999999999999999999999999999999",
        "category": "other",
        "milestones": [
            {
                "title": "M1",
                "description": "M1 desc",
                "amount_eth": 1.0,
                "deadline": "2026-12-31T23:59:59Z"
            }
        ]
    }
    response = client.post(
        f"/api/projects?client_wallet={client_user.wallet_address}",
        json=payload
    )
    assert response.status_code == 400
    assert "Freelancer wallet is not registered in Workchain" in response.json()["detail"]

def test_list_projects(client, client_user, freelancer_user):
    # Pre-create a project
    payload = {
        "title": "Test project for list",
        "description": "Description",
        "freelancer_wallet": freelancer_user.wallet_address,
        "category": "audit",
        "milestones": [
            {
                "title": "M1",
                "description": "M1 desc",
                "amount_eth": 1.0,
                "deadline": "2026-12-31T23:59:59Z"
            }
        ]
    }
    client.post(
        f"/api/projects?client_wallet={client_user.wallet_address}",
        json=payload
    )

    # List as client
    response = client.get(f"/api/projects?wallet_address={client_user.wallet_address}&role=client")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test project for list"

    # List as freelancer
    response = client.get(f"/api/projects?wallet_address={freelancer_user.wallet_address}&role=freelancer")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test project for list"

def test_get_project_detail(client, client_user, freelancer_user):
    payload = {
        "title": "Test detail project",
        "description": "Description",
        "freelancer_wallet": freelancer_user.wallet_address,
        "category": "design",
        "milestones": [
            {
                "title": "M1",
                "description": "M1 desc",
                "amount_eth": 2.0,
                "deadline": "2026-12-31T23:59:59Z"
            }
        ]
    }
    create_resp = client.post(
        f"/api/projects?client_wallet={client_user.wallet_address}",
        json=payload
    )
    project_id = create_resp.json()["id"]

    response = client.get(f"/api/projects/{project_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Test detail project"

def test_update_project_status(client, client_user, freelancer_user):
    payload = {
        "title": "Test status update project",
        "description": "Description",
        "freelancer_wallet": freelancer_user.wallet_address,
        "category": "design",
        "milestones": [
            {
                "title": "M1",
                "description": "M1 desc",
                "amount_eth": 2.0,
                "deadline": "2026-12-31T23:59:59Z"
            }
        ]
    }
    create_resp = client.post(
        f"/api/projects?client_wallet={client_user.wallet_address}",
        json=payload
    )
    project_id = create_resp.json()["id"]

    # Update status to active
    update_resp = client.put(
        f"/api/projects/{project_id}/status",
        json={"status": "active"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "active"
