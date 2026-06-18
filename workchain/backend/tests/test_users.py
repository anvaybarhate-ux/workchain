import pytest

def test_create_user_success(client):
    response = client.post(
        "/api/users",
        json={
            "wallet_address": "0x4444444444444444444444444444444444444444",
            "ens_name": "newguy.eth",
            "role": "freelancer",
            "bio": "Blockchain developer",
            "skills": ["Solidity", "Rust"],
            "hourly_rate_eth": 0.04,
            "availability": True
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["wallet_address"] == "0x4444444444444444444444444444444444444444"
    assert data["ens_name"] == "newguy.eth"
    assert data["role"] == "freelancer"
    assert "Solidity" in data["skills"]

def test_create_user_invalid_wallet(client):
    response = client.post(
        "/api/users",
        json={
            "wallet_address": "invalid_wallet",
            "ens_name": "bad.eth",
            "role": "client"
        }
    )
    assert response.status_code == 400
    assert "Invalid Ethereum address format" in response.json()["detail"]

def test_create_user_duplicate(client, freelancer_user):
    # Try to recreate the freelancer user
    response = client.post(
        "/api/users",
        json={
            "wallet_address": freelancer_user.wallet_address,
            "ens_name": "dup.eth",
            "role": "freelancer"
        }
    )
    assert response.status_code == 409
    assert "User with this wallet address already exists" in response.json()["detail"]

def test_get_user_success(client, freelancer_user):
    response = client.get(f"/api/users/{freelancer_user.wallet_address}")
    assert response.status_code == 200
    data = response.json()
    assert data["wallet_address"] == freelancer_user.wallet_address
    assert data["ens_name"] == "freelancer.eth"

def test_get_user_not_found(client):
    response = client.get("/api/users/0x0000000000000000000000000000000000000000")
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]

def test_update_user_success(client, freelancer_user):
    response = client.put(
        f"/api/users/{freelancer_user.wallet_address}",
        json={
            "bio": "Updated bio text",
            "hourly_rate_eth": 0.08,
            "availability": False
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["bio"] == "Updated bio text"
    assert float(data["hourly_rate_eth"]) == 0.08
    assert data["availability"] is False

def test_explore_freelancers(client, freelancer_user, voter_user):
    # Voter is ALSO registered as BOTH, so they act as freelancer too.
    response = client.get("/api/users/explore")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    
    # Filter by skill
    response = client.get("/api/users/explore?skill=Solidity")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["wallet_address"] == freelancer_user.wallet_address

    # Filter by tier
    response = client.get("/api/users/explore?tier=gold")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["wallet_address"] == voter_user.wallet_address
