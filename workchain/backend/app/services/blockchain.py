import json
import os
import logging
from typing import Dict, Any, Optional
from web3 import Web3, HTTPProvider
from eth_account.messages import encode_defunct
from app.config import settings

logger = logging.getLogger(__name__)

class BlockchainService:
    def __init__(self):
        # We handle HTTPProvider connection
        self.w3 = Web3(HTTPProvider(settings.WEB3_RPC_URL))
        
        # Load ABIs
        current_dir = os.path.dirname(os.path.abspath(__file__))
        app_dir = os.path.dirname(current_dir)
        
        with open(os.path.join(app_dir, "abi", "factory.json"), "r") as f:
            self.factory_abi = json.load(f)
            
        with open(os.path.join(app_dir, "abi", "escrow.json"), "r") as f:
            self.escrow_abi = json.load(f)
            
        with open(os.path.join(app_dir, "abi", "reputation.json"), "r") as f:
            self.reputation_abi = json.load(f)

    def get_contract(self, address: str, abi: list) -> Any:
        try:
            return self.w3.eth.contract(
                address=Web3.to_checksum_address(address),
                abi=abi
            )
        except Exception as e:
            logger.error(f"Error loading contract at {address}: {e}")
            return None

    def get_escrow_balance(self, contract_addr: str) -> Optional[float]:
        try:
            checksum_addr = Web3.to_checksum_address(contract_addr)
            balance_wei = self.w3.eth.get_balance(checksum_addr)
            return float(Web3.from_wei(balance_wei, 'ether'))
        except Exception as e:
            logger.error(f"Error fetching balance for {contract_addr}: {e}")
            return None

    def get_project_state(self, contract_addr: str) -> Optional[list]:
        try:
            contract = self.get_contract(contract_addr, self.escrow_abi)
            if not contract:
                return None
            return contract.functions.getProject().call()
        except Exception as e:
            logger.error(f"Error getting project state for {contract_addr}: {e}")
            return None

    def get_milestone(self, contract_addr: str, index: int) -> Optional[list]:
        try:
            contract = self.get_contract(contract_addr, self.escrow_abi)
            if not contract:
                return None
            return contract.functions.getMilestone(index).call()
        except Exception as e:
            logger.error(f"Error getting milestone {index} for {contract_addr}: {e}")
            return None

    def verify_transaction(self, tx_hash: str) -> Dict[str, Any]:
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            if receipt is None:
                return {"status": "pending"}
            return {
                "status": "confirmed" if receipt["status"] == 1 else "failed",
                "block": receipt["blockNumber"],
                "gas_used": float(Web3.from_wei(receipt["gasUsed"] * receipt.get("effectiveGasPrice", 0), "ether")) if "effectiveGasPrice" in receipt else float(receipt["gasUsed"])
            }
        except Exception as e:
            logger.debug(f"Transaction {tx_hash} receipt fetch failed (likely pending): {e}")
            return {"status": "pending"}

    def get_wallet_balance(self, address: str) -> Optional[float]:
        try:
            checksum_addr = Web3.to_checksum_address(address)
            balance_wei = self.w3.eth.get_balance(checksum_addr)
            return float(Web3.from_wei(balance_wei, 'ether'))
        except Exception as e:
            logger.error(f"Error getting wallet balance for {address}: {e}")
            return None

    def verify_signature(self, message: str, signature: str, expected_address: str) -> bool:
        try:
            msg = encode_defunct(text=message)
            recovered = self.w3.eth.account.recover_message(msg, signature=signature)
            return recovered.lower() == expected_address.lower()
        except Exception as e:
            logger.error(f"Error verifying signature: {e}")
            return False

# Initialize a singleton blockchain service
blockchain_service = BlockchainService()
