const BASE = 
  process.env.NEXT_PUBLIC_API_URL 
  || "http://localhost:8000"

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(
    BASE + path, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    let msg = `HTTP ${res.status}`;
    if (err.detail) {
      if (typeof err.detail === "string") {
        msg = err.detail;
      } else if (Array.isArray(err.detail)) {
        msg = err.detail.map((d: any) => {
          if (d && typeof d === "object") {
            return `${d.loc?.join(".") || "error"}: ${d.msg || JSON.stringify(d)}`;
          }
          return String(d);
        }).join(", ");
      } else if (typeof err.detail === "object") {
        msg = err.detail.message || JSON.stringify(err.detail);
      }
    }
    throw new Error(msg);
  }
  return res.json()
}

// ── USERS ──────────────────────────
export const getUser = (wallet: string) =>
  apiFetch<any>(`/api/users/${wallet}`)

export const createUser = (data: {
  wallet_address: string
  role: string
}) => apiFetch<any>("/api/users", {
  method: "POST",
  body: JSON.stringify(data)
})

export const updateUser = (
  wallet: string,
  data: Record<string, unknown>
) => apiFetch<any>(`/api/users/${wallet}`, {
  method: "PUT",
  body: JSON.stringify(data)
})

export const exploreFreelancers = (params?: {
  tier?: string
  skill?: string
  min_jobs?: number
  sort_by?: string
  limit?: number
  offset?: number
}) => {
  const q = new URLSearchParams(
    params as Record<string,string>
  ).toString()
  return apiFetch<any>(
    `/api/users/explore${q ? "?"+q : ""}`
  )
}

// ── PROJECTS ───────────────────────
export const getProjects = (
  wallet: string,
  status?: string
) => {
  const q = status 
    ? `?wallet_address=${wallet}&status=${status}` 
    : `?wallet_address=${wallet}`
  return apiFetch<any>(`/api/projects${q}`)
}

export const getProject = (id: string) =>
  apiFetch<any>(`/api/projects/${id}`)

export const createProject = (
  clientWallet: string,
  data: Record<string, unknown>
) => apiFetch<any>(`/api/projects?client_wallet=${clientWallet}`, {
  method: "POST",
  body: JSON.stringify(data)
})

export const updateProjectStatus = (
  id: string,
  status: string
) => apiFetch<any>(`/api/projects/${id}/status`, {
  method: "PUT",
  body: JSON.stringify({ status })
})

// ── MILESTONES ─────────────────────
export const getMilestone = (
  id: string
) => apiFetch<any>(`/api/milestones/${id}`)

export const submitMilestone = (
  id: string,
  walletAddress: string,
  data: {
    ipfs_hash: string
    proof_links: string[]
    notes: string
  }
) => apiFetch<any>(
  `/api/milestones/${id}/submit?wallet_address=${walletAddress}`, {
  method: "POST",
  body: JSON.stringify(data)
})

export const approveMilestone = (
  id: string,
  walletAddress: string
) => apiFetch<any>(
  `/api/milestones/${id}/approve?wallet_address=${walletAddress}`, {
  method: "POST"
})

export const rejectMilestone = (
  id: string,
  walletAddress: string,
  feedback: string
) => apiFetch<any>(
  `/api/milestones/${id}/reject?wallet_address=${walletAddress}`, {
  method: "POST",
  body: JSON.stringify({ feedback })
})

// ── DISPUTES ───────────────────────
export const getDisputes = (
  wallet: string,
  status?: string
) => {
  const q = status
    ? `?wallet_address=${wallet}&status=${status}`
    : `?wallet_address=${wallet}`
  return apiFetch<any>(`/api/disputes${q}`)
}

export const getDispute = (id: string) =>
  apiFetch<any>(`/api/disputes/${id}`)

export const createDispute = (
  walletAddress: string,
  data: Record<string, unknown>
) => apiFetch<any>(`/api/disputes?wallet_address=${walletAddress}`, {
  method: "POST",
  body: JSON.stringify(data)
})

export const castVote = (
  id: string,
  data: {
    wallet_address: string
    vote: "freelancer" | "client"
  }
) => apiFetch<any>(
  `/api/disputes/${id}/vote`, {
  method: "POST",
  body: JSON.stringify(data)
})

export const submitEvidence = (
  id: string,
  walletAddress: string,
  data: {
    ipfs_hash: string
    statement: string
  }
) => apiFetch<any>(
  `/api/disputes/${id}/evidence?wallet_address=${walletAddress}`, {
  method: "POST",
  body: JSON.stringify(data)
})

export const resolveDispute = (
  id: string
) => apiFetch<any>(
  `/api/disputes/${id}/resolve`, {
  method: "POST"
})

// ── REPUTATION ─────────────────────
export const getReputation = (
  wallet: string
) => apiFetch<any>(
  `/api/reputation/${wallet}`
)

export const getLeaderboard = (
  limit = 20,
  tier?: string
) => {
  const q = tier
    ? `?limit=${limit}&tier=${tier}`
    : `?limit=${limit}`
  return apiFetch<any>(
    `/api/reputation/leaderboard${q}`
  )
}

export const recalculateReputation = (
  wallet: string
) => apiFetch<any>(
  `/api/reputation/${wallet}/recalculate`,
  { method: "POST" }
)

// ── TRANSACTIONS ───────────────────
export const getTransaction = (
  hash: string
) => apiFetch<any>(`/api/tx/${hash}`)

export const getTransactions = (params: {
  wallet?: string
  project_id?: string
  type?: string
}) => {
  const q = new URLSearchParams(
    params as Record<string,string>
  ).toString()
  return apiFetch<any>(
    `/api/transactions?${q}`
  )
}

// ── IPFS ───────────────────────────
export const uploadFile = async (
  file: File
): Promise<{
  hash: string
  url: string
}> => {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(
    BASE + "/api/ipfs/upload", {
    method: "POST",
    body: form
  })
  if (!res.ok) throw new Error(
    `Upload failed: ${res.status}`
  )
  return res.json()
}
