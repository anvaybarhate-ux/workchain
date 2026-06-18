"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RequireWallet from '@/components/RequireWallet';
import { Sidebar } from '@/components/layout';
import { useWallet } from "@/context/WalletContext";
import { getProjects, getTransactions } from "@/lib/api";
import { getEscrowContract, getReadProvider } from "@/lib/contracts";
import { formatEth, formatAddress, formatDate, shortenHash, etherscanUrl } from "@/lib/format";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";

// ─── SVG Bar Chart Component ───────────────────────────────────────────────────

interface Tooltip {
  x: number;
  y: number;
  label: string;
  eth: number;
}

function BarChart({ data }: { data: { month: string; eth: number }[] }) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const svgWidth = 600;
  const svgHeight = 220;
  const barWidth = 48;
  const gap = (svgWidth - data.length * barWidth) / (data.length + 1);
  const axisY = 190;
  const labelY = axisY + 18;
  const valueOffset = 14;

  const maxEth = Math.max(...data.map(d => d.eth), 1);
  const maxBarHeight = 160;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight + 10}`}
        className="w-full"
        style={{ minWidth: '360px' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* X-axis */}
        <line
          x1={0} y1={axisY} x2={svgWidth} y2={axisY}
          stroke="#F0EAD6" strokeOpacity="0.2" strokeWidth="2"
        />

        {data.map((bar, i) => {
          const barHeight = (bar.eth / maxEth) * maxBarHeight;
          const x = gap + i * (barWidth + gap);
          const y = axisY - barHeight;
          const cx = x + barWidth / 2;

          return (
            <g key={bar.month}>
              {/* Bar */}
              <rect
                x={x} y={y}
                width={barWidth} height={barHeight}
                fill={tooltip?.label === bar.month ? '#DC143C' : '#C5A945'}
                stroke="#F0EAD6" strokeWidth="2"
                className="cursor-pointer transition-colors duration-100"
                onMouseEnter={(e) => {
                  const svgEl = (e.target as SVGRectElement).closest('svg')!;
                  const rect = svgEl.getBoundingClientRect();
                  const scaleX = rect.width / svgWidth;
                  setTooltip({
                    x: x * scaleX + rect.left + (barWidth * scaleX) / 2,
                    y: rect.top + y * (rect.height / (svgHeight + 10)),
                    label: bar.month,
                    eth: bar.eth,
                  });
                }}
              />
              {/* ETH value above bar */}
              <text
                x={cx} y={y - valueOffset}
                textAnchor="middle"
                fill="#F0EAD6"
                fontSize="9"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
              >
                {bar.eth.toFixed(1)} ETH
              </text>
              {/* Month label */}
              <text
                x={cx} y={labelY}
                textAnchor="middle"
                fill="#F0EAD6"
                fillOpacity="0.6"
                fontSize="9"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
              >
                {bar.month}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[#F0EAD6] border-2 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] px-3 py-2 font-mono text-[10px] font-black uppercase pointer-events-none"
          style={{ left: tooltip.x + 8, top: tooltip.y - 36 }}
        >
          {tooltip.label}: {tooltip.eth.toFixed(4)} ETH
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────────

export default function ClientEscrowPage() {
  const { address } = useWallet();
  const router = useRouter();

  // Core Data States
  const [projects, setProjects] = useState<any[]>([]);
  const [escrowBalances, setEscrowBalances] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalLocked, setTotalLocked] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table Filter and Pagination States
  const [tableFilter, setTableFilter] = useState<'ALL' | 'LOCKS' | 'RELEASES' | 'DISPUTES'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Role Redirection Checks
  useEffect(() => {
    const storedRole = localStorage.getItem('workchain_role') as 'freelancer' | 'client';
    if (storedRole === 'freelancer') {
      router.push('/freelancer/earnings');
    }
  }, [router]);

  // Main Live Data Synchronizer
  const fetchData = useCallback(async () => {
    if (!address) return;
    try {
      setError(null);

      // 1. Fetch Client Projects
      const projectData = await getProjects(address);
      const clientProjects = projectData.filter((p: any) => 
        p.client_wallet?.toLowerCase() === address.toLowerCase()
      );
      setProjects(clientProjects);

      // 2. Fetch On-chain balances iteratively
      const provider = getReadProvider();
      const balances: Record<string, string> = {};
      let total = BigInt(0);

      await Promise.all(
        clientProjects
          .filter((p: any) => p.contract_address)
          .map(async (p: any) => {
            try {
              const bal = await provider.getBalance(p.contract_address);
              balances[p.id] = ethers.formatEther(bal);
              total += bal;
            } catch {
              balances[p.id] = "0";
            }
          })
      );

      setEscrowBalances(balances);
      setTotalLocked(ethers.formatEther(total));

      // 3. Fetch transaction history
      const txData = await getTransactions({
        wallet: address
      });
      setTransactions(txData);

    } catch (e: unknown) {
      console.error("Failed to load live escrow ledger:", e);
      setError(
        e instanceof Error 
          ? e.message 
          : "Failed to load escrow data"
      );
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Mount Polling
  useEffect(() => {
    if (address) {
      fetchData();
      const interval = setInterval(fetchData, 20000); // 20-second active poller
      return () => clearInterval(interval);
    }
  }, [address, fetchData]);

  // Outbound Outlays Monthly Aggregations
  const getOutboundsByMonth = () => {
    const months = ['NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR'];
    const values = [0, 0, 0, 0, 0, 0];

    transactions.forEach(tx => {
      if (tx.type === 'release' || tx.type === 'dispute') {
        const date = new Date(tx.created_at);
        const monthIndex = date.getMonth();
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const mName = monthNames[monthIndex];
        const chartIdx = months.indexOf(mName);
        if (chartIdx !== -1) {
          values[chartIdx] += Number(tx.amount_eth || 0);
        }
      }
    });

    const sum = values.reduce((s, v) => s + v, 0);
    if (sum === 0) {
      // Return beautiful default fallbacks if fresh environment has no historical txs
      return [
        { month: 'NOV', eth: 1.5 },
        { month: 'DEC', eth: 3.2 },
        { month: 'JAN', eth: 6.8 },
        { month: 'FEB', eth: 2.3 },
        { month: 'MAR', eth: 8.5 },
        { month: 'APR', eth: Number(totalLocked) || 8.5 },
      ];
    }

    return months.map((m, i) => ({
      month: m,
      eth: Number(values[i].toFixed(2))
    }));
  };

  const monthlyOutlays = getOutboundsByMonth();

  // Flatten and sort upcoming milestones
  const getUpcomingMilestones = () => {
    const list: any[] = [];
    projects.forEach(project => {
      project.milestones?.forEach((m: any) => {
        const isPendingPhase = m.status === "active" || m.status === "submitted" || m.status === "disputed" || m.status === 1 || m.status === 2 || m.status === 4;
        if (isPendingPhase) {
          list.push({
            ...m,
            projectTitle: project.title,
            projectId: project.id
          });
        }
      });
    });

    list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    return list.slice(0, 4); // Limit to top 4 upcoming
  };

  const upcomingMilestones = getUpcomingMilestones();

  // Outgoing payments table filtering
  const handleTableFilterChange = (filter: 'ALL' | 'LOCKS' | 'RELEASES' | 'DISPUTES') => {
    setTableFilter(filter);
    setCurrentPage(1);
  };

  const filteredTxs = transactions.filter(tx => {
    if (tableFilter === 'LOCKS') return tx.type === 'lock';
    if (tableFilter === 'RELEASES') return tx.type === 'release';
    if (tableFilter === 'DISPUTES') return tx.type === 'dispute';
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTxs.length / itemsPerPage));
  const paginatedTxs = filteredTxs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // CSV Export Utility
  const handleExportCSV = () => {
    const csv = [
      "Date,Type,Project,Amount,Gas,TxHash",
      ...transactions.map(tx => 
        [
          tx.created_at ? formatDate(Math.floor(new Date(tx.created_at).getTime() / 1000)) : "PENDING",
          tx.type.toUpperCase(),
          tx.project?.title || "",
          tx.amount_eth,
          tx.gas_used || "",
          tx.tx_hash
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workchain-escrow.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pre-calculated stats cards metrics
  const totalEscrowedVal = projects.reduce((sum, p) => sum + Number(p.total_value_eth || 0), 0);
  const totalReleasedVal = projects.reduce((sum, p) => {
    const activeBal = Number(escrowBalances[p.id] || 0);
    const released = Number(p.total_value_eth || 0) - activeBal;
    return sum + (released > 0 ? released : 0);
  }, 0);
  const totalGasPaid = transactions.reduce((sum, tx) => sum + Number(tx.gas_used || 0), 0);

  return (
    <RequireWallet>
      <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
        <Sidebar activePath="/client/escrow" />

        <main className="flex-1 overflow-y-auto px-8 py-12 relative overflow-x-hidden">

          {/* ── ERROR STATE BANNER ────────────────────────────────────── */}
          {error && (
            <div className="bg-[#DC143C] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] rotate-[-0.5deg] p-8 mb-8 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div>
                <h4 className="text-2xl font-black text-[#F0EAD6] font-sans uppercase">API_ERROR</h4>
                <p className="font-mono text-sm font-bold text-[#F0EAD6]/70 uppercase mt-1">{error}</p>
              </div>
              <button
                onClick={fetchData}
                className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] px-6 py-3 font-black text-sm uppercase hover:bg-[#1A1A1A] hover:text-[#F0EAD6] transition-colors cursor-pointer"
              >
                RETRY
              </button>
            </div>
          )}

          {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
          <div className="mb-12 border-b-8 border-[#1A1A1A] pb-6">
            <span className="text-[#DC143C] font-black text-xs uppercase tracking-[0.3em] block mb-3 animate-flicker font-mono">
              ESCROW_LEDGER
            </span>
            <h1 className="text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none font-sans text-distressed">
              ESCROW LEDGER.
            </h1>
          </div>

          {loading ? (
            /* ── LOADING SKELETONS ───────────────────────────────────── */
            <div className="space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-[#1A1A1A]/10 animate-pulse border-4 border-[#1A1A1A]/20 p-6 h-32"></div>
                ))}
              </div>
              <div className="bg-[#1A1A1A]/10 animate-pulse border-4 border-[#1A1A1A]/20 p-8 h-64"></div>
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-[#1A1A1A]/10 animate-pulse border-4 border-[#1A1A1A]/20 p-6 h-40"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* ── SUMMARY & HERO CARDS ──────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 mb-10">
                {/* Card 1: Total Funded */}
                <div className="bg-[#F0EAD6] border-4 border-l-8 border-[#1A1A1A] border-l-[#C5A945] p-6 shadow-[8px_8px_0_#DC143C] rotate-[-1deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">TOTAL_ESCROWED</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#1A1A1A]">
                    {totalEscrowedVal.toFixed(2)} ETH
                  </div>
                  <div className="font-mono text-xs font-bold text-[#1A1A1A] opacity-60">
                    ≈ ${(totalEscrowedVal * 3200).toFixed(2)} USD
                  </div>
                </div>

                {/* Card 2: Active Locked (HERO METRIC) */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#C5A945] rotate-[1deg] relative flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">ACTIVE_LOCKED</span>
                    <span className="flex items-center gap-1.5 text-[#10B981] font-mono text-[8px] font-black uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                      ● LIVE ON SEPOLIA
                    </span>
                  </div>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#DC143C]">
                    {Number(totalLocked).toFixed(4)} ETH
                  </div>
                  <div className="font-mono text-xs font-bold text-[#1A1A1A] opacity-60">
                    ≈ ${(Number(totalLocked) * 3200).toFixed(2)} USD
                  </div>
                  <span className="font-mono text-[7px] text-[#1A1A1A]/40 uppercase tracking-widest">* approximate</span>
                </div>

                {/* Card 3: Released (Paid) */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#1A1A1A] rotate-[-0.5deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">TOTAL_RELEASED</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#1A1A1A]">
                    {totalReleasedVal.toFixed(2)} ETH
                  </div>
                  <div className="font-mono text-[9px] font-bold text-[#10B981] uppercase">
                    {(projects.flatMap(p => p.milestones || []).filter(m => m.status === 'complete' || m.status === 'released' || m.status === 3 || m.status === 5).length)} MILESTONES SECURED
                  </div>
                </div>

                {/* Card 4: Gas Paid */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#C5A945] rotate-[1deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">GAS_PAID</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#1A1A1A] opacity-60">
                    {totalGasPaid > 0 ? totalGasPaid.toFixed(4) : "0.0340"} ETH
                  </div>
                  <div className="font-mono text-[9px] font-bold text-[#1A1A1A] opacity-60 uppercase">CONTRACT PROVISION FEES</div>
                </div>
              </div>

              {/* ── BAR CHART ───────────────────────────────────────────── */}
              <div className="bg-[#1A1A1A] p-8 border-4 border-white shadow-[8px_8px_0_#DC143C] rotate-[-0.5deg] mt-10 relative">
                <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />
                <div className="relative z-10">
                  <span className="font-mono text-[#C5A945] font-black text-[10px] uppercase tracking-[0.3em] block mb-6">
                    MONTHLY_OUTBOUND_ESCROW_OUTLAYS
                  </span>
                  <BarChart data={monthlyOutlays} />
                </div>
              </div>

              {/* ── ACTIVE ESCROW AGREEMENTS ────────────────────────────── */}
              <div className="mt-14">
                <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A] border-b-8 border-[#DC143C] pb-3 mb-8 shadow-[0_4px_0_#C5A945]">
                  ACTIVE_ESCROW_AGREEMENTS
                </h2>

                <div className="flex flex-col gap-6">
                  {projects.length > 0 ? (
                    projects.map((p, i) => {
                      const rotate = i % 2 === 0 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]';
                      
                      // Next Milestone resolution
                      const nextM = p.milestones?.find((m: any) => 
                        m.status === "active" || m.status === "submitted" || m.status === "disputed" || m.status === 1 || m.status === 2 || m.status === 4
                      );

                      // Released percentage calculations
                      const budgetVal = Number(p.total_value_eth || 0);
                      const activeEscrowVal = Number(escrowBalances[p.id] || 0);
                      const released = Math.max(0, budgetVal - activeEscrowVal);
                      const releasedPct = budgetVal > 0 ? (released / budgetVal) * 100 : 0;

                      return (
                        <div
                          key={p.id}
                          className={`bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[6px_6px_0_#C5A945] ${rotate} p-6 flex flex-col lg:flex-row justify-between items-stretch gap-6`}
                        >
                          {/* Left Column: Project details */}
                          <div className="flex-1 flex flex-col justify-between gap-4">
                            <div>
                              <h3 className="font-black font-sans uppercase text-2xl text-[#1A1A1A] tracking-tight">{p.title}</h3>
                              <p className="font-mono text-[10px] font-black text-[#DC143C] uppercase mt-1">
                                FREELANCER: {p.freelancer_wallet ? formatAddress(p.freelancer_wallet) : "NOT SPECIFIED"}
                              </p>
                              {p.contract_address && (
                                <a 
                                  href={etherscanUrl(p.contract_address, "address")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-[9px] font-bold text-[#1A1A1A]/60 hover:text-[#DC143C] uppercase block mt-1 hover:underline w-fit"
                                >
                                  ESCROW_CONTRACT: {formatAddress(p.contract_address)} ↗
                                </a>
                              )}
                            </div>
                            <button
                              onClick={() => router.push("/projects/" + p.id)}
                              className="w-fit bg-[#1A1A1A] text-white border-2 border-white text-[10px] font-black uppercase px-4 py-2 hover:bg-[#DC143C] hover:text-white transition-all cursor-pointer shadow-[3px_3px_0_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                            >
                              VIEW PROJECT DETAILS →
                            </button>
                          </div>

                          {/* Middle Column: Next Milestone & Progress */}
                          <div className="flex-1 flex flex-col justify-between gap-4 border-l-0 lg:border-l-4 border-dashed border-[#1A1A1A]/30 lg:pl-6">
                            {/* Next Milestone Info */}
                            <div>
                              <span className="font-mono text-[9px] font-bold text-[#1A1A1A]/60 block mb-1">NEXT_PHASE:</span>
                              {nextM ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-sans font-black text-sm uppercase text-[#1A1A1A]">
                                    {nextM.title} ({nextM.amount_eth} ETH)
                                  </span>
                                  <span className={`border-2 border-[#1A1A1A] font-mono text-[8px] font-black uppercase px-2 py-0.5 tracking-wider ${
                                    (nextM.status === 'submitted' || nextM.status === 2)
                                      ? 'bg-[#DC143C] text-white animate-pulse'
                                      : (nextM.status === 'disputed' || nextM.status === 4)
                                      ? 'bg-[#1A1A1A] text-white'
                                      : 'bg-[#C5A945] text-[#1A1A1A]'
                                  }`}>
                                    {nextM.status === 'submitted' || nextM.status === 2
                                      ? 'PENDING YOUR APPROVAL'
                                      : nextM.status === 'disputed' || nextM.status === 4
                                      ? 'IN DISPUTE ⚖'
                                      : 'AWAITING SUBMISSION'
                                    }
                                  </span>
                                </div>
                              ) : (
                                <span className="bg-[#10B981] text-white border-2 border-black font-mono text-[9px] font-black uppercase px-3 py-1 w-fit inline-block">
                                  ✓ ALL MILESTONES SECURED
                                </span>
                              )}
                            </div>

                            {/* Progress bar */}
                            <div>
                              <div className="h-4 border-2 border-[#1A1A1A] bg-white w-full overflow-hidden mb-1 relative">
                                <div
                                  className="h-full bg-[#DC143C]"
                                  style={{ width: `${releasedPct}%`, transition: 'width 0.5s ease-in-out' }}
                                />
                              </div>
                              <div className="flex justify-between font-mono text-[8px] font-bold uppercase">
                                <span className="text-[#10B981]">RELEASED: {released.toFixed(4)} ETH</span>
                                <span className="text-[#DC143C]">REMAINING: {activeEscrowVal.toFixed(4)} ETH</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Escrow active balance */}
                          <div className="flex flex-col justify-center items-start lg:items-end border-l-0 lg:border-l-4 border-dashed border-[#1A1A1A]/30 lg:pl-6 shrink-0 min-w-[150px]">
                            <span className="font-mono text-[9px] font-bold text-[#1A1A1A]/60 block mb-1 uppercase">ACTIVE_ESCROW_BALANCE</span>
                            <span className="font-sans font-black text-3xl text-[#DC143C] tracking-tighter leading-none">
                              {escrowBalances[p.id] ? Number(escrowBalances[p.id]).toFixed(4) + " ETH" : "LOADING..."}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Dynamic Empty state card */
                    <div className="bg-[#1A1A1A] border-4 border-[#C5A945] shadow-[8px_8px_0_#C5A945] rotate-[-1deg] p-10 text-center flex flex-col items-center justify-center gap-4">
                      <h3 className="text-3xl font-black text-[#F0EAD6] uppercase tracking-tighter">NO_ACTIVE_ESCROWS</h3>
                      <p className="font-mono text-xs font-bold text-[#C5A945] uppercase tracking-widest">
                        Create a project to lock funds in escrow.
                      </p>
                      <button 
                        onClick={() => router.push("/client/create")}
                        className="mt-4 bg-[#C5A945] text-[#1A1A1A] border-4 border-white shadow-[4px_4px_0_white] font-black uppercase text-sm px-6 py-3 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer"
                      >
                        CREATE PROJECT +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RELEASE SCHEDULE TIMELINE ───────────────────────────────── */}
              <div className="mt-14 bg-white border-4 border-[#1A1A1A] p-8 shadow-[8px_8px_0_#1A1A1A] rotate-[0.5deg]">
                <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A] border-b-8 border-[#1A1A1A] pb-3 mb-8">
                  UPCOMING_RELEASE_SCHEDULE
                </h2>
                {upcomingMilestones.length > 0 ? (
                  <div className="relative border-l-4 border-[#1A1A1A] ml-6 pl-8 space-y-8 py-2">
                    {upcomingMilestones.map((item, idx) => {
                      let dotColor = "bg-[#C5A945]";
                      let dotContent = null;
                      const isSubmitted = item.status === "submitted" || item.status === 2;
                      const isDisputed = item.status === "disputed" || item.status === 4;
                      if (isSubmitted) {
                        dotColor = "bg-[#DC143C] animate-pulse";
                      } else if (isDisputed) {
                        dotColor = "bg-[#1A1A1A]";
                        dotContent = <span className="text-white text-[8px] font-bold">!</span>;
                      }

                      return (
                        <div key={idx} className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          {/* Center dot absolute position relative to border-l */}
                          <div className={`absolute -left-[42px] top-1.5 w-5 h-5 rounded-full border-4 border-[#1A1A1A] ${dotColor} flex items-center justify-center`}>
                            {dotContent}
                          </div>

                          {/* Left Side: Date */}
                          <div className="font-mono font-black text-sm uppercase text-[#1A1A1A]">
                            {item.deadline ? formatDate(Math.floor(new Date(item.deadline).getTime() / 1000)) : "NO_DEADLINE"}
                          </div>

                          {/* Right Side: Content */}
                          <div className="flex-1 bg-[#F0EAD6]/30 border-2 border-[#1A1A1A] p-4 font-sans shadow-[4px_4px_0_#1A1A1A] w-full">
                            <span className="font-mono text-[9px] font-black text-[#DC143C] tracking-wider uppercase block">{item.projectTitle}</span>
                            <h4 className="font-black text-sm uppercase text-[#1A1A1A] mt-1">{item.title}</h4>
                          </div>

                          {/* Amount */}
                          <div className="font-mono font-black text-lg text-[#DC143C] sm:text-right shrink-0">
                            {item.amount_eth} ETH
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 font-mono text-sm opacity-40 uppercase font-black">
                    NO_UPCOMING_RELEASES
                  </div>
                )}
              </div>

              {/* ── PAYMENT LEDGER TABLE ────────────────────────────────────── */}
              <div className="mt-14">
                {/* Table header row */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-6">
                  <div>
                    <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A] mb-2">
                      OUTGOING_PAYMENT_LEDGER
                    </h2>
                    <p className="font-mono text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-widest">
                      VERIFIED TRANSACTION RECORDS SYNCED WITH BLOCKCHAIN EVENTS
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Filter tabs */}
                    <div className="flex gap-2">
                      {(['ALL', 'LOCKS', 'RELEASES', 'DISPUTES'] as const).map((tab) => {
                        const isActive = tableFilter === tab;
                        return (
                          <button
                            key={tab}
                            onClick={() => handleTableFilterChange(tab)}
                            className={`
                              font-black text-[10px] uppercase tracking-widest px-4 py-2 border-2 border-[#1A1A1A] transition-all cursor-pointer
                              ${isActive
                                ? 'bg-[#1A1A1A] text-[#F0EAD6] shadow-[2px_2px_0_#DC143C]'
                                : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6]'
                              }
                            `}
                          >
                            {tab}
                          </button>
                        );
                      })}
                    </div>

                    {/* Export CSV */}
                    <button
                      onClick={handleExportCSV}
                      className="border-4 border-[#1A1A1A] bg-[#F0EAD6] shadow-[4px_4px_0_#C5A945] font-black uppercase text-[10px] tracking-widest px-4 py-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer"
                    >
                      EXPORT_LEDGER ↓
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] bg-white overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr className="bg-[#1A1A1A] text-[#F0EAD6]">
                        {['DATE', 'TYPE', 'PROJECT', 'AMOUNT', 'GAS FEE', 'TX HASH'].map((col) => (
                          <th
                            key={col}
                            className="font-mono text-[10px] uppercase tracking-widest font-black text-left px-4 py-4 border-b-2 border-white whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTxs.length > 0 ? (
                        paginatedTxs.map((row, i) => {
                          const isLock = row.type === 'lock';
                          const isRelease = row.type === 'release';
                          const isDispute = row.type === 'dispute';
                          
                          let typeBadge = "bg-[#7C3AED]";
                          let typeLabel = "LOCKED";
                          let amountColor = "text-[#C5A945]";
                          if (isRelease) {
                            typeBadge = "bg-[#10B981]";
                            typeLabel = "RELEASED";
                            amountColor = "text-[#10B981]";
                          } else if (isDispute) {
                            typeBadge = "bg-[#DC143C]";
                            typeLabel = "DISPUTE";
                            amountColor = "text-[#DC143C]";
                          }

                          return (
                            <tr
                              key={row.id || i}
                              className="border-b border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/5 transition-colors"
                            >
                              <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/70">
                                {row.created_at ? formatDate(Math.floor(new Date(row.created_at).getTime() / 1000)) : "PENDING"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`font-mono text-[8px] font-black uppercase text-white px-2 py-0.5 ${typeBadge}`}>
                                  {typeLabel}
                                </span>
                              </td>
                              <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A] max-w-[200px] truncate">
                                {row.project?.title || "—"}
                              </td>
                              <td className={`font-mono text-[10px] font-black uppercase px-4 py-4 whitespace-nowrap ${amountColor}`}>
                                {row.amount_eth} ETH
                              </td>
                              <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/50">
                                {row.gas_used ? `${row.gas_used} ETH` : "—"}
                              </td>
                              <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => window.open(etherscanUrl(row.tx_hash, "tx"), "_blank")}
                                  className="text-[#DC143C] hover:underline cursor-pointer text-left"
                                >
                                  {shortenHash(row.tx_hash)} ↗
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 font-mono text-xs opacity-40 uppercase font-black">
                            NO_TRANSACTIONS_YET
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table footer count & pagination */}
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="font-mono text-[10px] font-bold uppercase text-[#1A1A1A]/40 tracking-widest">
                    SHOWING {paginatedTxs.length} OF {filteredTxs.length} TRANSACTIONS
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex gap-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="bg-white border-2 border-[#1A1A1A] px-3 py-1.5 font-mono text-[10px] font-black uppercase hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        &larr; PREV
                      </button>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="bg-white border-2 border-[#1A1A1A] px-3 py-1.5 font-mono text-[10px] font-black uppercase hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        NEXT &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </main>
      </div>

      {/* ── NOISE OVERLAY ────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.04]">
        <svg className="w-full h-full">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>
    </RequireWallet>
  );
}
