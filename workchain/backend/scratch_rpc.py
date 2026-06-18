import os
import sys
import requests
from web3 import Web3, HTTPProvider

rpc_url = "https://eth-sepolia.g.alchemy.com/v2/BBqgWCw5DmqAkIKhZfT0h"
w3 = Web3(HTTPProvider(rpc_url))

print("Is connected:", w3.is_connected())
print("Current block:", w3.eth.block_number)

factory_address = "0x4D1838574F935Da21fFF7b3a1B4d5C0477Cd30E8"

with open("app/abi/factory.json", "r") as f:
    import json
    abi = json.load(f)

contract = w3.eth.contract(address=w3.to_checksum_address(factory_address), abi=abi)

from_block = 10895967
to_block = w3.eth.block_number

print(f"Querying from {from_block} to {to_block}")
try:
    logs = contract.events.ProjectCreated.get_logs(fromBlock=from_block, toBlock=to_block)
    print("Logs fetched:", len(logs))
except requests.exceptions.HTTPError as e:
    print("HTTP Error response text:", e.response.text)
except Exception as e:
    import traceback
    print("Generic Error:")
    traceback.print_exc()
