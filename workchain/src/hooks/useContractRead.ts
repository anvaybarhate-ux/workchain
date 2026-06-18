"use client"
import { useState, useEffect, 
  useCallback } from "react"
import { ethers } from "ethers"

export function useContractRead<T>(
  contract: ethers.Contract | null,
  method: string,
  args: unknown[] = [],
  refreshInterval = 15000
) {
  const [data, setData] = 
    useState<T | null>(null)
  const [loading, setLoading] = 
    useState(true)
  const [error, setError] = 
    useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!contract) {
      setLoading(false)
      return
    }
    try {
      const result = await 
        contract[method](...args)
      setData(result as T)
      setError(null)
    } catch (e: unknown) {
      setError(
        e instanceof Error 
          ? e.message 
          : "Contract read failed"
      )
    } finally {
      setLoading(false)
    }
  }, [contract, method, 
    JSON.stringify(args)])

  useEffect(() => {
    fetch()
    const interval = setInterval(
      fetch, refreshInterval
    )
    return () => clearInterval(interval)
  }, [fetch, refreshInterval])

  return { data, loading, error, 
    refetch: fetch }
}
