from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ipfs import ipfs_service

router = APIRouter(prefix="/ipfs", tags=["IPFS"])

@router.post("/upload")
async def upload_ipfs(file: UploadFile = File(...)):
    """
    Uploads a file to Pinata IPFS. Returns the IPFS CID hash and gateway URL.
    """
    try:
        content = await file.read()
        ipfs_hash = ipfs_service.upload_file(content, file.filename)
        if not ipfs_hash:
            raise HTTPException(status_code=500, detail="Failed to upload file to IPFS")
        return {
            "ipfs_hash": ipfs_hash,
            "url": ipfs_service.get_file_url(ipfs_hash)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IPFS upload error: {str(e)}")

@router.get("/{ipfs_hash}")
def get_ipfs_url(ipfs_hash: str):
    """
    Returns the gateway URL for a given IPFS CID hash.
    """
    # Check if hash is a standard format
    if not ipfs_hash or len(ipfs_hash) < 10:
        raise HTTPException(status_code=400, detail="Invalid IPFS hash")
        
    return {
        "ipfs_hash": ipfs_hash,
        "url": ipfs_service.get_file_url(ipfs_hash)
    }
