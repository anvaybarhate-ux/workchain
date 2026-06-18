import pytest
from app.models.transaction import Transaction, TransactionType, TransactionStatus

@pytest.fixture
def sample_transaction(db_session, freelancer_user):
    tx = Transaction(
        tx_hash="0x1111111111111111111111111111111111111111111111111111111111111111",
        from_address="0x2222222222222222222222222222222222222222",
        to_address="0x3333333333333333333333333333333333333333",
        amount_eth=2.5,
        type=TransactionType.RELEASE,
        status=TransactionStatus.PENDING,
        block_number=None,
        gas_used=None
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(tx)
    return tx

def test_get_transaction_status_success(client, sample_transaction):
    # Retrieve pending transaction. Should check blockchain (mocked to confirmed) and update DB
    response = client.get(f"/api/tx/{sample_transaction.tx_hash}")
    assert response.status_code == 200
    data = response.json()
    assert data["tx_hash"] == sample_transaction.tx_hash
    assert data["status"] == "confirmed"
    assert data["block_number"] == 10895999
    assert float(data["gas_used"]) == 21000.0

def test_get_transaction_not_found(client):
    response = client.get("/api/tx/0x9999999999999999999999999999999999999999999999999999999999999999")
    assert response.status_code == 404
    assert "Transaction not indexed in database" in response.json()["detail"]

def test_list_transactions(client, sample_transaction):
    response = client.get("/api/transactions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["tx_hash"] == sample_transaction.tx_hash

    # Filter by wallet
    response = client.get("/api/transactions?wallet=0x2222222222222222222222222222222222222222")
    assert response.status_code == 200
    assert len(response.json()) == 1

    # Filter by type
    response = client.get("/api/transactions?type=release")
    assert response.status_code == 200
    assert len(response.json()) == 1
