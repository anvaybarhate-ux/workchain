"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RequireWallet from '@/components/RequireWallet';
import { Sidebar } from '@/components/layout';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';

// ─── Data ─────────────────────────────────────────────────────────────────────

import { getReputation, getProjects, getUser } from "@/lib/api";
import { formatEth, formatAddress, formatDate } from "@/lib/format";

const SCORE_UP = [
  { pts: '+5', label: 'MILESTONE RELEASED PROMPTLY'    },
  { pts: '+10', label: 'FREELANCER 5-STAR RATING RECEIVED'  },
  { pts: '+4', label: 'DISPUTE SETTLED AMICABLY'  },
  { pts: '+3', label: 'CONTRACT FUNDED > 5 ETH'          },
];

const SCORE_DOWN = [
  { pts: '-15', label: 'ESCROW AGREEMENT ABANDONED' },
  { pts: '-10', label: 'UNJUSTIFIED MILESTONE REJECTION' },
  { pts: '-5',  label: 'FREELANCER 1-STAR RATING'    },
  { pts: '-4',  label: 'RESPONSE DELAY > 48 HOURS'  },
];

function StatBar({ label, score, delay }: { label: string; score: number; delay: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay);
    return () => clearTimeout(t);
  }, [score, delay]);

  return (
    <div className="flex items-center gap-4">
      <span className="font-black text-xs uppercase tracking-widest text-[#1A1A1A] w-36 shrink-0">{label}</span>
      <div className="flex-1 h-6 border-4 border-[#1A1A1A] bg-white relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[#C5A945]"
          style={{ width: `${width}%`, transition: 'width 1s ease-out' }}
        />
      </div>
      <span className="font-mono text-xs font-black text-[#1A1A1A] w-8 text-right shrink-0">{score}</span>
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-[#DC143C] font-black text-sm">
      {'★'.repeat(count)}
      <span className="opacity-20">{'★'.repeat(5 - count)}</span>
    </span>
  );
}

export default function ClientReputationPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();

  const [reputation, setReputation] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    const storedRole = localStorage.getItem('workchain_role') as 'freelancer' | 'client';
    if (storedRole === 'freelancer') {
      router.push('/freelancer/reputation');
    }
  }, [router]);

  const loadData = async () => {
    if (!address) return;
    try {
      setIsError(false);
      // Get backend client statistics
      const rep = await getReputation(address);
      setReputation(rep);

      const profile = await getUser(address);
      setUserProfile(profile);

      const projects = await getProjects(address, "complete");
      setCompletedProjects(projects);
    } catch (err) {
      console.error("Error loading client reputation:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      loadData();
    }
  }, [address, isConnected, refreshTrigger]);

  const activeScore = reputation?.score ?? 98;
  const activeTier = reputation?.tier ?? "GOLD";

  const totalFundedEth = completedProjects.reduce((sum, p) => sum + parseFloat(p.total_value_eth || 0), 0);

  const clientStats = [
    { label: 'ESCROW_RELEASE', score: Math.min(100, Math.max(80, activeScore)) },
    { label: 'COMMUNICATION',  score: Math.min(100, Math.max(75, activeScore - 2)) },
    { label: 'SPEC_CLARITY',   score: Math.min(100, Math.max(70, activeScore - 5)) },
    { label: 'PROMPT_DEPOSIT', score: Math.min(100, Math.max(80, activeScore - 1)) },
    { label: 'TRUST_RATING',   score: Math.min(100, Math.max(90, activeScore + 1)) },
  ];

  return (
    <RequireWallet>
      <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
        <Sidebar activePath="/client/reputation" />

        <main className="flex-1 overflow-y-auto px-8 py-12 relative overflow-x-hidden">

          {/* ── PAGE HEADER ───────────────────────────────────────────── */}
          <div className="mb-10 border-b-8 border-[#1A1A1A] pb-6">
            <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.3em] block mb-3 animate-flicker">
              SPONSOR_IDENTITY
            </span>
            <h1 className="text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none font-sans text-distressed">
              YOUR REPUTATION.
            </h1>
          </div>

          {/* ── ERROR BANNER ─────────────────────────────────── */}
          {isError && (
            <div className="bg-white border-4 border-[#DC143C] p-6 mb-12 shadow-[8px_8px_0_#DC143C] rotate-[-1deg] flex flex-col sm:flex-row justify-between items-center gap-4 animate-jitter-slow">
              <div className="flex items-center gap-4">
                <span className="text-4xl">⚠</span>
                <div>
                  <h4 className="text-2xl font-black text-[#DC143C] font-sans">REPUTATION SYSTEM OFFLINE</h4>
                  <p className="font-mono text-xs font-bold uppercase mt-1">Failed to query backend profile records.</p>
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

          {isLoading ? (
            <div className="h-[500px] bg-[#1A1A1A] animate-pulse border-4 border-[#1A1A1A]/50 p-12 mb-16">
              <div className="h-6 bg-[#F0EAD6]/20 w-1/4 mb-4"></div>
              <div className="h-10 bg-[#F0EAD6]/20 w-1/2"></div>
            </div>
          ) : (
            <>
              {/* ── NFT HERO CARD ─────────────────────────────────────────── */}
              <div className="max-w-2xl mx-auto mt-8">
                <div className="bg-[#1A1A1A] border-4 border-[#C5A945] shadow-[16px_16px_0_#DC143C] rotate-[1.5deg] p-10 relative">
                  <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />

                  {/* Top row */}
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <span className="font-mono text-[#C5A945] font-black text-[10px] uppercase tracking-[0.25em]">
                      ON-CHAIN_ESCROW_ASSET
                    </span>
                    <span className="flex items-center gap-1.5 bg-[#10B981] text-white border-2 border-white font-black text-[10px] uppercase px-3 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-flicker inline-block" />
                      VERIFIED_SPONSOR
                    </span>
                  </div>

                  {/* Shield avatar */}
                  <div className="flex justify-center mb-6 relative z-10">
                    <div
                      className="w-28 h-28 bg-[#C5A945] flex items-center justify-center"
                      style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                    >
                      {/* Shield SVG — brutalist flat */}
                      <svg viewBox="0 0 64 48" width="54" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="12,4 52,4 52,24 32,44 12,24" fill="#1A1A1A" />
                        <rect x="29" y="8" width="6" height="24" fill="#C5A945" />
                        <rect x="20" y="17" width="24" height="6" fill="#C5A945" />
                      </svg>
                    </div>
                  </div>

                  {/* Tier + Score */}
                  <div className="text-center relative z-10 mb-6">
                    <div className="text-5xl font-black uppercase text-[#C5A945] tracking-tighter font-sans text-distressed mb-2">
                      {activeTier.toUpperCase()}_SPONSOR
                    </div>
                    <div className="text-3xl font-black text-[#DC143C] font-sans tracking-tighter mb-2">
                      SCORE: {activeScore}/100
                    </div>
                    <div className="font-mono text-[#F0EAD6]/60 text-xs font-bold uppercase tracking-widest">
                      SPONSOR_ID: #{address?.slice(-4).toUpperCase()}
                    </div>
                  </div>

                  {/* Stats 2×2 grid */}
                  <div className="grid grid-cols-2 gap-3 mb-8 relative z-10">
                    {[
                      { label: 'TOTAL_FUNDED',    value: `${totalFundedEth.toFixed(2)} ETH` },
                      { label: 'DISPUTE_RATE',    value: `${reputation?.dispute_rate ?? "0.0"}%` },
                      { label: 'ACTIVE_ESCROW',   value: `${completedProjects.filter(p => p.status === 'active').reduce((sum, p) => sum + parseFloat(p.total_value_eth || 0), 0).toFixed(2)} ETH` },
                      { label: 'CONTRACTS_COUNT', value: completedProjects.length },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/10 border-2 border-[#C5A945]/30 p-4 text-center">
                        <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#F0EAD6]/50 mb-1">{s.label}</div>
                        <div className="font-black text-xl text-[#F0EAD6] font-sans tracking-tight">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-4 relative z-10">
                    <button className="flex-1 border-2 border-white text-[#F0EAD6] font-black uppercase text-xs tracking-widest py-3 hover:bg-white hover:text-[#1A1A1A] transition-colors">
                      SHARE_PROFILE ↗
                    </button>
                    <button className="flex-1 border-2 border-white text-[#F0EAD6] font-black uppercase text-xs tracking-widest py-3 hover:bg-white hover:text-[#1A1A1A] transition-colors">
                      ON-CHAIN_LEDGER ↗
                    </button>
                  </div>
                </div>
              </div>

              {/* ── TIER PROGRESSION ──────────────────────────────────────── */}
              <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] rotate-[-0.5deg] p-8 mt-14">
                <h2 className="text-2xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A] mb-6">
                  SPONSOR_TIER_PROGRESSION
                </h2>

                {/* Tier labels */}
                <div className="grid grid-cols-4 mb-3">
                  {['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((tier) => (
                    <div key={tier} className="text-center">
                      <span className={`font-black text-xs uppercase tracking-widest ${
                        tier === activeTier.toUpperCase()
                          ? 'text-[#C5A945] border-b-4 border-[#C5A945] pb-1'
                          : 'text-[#1A1A1A] opacity-40'
                      }`}>
                        {tier}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="border-4 border-[#1A1A1A] h-6 bg-white relative overflow-hidden mb-2">
                  <div className="absolute inset-y-0 left-0 bg-[#C5A945]" style={{ width: `${activeScore}%` }} />
                  {/* Tick marks */}
                  {[25, 50, 75, 100].map((pct) => (
                    <div
                      key={pct}
                      className="absolute top-0 bottom-0 w-0.5 bg-[#1A1A1A]/30"
                      style={{ left: `${pct}%` }}
                    />
                  ))}
                </div>

                {/* Below bar */}
                <div className="flex justify-between items-center mt-3">
                  <span className="font-mono text-[#1A1A1A]/40 text-[9px] font-bold uppercase">0</span>
                  <span className="font-mono text-[#DC143C] font-black text-xs uppercase tracking-widest animate-jitter-slow">
                    VALUED CLIENT // TOP ESCROW SPONSOR
                  </span>
                  <span className="font-mono text-[#1A1A1A]/40 text-[9px] font-bold uppercase">100</span>
                </div>
              </div>

              {/* ── SCORING LOGIC ─────────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-14">

                {/* Increases */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] rotate-[1deg] p-8">
                  <h3 className="font-black text-xl uppercase font-sans tracking-tighter text-[#10B981] mb-6 border-b-4 border-[#1A1A1A] pb-3">
                    INCREASES_SCORE
                  </h3>
                  <div className="flex flex-col gap-4">
                    {SCORE_UP.map((item) => (
                      <div key={item.label} className="flex items-center gap-4">
                        <span className="bg-[#10B981] text-white border-2 border-[#1A1A1A] font-black text-xs px-2 py-1 shrink-0 w-10 text-center">
                          {item.pts}
                        </span>
                        <span className="font-mono text-xs font-bold uppercase text-[#1A1A1A] tracking-wide">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decreases */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#DC143C] rotate-[-1deg] p-8">
                  <h3 className="font-black text-xl uppercase font-sans tracking-tighter text-[#DC143C] mb-6 border-b-4 border-[#1A1A1A] pb-3">
                    DECREASES_SCORE
                  </h3>
                  <div className="flex flex-col gap-4">
                    {SCORE_DOWN.map((item) => (
                      <div key={item.label} className="flex items-center gap-4">
                        <span className="bg-[#DC143C] text-white border-2 border-[#1A1A1A] font-black text-xs px-2 py-1 shrink-0 w-10 text-center">
                          {item.pts}
                        </span>
                        <span className="font-mono text-xs font-bold uppercase text-[#1A1A1A] tracking-wide">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── SPONSOR RATING DETAILS ─────────────────────────────────── */}
              <div className="mt-14">
                <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A] border-b-8 border-[#DC143C] pb-3 mb-8">
                  SPONSOR_HEALTH_INDEX
                </h2>
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] p-8 flex flex-col gap-5">
                  {clientStats.map((stat, i) => (
                    <StatBar
                      key={stat.label}
                      label={stat.label}
                      score={stat.score}
                      delay={i * 150}
                    />
                  ))}
                </div>
              </div>

              {/* ── PROJECT FUNDING TABLE ─────────────────────────────────── */}
              <div className="mt-14">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A]">
                    FUNDED_PROJECT_HISTORY
                  </h2>
                  <span className="bg-[#C5A945] text-[#1A1A1A] border-2 border-[#1A1A1A] font-black text-xs uppercase px-3 py-1 shadow-[2px_2px_0_#1A1A1A]">
                    {completedProjects.length} ESCROWS PROVISIONED
                  </span>
                </div>

                <div className="border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse">
                    <thead>
                      <tr className="bg-[#1A1A1A] text-[#F0EAD6]">
                        {['PROJECT', 'FREELANCER', 'BUDGET', 'RATING GIVEN', 'DATE', 'STATUS'].map((col) => (
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
                      {completedProjects.map((row, i) => (
                        <tr key={i} className="border-b border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/5 transition-colors">
                          <td className="font-mono text-[10px] font-black uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]">
                            {row.title}
                          </td>
                          <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/60">
                            {row.freelancer_wallet ? formatAddress(row.freelancer_wallet) : "UNDEPLOYED"}
                          </td>
                          <td className="font-mono text-[10px] font-black uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]">
                            {parseFloat(row.total_value_eth).toFixed(2)} ETH
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Stars count={5} />
                          </td>
                          <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/60">
                            {formatDate(Math.floor(new Date(row.created_at).getTime() / 1000))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-black text-[10px] uppercase px-3 py-1 border-2 border-[#1A1A1A] bg-[#C5A945] text-[#1A1A1A]">
                              {row.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {completedProjects.length === 0 && (
                    <div className="py-16 text-center font-mono p-8 bg-transparent">
                      <span className="text-4xl mb-3 block">📭</span>
                      <p className="text-xs font-black uppercase text-[#1A1A1A]/60 tracking-widest">
                        NO PROJECTS RECORDED
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </RequireWallet>
  );
}
