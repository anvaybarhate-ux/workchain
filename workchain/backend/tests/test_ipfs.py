import pytest

def test_upload_ipfs_file(client):
    file_content = b"This is a dummy test file content"
    files = {"file": ("test_file.txt", file_content, "text/plain")}
    
    response = client.post("/api/ipfs/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "ipfs_hash" in data
    assert data["ipfs_hash"].startswith("Qm")
    assert "url" in data
    assert data["url"] == f"https://gateway.pinata.cloud/ipfs/{data['ipfs_hash']}"

def test_get_ipfs_url(client):
    ipfs_hash = "QmVkD3WkRj64U8T7R9bZ2pE6x6G8t19a4S5c6D7e8F9g0h"
    response = client.get(f"/api/ipfs/{ipfs_hash}")
    assert response.status_code == 200
    data = response.json()
    assert data["ipfs_hash"] == ipfs_hash
    assert data["url"] == f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"

def test_get_ipfs_url_invalid(client):
    response = client.get("/api/ipfs/short")
    assert response.status_code == 400
    assert "Invalid IPFS hash" in response.json()["detail"]
