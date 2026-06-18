import logging
import requests
import hashlib
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class IPFSService:
    PINATA_URL = "https://api.pinata.cloud"

    def __init__(self):
        self.jwt = settings.PINATA_JWT
        self.gateway = settings.PINATA_GATEWAY or "https://gateway.pinata.cloud"

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.jwt}"
        }

    def _is_mock(self) -> bool:
        # If the JWT is a placeholder, run in mock/local-simulation mode.
        return not self.jwt or "jwt" in self.jwt.lower() or "your" in self.jwt.lower()

    def upload_file(self, file_bytes: bytes, filename: str) -> Optional[str]:
        if self._is_mock():
            # Mock hash generation for offline development/testing
            mock_hash = "Qm" + hashlib.sha256(file_bytes + filename.encode()).hexdigest()[:44]
            logger.info(f"[IPFS MOCK] Uploaded file {filename} -> {mock_hash}")
            return mock_hash

        url = f"{self.PINATA_URL}/pinning/pinFileToIPFS"
        files = {
            "file": (filename, file_bytes)
        }
        
        # Retry once on timeout
        for attempt in range(2):
            try:
                response = requests.post(url, files=files, headers=self._get_headers(), timeout=15)
                if response.status_code == 200:
                    return response.json().get("IpfsHash")
                else:
                    logger.error(f"Pinata upload failed (attempt {attempt+1}): {response.text}")
            except requests.RequestException as e:
                logger.warning(f"Pinata upload error on attempt {attempt+1}: {e}")
                if attempt == 1:
                    raise e
        return None

    def upload_json(self, data: dict) -> Optional[str]:
        if self._is_mock():
            # Mock hash generation for JSON
            import json
            serialized = json.dumps(data, sort_keys=True).encode()
            mock_hash = "Qm" + hashlib.sha256(serialized).hexdigest()[:44]
            logger.info(f"[IPFS MOCK] Uploaded JSON -> {mock_hash}")
            return mock_hash

        url = f"{self.PINATA_URL}/pinning/pinJSONToIPFS"
        
        for attempt in range(2):
            try:
                response = requests.post(url, json={"pinataContent": data}, headers=self._get_headers(), timeout=15)
                if response.status_code == 200:
                    return response.json().get("IpfsHash")
                else:
                    logger.error(f"Pinata JSON upload failed (attempt {attempt+1}): {response.text}")
            except requests.RequestException as e:
                logger.warning(f"Pinata JSON upload error on attempt {attempt+1}: {e}")
                if attempt == 1:
                    raise e
        return None

    def get_file_url(self, ipfs_hash: str) -> str:
        return f"{self.gateway}/ipfs/{ipfs_hash}"

    def pin_exists(self, ipfs_hash: str) -> bool:
        if self._is_mock():
            return ipfs_hash.startswith("Qm")

        url = f"{self.PINATA_URL}/data/pinList?hashContains={ipfs_hash}"
        try:
            response = requests.get(url, headers=self._get_headers(), timeout=10)
            if response.status_code == 200:
                count = response.json().get("count", 0)
                return count > 0
            return False
        except Exception as e:
            logger.error(f"Pinata pin check error: {e}")
            return False

# Initialize singleton service
ipfs_service = IPFSService()
