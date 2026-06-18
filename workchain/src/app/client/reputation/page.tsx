"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RequireWallet from '@/components/RequireWallet';
import { Sidebar } from '@/components/layout';
import { useRouter } from 'next/navigation';

// ─── Data ─────────────────────────────────────────────────────────────────────

const CLIENT_STATS = [
  { label: 'ESCROW_RELEASE', score: 98 },
  { label: 'COMMUNICATION',  score: 95 },
  { label: 'SPEC_CLARITY',   score: 92 },
  { label: 'PROMPT_DEPOSIT', score: 96 },
  { label: 'TRUST_RATING',   score: 99 },
];

const FUNDING_HISTORY = [
  { project: 'DEX SMART CONTRACT AUDIT', freelancer: '0x8f9...0000', value: '4.5 ETH', rating: 5, date: 'APR 2026', status: 'COMPLETE' },
  { project: 'ZK-ROLLUP UI DASHBOARD',   freelancer: '0xE89...F12A', value: '2.1 ETH', rating: 5, date: 'MAR 2026', status: 'ACTIVE'   },
  { project: 'SOLANA RPC INTEGRATION',   freelancer: '0x4F2...D771', value: '10.0 ETH', rating: 5, date: 'FEB 2026', status: 'COMPLETE' },
  { project: 'TOKEN VESTING PORTAL',     freelancer: '0x7F1...A329', value: '1.5 ETH', rating: 4, date: 'FEB 2026', status: 'COMPLETE' },
  { project: 'DAO GOVERNANCE APP',       freelancer: '0x3C2...D453', value: '6.0 ETH', rating: 5, date: 'JAN 2026', status: 'COMPLETE' },
  { project: 'NFT MARKETPLACE UI',       freelancer: '0x9B4...E561', value: '3.2 ETH', rating: 5, date: 'DEC 2025', status: 'COMPLETE' },
  { project: 'WEB3 ANALYTICS PLATFORM', freelancer: '0x2D8...C890', value: '0.8 ETH', rating: 4, date: 'NOV 2025', status: 'COMPLETE' },
  { project: 'DEFI YIELD OPTIMIZER',     freelancer: '0x6A1...F204', value: '5.2 ETH', rating: 5, date: 'OCT 2025', status: 'COMPLETE' },
];

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

// Shared Sidebar is imported from '@/components/layout'

// ─── Skill Bar ────────────────────────────────────────────────────────────────

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

export default function ClientReputationPage() {
  const router = useRouter();

  useEffect(() => {
    const storedRole = localStorage.getItem('workchain_role') as 'freelancer' | 'client';
    if (storedRole === 'freelancer') {
      router.push('/freelancer/reputation');
    }
  }, [router]);

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
                PLATINUM_SPONSOR
              </div>
              <div className="text-3xl font-black text-[#DC143C] font-sans tracking-tighter mb-2">
                SCORE: 98/100
              </div>
              <div className="font-mono text-[#F0EAD6]/60 text-xs font-bold uppercase tracking-widest">
                SPONSOR_ID: #3310
              </div>
            </div>

            {/* Stats 2×2 grid */}
            <div className="grid grid-cols-2 gap-3 mb-8 relative z-10">
              {[
                { label: 'TOTAL_FUNDED',    value: '30.8 ETH' },
                { label: 'DISPUTE_RATE',    value: '0.0%'     },
                { label: 'ACTIVE_ESCROW',   value: '8.5 ETH' },
                { label: 'CONTRACTS_COUNT', value: '18' },
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
                  tier === 'PLATINUM'
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
            <div className="absolute inset-y-0 left-0 bg-[#C5A945]" style={{ width: '95%' }} />
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
              VALUED CLIENT // TOP 5% ESCROW SPONSOR
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
            {CLIENT_STATS.map((stat, i) => (
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
              18 ESCROWS PROVISIONED
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
                {FUNDING_HISTORY.map((row, i) => (
                  <tr key={i} className="border-b border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/5 transition-colors">
                    <td className="font-mono text-[10px] font-black uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]">
                      {row.project}
                    </td>
                    <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/60">
                      {row.freelancer}
                    </td>
                    <td className="font-mono text-[10px] font-black uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]">
                      {row.value}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Stars count={row.rating} />
                    </td>
                    <td className="font-mono text-[10px] font-bold uppercase px-4 py-4 whitespace-nowrap text-[#1A1A1A]/60">
                      {row.date}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`font-black text-[10px] uppercase px-3 py-1 border-2 border-[#1A1A1A] ${
                        row.status === 'COMPLETE'
                          ? 'bg-[#C5A945] text-[#1A1A1A]'
                          : 'bg-[#DC143C] text-white animate-flicker'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
    </RequireWallet>
  );
}
