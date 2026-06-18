import FACTORY_JSON from "./abi/factory.json"
import ESCROW_JSON from "./abi/escrow.json"
import REPUTATION_JSON from "./abi/reputation.json"
import { ethers } from "ethers"

export const FACTORY_ADDRESS = 
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS!

export const REPUTATION_ADDRESS =
  process.env.NEXT_PUBLIC_REPUTATION_ADDRESS!

export const CHAIN_ID = 
  Number(
    process.env.NEXT_PUBLIC_CHAIN_ID
  )

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL!

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL!

export const FACTORY_ABI = FACTORY_JSON.abi
export const ESCROW_ABI = ESCROW_JSON.abi
export const REPUTATION_ABI = REPUTATION_JSON.abi

export function getReadProvider() {
  return new ethers.JsonRpcProvider(
    RPC_URL
  )
}

export function getFactoryContract(
  signerOrProvider?: 
    ethers.Signer | ethers.Provider
) {
  return new ethers.Contract(
    FACTORY_ADDRESS,
    FACTORY_ABI,
    signerOrProvider || getReadProvider()
  )
}

export function getEscrowContract(
  address: string,
  signerOrProvider?: 
    ethers.Signer | ethers.Provider
) {
  if (!ethers.isAddress(address)) 
    return null
  return new ethers.Contract(
    address,
    ESCROW_ABI,
    signerOrProvider || getReadProvider()
  )
}

export function getReputationContract(
  signerOrProvider?: 
    ethers.Signer | ethers.Provider
) {
  return new ethers.Contract(
    REPUTATION_ADDRESS,
    REPUTATION_ABI,
    signerOrProvider || getReadProvider()
  )
}
