"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

import { exploreFreelancers } from "@/lib/api";
import { formatAddress } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

interface Reputation {
  score: number;
  tier: string;
  total_jobs: number;
  dispute_rate: string | number;
  total_value_eth: string | number;
  nft_token_id?: number | null;
  nft_contract_address?: string | null;
}

interface FreelancerUser {
  id: string;
  wallet_address: string;
  ens_name?: string | null;
  bio?: string | null;
  skills: string[];
  hourly_rate_eth?: string | number | null;
  availability: boolean;
  reputation?: Reputation | null;
  created_at: string;
  updated_at: string;
}

type SortKey = 'TOP_RATED' | 'MOST_JOBS' | 'NEWEST';

// ─── Tier styling helpers ──────────────────────────────────────────────────────

const TIER_BANNER: Record<string, string> = {
  BRONZE:   'bg-[#CD7F32]',
  SILVER:   'bg-[#C0C0C0]',
  GOLD:     'bg-[#C5A945]',
  PLATINUM: 'bg-[#1A1A1A]',
};

const TIER_BADGE_BG: Record<string, string> = {
  BRONZE:   'bg-[#CD7F32] text-white border-[#1A1A1A]',
  SILVER:   'bg-[#C0C0C0] text-[#1A1A1A] border-[#1A1A1A]',
  GOLD:     'bg-[#C5A945] text-[#1A1A1A] border-[#1A1A1A]',
  PLATINUM: 'bg-[#1A1A1A] text-[#F0EAD6] border-white',
};

const TIER_AVATAR_BG: Record<string, string> = {
  BRONZE:   'bg-[#CD7F32]',
  SILVER:   'bg-[#C0C0C0]',
  GOLD:     'bg-[#C5A945]',
  PLATINUM: 'bg-[#DC143C]',
};

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'SORT: TOP RATED', value: 'TOP_RATED' },
  { label: 'SORT: MOST JOBS', value: 'MOST_JOBS' },
  { label: 'SORT: NEWEST',    value: 'NEWEST'    },
];

// ─── Freelancer Card ───────────────────────────────────────────────────────────

function FreelancerCard({ user, index }: { user: FreelancerUser; index: number }) {
  const rotation = index % 2 === 0 ? 'rotate-[1deg]' : 'rotate-[-1deg]';
  const name = user.ens_name || formatAddress(user.wallet_address);
  const initials = (user.ens_name || 'OP').slice(0, 2).toUpperCase();

  const rep = user.reputation || {
    score: 50,
    tier: 'BRONZE',
    total_jobs: 0,
    dispute_rate: '0.0',
    total_value_eth: '0.0'
  };

  const formattedTier = (rep.tier || 'BRONZE').toUpperCase();

  return (
    <article
      className={`
        relative flex flex-col bg-[#F0EAD6] border-4 border-[#1A1A1A]
        shadow-[8px_8px_0_#1A1A1A] ${rotation}
        hover:-translate-y-2 hover:shadow-[12px_12px_0_#1A1A1A]
        transition-all duration-150 torn-edge overflow-visible
      `}
    >
      {/* Tier banner strip */}
      <div className={`${TIER_BANNER[formattedTier] || 'bg-[#CD7F32]'} h-3 w-full shrink-0`} />

      {/* Card body */}
      <div className="p-6 flex flex-col flex-1">

        {/* Top row: avatar + tier badge */}
        <div className="flex justify-between items-start mb-3">
          <div
            className={`
              w-12 h-12 ${TIER_AVATAR_BG[formattedTier] || 'bg-[#CD7F32]'} border-2 border-[#1A1A1A]
              flex items-center justify-center font-black text-sm text-[#1A1A1A] uppercase shrink-0
            `}
          >
            {initials}
          </div>
          <span className={`border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${TIER_BADGE_BG[formattedTier] || 'bg-[#CD7F32] text-white'}`}>
            {formattedTier}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-xl font-black uppercase tracking-tight text-[#1A1A1A] mt-1 leading-none font-sans truncate">
          {name}
        </h3>

        {/* Wallet */}
        <p className="font-mono text-[10px] font-bold uppercase opacity-60 mt-1 mb-4">
          {formatAddress(user.wallet_address)}
        </p>

        {/* Score */}
        <div className="mb-4">
          <div className="text-3xl font-black text-[#DC143C] leading-none font-sans">
            {rep.score}/100
          </div>
          <div className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60 mt-0.5">
            REPUTATION SCORE
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {user.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="border-2 border-[#1A1A1A] text-[10px] font-black uppercase px-2 py-0.5 bg-white"
            >
              {skill.toUpperCase()}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="font-mono text-[10px] font-bold uppercase opacity-70 flex gap-2 items-center flex-wrap mb-4">
          <span>{rep.total_jobs} JOBS</span>
          <span className="opacity-40">•</span>
          <span>{Number(rep.total_value_eth || 0).toFixed(1)} ETH</span>
          <span className="opacity-40">•</span>
          <span className={Number(rep.dispute_rate || 0) === 0 ? 'text-[#10B981]' : ''}>
            {Number(rep.dispute_rate || 0).toFixed(1)}% DISPUTES
          </span>
        </div>

        {/* CTA */}
        <Link
          href={`/profile/${user.wallet_address}`}
          className="
            mt-auto w-full bg-[#1A1A1A] text-[#F0EAD6] border-2 border-[#1A1A1A]
            font-black uppercase text-xs tracking-widest py-3 text-center
            hover:bg-[#DC143C] transition-colors block
          "
        >
          VIEW PROFILE →
        </Link>
      </div>
    </article>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const TIER_FILTERS: (Tier | 'ALL')[] = ['ALL', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

export default function ExplorePage() {
  const [freelancers, setFreelancers] = useState<FreelancerUser[]>([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<Tier | 'ALL'>('ALL');
  const [sort, setSort] = useState<SortKey>('TOP_RATED');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFreelancers = async () => {
    setIsLoading(true);
    try {
      const data = await exploreFreelancers({
        limit: 20,
        sort_by: "score"
      });
      setFreelancers(data || []);
    } catch (err) {
      console.error('Error fetching freelancers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFreelancers();
  }, []);

  const handleClearFilters = () => {
    setSearch('');
    setTierFilter('ALL');
    setSort('TOP_RATED');
  };

  const results = useMemo(() => {
    let list = [...freelancers];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((user) => {
        const walletMatches = user.wallet_address.toLowerCase().includes(q);
        const ensMatches = user.ens_name?.toLowerCase().includes(q);
        const skillMatches = user.skills.some((s) => s.toLowerCase().includes(q));
        return walletMatches || ensMatches || skillMatches;
      });
    }

    // Tier filter
    if (tierFilter !== 'ALL') {
      list = list.filter((user) => {
        const repTier = user.reputation?.tier?.toUpperCase() || 'BRONZE';
        return repTier === tierFilter;
      });
    }

    // Sort key logic
    return list.sort((a, b) => {
      const repA = a.reputation || { score: 50, total_jobs: 0 };
      const repB = b.reputation || { score: 50, total_jobs: 0 };

      if (sort === 'TOP_RATED') {
        return (repB.score ?? 50) - (repA.score ?? 50);
      }
      if (sort === 'MOST_JOBS') {
        return (repB.total_jobs ?? 0) - (repA.total_jobs ?? 0);
      }
      if (sort === 'NEWEST') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });
  }, [freelancers, search, tierFilter, sort]);

  return (
    <>
      {/* SEO */}
      <title>FIND TALENT | WORKCHAIN</title>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#1A1A1A] py-24 px-8 relative torn-edge">
        {/* Halftone overlay */}
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Label */}
          <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.3em] mb-6 block animate-flicker">
            TALENT_REGISTRY
          </span>

          {/* Headline */}
          <h1 className="font-sans font-black uppercase tracking-tighter leading-none mb-2">
            <span className="block text-7xl md:text-[8rem] text-[#F0EAD6]">FIND YOUR</span>
            <span className="block text-7xl md:text-[8rem] text-[#DC143C] text-distressed">OPERATOR.</span>
          </h1>

          {/* Subtitle */}
          <p className="font-mono text-[#F0EAD6]/60 text-sm font-bold uppercase tracking-widest mt-8 max-w-2xl">
            Verified on-chain. Zero fake reviews. Reputation backed by immutable code.
          </p>
        </div>
      </section>

      {/* ── SEARCH + FILTER BAR ───────────────────────────────────────────── */}
      <section className="bg-[#F0EAD6] py-8 px-8 border-y-4 border-[#1A1A1A] sticky top-12 z-30">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">

          {/* Search input */}
          <div className="flex items-center border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] bg-white w-full lg:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH BY SKILL OR WALLET..."
              className="
                flex-1 bg-transparent outline-none border-none
                font-mono font-bold uppercase text-xs tracking-widest
                placeholder:text-[#1A1A1A]/30 text-[#1A1A1A] px-4 py-3
              "
            />
            <button
              onClick={() => {}}
              className="bg-[#1A1A1A] text-[#F0EAD6] font-black uppercase text-[10px] tracking-widest px-4 py-3 hover:bg-[#DC143C] transition-colors shrink-0"
            >
              FIND
            </button>
          </div>

          {/* Tier filter pills */}
          <div className="flex flex-wrap gap-2">
            {TIER_FILTERS.map((t) => {
              const isActive = tierFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`
                    border-2 border-[#1A1A1A] font-black text-[10px] uppercase tracking-widest px-4 py-2 transition-all
                    ${isActive
                      ? 'bg-[#1A1A1A] text-white shadow-[2px_2px_0_#DC143C]'
                      : 'bg-transparent text-[#1A1A1A] hover:bg-[#DC143C] hover:text-white hover:border-[#DC143C]'
                    }
                  `}
                >
                  {t === 'ALL' ? 'ALL TIERS' : t}
                </button>
              );
            })}
          </div>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="
              border-2 border-[#1A1A1A] bg-[#F0EAD6] font-mono font-bold
              uppercase text-xs tracking-widest text-[#1A1A1A]
              px-4 py-3 outline-none cursor-pointer
              shadow-[4px_4px_0_#1A1A1A] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all
            "
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── RESULTS GRID ─────────────────────────────────────────────────── */}
      <section className="bg-[#F0EAD6] py-16 px-8">
        <div className="max-w-7xl mx-auto">

          {/* Result count */}
          <p className="font-mono text-[#DC143C] font-black uppercase text-xs tracking-[0.25em] mb-8 animate-flicker">
            {isLoading ? 'LOADING...' : `${String(results.length).padStart(2, '0')} OPERATORS FOUND`}
          </p>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-96 bg-[#1A1A1A]/10 border-4 border-[#1A1A1A] animate-pulse relative p-6">
                  <div className="h-6 bg-[#1A1A1A]/20 w-1/3 mb-4"></div>
                  <div className="h-10 bg-[#1A1A1A]/20 w-3/4 mb-4"></div>
                  <div className="h-20 bg-[#1A1A1A]/20 w-full mb-6"></div>
                  <div className="h-10 bg-[#1A1A1A]/20 w-full mt-auto"></div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="border-4 border-dashed border-[#1A1A1A] py-32 flex flex-col items-center justify-center rotate-[-1deg] bg-white">
              <h2 className="text-4xl font-black uppercase font-sans text-[#DC143C] tracking-tighter mb-4">
                NO_OPERATORS_FOUND
              </h2>
              <p className="font-mono text-xs font-bold uppercase opacity-60 mb-6">
                Try adjusting your search or filter.
              </p>
              <button
                onClick={handleClearFilters}
                className="bg-[#DC143C] text-white px-6 py-3 font-black text-xs uppercase border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer"
              >
                CLEAR FILTERS
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {results.map((f, i) => (
                <FreelancerCard key={f.id} user={f} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section className="bg-[#DC143C] py-20 px-8 border-y-8 border-[#1A1A1A] relative">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div>
            <span className="font-mono text-[#F0EAD6]/60 text-[10px] uppercase tracking-[0.3em] font-black block mb-2">
              READY TO BUILD?
            </span>
            <h2 className="text-5xl font-black uppercase text-[#F0EAD6] tracking-tighter text-distressed font-sans">
              JOIN THE PROTOCOL.
            </h2>
          </div>
          <Link
            href="/connect"
            className="
              bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A]
              font-black uppercase text-lg px-10 py-5
              shadow-[8px_8px_0_#1A1A1A] hover:translate-x-2 hover:translate-y-2
              hover:shadow-none transition-all shrink-0 animate-jitter-slow
            "
          >
            CONNECT WALLET →
          </Link>
        </div>
      </section>
    </>
  );
}
