export function formatAddress(
  address: string
): string {
  if (!address) return ""
  return address.slice(0,6) 
    + "..." 
    + address.slice(-4)
}

export function formatEth(
  wei: bigint | string | number,
  decimals = 4
): string {
  try {
    const { ethers } = 
      require("ethers")
    const val = typeof wei === "bigint"
      ? wei
      : BigInt(wei.toString())
    return Number(
      ethers.formatEther(val)
    ).toFixed(decimals) + " ETH"
  } catch {
    return "0.0000 ETH"
  }
}

export function formatDate(
  timestamp: number
): string {
  return new Date(timestamp * 1000)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
}

export function formatCountdown(
  deadlineTimestamp: number
): string {
  const now = Math.floor(Date.now()/1000)
  const diff = deadlineTimestamp - now
  if (diff <= 0) return "EXPIRED"
  const d = Math.floor(diff / 86400)
  const h = Math.floor(
    (diff % 86400) / 3600
  )
  const m = Math.floor(
    (diff % 3600) / 60
  )
  const s = diff % 60
  if (d > 0) 
    return `${d}D ${h}H ${m}M`
  if (h > 0) 
    return `${h}H ${m}M ${s}S`
  return `${m}M ${s}S`
}

export function formatTier(
  score: number
): string {
  if (score <= 40) return "BRONZE"
  if (score <= 65) return "SILVER"
  if (score <= 88) return "GOLD"
  return "PLATINUM"
}

export function shortenHash(
  hash: string
): string {
  if (!hash) return ""
  return hash.slice(0,10) 
    + "..." 
    + hash.slice(-6)
}

export function etherscanUrl(
  value: string,
  type: "tx" | "address" = "tx"
): string {
  return `https://sepolia.etherscan.io`
    + `/${type}/${value}`
}

export function formatStatus(
  status: string
): string {
  return status
    .toUpperCase()
    .replace(/_/g, " ")
}
