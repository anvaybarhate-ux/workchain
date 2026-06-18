"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import RequireWallet from '@/components/RequireWallet';
import { Sidebar } from '@/components/layout';
import { getReputation, getProjects, getUser } from "@/lib/api";
import { getReputationContract, getReadProvider } from "@/lib/contracts";
import { formatEth, formatTier, formatDate, formatAddress } from "@/lib/format";

const SCORE_UP = [
  { pts: '+5', label: 'MILESTONE COMPLETED ON TIME'    },
  { pts: '+8', label: 'CLIENT 5-STAR RATING RECEIVED'  },
  { pts: '+3', label: 'DISPUTE WON BY COMMUNITY VOTE'  },
  { pts: '+2', label: 'REPEAT CLIENT BOOKING'          },
];

const SCORE_DOWN = [
  { pts: '-15', label: 'DISPUTE LOST'            },
  { pts: '-8',  label: 'CONTRACT CANCELLED'       },
  { pts: '-5',  label: 'CLIENT 1-STAR RATING'    },
  { pts: '-3',  label: 'LATE MILESTONE DELIVERY'  },
];

// ─── Skill Bar ────────────────────────────────────────────────────────────────

interface SkillBarProps {
  label: string;
  score: number;
  delay: number;
}

function SkillBar({ label, score, delay }: SkillBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay);
    return () => clearTimeout(t);
  }, [score, delay]);

  return (
    <div className="flex items-center gap-4">
      <span className="font-black text-xs uppercase tracking-widest text-[#1A1A1A] w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 border-4 border-[#1A1A1A] bg-white relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[#DC143C]"
          style={{ width: `${width}%`, transition: 'width 1s ease-out' }}
        />
      </div>
      <span className="font-mono text-xs font-black text-[#1A1A1A] w-8 text-right shrink-0">{score}</span>
    </div>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <span className="text-[#DC143C] font-black text-sm">
      {'★'.repeat(count)}
      <span className="opacity-20">{'★'.repeat(5 - count)}</span>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReputationPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();

  // State Variables
  const [reputation, setReputation] = useState<any>(null);
  const [onChainRep, setOnChainRep] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Client redirection checks
  useEffect(() => {
    const storedRole = localStorage.getItem('workchain_role') as 'freelancer' | 'client';
    if (storedRole === 'client') {
      router.push('/client/reputation');
    }
  }, [router]);

  // Main reputation data loader
  const loadReputationData = async () => {
    if (!address) return;
    try {
      setIsError(false);

      // 1. Fetch backend Reputation details
      const rep = await getReputation(address);
      setReputation(rep);

      // 2. Fetch on-chain Reputation NFT details if minted
      if (rep?.nft_token_id) {
        try {
          const provider = getReadProvider();
          const contract = getReputationContract(provider);
          if (contract) {
            const oChainRep = await contract.getReputation(address);
            setOnChainRep(oChainRep);
          }
        } catch (chainErr) {
          console.warn("Failed to retrieve on-chain NFT reputation struct:", chainErr);
        }
      }

      // 3. Fetch user profile for skills
      const profile = await getUser(address);
      setUserProfile(profile);

      // 4. Fetch completed projects list
      const projects = await getProjects(address, "complete");
      setCompletedProjects(projects);

    } catch (err) {
      console.error("Error loading freelancer reputation:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll details every 60 seconds
  useEffect(() => {
    if (isConnected && address) {
      loadReputationData();

      const interval = setInterval(() => {
        loadReputationData();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [address, isConnected, refreshTrigger]);

  // Safe struct extractions
  const getOnChainScore = () => {
    if (!onChainRep) return null;
    if (onChainRep.score !== undefined) return Number(onChainRep.score);
    if (onChainRep[1] !== undefined) return Number(onChainRep[1]);
    return null;
  };

  const getOnChainTier = () => {
    if (!onChainRep) return null;
    if (onChainRep.tier !== undefined) return String(onChainRep.tier);
    if (onChainRep[2] !== undefined) return String(onChainRep[2]);
    return null;
  };

  // Computed values
  const activeScore = getOnChainScore() ?? reputation?.score ?? 0;
  const activeTier = getOnChainTier() ?? reputation?.tier ?? formatTier(activeScore);
  const activeTokenId = reputation?.nft_token_id ? `#${reputation.nft_token_id}` : "NOT MINTED";

  // Tier color mapper for hexagon icon base background
  const getTierColor = (tier: string) => {
    switch (tier.toUpperCase()) {
      case "BRONZE":
        return "bg-[#CD7F32]";
      case "SILVER":
        return "bg-[#C0C0C0]";
      case "GOLD":
        return "bg-[#C5A945]";
      case "PLATINUM":
        return "bg-[#E5E4E2]";
      default:
        return "bg-[#CD7F32]";
    }
  };

  // Progression fill width percentages
  const getProgressionPercentage = (score: number) => {
    if (score <= 40) return 25;
    if (score <= 65) return 50;
    if (score <= 88) return 75;
    return 100;
  };

  // Remaining progression values
  const getPointsToNextTier = (score: number) => {
    if (score <= 40) {
      return `${41 - score} MORE POINTS TO SILVER`;
    } else if (score <= 65) {
      return `${66 - score} MORE POINTS TO GOLD`;
    } else if (score <= 88) {
      return `${89 - score} MORE POINTS TO PLATINUM`;
    } else {
      return "MAX TIER ACHIEVED";
    }
  };

  return (
    <RequireWallet>
      <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
        <Sidebar activePath="/freelancer/reputation" />

        <main className="flex-1 overflow-y-auto px-8 py-12 relative overflow-x-hidden">

          {/* ── PAGE HEADER ───────────────────────────────────────────── */}
          <div className="mb-10 border-b-8 border-[#1A1A1A] pb-6">
            <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.3em] block mb-3 animate-flicker">
              ON_CHAIN_IDENTITY
            </span>
            <h1 className="text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none font-sans text-distressed">
              YOUR REPUTATION.
            </h1>
          </div>

          {/* ── ERROR RECOVERY BANNER ─────────────────────────────────── */}
          {isError && (
            <div className="bg-white border-4 border-[#DC143C] p-6 mb-12 shadow-[8px_8px_0_#DC143C] rotate-[-1deg] flex flex-col sm:flex-row justify-between items-center gap-4 animate-jitter-slow">
              <div className="flex items-center gap-4">
                <span className="text-4xl">⚠</span>
                <div>
                  <h4 className="text-2xl font-black text-[#DC143C] font-sans">REPUTATION SYSTEM OFFLINE</h4>
                  <p className="font-mono text-xs font-bold uppercase mt-1">Failed to query backend profile records. The SQLite servers might be offline.</p>
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
                <div className="bg-[#1A1A1A] text-[#F0EAD6] border-4 border-[#C5A945] shadow-[16px_16px_0_#DC143C] rotate-[-1.5deg] p-10 relative">
                  <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />

                  {/* Top row */}
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <span className="font-mono text-[#C5A945] font-black text-[10px] uppercase tracking-[0.25em]">
                      ON-CHAIN_IDENTITY_ASSET
                    </span>
                    <span className="flex items-center gap-1.5 bg-[#10B981] text-white border-2 border-white font-black text-[10px] uppercase px-3 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-flicker inline-block" />
                      {reputation?.nft_token_id ? "VERIFIED NFT MINT" : "VIRTUAL SYSTEM PROFILE"}
                    </span>
                  </div>

                  {/* Hexagon avatar */}
                  {reputation?.nft_token_id ? (
                    <div className="flex justify-center mb-6 relative z-10">
                      <div
                        className={`w-28 h-28 flex items-center justify-center ${getTierColor(activeTier)}`}
                        style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}
                      >
                        {/* Crown SVG — brutalist flat */}
                        <svg viewBox="0 0 64 48" width="54" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <polygon points="4,44 4,24 16,36 32,8 48,36 60,24 60,44" fill="#1A1A1A" />
                          <rect x="4" y="40" width="56" height="6" fill="#1A1A1A" />
                          <rect x="29" y="4" width="6" height="6" fill="#DC143C" />
                          <rect x="12" y="32" width="5" height="5" fill="#DC143C" />
                          <rect x="47" y="32" width="5" height="5" fill="#DC143C" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center mb-6 relative z-10">
                      <div className="border-4 border-dashed border-[#C5A945]/40 bg-white/5 p-6 text-center w-full max-w-sm">
                        <p className="font-mono text-xs font-black uppercase text-[#C5A945] mb-2 tracking-widest animate-flicker">NFT NOT MINTED YET</p>
                        <p className="font-mono text-[10px] font-bold uppercase text-[#F0EAD6]/60">
                          COMPLETE YOUR FIRST MILESTONE TO MINT YOUR REPUTATION NFT
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tier + Score */}
                  <div className="text-center relative z-10 mb-6">
                    <div className="text-5xl font-black uppercase text-[#C5A945] tracking-tighter font-sans text-distressed mb-2">
                      {activeTier.toUpperCase()}_TIER
                    </div>
                    <div className="text-3xl font-black text-[#DC143C] font-sans tracking-tighter mb-2">
                      SCORE: {activeScore}/100
                    </div>
                    <div className="font-mono text-[#F0EAD6]/60 text-xs font-bold uppercase tracking-widest">
                      TOKEN_ID: {activeTokenId}
                    </div>
                  </div>

                  {/* Stats 2×2 grid */}
                  <div className="grid grid-cols-2 gap-3 mb-8 relative z-10">
                    {[
                      { label: 'TOTAL_JOBS',    value: reputation?.total_jobs ?? 0 },
                      { label: 'DISPUTE_RATE',  value: `${reputation?.dispute_rate ?? "0.0"}%` },
                      { label: 'TOTAL_VALUE',   value: formatEth(reputation?.total_value_eth ?? 0) },
                      { label: 'MEMBER_SINCE',  value: userProfile?.created_at ? formatDate(Math.floor(new Date(userProfile.created_at).getTime() / 1000)).toUpperCase() : "LOADING" },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/10 border-2 border-[#C5A945]/30 p-4 text-center">
                        <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#F0EAD6]/50 mb-1">{s.label}</div>
                        <div className="font-black text-xl text-[#F0EAD6] font-sans tracking-tight">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-4 relative z-10">
                    <button 
                      onClick={() => router.push(`/profile/${address}`)}
                      className="flex-1 border-2 border-white text-[#F0EAD6] font-black uppercase text-xs tracking-widest py-3 hover:bg-white hover:text-[#1A1A1A] transition-colors cursor-pointer"
                    >
                      VIEW_PROFILE_EDIT ↗
                    </button>
                    {reputation?.nft_token_id && (
                      <a 
                        href={`https://opensea.io/assets/sepolia/${process.env.NEXT_PUBLIC_REPUTATION_ADDRESS}/${reputation.nft_token_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 border-2 border-white text-center text-[#F0EAD6] font-black uppercase text-xs tracking-widest py-3 hover:bg-white hover:text-[#1A1A1A] transition-colors"
                      >
                        VIEW_ON_OPENSEA ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* ── TIER PROGRESSION ──────────────────────────────────────── */}
              <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] rotate-[0.5deg] p-8 mt-14">
                <h2 className="text-2xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A] mb-6">
                  TIER_PROGRESSION
                </h2>

                {/* Tier labels */}
                <div className="grid grid-cols-4 mb-3">
                  {['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((tier) => (
                    <div key={tier} className="text-center">
                      <span className={`font-black text-xs uppercase tracking-widest ${
                        tier === activeTier.toUpperCase()
                          ? 'text-[#DC143C] border-b-4 border-[#DC143C] pb-1'
                          : 'text-[#1A1A1A] opacity-40'
                      }`}>
                        {tier}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="border-4 border-[#1A1A1A] h-6 bg-white relative overflow-hidden mb-2">
                  <div className="absolute inset-y-0 left-0 bg-[#DC143C]" style={{ width: `${getProgressionPercentage(activeScore)}%` }} />
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
                  <span className="font-mono text-[#C5A945] font-black text-xs uppercase tracking-widest animate-jitter-slow">
                    {getPointsToNextTier(activeScore)}
                  </span>
                  <span className="font-mono text-[#1A1A1A]/40 text-[9px] font-bold uppercase">100</span>
                </div>
              </div>

              {/* ── SCORING LOGIC ─────────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-14">

                {/* Increases */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] rotate-[-1deg] p-8">
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
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#DC143C] rotate-[1deg] p-8">
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

              {/* ── SKILL RATINGS ─────────────────────────────────────────── */}
              <div className="mt-14">
                <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A] border-b-8 border-[#DC143C] pb-3 mb-8">
                  SKILL_RATINGS
                </h2>
                {userProfile?.skills && userProfile.skills.length > 0 ? (
                  <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] p-8 flex flex-col gap-5">
                    {userProfile.skills.map((skill: string, i: number) => {
                      const skillScore = Math.max(50, Math.min(100, activeScore - i * 4));
                      return (
                        <SkillBar
                          key={skill}
                          label={skill.toUpperCase()}
                          score={skillScore}
                          delay={i * 150}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-4 border-dashed border-[#1A1A1A] p-12 text-center bg-white/5">
                    <p className="font-mono text-sm font-black uppercase text-[#1A1A1A] opacity-60 mb-6">NO SKILLS ADDED YET</p>
                    <button 
                      onClick={() => router.push(`/profile/${address}`)}
                      className="bg-[#DC143C] text-white px-6 py-3 font-black text-xs uppercase border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer"
                    >
                      EDIT PROFILE
                    </button>
                  </div>
                )}
              </div>

              {/* ── PROJECT HISTORY TABLE ─────────────────────────────────── */}
              <div className="mt-14">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-[#1A1A1A]">
                    PROJECT_HISTORY
                  </h2>
                  <span className="bg-[#C5A945] text-[#1A1A1A] border-2 border-[#1A1A1A] font-black text-xs uppercase px-3 py-1 shadow-[2px_2px_0_#1A1A1A]">
                    {completedProjects.length} COMPLETED
                  </span>
                </div>

                {completedProjects.length > 0 ? (
                  <div className="border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] overflow-x-auto">
                    <table className="w-full min-w-[680px] border-collapse">
                      <thead>
                        <tr className="bg-[#1A1A1A] text-[#F0EAD6]">
                          {['PROJECT', 'CLIENT', 'VALUE', 'RATING', 'DATE', 'STATUS'].map((col) => (
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
                        {completedProjects.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/5 transition-colors">
                            <td className="font-mono text-[10px] font-black uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]">
                              {row.title}
                            </td>
                            <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/60">
                              {row.client_wallet ? formatAddress(row.client_wallet) : "UNDEPLOYED"}
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
                  </div>
                ) : (
                  <div className="border-4 border-dashed border-[#1A1A1A] p-12 text-center bg-white/5">
                    <p className="font-mono text-sm font-black uppercase text-[#1A1A1A] opacity-60">
                      NO COMPLETED PROJECTS DETECTED IN HISTORY
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

        </main>
      </div>
    </RequireWallet>
  );
}
