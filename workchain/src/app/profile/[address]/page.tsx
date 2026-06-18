"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useWallet } from "@/context/WalletContext";
import { getUser, getReputation, getProjects } from "@/lib/api";
import { formatAddress, formatEth, formatDate } from "@/lib/format";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'OVERVIEW' | 'PROJECTS' | 'REVIEWS';

// ─── Sub-components ────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <span className="font-black tracking-tight">
      <span className="text-[#DC143C]">{'★'.repeat(count)}</span>
      <span className="text-[#1A1A1A] opacity-20">{'★'.repeat(5 - count)}</span>
    </span>
  );
}

function SkillBar({ label, score, delay }: { label: string; score: number; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  return (
    <div className="flex items-center gap-4">
      <span className="font-black text-xs uppercase tracking-widest text-[#1A1A1A] w-20 shrink-0 truncate">{label}</span>
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

// ─── Crown SVG ────────────────────────────────────────────────────────────────

function CrownIcon() {
  return (
    <svg viewBox="0 0 64 48" width="40" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="4,44 4,24 16,36 32,8 48,36 60,24 60,44" fill="#1A1A1A" />
      <rect x="4" y="40" width="56" height="6" fill="#1A1A1A" />
      <rect x="29" y="4" width="6" height="6" fill="#DC143C" />
      <rect x="12" y="32" width="5" height="5" fill="#DC143C" />
      <rect x="47" y="32" width="5" height="5" fill="#DC143C" />
    </svg>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]
        bg-[#1A1A1A] text-[#F0EAD6] border-4 border-[#C5A945]
        shadow-[6px_6px_0_#DC143C] font-mono font-black text-xs uppercase
        tracking-widest px-8 py-4 transition-all duration-200
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
      `}
    >
      COPIED!
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

interface OverviewTabProps {
  user: any;
}

function OverviewTab({ user }: OverviewTabProps) {
  const mappedSkills = (user?.skills || []).map((s: string, idx: number) => ({
    label: s.toUpperCase(),
    score: Math.round(75 + (idx * 5) % 20)
  }));

  const rateText = user?.hourly_rate_eth
    ? `${parseFloat(user.hourly_rate_eth).toFixed(2)} ETH/hr`
    : "Rate not set";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Bio */}
      <div className="border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] rotate-[-0.5deg] p-8 bg-[#F0EAD6]">
        <h3 className="font-black text-xs uppercase tracking-[0.3em] text-[#DC143C] mb-4 font-mono">BIO_STATEMENT</h3>
        <p className="font-mono text-sm font-bold uppercase text-[#1A1A1A] leading-relaxed opacity-80">
          {user?.bio || "No bio added yet."}
        </p>
        <div className="mt-8 pt-6 border-t-4 border-[#1A1A1A] flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-50">RATE</span>
            <span className="font-black font-sans text-lg text-[#1A1A1A]">{rateText}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-50">PROJECT_SIZE</span>
            <span className="font-mono text-[10px] font-black uppercase text-[#1A1A1A]">MEDIUM — LARGE (2–8 WEEKS)</span>
          </div>
        </div>
      </div>

      {/* Skill bars */}
      <div className="border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] rotate-[0.5deg] p-8 bg-[#F0EAD6]">
        <h3 className="font-black text-xs uppercase tracking-[0.3em] text-[#DC143C] mb-6 font-mono">VERIFIED_SKILLS</h3>
        {mappedSkills.length > 0 ? (
          <div className="flex flex-col gap-5">
            {mappedSkills.map((s: any, i: number) => (
              <SkillBar key={s.label} label={s.label} score={s.score} delay={i * 150} />
            ))}
          </div>
        ) : (
          <div className="font-mono text-xs font-black uppercase text-[#1A1A1A]/40 text-center py-10">
            No skills added yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Projects ────────────────────────────────────────────────────────────

interface ProjectsTabProps {
  projects: any[];
}

function ProjectsTab({ projects }: ProjectsTabProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] bg-[#F0EAD6] p-8 font-mono text-center font-black uppercase tracking-widest text-[#1A1A1A]/40">
        NO COMPLETED PROJECTS YET
      </div>
    );
  }
  return (
    <div className="border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="bg-[#1A1A1A] text-[#F0EAD6]">
            {['PROJECT', 'CLIENT', 'VALUE', 'RATING', 'DATE', 'STATUS'].map((col) => (
              <th key={col} className="font-mono text-[10px] uppercase tracking-widest font-black text-left px-4 py-4 border-b-2 border-white whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((row: any, i: number) => {
            const displayClient = row.client_wallet ? `${row.client_wallet.substring(0, 6)}...${row.client_wallet.substring(row.client_wallet.length - 4)}` : 'N/A';
            const endDateTimestamp = row.end_date ? Math.floor(new Date(row.end_date).getTime() / 1000) : null;
            const displayEndDate = endDateTimestamp ? formatDate(endDateTimestamp) : 'N/A';

            return (
              <tr key={row.id || i} className="border-b-2 border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 transition-colors">
                <td className="font-mono text-[10px] font-black uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]">{row.title.toUpperCase()}</td>
                <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/60">{displayClient.toUpperCase()}</td>
                <td className="font-mono text-[10px] font-black uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]">{parseFloat(row.total_value_eth).toFixed(2)} ETH</td>
                <td className="px-4 py-4 whitespace-nowrap"><Stars count={5} /></td>
                <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/60">{displayEndDate}</td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="font-black text-[10px] uppercase px-3 py-1 border-2 border-[#1A1A1A] bg-[#C5A945] text-[#1A1A1A]">
                    {row.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Reviews ─────────────────────────────────────────────────────────────

function ReviewsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="border-4 border-[#1A1A1A] shadow-[6px_6px_0_#C5A945] rotate-[0.5deg] p-6 bg-[#F0EAD6] flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <Stars count={5} />
          <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#1A1A1A]/40">REVIEWS COMING SOON</span>
        </div>
        <div className="font-black text-xs uppercase tracking-widest text-[#DC143C] font-mono">FUTURE REPUTATION UPDATE</div>
        <p className="font-mono text-xs font-bold uppercase text-[#1A1A1A]/80 leading-relaxed border-l-4 border-[#1A1A1A] pl-4">
          "ON-CHAIN CLIENT FEEDBACK MODULE IS CURRENTLY UNDER RESEARCH AND DEVELOPMENT. REVIEW VERBAL SCORE ATTESTATIONS WILL BE INTEGRATED IN VER 2.0."
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: Tab[] = ['OVERVIEW', 'PROJECTS', 'REVIEWS'];

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const walletAddress = (params?.address as string) || '';

  const { address: myAddress, role } = useWallet();

  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [user, setUser] = useState<any>(null);
  const [rep, setRep] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const isOwnProfile = myAddress?.toLowerCase() === walletAddress?.toLowerCase();

  const loadProfileData = async () => {
    if (!walletAddress) return;
    setLoading(true);
    setIsError(false);
    try {
      // 1. Fetch user profile
      const u = await getUser(walletAddress);
      setUser(u);

      // 2. Fetch reputation
      const r = await getReputation(walletAddress);
      setRep(r);

      // 3. Fetch completed projects
      const p = await getProjects(walletAddress, "complete");
      setProjects(p || []);
    } catch (err) {
      console.error("Error loading profile data:", err);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [walletAddress]);

  function handleCopyWallet() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress).catch(() => {});
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  }

  // Safe defaults
  const displayName = user?.ens_name || formatAddress(walletAddress);
  const formattedTier = (rep?.tier || 'BRONZE').toUpperCase();

  return (
    <>
      <title>{`${displayName} | WORKCHAIN`}</title>

      <Toast visible={toastVisible} />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="bg-[#1A1A1A] py-24 px-8 relative">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">

          {/* LEFT — identity */}
          <div>
            {/* Label */}
            <span className="font-mono font-black text-[10px] uppercase tracking-[0.3em] text-[#DC143C] mb-4 block animate-flicker">
              VERIFIED_OPERATOR
            </span>

            {/* Name */}
            <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter text-[#F0EAD6] leading-none font-sans text-distressed mb-4 break-all">
              {displayName}
            </h1>

            {/* Wallet + copy */}
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-sm font-bold text-[#F0EAD6]/50 uppercase">{formatAddress(walletAddress)}</span>
              <button
                onClick={handleCopyWallet}
                className="border-2 border-[#F0EAD6]/30 text-[#F0EAD6]/50 font-mono font-black text-[9px] uppercase tracking-widest px-3 py-1 hover:border-[#C5A945] hover:text-[#C5A945] transition-colors"
              >
                COPY
              </button>
            </div>

            {/* Available badge */}
            <div className="flex items-center gap-2 mb-10">
              <span className={`font-mono text-xs font-black uppercase tracking-widest ${user?.availability ? 'text-[#10B981]' : 'text-[#DC143C]'}`}>
                {user?.availability ? "● AVAILABLE FOR WORK" : "● NOT AVAILABLE"}
              </span>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4 mb-6">
              {isOwnProfile ? (
                <button
                  onClick={() => router.push("/profile/edit")}
                  className="bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] font-black uppercase text-2xl tracking-tighter px-10 py-5 hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all font-sans cursor-pointer"
                >
                  EDIT PROFILE
                </button>
              ) : (
                !isOwnProfile && role === "client" && (
                  <button
                    onClick={() => router.push("/hire/" + walletAddress)}
                    className="inline-block bg-[#DC143C] text-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] font-black uppercase text-2xl tracking-tighter px-10 py-5 hover:animate-jitter hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all font-sans cursor-pointer"
                  >
                    HIRE {user?.ens_name || formatAddress(walletAddress)} →
                  </button>
                )
              )}
            </div>
          </div>

          {/* RIGHT — NFT reputation card */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-[#C5A945] border-4 border-[#1A1A1A] shadow-[12px_12px_0_#DC143C] rotate-[2deg] p-8 w-full max-w-sm relative">
              <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />

              <div className="relative z-10">
                {/* Card header */}
                <div className="flex justify-between items-center mb-6">
                  <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]/60">
                    IDENTITY_ASSET
                  </span>
                  <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]/60">
                    {rep?.nft_token_id ? `#${rep.nft_token_id}` : 'NOT MINTED'}
                  </span>
                </div>

                {/* Crown icon centered */}
                <div className="flex justify-center mb-4">
                  <div
                    className="w-20 h-20 bg-[#1A1A1A] flex items-center justify-center animate-jitter-slow"
                    style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}
                  >
                    <CrownIcon />
                  </div>
                </div>

                {/* Tier + Score */}
                <div className="text-center mb-6">
                  <div className="text-4xl font-black uppercase text-[#1A1A1A] tracking-tighter font-sans leading-tight">
                    {formattedTier}_TIER
                  </div>
                  <div className="font-mono text-sm font-black uppercase text-[#DC143C] mt-1">
                    SCORE: {rep?.score ?? 50}/100
                  </div>
                </div>

                {/* Stats 2×2 */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'TOTAL_JOBS',   value: String(rep?.total_jobs ?? 0) },
                    { label: 'DISPUTE_RATE', value: `${parseFloat(rep?.dispute_rate ?? 0).toFixed(1)}%` },
                    { label: 'TOTAL_VALUE',  value: `${parseFloat(rep?.total_value_eth ?? 0).toFixed(2)} ETH` },
                    { label: 'MEMBER_SINCE', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase() : 'N/A' },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#1A1A1A]/10 border-2 border-[#1A1A1A]/20 p-3 text-center">
                      <div className="font-mono text-[8px] font-black uppercase tracking-widest text-[#1A1A1A]/50 mb-1">{s.label}</div>
                      <div className="font-black text-base text-[#1A1A1A] font-sans tracking-tight">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TABS SECTION ─────────────────────────────────────────────── */}
      <section className="bg-[#F0EAD6] py-16 px-8">
        <div className="max-w-7xl mx-auto">

          {/* Tab bar */}
          <div className="flex gap-0 border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] w-fit mb-12">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    font-black text-xs uppercase tracking-widest px-8 py-4 border-r-4 border-[#1A1A1A] last:border-r-0 transition-all
                    ${isActive
                      ? 'bg-[#1A1A1A] text-[#F0EAD6]'
                      : 'bg-[#F0EAD6] text-[#1A1A1A] hover:bg-[#DC143C] hover:text-[#F0EAD6]'
                    }
                  `}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {loading ? (
            <div className="border-4 border-[#1A1A1A] bg-[#F0EAD6] p-12 text-center shadow-[8px_8px_0_#1A1A1A] font-mono font-black uppercase tracking-widest text-[#1A1A1A] animate-pulse">
              LOADING SYSTEM DATA...
            </div>
          ) : isError ? (
            <div className="border-4 border-[#DC143C] bg-white p-12 text-center shadow-[8px_8px_0_#DC143C] font-mono font-black uppercase tracking-widest text-[#DC143C] rotate-[-0.5deg]">
              ⚠ ERROR LOADING OPERATOR DATA
              <button 
                onClick={loadProfileData}
                className="mt-6 block mx-auto bg-[#DC143C] text-white px-6 py-3 font-black text-xs uppercase border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer"
              >
                RETRY
              </button>
            </div>
          ) : (
            <div>
              {activeTab === 'OVERVIEW'  && <OverviewTab user={user} />}
              {activeTab === 'PROJECTS'  && <ProjectsTab projects={projects} />}
              {activeTab === 'REVIEWS'   && <ReviewsTab />}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────── */}
      {!isOwnProfile && (
        <section className="bg-[#DC143C] py-20 px-8 border-y-8 border-[#1A1A1A] relative">
          <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div>
              <span className="font-mono text-[#F0EAD6]/60 text-[10px] uppercase tracking-[0.3em] font-black block mb-2">
                READY TO BUILD?
              </span>
              <h2 className="text-5xl font-black uppercase text-[#F0EAD6] tracking-tighter font-sans text-distressed">
                LOCK IN YOUR OPERATOR.
              </h2>
            </div>
            <Link
              href="/connect"
              className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] font-black uppercase text-xl px-10 py-5 shadow-[8px_8px_0_#1A1A1A] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all shrink-0 animate-jitter-slow font-sans"
            >
              CONNECT WALLET →
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
