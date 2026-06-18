from web3 import Web3

def is_valid_eth_address(address: str) -> bool:
    if not address or not isinstance(address, str):
        return False
    return Web3.is_address(address)

def to_checksum(address: str) -> str:
    if not is_valid_eth_address(address):
        raise ValueError(f"Invalid Ethereum address: {address}")
    return Web3.to_checksum_address(address)

def truncate_address(address: str) -> str:
    if not is_valid_eth_address(address):
        return address
    checksum_addr = to_checksum(address)
    return f"{checksum_addr[:6]}...{checksum_addr[-4:]}"
