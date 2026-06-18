"use client"
import { useState, useEffect } from "react"
import { ethers } from "ethers"

export function useContract(
  address: string | null,
  abi: unknown[],
  signerOrProvider?: 
    ethers.Signer | ethers.Provider
) {
  const [contract, setContract] = 
    useState<ethers.Contract | null>(null)

  useEffect(() => {
    if (!address || 
        !ethers.isAddress(address)) {
      setContract(null)
      return
    }
    const c = new ethers.Contract(
      address, 
      abi as ethers.InterfaceAbi,
      signerOrProvider 
        || new ethers.JsonRpcProvider(
          process.env
            .NEXT_PUBLIC_RPC_URL
        )
    )
    setContract(c)
  }, [address, signerOrProvider])

  return contract
}
