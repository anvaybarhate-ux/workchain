from eth_account import Account
from eth_account.messages import encode_defunct

def verify_wallet_signature(message: str, signature: str, wallet: str) -> bool:
    """
    Verifies that a message signature matches the expected Ethereum wallet address.
    """
    if not message or not signature or not wallet:
        return False
    try:
        msg = encode_defunct(text=message)
        recovered_address = Account.recover_message(msg, signature=signature)
        return recovered_address.lower() == wallet.lower()
    except Exception:
        return False
