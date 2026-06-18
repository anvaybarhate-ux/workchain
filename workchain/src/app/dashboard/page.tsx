"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout';
import { getProjects, getReputation, getTransactions } from "@/lib/api";
import { getEscrowContract, getReadProvider } from "@/lib/contracts";
import { formatAddress, formatEth, formatDate, shortenHash, etherscanUrl } from "@/lib/format";

export default function DashboardPage() {
  const router = useRouter();
  const {
    address,
    isConnected,
    isConnecting,
    connectWallet,
    role,
    changeRole,
    shortAddress,
    isCorrectNetwork,
    disconnectWallet
  } = useWallet();

  const activeRole = role || 'freelancer';
  const [projects, setProjects] = useState<any[]>([]);
  const [escrowBalances, setEscrowBalances] = useState<Record<string, string>>({});
  const [escrowMilestones, setEscrowMilestones] = useState<Record<string, { current: number, total: number }>>({});
  const [reputation, setReputation] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleRoleToggle = () => {
    const newRole = activeRole === 'freelancer' ? 'client' : 'freelancer';
    disconnectWallet();
    localStorage.setItem("workchain_role", newRole);
    router.push('/connect');
  };

  const handleDisconnect = () => {
    disconnectWallet();
    router.push('/connect');
  };

  const fetchData = async () => {
    if (!address) return;
    setIsLoading(true);
    setIsError(false);
    try {
      // 1. Fetch Projects
      const projs = await getProjects(address);
      setProjects(projs);

      // 2. Fetch Reputation
      try {
        const rep = await getReputation(address);
        setReputation(rep);
      } catch (err) {
        console.warn("Error fetching reputation:", err);
        setReputation(null);
      }

      // 3. Fetch Activity
      try {
        const txs = await getTransactions({ wallet: address });
        setActivity(txs.slice(0, 5));
      } catch (err) {
        console.warn("Error fetching transactions:", err);
        setActivity([]);
      }

      // 4. Fetch on-chain escrow contract data for each project asynchronously
      projs.forEach(async (project: any) => {
        if (project.contract_address) {
          try {
            const provider = getReadProvider();
            const contract = getEscrowContract(project.contract_address, provider);
            if (contract) {
              // Fetch Balance
              const balanceWei = await provider.getBalance(project.contract_address);
              setEscrowBalances(prev => ({
                ...prev,
                [project.contract_address]: formatEth(balanceWei)
              }));

              // Fetch Milestone Count and Active Index
              const state = await contract.getProject();
              const totalCountBig = await contract.getMilestoneCount();
              const totalCount = Number(totalCountBig);
              const activeIndex = Number(state[7]);
              let approvedCount = activeIndex;

              if (activeIndex < totalCount) {
                const activeMilestone = await contract.getMilestone(activeIndex);
                const activeMilestoneStatus = Number(activeMilestone[4]);
                if (activeMilestoneStatus === 4) { // MilestoneStatus.Released
                  approvedCount = activeIndex + 1;
                }
              } else {
                approvedCount = totalCount;
              }

              setEscrowMilestones(prev => ({
                ...prev,
                [project.contract_address]: { current: approvedCount, total: totalCount }
              }));
            }
          } catch (onChainErr) {
            console.warn(`Error fetching on-chain state for project ${project.id}:`, onChainErr);
          }
        }
      });

    } catch (error) {
      console.error("API error:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Fetch & Polling Setup
  useEffect(() => {
    if (isConnected && address) {
      fetchData();
      
      const interval = setInterval(() => {
        fetchData();
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(interval);
    }
  }, [address, isConnected, refreshTrigger]);

  // Dynamic Metrics Calculations
  // Sum amount_eth from transactions where type === "release"
  const totalEarnedEth = activity
    .filter((tx: any) => tx.type === "release")
    .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount_eth || 0), 0);
  const totalEarnedWei = BigInt(Math.round(totalEarnedEth * 1e18));
  const totalEarnedFormatted = isLoading ? "—" : formatEth(totalEarnedWei);

  // Active Projects: projects where status is active
  const activeCount = projects.filter(p => p.status?.toLowerCase() === "active").length;

  // Dispute Rate
  const disputeRateFormatted = reputation ? `${parseFloat(reputation.dispute_rate || 0).toFixed(1)}%` : "0.0%";

  // Reputation Metric
  const reputationScoreFormatted = reputation ? `${reputation.score}/100` : "—/100";
  const reputationTierFormatted = reputation ? reputation.tier.toUpperCase() : "NO TIER";
  const reputationNftFormatted = reputation?.nft_token_id ? `NFT #${reputation.nft_token_id}` : "NO NFT YET";

  // Client calculations for role switching view
  const clientTotalLocked = projects
    .filter(p => p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.total_value_eth || 0), 0);
  const clientTotalLockedWei = BigInt(Math.round(clientTotalLocked * 1e18));

  const clientActiveCount = projects.filter(p => p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'pending').length;

  const clientPendingApprovals = projects
    .flatMap(p => p.milestones || [])
    .filter(m => m.status?.toLowerCase() === 'submitted').length;

  const clientTotalPaid = projects
    .filter(p => p.status?.toLowerCase() === 'complete')
    .reduce((sum, p) => sum + parseFloat(p.total_value_eth || 0), 0);
  const clientTotalPaidWei = BigInt(Math.round(clientTotalPaid * 1e18));

  interface DashboardMetric {
    label: string;
    value: string;
    subText: string;
    border: string;
    bg: string;
    rotate: string;
    badge?: string;
    valueClass?: string;
  }

  // Build the metrics grid lists
  const freelancerMetrics: DashboardMetric[] = [
    { label: "TOTAL_EARNED", value: totalEarnedFormatted, subText: `≈ $${Math.round(totalEarnedEth * 3000).toLocaleString()}`, badge: "LIVE_RELEASES", border: "border-l-8 border-[#DC143C]", bg: "bg-[#F0EAD6]", rotate: "rotate-[1deg]" },
    { label: "ACTIVE_PROJECTS", value: String(activeCount).padStart(2, '0'), subText: "ON-CHAIN CONTRACTS", border: "border-4 border-[#C5A945]", bg: "bg-[#F0EAD6]", rotate: "rotate-[-1deg] shadow-[8px_8px_0_#C5A945]" },
    { label: "DISPUTE_RATE", value: disputeRateFormatted, valueClass: "text-[#10B981]", subText: "CLEAN RECORD ✓", border: "border-4 border-[#1A1A1A]", bg: "bg-[#F0EAD6]", rotate: "rotate-[2deg] shadow-[8px_8px_0_#1A1A1A]" },
    { label: "REPUTATION", value: reputationScoreFormatted, subText: `${reputationTierFormatted} // ${reputationNftFormatted}`, border: "border-4 border-[#DC143C]", bg: "bg-[#F0EAD6]", rotate: "rotate-[-2deg] shadow-[8px_8px_0_#DC143C]" },
  ];

  const clientMetrics: DashboardMetric[] = [
    { label: "TOTAL_LOCKED", value: formatEth(clientTotalLockedWei), subText: "ACTIVE ESCROW", border: "border-l-8 border-[#1A1A1A]", bg: "bg-[#F0EAD6]", rotate: "rotate-[1deg]" },
    { label: "ACTIVE_PROJECTS", value: String(clientActiveCount).padStart(2, '0'), subText: "IN PROGRESS", border: "border-4 border-[#1A1A1A]", bg: "bg-[#F0EAD6]", rotate: "rotate-[-2deg] shadow-[8px_8px_0_#1A1A1A]" },
    { label: "PENDING_APPROVALS", value: String(clientPendingApprovals).padStart(2, '0'), subText: "NEEDS REVIEW", border: "border-4 border-[#C5A945]", bg: "bg-[#C5A945]", rotate: "rotate-[2deg] shadow-[8px_8px_0_#1A1A1A]" },
    { label: "TOTAL_PAID", value: formatEth(clientTotalPaidWei), subText: "ALL TIME", border: "border-4 border-[#DC143C]", bg: "bg-[#F0EAD6]", rotate: "rotate-[-1deg] shadow-[8px_8px_0_#DC143C]" },
  ];

  const metrics = activeRole === 'freelancer' ? freelancerMetrics : clientMetrics;

  const getTxActionText = (tx: any) => {
    const formattedAmt = formatEth(BigInt(Math.round(parseFloat(tx.amount_eth || 0) * 1e18)));
    switch (tx.type.toLowerCase()) {
      case 'deploy':
        return `Escrow contract deployed. Total Value: ${formattedAmt}`;
      case 'deposit':
        return `Client deposited ${formattedAmt} in Escrow.`;
      case 'release':
        return `Funds of ${formattedAmt} released to Freelancer.`;
      case 'dispute':
        return `Dispute raised on contract. Active milestone paused.`;
      case 'vote':
        return `Arbiter cast a vote on the open dispute.`;
      case 'resolution':
        return `Dispute resolved. Winner paid: ${formattedAmt}`;
      case 'cancel':
        return `Project cancelled. Funds returned.`;
      default:
        return `Transaction of type ${tx.type.toUpperCase()} completed. Amount: ${formattedAmt}`;
    }
  };

  const getFormattedCurrentDate = () => {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).toUpperCase().replace(/ /g, "-");
  };

  // WALLET GUARD
  if (!isConnected) {
    return (
      <div className="bg-[#F0EAD6] min-h-[90vh] flex items-center justify-center py-20 px-4 relative font-sans">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
        <div className="bg-[#1A1A1A] text-[#F0EAD6] p-12 border-4 border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-[-1deg] text-center max-w-lg mx-auto relative z-10 w-full">
          <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-widest block mb-4 animate-flicker">
            ACCESS_RESTRICTED
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase text-[#F0EAD6] tracking-tighter leading-none mb-4 font-sans text-distressed">
            CONNECT WALLET TO VIEW DASHBOARD
          </h1>
          <p className="font-mono text-xs font-bold text-[#F0EAD6]/60 uppercase tracking-wide leading-relaxed mb-8">
            Please connect your Web3 MetaMask wallet to view your freelance and escrow statistics.
          </p>
          <button 
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-[#DC143C] text-white border-4 border-white shadow-[8px_8px_0_white] font-black uppercase text-xl p-5 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:translate-x-2 active:translate-y-2 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait"
          >
            {isConnecting ? (
              <span className="animate-pulse">CONNECTING...</span>
            ) : (
              <span>CONNECT WALLET</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ROLE GUARD
  if (!role) {
    return (
      <div className="bg-[#F0EAD6] min-h-[90vh] flex items-center justify-center py-20 px-4 relative font-sans">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
        <div className="bg-[#1A1A1A] text-[#F0EAD6] p-12 border-4 border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-[-1deg] text-center max-w-lg mx-auto relative z-10 w-full flex flex-col items-center justify-center">
          <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-widest block mb-4 animate-flicker">
            ROLE_REQUIRED
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase text-[#F0EAD6] tracking-tighter leading-none mb-4 font-sans text-distressed">
            SELECT YOUR ROLE FIRST
          </h1>
          <p className="font-mono text-xs font-bold text-[#F0EAD6]/60 uppercase tracking-wide leading-relaxed mb-8">
            You must choose between Freelancer and Client before accessing the dashboard.
          </p>
          <Link 
            href="/connect"
            className="w-full bg-[#C5A945] text-[#1A1A1A] border-4 border-white shadow-[8px_8px_0_white] font-black text-center text-xl p-5 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:translate-x-2 active:translate-y-2 inline-block"
          >
            GO TO SELECT ROLE →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
      <Sidebar activePath="/dashboard" />

      {/* MAIN LAYOUT */}
      <main className="flex-1 overflow-y-auto px-8 py-12 relative w-full overflow-x-hidden">
        
        {/* Toggle Utility */}
        <div className="absolute top-4 right-8 z-50">
          <button 
            onClick={handleRoleToggle}
            className="bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] font-black uppercase text-xs px-4 py-2 shadow-[4px_4px_0_#1A1A1A] hover:bg-white transition-all cursor-pointer"
          >
            SWITCH ROLE
          </button>
        </div>

        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b-8 border-[#1A1A1A] pb-6 gap-6">
          <div>
            <span className="text-[#DC143C] font-black uppercase text-sm mb-2 block tracking-widest animate-flicker">
              SYSTEM_DASHBOARD
            </span>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none mb-2">
              GM, {shortAddress || 'OPERATOR'}.
            </h1>
          </div>
          <div className="font-mono text-sm font-black uppercase bg-[#1A1A1A] text-[#F0EAD6] px-4 py-2 border-2 border-[#1A1A1A] rotate-[2deg] shadow-[4px_4px_0_#C5A945]">
            {getFormattedCurrentDate()}
          </div>
        </div>

        {/* ERROR STATE */}
        {isError && (
          <div className="bg-white border-4 border-[#DC143C] p-6 mb-12 shadow-[8px_8px_0_#DC143C] rotate-[-1deg] flex flex-col sm:flex-row justify-between items-center gap-4 animate-jitter-slow">
            <div className="flex items-center gap-4">
              <span className="text-4xl">⚠</span>
              <div>
                <h4 className="text-2xl font-black text-[#DC143C] font-sans">API_ERROR — BACKEND OFFLINE</h4>
                <p className="font-mono text-xs font-bold uppercase mt-1">Failed to fetch the latest platform data. The backend server might be offline.</p>
              </div>
            </div>
            <button 
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="bg-[#DC143C] text-white px-6 py-3 font-black text-sm uppercase border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shrink-0 cursor-pointer"
            >
              RETRY
            </button>
          </div>
        )}

        {/* LOADING STATE - SKELETON */}
        {isLoading ? (
          <>
            {/* Metrics Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-16">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-[#1A1A1A] animate-pulse border-4 border-[#1A1A1A]/50 p-6 flex flex-col justify-between">
                  <div className="h-4 bg-[#F0EAD6]/20 w-24"></div>
                  <div className="h-8 bg-[#F0EAD6]/20 w-32"></div>
                  <div className="h-4 bg-[#F0EAD6]/20 w-16"></div>
                </div>
              ))}
            </div>

            {/* Two Column Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 mb-16">
              <div className="xl:col-span-2">
                <div className="h-10 bg-[#1A1A1A] border-b-8 border-[#DC143C]/50 w-48 mb-8"></div>
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-48 bg-[#1A1A1A] animate-pulse border-4 border-[#1A1A1A]/50 p-6 flex flex-col justify-between">
                      <div className="h-6 bg-[#F0EAD6]/20 w-3/4"></div>
                      <div className="h-4 bg-[#F0EAD6]/20 w-1/2"></div>
                      <div className="h-4 bg-[#F0EAD6]/20 w-full mt-4"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="xl:col-span-1 border-l-8 border-[#1A1A1A] pl-0 xl:pl-12">
                <div className="h-10 bg-[#1A1A1A] border-b-8 border-[#C5A945]/50 w-48 mb-8"></div>
                <div className="h-[400px] bg-[#1A1A1A] animate-pulse border-4 border-[#1A1A1A]/50 p-8 flex flex-col justify-between">
                  <div className="h-4 bg-[#F0EAD6]/20 w-20"></div>
                  <div className="h-8 bg-[#F0EAD6]/20 w-36"></div>
                  <div className="h-24 bg-[#F0EAD6]/20 w-full"></div>
                  <div className="h-12 bg-[#F0EAD6]/20 w-full"></div>
                </div>
              </div>
            </div>

            {/* Activity Skeleton */}
            <section>
              <div className="h-10 bg-[#1A1A1A] border-b-8 border-[#1A1A1A]/50 w-48 mb-8"></div>
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-[#1A1A1A] animate-pulse border-4 border-[#1A1A1A]/50 p-4 w-full max-w-4xl"></div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-16">
              {metrics.map((m, i) => (
                <motion.div 
                  key={`${role}-metric-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-6 border-4 border-[#1A1A1A] ${m.bg} ${m.border} ${m.rotate} relative flex flex-col gap-2`}
                >
                  <span className="font-mono text-sm font-black uppercase">{m.label}</span>
                  <div className={`text-4xl md:text-5xl font-black tracking-tighter uppercase font-sans ${m.valueClass || 'text-[#1A1A1A]'}`}>
                    {m.value}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-mono text-xs font-bold opacity-80">{m.subText}</span>
                    {m.badge && (
                      <span className="bg-[#C5A945] text-[#1A1A1A] px-2 py-0.5 text-[10px] font-black border-2 border-[#1A1A1A]">
                        {m.badge}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* TWO COLUMN CONTENT */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 mb-16">
              
              {/* LEFT: PROJECTS LIST */}
              <div className="xl:col-span-2">
                <h3 className="text-3xl font-black uppercase border-b-8 border-[#DC143C] pb-4 mb-8 text-[#1A1A1A] flex items-center justify-between">
                  ACTIVE_PROJECTS
                  <Link href="/projects" className="text-sm border-2 border-[#1A1A1A] px-3 py-1 bg-white shadow-[4px_4px_0_#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6] transition-colors">
                    VIEW ALL
                  </Link>
                </h3>
                
                <div className="space-y-6">
                  {projects.length > 0 ? (
                    projects.map((p, i) => {
                      const onChainMilestone = escrowMilestones[p.contract_address] || { current: 0, total: p.milestones?.length || 1 };
                      const approvedCount = onChainMilestone.current;
                      const totalCount = onChainMilestone.total;
                      const percent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
                      
                      const rawVal = parseFloat(p.total_value_eth || 0);
                      const weiVal = BigInt(Math.round(rawVal * 1e18));

                      return (
                        <div key={p.id || i} className="bg-white border-4 border-[#1A1A1A] p-6 flex flex-col md:flex-row justify-between items-start md:items-center shadow-[8px_8px_0_#1A1A1A] hover:-translate-y-1 transition-transform group">
                          <div className="flex-1 mb-4 md:mb-0 w-full">
                            <h4 className="text-2xl font-black uppercase font-sans">
                              {p.title}
                            </h4>
                            <p className="font-mono text-xs font-bold text-[#1A1A1A] opacity-60 mt-2">
                              {activeRole === 'freelancer' ? 'CLIENT:' : 'FREELANCER:'} {p.contract_address ? formatAddress(p.contract_address) : "UNDEPLOYED"}
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="mt-6 flex items-center gap-4 max-w-sm w-full">
                              <div className="flex-1 h-6 border-4 border-[#1A1A1A] relative bg-[#F0EAD6]">
                                <div className="absolute top-0 left-0 h-full bg-[#DC143C] border-r-4 border-[#1A1A1A]" style={{ width: `${percent}%` }}></div>
                              </div>
                              <span className="font-mono text-xs font-black">{approvedCount}/{totalCount}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-4 border-t-4 border-[#1A1A1A] md:border-t-0 md:border-l-4 md:pl-6 pt-4 md:pt-0 w-full md:w-auto">
                            <div className="text-4xl font-black text-[#1A1A1A] whitespace-nowrap">
                              {formatEth(weiVal)}
                            </div>
                            {p.status?.toUpperCase() === 'ACTIVE' || p.status?.toUpperCase() === 'IN_PROGRESS' || p.status?.toUpperCase() === 'IN PROGRESS' ? (
                              <span className="bg-[#C5A945] text-[#1A1A1A] px-3 py-1 font-black text-xs uppercase border-2 border-[#1A1A1A] animate-flicker">IN PROGRESS</span>
                            ) : (
                              <span className="bg-[#1A1A1A] text-[#F0EAD6] px-3 py-1 font-black text-xs uppercase border-2 border-[#1A1A1A]">{p.status?.toUpperCase()}</span>
                            )}
                            <Link href={`/projects/${p.id}`} className="mt-2 text-sm font-black uppercase text-[#DC143C] group-hover:underline">VIEW →</Link>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#1A1A1A] text-center">
                      <p className="font-mono text-sm font-bold">NO ACTIVE PROJECTS FOUND FOR {activeRole.toUpperCase()}. SETUP A PROJECT TO START SYNCING.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: REPUTATION / FAST ACTIONS */}
              <div className="xl:col-span-1 border-l-8 border-[#1A1A1A] pl-0 xl:pl-12 pt-12 xl:pt-0">
                {activeRole === 'freelancer' ? (
                  <>
                    <h3 className="text-3xl font-black uppercase border-b-8 border-[#C5A945] pb-4 mb-8 text-[#1A1A1A]">
                      REPUTATION NFT
                    </h3>
                    
                    {!reputation ? (
                      <div className="bg-[#1A1A1A] border-4 border-[#C5A945] shadow-[12px_12px_0_#C5A945] p-8 text-[#F0EAD6] rotate-[1deg] text-center">
                        <h4 className="text-3xl font-black font-sans uppercase mb-4 text-[#DC143C]">NO_REPUTATION_FOUND</h4>
                        <p className="font-mono text-xs uppercase font-bold text-[#F0EAD6]/60">COMPLETE A PROJECT FIRST</p>
                      </div>
                    ) : (
                      <div className="bg-[#1A1A1A] border-4 border-[#C5A945] shadow-[12px_12px_0_#C5A945] p-8 text-[#F0EAD6] rotate-[1deg] relative">
                        <div className="absolute inset-0 halftone opacity-30 pointer-events-none"></div>
                        <span className="text-[#C5A945] font-black uppercase text-xs mb-2 block tracking-widest relative z-10">ON-CHAIN_IDENTITY</span>
                        <h4 className="text-4xl font-black font-sans uppercase mb-6 relative z-10 text-distressed text-[#C5A945]">
                          {(reputation.tier || 'BRONZE').toUpperCase()} TIER
                        </h4>
                        
                        <div className="flex justify-center mb-6 relative z-10">
                          <div className="text-9xl font-black text-[#DC143C] rotate-[-2deg] animate-jitter-slow tracking-tighter">
                            {reputation.score || 50}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 border-t-4 border-white/20 pt-6 relative z-10 font-mono text-xs uppercase font-bold">
                          <div>
                            <p className="opacity-60 mb-1">COMPLETED</p>
                            <p className="text-xl">{reputation.total_jobs || 0} JOBS</p>
                          </div>
                          <div>
                            <p className="opacity-60 mb-1">TOTAL VOL</p>
                            <p className="text-xl">
                              {formatEth(BigInt(Math.round(parseFloat(reputation.total_value_eth || 0) * 1e18)), 1)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-8 space-y-4 relative z-10">
                          <div>
                            <div className="flex justify-between font-mono text-[10px] mb-1 font-bold"><span>REPUTATION SCORE</span><span>{reputation.score || 50}%</span></div>
                            <div className="h-4 border-2 border-white w-full">
                              <div className="h-full bg-[#DC143C]" style={{ width: `${reputation.score || 50}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between font-mono text-[10px] mb-1 font-bold"><span>DISPUTE RATE</span><span>{parseFloat(reputation.dispute_rate || 0).toFixed(1)}%</span></div>
                            <div className="h-4 border-2 border-white w-full">
                              <div className="h-full bg-[#10B981]" style={{ width: `${Math.min(100, parseFloat(reputation.dispute_rate || 0) * 10)}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-3xl font-black uppercase border-b-8 border-[#C5A945] pb-4 mb-8 text-[#1A1A1A]">
                      QUICK ACTIONS
                    </h3>
                    <div className="flex flex-col gap-6">
                      <Link href="/client/create" className="bg-[#1A1A1A] text-[#F0EAD6] p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0_#DC143C] hover:-translate-x-1 hover:-translate-y-1 transition-transform rotate-[1deg] flex flex-col items-start w-full">
                        <span className="text-4xl mb-4">➕</span>
                        <span className="font-black text-2xl uppercase font-sans">CREATE PROJECT</span>
                        <span className="font-mono text-xs mt-2 opacity-80">Lock funds securely in escrow</span>
                      </Link>
                      <Link href="/disputes" className="bg-white text-[#1A1A1A] p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] hover:-translate-x-1 hover:-translate-y-1 transition-transform rotate-[-1deg] flex flex-col items-start w-full">
                        <span className="text-4xl mb-4">⚖️</span>
                        <span className="font-black text-2xl uppercase font-sans">DISPUTE CENTER</span>
                        <span className="font-mono text-xs mt-2 opacity-80">Manage active smart disputes</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* BOTTOM: RECENT ACTIVITY */}
            <section>
              <h3 className="text-3xl font-black uppercase border-b-8 border-[#1A1A1A] pb-4 mb-8 text-[#1A1A1A]">
                RECENT_ACTIVITY
              </h3>
              <div className="flex flex-col gap-4">
                {activity.length > 0 ? (
                  activity.map((tx, i) => {
                    const ts = Math.floor(new Date(tx.created_at).getTime() / 1000);
                    const rotation = i % 2 === 0 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]';
                    return (
                      <div key={tx.id || i} className={`bg-white border-2 border-[#1A1A1A] p-4 flex gap-6 items-center ${rotation} shadow-sm max-w-4xl hover:bg-[#F0EAD6] transition-colors justify-between`}>
                        <div className="flex gap-6 items-center">
                          <span className="font-mono text-[10px] font-black uppercase bg-[#1A1A1A] text-[#F0EAD6] px-2 py-1 shrink-0 w-24 text-center">
                            {formatDate(ts)}
                          </span>
                          <span className="font-bold text-sm font-sans tracking-tight">
                            {getTxActionText(tx)}
                          </span>
                        </div>
                        <a 
                          href={etherscanUrl(tx.tx_hash, "tx")} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-mono text-xs font-black uppercase text-[#DC143C] hover:underline"
                        >
                          TX: {shortenHash(tx.tx_hash)} ↗
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white border-2 border-[#1A1A1A] p-6 max-w-4xl text-center">
                    <p className="font-mono text-sm font-bold">NO RECENT PLATFORM ACTIVITY FOUND FOR THIS ADDRESS.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

      </main>
    </div>
  );
}
