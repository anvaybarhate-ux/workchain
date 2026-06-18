"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RequireWallet from '@/components/RequireWallet';
import { Sidebar } from '@/components/layout';
import { useRouter } from 'next/navigation';

import { useWallet } from "@/context/WalletContext";
import { getTransactions, getProjects } from "@/lib/api";
import { formatEth, formatDate, shortenHash, etherscanUrl } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingPayment {
  projectTitle: string;
  milestoneTitle: string;
  amount: string;
  daysSinceSubmission: number;
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

interface Tooltip {
  x: number;
  y: number;
  label: string;
  eth: number;
}

interface BarChartProps {
  monthlyData: { label: string; eth: number }[];
}

function BarChart({ monthlyData }: BarChartProps) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const svgWidth = 600;
  const svgHeight = 220;
  const barWidth = 48;
  const gap = (svgWidth - monthlyData.length * barWidth) / (monthlyData.length + 1);
  const axisY = 190;
  const labelY = axisY + 18;
  const valueOffset = 14;

  const maxEth = Math.max(...monthlyData.map(d => d.eth), 0.1);
  const maxBarHeight = 160;

  const allZeros = monthlyData.every(d => d.eth === 0);

  if (allZeros) {
    return (
      <div className="flex h-[220px] items-center justify-center font-mono text-xs font-black uppercase text-[#F0EAD6]/40 tracking-widest">
        NO DATA
      </div>
    );
  }

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

        {monthlyData.map((bar, i) => {
          const barHeight = (bar.eth / maxEth) * maxBarHeight;
          const x = gap + i * (barWidth + gap);
          const y = axisY - barHeight;
          const cx = x + barWidth / 2;

          return (
            <g key={bar.label}>
              {/* Bar */}
              <rect
                x={x} y={y}
                width={barWidth} height={barHeight}
                fill={tooltip?.label === bar.label ? '#C5A945' : '#DC143C'}
                stroke="#F0EAD6" strokeWidth="2"
                className="cursor-pointer transition-colors duration-100"
                onMouseEnter={(e) => {
                  const svgEl = (e.target as SVGRectElement).closest('svg')!;
                  const rect = svgEl.getBoundingClientRect();
                  const scaleX = rect.width / svgWidth;
                  setTooltip({
                    x: x * scaleX + rect.left + (barWidth * scaleX) / 2,
                    y: rect.top + y * (rect.height / (svgHeight + 10)),
                    label: bar.label,
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
                {bar.eth > 0 ? `${bar.eth.toFixed(4)} ETH` : "0 ETH"}
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
                {bar.label}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterTab = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH';
const FILTER_TABS: FilterTab[] = ['ALL', 'THIS_MONTH', 'LAST_MONTH'];

export default function EarningsPage() {
  const router = useRouter();
  const { address } = useWallet();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingProjects, setPendingProjects] = useState<any[]>([]);
  const [projectMap, setProjectMap] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    const storedRole = localStorage.getItem('workchain_role') as 'freelancer' | 'client';
    if (storedRole === 'client') {
      router.push('/client/escrow');
    }
  }, [router]);

  const loadData = async () => {
    if (!address) return;
    setIsLoading(true);
    setIsError(false);
    try {
      // 1. Fetch release transactions
      const txs = await getTransactions({
        wallet: address,
        type: "release"
      });
      setTransactions(txs);

      // 2. Fetch active projects
      const activeProjects = await getProjects(address, "active");
      setPendingProjects(activeProjects);

      // 3. Fetch all projects to build lookup Map
      const allProjects = await getProjects(address);
      const pMap = new Map();
      allProjects.forEach((proj: any) => {
        pMap.set(proj.id, proj);
      });
      setProjectMap(pMap);
    } catch (err) {
      console.error("Error loading earnings data:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      loadData();
    }
  }, [address]);

  // ─── Calculations ───────────────────────────────────────────────────────────

  // TOTAL_EARNED
  const totalEarnedNumber = transactions
    .filter(t => t.type === "release")
    .reduce((sum, t) => sum + Number(t.amount_eth || 0), 0);
  const totalEarnedFormatted = totalEarnedNumber.toFixed(4) + " ETH";
  const totalEarnedUSD = `≈ $${Math.round(totalEarnedNumber * 3000).toLocaleString()} USD`;

  // PENDING_RELEASE
  const pendingReleaseNumber = pendingProjects
    .flatMap(p => p.milestones || [])
    .filter(m => m.status === "submitted")
    .reduce((sum, m) => sum + Number(m.amount_eth || 0), 0);
  const pendingReleaseFormatted = pendingReleaseNumber.toFixed(4) + " ETH";

  // THIS_MONTH
  const now = new Date();
  const isThisMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const isLastMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const targetMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
  };

  const thisMonthNumber = transactions
    .filter(t => t.type === "release" && isThisMonth(t.created_at))
    .reduce((sum, t) => sum + Number(t.amount_eth || 0), 0);
  const thisMonthFormatted = thisMonthNumber.toFixed(4) + " ETH";

  // Percentage change for this month vs last month
  const lastMonthNumber = transactions
    .filter(t => t.type === "release" && isLastMonth(t.created_at))
    .reduce((sum, t) => sum + Number(t.amount_eth || 0), 0);

  let pctChangeText = "";
  if (lastMonthNumber > 0) {
    const pct = ((thisMonthNumber - lastMonthNumber) / lastMonthNumber) * 100;
    if (pct >= 0) {
      pctChangeText = `↑ ${pct.toFixed(0)}% VS LAST MONTH`;
    } else {
      pctChangeText = `↓ ${Math.abs(pct).toFixed(0)}% VS LAST MONTH`;
    }
  } else {
    pctChangeText = thisMonthNumber > 0 ? "↑ 100% VS LAST MONTH" : "NO EARNINGS YET";
  }

  // GAS_SPENT
  const totalGasSpentNumber = transactions
    .reduce((sum, t) => sum + Number(t.gas_used || 0), 0);
  const totalGasSpentWei = BigInt(Math.round(totalGasSpentNumber * 1e18));
  const totalGasSpentFormatted = formatEth(totalGasSpentWei);

  // CHART DATA (Last 6 Months)
  const getLast6Months = () => {
    const months = [];
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: monthNames[m.getMonth()],
        year: m.getFullYear(),
        monthIndex: m.getMonth()
      });
    }
    return months;
  };

  const last6Months = getLast6Months();
  const monthlyData = last6Months.map(m => {
    const eth = transactions
      .filter(t => t.type === "release" && isSameMonth(t.created_at, m))
      .reduce((sum, t) => sum + Number(t.amount_eth || 0), 0);
    return {
      label: m.label,
      eth: eth
    };
  });

  function isSameMonth(createdAtStr: string, monthObj: { monthIndex: number; year: number }) {
    if (!createdAtStr) return false;
    const date = new Date(createdAtStr);
    return date.getMonth() === monthObj.monthIndex && date.getFullYear() === monthObj.year;
  }

  // PENDING PAYMENTS
  const pendingPayments: PendingPayment[] = [];
  pendingProjects.forEach((proj: any) => {
    (proj.milestones || []).forEach((ms: any) => {
      if (ms.status === "submitted") {
        let waitDays = 0;
        if (ms.submitted_at) {
          const subDate = new Date(ms.submitted_at);
          const diffTime = Math.abs(new Date().getTime() - subDate.getTime());
          waitDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
        pendingPayments.push({
          projectTitle: proj.title,
          milestoneTitle: ms.title,
          amount: Number(ms.amount_eth || 0).toFixed(4) + " ETH",
          daysSinceSubmission: waitDays
        });
      }
    });
  });

  // FILTERED ROWS (TABLE)
  const filteredRows = transactions.filter((row) => {
    if (activeFilter === 'THIS_MONTH') return isThisMonth(row.created_at);
    if (activeFilter === 'LAST_MONTH') return isLastMonth(row.created_at);
    return true;
  });

  // EXPORT CSV
  function handleExportCSV() {
    const header = 'DATE,PROJECT,MILESTONE,AMOUNT,GAS,TX_HASH\n';
    const rows = filteredRows
      .map((tx) => {
        const dateStr = formatDate(Math.floor(new Date(tx.created_at).getTime() / 1000));
        const project = projectMap.get(tx.project_id);
        const milestone = project?.milestones?.find((m: any) => m.id === tx.milestone_id);
        const projectTitle = project ? project.title.replace(/"/g, '""') : 'N/A';
        const milestoneTitle = milestone ? milestone.title.replace(/"/g, '""') : 'N/A';
        const amount = Number(tx.amount_eth || 0) + ' ETH';
        const gas = Number(tx.gas_used || 0) + ' ETH';
        return `"${dateStr}","${projectTitle}","${milestoneTitle}","${amount}","${gas}","${tx.tx_hash}"`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workchain-earnings.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RequireWallet>
      <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
        <Sidebar activePath="/freelancer/earnings" />

        {/* ── MAIN ─────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-8 py-12 relative overflow-x-hidden">

          {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
          <div className="mb-12 border-b-8 border-[#1A1A1A] pb-6">
            <span className="text-[#DC143C] font-black text-xs uppercase tracking-[0.3em] block mb-3 animate-flicker font-mono">
              EARNINGS_MODULE
            </span>
            <h1 className="text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none font-sans text-distressed">
              YOUR LEDGER.
            </h1>
          </div>

          {/* ── ERROR RECOVERY BANNER ─────────────────────────────────── */}
          {isError && (
            <div className="bg-white border-4 border-[#DC143C] p-6 mb-12 shadow-[8px_8px_0_#DC143C] rotate-[-1deg] flex flex-col sm:flex-row justify-between items-center gap-4 animate-jitter-slow">
              <div className="flex items-center gap-4">
                <span className="text-4xl">⚠</span>
                <div>
                  <h4 className="text-2xl font-black text-[#DC143C] font-sans">EARNINGS SYSTEM ERROR</h4>
                  <p className="font-mono text-xs font-bold uppercase mt-1">Failed to query platform records. The SQLite backend might be offline.</p>
                </div>
              </div>
              <button 
                onClick={loadData}
                className="bg-[#DC143C] text-white px-6 py-3 font-black text-sm uppercase border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shrink-0 cursor-pointer"
              >
                RETRY
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="h-[400px] bg-[#1A1A1A] animate-pulse border-4 border-[#1A1A1A]/50 p-12 mb-16">
              <div className="h-6 bg-[#F0EAD6]/20 w-1/4 mb-4"></div>
              <div className="h-10 bg-[#F0EAD6]/20 w-1/2 mb-6"></div>
              <div className="h-20 bg-[#F0EAD6]/10 w-full"></div>
            </div>
          ) : (
            <>
              {/* ── SUMMARY CARDS ───────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 mb-10">

                {/* Card 1: Total Earned */}
                <div className="bg-[#F0EAD6] border-4 border-l-8 border-[#1A1A1A] border-l-[#DC143C] p-6 shadow-[8px_8px_0_#C5A945] rotate-[-1deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">TOTAL_EARNED</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#1A1A1A]">{totalEarnedFormatted}</div>
                  <div className="font-mono text-xs font-bold text-[#1A1A1A] opacity-60">{totalEarnedUSD}</div>
                </div>

                {/* Card 2: Pending Release */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#DC143C] rotate-[1deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">PENDING_RELEASE</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#C5A945]">{pendingReleaseFormatted}</div>
                  <div className="font-mono text-[9px] font-bold text-[#1A1A1A] opacity-60 uppercase">AWAITING CLIENT APPROVAL</div>
                </div>

                {/* Card 3: This Month */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#1A1A1A] rotate-[-0.5deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">THIS_MONTH</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#1A1A1A]">{thisMonthFormatted}</div>
                  <div className="font-mono text-[9px] font-bold text-[#10B981] uppercase">{pctChangeText}</div>
                </div>

                {/* Card 4: Gas Spent */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#C5A945] rotate-[1deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">GAS_SPENT</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#1A1A1A] opacity-60">{totalGasSpentFormatted}</div>
                  <div className="font-mono text-[9px] font-bold text-[#1A1A1A] opacity-60 uppercase">TOTAL TRANSACTION FEES</div>
                </div>
              </div>

              {/* ── BAR CHART ───────────────────────────────────────────────── */}
              <div className="bg-[#1A1A1A] p-8 border-4 border-white shadow-[8px_8px_0_#DC143C] rotate-[-0.5deg] mt-10 relative">
                <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />
                <div className="relative z-10">
                  <span className="font-mono text-[#C5A945] font-black text-[10px] uppercase tracking-[0.3em] block mb-6">
                    MONTHLY_EARNINGS_CHART
                  </span>
                  <BarChart monthlyData={monthlyData} />
                </div>
              </div>

              {/* ── PENDING PAYMENTS ────────────────────────────────────────── */}
              <div className="mt-14">
                <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A] border-b-8 border-[#DC143C] pb-3 mb-8 shadow-[0_4px_0_#C5A945]">
                  PENDING_RELEASE
                </h2>

                <div className="flex flex-col gap-6">
                  {pendingPayments.map((p, i) => {
                    const rotate = i % 2 === 0 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]';
                    return (
                      <div
                        key={i}
                        className={`bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[6px_6px_0_#C5A945] ${rotate} p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6`}
                      >
                        {/* Left */}
                        <div className="flex-1">
                          <h3 className="font-black font-sans uppercase text-xl text-[#1A1A1A] tracking-tight">{p.projectTitle}</h3>
                          <p className="font-mono text-[10px] font-bold uppercase opacity-60 mt-1">{p.milestoneTitle}</p>
                        </div>

                        {/* Center */}
                        <div className="flex flex-col items-start md:items-center gap-2">
                          <span className="font-black font-sans text-2xl text-[#DC143C] tracking-tighter">{p.amount}</span>
                          <span className="bg-[#C5A945] text-[#1A1A1A] border-2 border-[#1A1A1A] font-black text-[9px] uppercase px-2 py-0.5 tracking-widest">
                            AWAITING APPROVAL
                          </span>
                        </div>

                        {/* Right */}
                        <div className="flex flex-col items-start md:items-end gap-3">
                          <span className="font-mono text-[10px] font-bold uppercase opacity-60">
                            WAITING {p.daysSinceSubmission} DAY{p.daysSinceSubmission !== 1 ? 'S' : ''}
                          </span>
                          <button className="border-2 border-[#DC143C] text-[#DC143C] font-black uppercase text-[10px] tracking-widest px-4 py-2 hover:bg-[#DC143C] hover:text-white transition-colors">
                            REMIND CLIENT
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {pendingPayments.length === 0 && (
                    <div className="bg-[#F0EAD6] border-4 border-dashed border-[#1A1A1A]/30 shadow-[6px_6px_0_#C5A945] p-12 text-center">
                      <span className="text-4xl mb-4 block">🎉</span>
                      <p className="font-mono text-xs font-black uppercase text-[#1A1A1A]/60 tracking-widest">
                        NO_PENDING_RELEASES
                      </p>
                      <p className="font-mono text-[9px] font-bold text-[#1A1A1A]/40 uppercase mt-1">
                        ALL SUBMITTED MILESTONES HAVE BEEN APPROVED AND DISBURSED.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── PAYMENT HISTORY TABLE ────────────────────────────────────── */}
              <div className="mt-14">

                {/* Table header row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A]">
                    PAYMENT_HISTORY
                  </h2>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Filter tabs */}
                    <div className="flex gap-2">
                      {FILTER_TABS.map((tab) => {
                        const isActive = activeFilter === tab;
                        const displayText = tab === 'THIS_MONTH' ? 'THIS MONTH' : tab === 'LAST_MONTH' ? 'LAST MONTH' : 'ALL';
                        return (
                          <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`
                              font-black text-[10px] uppercase tracking-widest px-4 py-2 border-2 border-[#1A1A1A] transition-all
                              ${isActive
                                ? 'bg-[#1A1A1A] text-[#F0EAD6] shadow-[2px_2px_0_#DC143C]'
                                : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6]'
                              }
                            `}
                          >
                            {displayText}
                          </button>
                        );
                      })}
                    </div>

                    {/* Export CSV */}
                    <button
                      onClick={handleExportCSV}
                      className="border-4 border-[#1A1A1A] bg-[#F0EAD6] shadow-[4px_4px_0_#C5A945] font-black uppercase text-[10px] tracking-widest px-4 py-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                      EXPORT_CSV ↓
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr className="bg-[#1A1A1A] text-[#F0EAD6]">
                        {['DATE', 'PROJECT', 'MILESTONE', 'AMOUNT', 'GAS', 'TX_HASH'].map((col) => (
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
                      {filteredRows.map((row, i) => {
                        const project = projectMap.get(row.project_id);
                        const milestone = project?.milestones?.find((m: any) => m.id === row.milestone_id);
                        return (
                          <tr
                            key={row.id || i}
                            className="border-b border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/5 transition-colors"
                          >
                            <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/70">
                              {formatDate(Math.floor(new Date(row.created_at).getTime() / 1000))}
                            </td>
                            <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]">
                              {project?.title || "N/A"}
                            </td>
                            <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/70">
                              {milestone?.title || "N/A"}
                            </td>
                            <td className="font-mono text-[10px] font-black uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]">
                              {Number(row.amount_eth || 0).toFixed(4)} ETH
                            </td>
                            <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/50">
                              {row.gas_used ? Number(row.gas_used).toFixed(4) + " ETH" : "0.0000 ETH"}
                            </td>
                            <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap">
                              <a
                                href={etherscanUrl(row.tx_hash, "tx")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#DC143C] hover:underline"
                              >
                                {shortenHash(row.tx_hash)}
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredRows.length === 0 && (
                    <div className="py-16 text-center font-mono p-8 bg-transparent">
                      <span className="text-4xl mb-3 block">📭</span>
                      <p className="text-xs font-black uppercase text-[#1A1A1A]/60 tracking-widest">
                        NO_TRANSACTIONS_YET
                      </p>
                      <p className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase mt-1">
                        NO RELEASE TRANSACTIONS RECORDED ON-CHAIN FOR THIS FILTER.
                      </p>
                    </div>
                  )}
                </div>

                {/* Table footer count */}
                <div className="mt-4 font-mono text-[10px] font-bold uppercase text-[#1A1A1A]/40 tracking-widest">
                  SHOWING {filteredRows.length} OF {transactions.length} TRANSACTIONS
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </RequireWallet>
  );
}
