"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useWallet } from "@/context/WalletContext";
import { getDisputes, getUser } from "@/lib/api";
import { formatAddress, formatCountdown, formatEth, etherscanUrl } from "@/lib/format";
import { Sidebar } from "@/components/layout";
import RequireWallet from "@/components/RequireWallet";

// ─── Sub-components ────────────────────────────────────────────────────────────

function CountdownTimer({ deadlineTimestamp }: { deadlineTimestamp: number }) {
  const [timeString, setTimeString] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = deadlineTimestamp - now;
      if (diff <= 0) {
        setTimeString("EXPIRED");
        setIsUrgent(false);
      } else {
        setTimeString(formatCountdown(deadlineTimestamp));
        setIsUrgent(diff < 3600); // urgent if under 1 hour
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [deadlineTimestamp]);

  return (
    <div>
      <span className="font-mono text-[9px] font-bold text-[#C5A945] uppercase tracking-widest block mb-0.5">
        VOTING CLOSES IN:
      </span>
      <span className={`font-mono text-xl font-black uppercase tracking-tight block ${isUrgent ? 'text-[#DC143C] animate-jitter' : 'text-[#1A1A1A]'}`}>
        {timeString}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterTab = 'ALL' | 'OPEN' | 'VOTING' | 'RESOLVED';
const FILTER_TABS: FilterTab[] = ['ALL', 'OPEN', 'VOTING', 'RESOLVED'];

export default function DisputesPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();

  const [disputes, setDisputes] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const loadData = async () => {
    if (!address) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const user = await getUser(address);
      if (user?.id) {
        setUserId(user.id);
      }

      const data = await getDisputes(address);
      setDisputes(data || []);
    } catch (err) {
      console.error("Error loading disputes:", err);
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

  // Periodic poll data every 15 seconds
  useEffect(() => {
    if (!address) return;

    const pollData = async () => {
      try {
        const data = await getDisputes(address);
        setDisputes(data || []);
      } catch (err) {
        console.warn("Silent background disputes poll failed:", err);
      }
    };

    const interval = setInterval(pollData, 15000);
    return () => clearInterval(interval);
  }, [address]);

  // ─── Calculations ───────────────────────────────────────────────────────────

  const openCount = disputes.filter(d => d.status === "open").length;
  const resolvedCount = disputes.filter(d => d.status === "resolved").length;

  // ETH at stake: sum of all open or voting dispute milestone amounts
  const openOrVotingDisputes = disputes.filter(d => d.status === "open" || d.status === "voting");
  const ethAtStake = openOrVotingDisputes
    .reduce((sum, d) => sum + Number(d.milestone?.amount_eth || 0), 0)
    .toFixed(4) + " ETH";

  const filteredDisputes = disputes.filter(d => {
    if (activeFilter === 'OPEN') return d.status === 'open';
    if (activeFilter === 'VOTING') return d.status === 'voting';
    if (activeFilter === 'RESOLVED') return d.status === 'resolved';
    return true;
  });

  return (
    <RequireWallet>
      <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
        <Sidebar activePath="/disputes" />

        {/* Noise overlay */}
        <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.04]">
          <svg className="w-full h-full">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0 0 0 9 -4  0 0 0 9 -4  0 0 0 9 -4  0 0 0 0 1" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>

        {/* ── MAIN ─────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-8 py-12 relative overflow-x-hidden">

          {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
          <div className="mb-12 border-b-8 border-[#1A1A1A] pb-6">
            <span className="text-[#DC143C] font-black text-xs uppercase tracking-[0.3em] block mb-3 animate-flicker font-mono">
              DISPUTE_MODULE
            </span>
            <h1 className="text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none font-sans text-distressed">
              ARBITRATION.
            </h1>
          </div>

          {/* ── ERROR RECOVERY BANNER ─────────────────────────────────── */}
          {isError && (
            <div className="bg-[#DC143C] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] rotate-[-0.5deg] p-8 mb-12 flex flex-col sm:flex-row justify-between items-center gap-4 animate-jitter-slow">
              <div className="text-left text-[#F0EAD6]">
                <h3 className="font-black text-2xl uppercase tracking-tighter">API_ERROR</h3>
                <p className="font-mono text-sm font-bold uppercase mt-1 opacity-70">
                  Could not load disputes. Is the backend running?
                </p>
              </div>
              <button 
                onClick={loadData}
                className="bg-[#F0EAD6] text-[#1A1A1A] px-6 py-3 font-black text-xs uppercase border-4 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6] transition-colors shrink-0 cursor-pointer"
              >
                RETRY
              </button>
            </div>
          )}

          {!isError && (
            <>
              {/* ── SUMMARY ROW ───────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
                {/* OPEN */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#DC143C] rotate-[-1deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">OPEN</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#1A1A1A]">{openCount}</div>
                  <div className="font-mono text-[9px] font-bold text-[#1A1A1A] opacity-60 uppercase">ACTIVE PROTOCOL DISPUTES</div>
                </div>

                {/* RESOLVED */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#C5A945] rotate-[1deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">RESOLVED</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#C5A945]">{resolvedCount}</div>
                  <div className="font-mono text-[9px] font-bold text-[#1A1A1A] opacity-60 uppercase">COMPLETED ARBITRATIONS</div>
                </div>

                {/* ETH AT STAKE */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#1A1A1A] rotate-[-0.5deg] relative flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60">ETH AT STAKE</span>
                  <div className="text-5xl font-black font-sans tracking-tighter text-[#1A1A1A]">{ethAtStake}</div>
                  <div className="font-mono text-[9px] font-bold text-[#1A1A1A] opacity-60 uppercase">TOTAL ESCROW VALUE LOCKED</div>
                </div>
              </div>

              {/* ── FILTER TABS ───────────────────────────────────────────── */}
              <div className="flex flex-wrap gap-3 mb-10">
                {FILTER_TABS.map((tab) => {
                  const isActive = activeFilter === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`
                        font-black text-[10px] uppercase tracking-widest px-6 py-3 border-2 border-[#1A1A1A] transition-all cursor-pointer
                        ${isActive
                          ? 'bg-[#DC143C] text-white shadow-[3px_3px_0_#1A1A1A]'
                          : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6]'
                        }
                      `}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* ── DISPUTES LIST ─────────────────────────────────────────── */}
              <div className="flex flex-col gap-6">
                {isLoading ? (
                  <div className="flex flex-col gap-6">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-48 bg-[#1A1A1A] animate-pulse border-4 border-[#1A1A1A]/50 relative" />
                    ))}
                  </div>
                ) : filteredDisputes.length === 0 ? (
                  <div className="bg-[#1A1A1A] border-4 border-[#C5A945] shadow-[8px_8px_0_#C5A945] rotate-[-1deg] p-12 text-center">
                    <span className="text-6xl mb-4 block">⚖</span>
                    <h3 className="text-4xl font-black text-[#F0EAD6] font-sans uppercase mb-2">
                      NO ACTIVE DISPUTES
                    </h3>
                    <p className="font-mono text-xs font-bold text-[#C5A945] uppercase mt-1">
                      All contracts running smoothly.
                    </p>
                  </div>
                ) : (
                  filteredDisputes.map((d, index) => {
                    const isResolved = d.status === "resolved";
                    const rotation = index % 2 === 0 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]';
                    const topStripColor = isResolved ? "bg-[#C5A945]" : "bg-[#DC143C]";
                    const raisedByMe = d.raised_by === userId;

                    const votesFreelancer = d.votes_freelancer || 0;
                    const votesClient = d.votes_client || 0;
                    const totalVotes = votesFreelancer + votesClient;

                    const freelancerPct = totalVotes > 0 ? (votesFreelancer / totalVotes) * 50 : 0;
                    const clientPct = totalVotes > 0 ? (votesClient / totalVotes) * 50 : 0;

                    const deadlineTimestamp = Math.floor(new Date(d.voting_deadline).getTime() / 1000);

                    return (
                      <article
                        key={d.id}
                        className={`
                          relative flex flex-col bg-[#F0EAD6] border-4 border-[#1A1A1A]
                          shadow-[8px_8px_0_#DC143C] ${rotation}
                          hover:-translate-y-1 hover:shadow-[10px_10px_0_#DC143C]
                          transition-all duration-200 overflow-visible
                          ${isResolved ? 'opacity-70' : ''}
                        `}
                      >
                        {/* Top strip banner */}
                        <div className={`${topStripColor} h-3 w-full shrink-0`} />

                        {/* Card body */}
                        <div className="p-8 flex flex-col flex-1">

                          {/* Top Row: ID & Status Badge */}
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-mono text-xs font-black text-[#DC143C]">
                              DISPUTE #D-{d.id.slice(0, 4).toUpperCase()}
                            </span>
                            <span className={`border-2 border-[#1A1A1A] font-black uppercase font-mono text-[10px] px-3 py-1 ${
                              d.status === "open" ? 'bg-[#DC143C] text-white' :
                              d.status === "voting" ? 'bg-[#C5A945] text-[#1A1A1A]' :
                              'bg-[#1A1A1A] text-[#F0EAD6]'
                            }`}>
                              {d.status === "open" ? '● OPEN' : d.status === "voting" ? '● VOTING' : '✓ RESOLVED'}
                            </span>
                          </div>

                          {/* Project title */}
                          <h3 className="text-3xl font-black uppercase font-sans text-[#1A1A1A] mb-1">
                            {d.project?.title || "Unknown Project"}
                          </h3>

                          {/* Parties */}
                          <p className="font-mono text-xs font-bold text-[#1A1A1A] opacity-60 mb-6">
                            {formatAddress(d.project?.freelancer_wallet || '')} VS {formatAddress(d.project?.client_wallet || '')}
                          </p>

                          {/* 2 Column Stats Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end mb-6">
                            
                            {/* Stake */}
                            <div>
                              <div className="text-4xl font-black text-[#DC143C] leading-none">
                                {d.milestone?.amount_eth || "0.0"} ETH
                              </div>
                              <span className="font-mono text-[9px] font-bold text-[#1A1A1A] opacity-60 uppercase tracking-widest block mt-1">
                                AT STAKE
                              </span>

                              {/* Winner badge for resolved */}
                              {isResolved && d.winner && (
                                <div className="mt-3">
                                  <span className={`font-black text-sm uppercase tracking-widest px-3 py-1 border-2 border-[#1A1A1A] inline-block ${
                                    d.winner === 'freelancer' ? 'bg-[#10B981] text-white' : 'bg-[#C5A945] text-[#1A1A1A]'
                                  }`}>
                                    {d.winner === 'freelancer' ? 'FREELANCER WON ✓' : 'CLIENT WON ✓'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Countdown */}
                            {!isResolved && (
                              <div className="md:text-right">
                                <CountdownTimer deadlineTimestamp={deadlineTimestamp} />
                              </div>
                            )}
                          </div>

                          {/* Tally Vote Bar */}
                          <div className="flex flex-col gap-2 my-4 border-t-2 border-[#1A1A1A]/10 pt-4">
                            {totalVotes > 0 ? (
                              <div className="flex items-center h-6 border-4 border-[#1A1A1A] bg-white relative w-full overflow-hidden">
                                {/* Freelancer Votes (Align right inside the left 50% half) */}
                                <div className="flex-1 flex justify-end">
                                  <div 
                                    className="bg-[#DC143C] h-full"
                                    style={{ width: `${freelancerPct}%`, minWidth: '4px' }}
                                  />
                                </div>
                                
                                {/* Center divider */}
                                <div className="w-0.5 h-full bg-[#1A1A1A] shrink-0" />
                                
                                {/* Client Votes (Align left inside the right 50% half) */}
                                <div className="flex-1 flex justify-start">
                                  <div 
                                    className="bg-[#C5A945] h-full"
                                    style={{ width: `${clientPct}%`, minWidth: '4px' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="py-3 border-4 border-dashed border-[#1A1A1A]/30 text-center font-mono text-xs opacity-40 uppercase tracking-widest">
                                NO VOTES CAST YET
                              </div>
                            )}

                            <div className="flex justify-between font-mono text-xs font-bold uppercase text-[#1A1A1A]/80">
                              <span>FREELANCER [{votesFreelancer}]</span>
                              <span>[{votesClient}] CLIENT</span>
                            </div>
                          </div>

                          {/* Bottom Row */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 border-t-2 border-[#1A1A1A]/10 pt-6">
                            
                            {/* Raised by */}
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] font-bold text-[#1A1A1A] opacity-60 uppercase">
                                RAISED BY:
                              </span>
                              {raisedByMe ? (
                                <span className="bg-[#DC143C] text-white border-2 border-[#1A1A1A] font-black font-mono text-[9px] px-2 py-0.5 tracking-widest animate-flicker">
                                  YOU
                                </span>
                              ) : (
                                <span className="font-mono text-[10px] font-black text-[#1A1A1A]">
                                  {d.project?.freelancer_id === d.raised_by ? 'FREELANCER' : 'CLIENT'}
                                </span>
                              )}
                            </div>

                            {/* Action Button */}
                            <button
                              onClick={() => router.push(`/disputes/${d.id}`)}
                              className={`
                                font-black uppercase text-xs px-6 py-3 border-4 border-[#1A1A1A] cursor-pointer shadow-[6px_6px_0_#1A1A1A]
                                hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all
                                ${isResolved ? 'bg-[#C5A945] text-[#1A1A1A]' : 'bg-[#DC143C] text-[#F0EAD6]'}
                              `}
                            >
                              {isResolved ? 'VIEW RESULT →' : 'ENTER DISPUTE ROOM →'}
                            </button>
                          </div>

                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </>
          )}

        </main>
      </div>
    </RequireWallet>
  );
}
