"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [role, setRole] = useState<'freelancer' | 'client'>('freelancer');

  interface Metric {
    label: string;
    value: string;
    subText: string;
    border: string;
    bg: string;
    rotate: string;
    valueClass?: string;
    badge?: string;
  }

  const freelancerMetrics: Metric[] = [
    { label: "TOTAL_EARNED", value: "13.5 ETH", subText: "≈ $42,800", badge: "↑ 18% MTD", border: "border-l-8 border-[#DC143C]", bg: "bg-[#F0EAD6]", rotate: "rotate-[1deg]" },
    { label: "ACTIVE_PROJECTS", value: "02", subText: "4 MILESTONES DUE", border: "border-4 border-[#C5A945]", bg: "bg-[#F0EAD6]", rotate: "rotate-[-1deg] shadow-[8px_8px_0_#C5A945]" },
    { label: "DISPUTE_RATE", value: "0.0%", valueClass: "text-[#10B981]", subText: "CLEAN RECORD ✓", border: "border-4 border-[#1A1A1A]", bg: "bg-[#F0EAD6]", rotate: "rotate-[2deg] shadow-[8px_8px_0_#1A1A1A]" },
    { label: "REPUTATION", value: "92/100", subText: "GOLD TIER // NFT #8821", border: "border-4 border-[#DC143C]", bg: "bg-[#F0EAD6]", rotate: "rotate-[-2deg] shadow-[8px_8px_0_#DC143C]" },
  ];

  const clientMetrics: Metric[] = [
    { label: "TOTAL_LOCKED", value: "8.5 ETH", subText: "ACTIVE ESCROW", border: "border-l-8 border-[#1A1A1A]", bg: "bg-[#F0EAD6]", rotate: "rotate-[1deg]" },
    { label: "ACTIVE_PROJECTS", value: "03", subText: "IN PROGRESS", border: "border-4 border-[#1A1A1A]", bg: "bg-[#F0EAD6]", rotate: "rotate-[-2deg] shadow-[8px_8px_0_#1A1A1A]" },
    { label: "PENDING_APPROVALS", value: "02", subText: "NEEDS REVIEW", border: "border-4 border-[#C5A945]", bg: "bg-[#C5A945]", rotate: "rotate-[2deg] shadow-[8px_8px_0_#1A1A1A]" },
    { label: "TOTAL_PAID", value: "22.3 ETH", subText: "ALL TIME", border: "border-4 border-[#DC143C]", bg: "bg-[#F0EAD6]", rotate: "rotate-[-1deg] shadow-[8px_8px_0_#DC143C]" },
  ];

  const metrics = role === 'freelancer' ? freelancerMetrics : clientMetrics;

  return (
    <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
      {/* SIDEBAR */}
      <aside className="w-[260px] bg-[#1A1A1A] border-r-4 border-[#DC143C] flex flex-col justify-between hidden md:flex shrink-0 z-30 relative shadow-[12px_12px_0_#DC143C]">
        <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
        <div>
          {/* Logo */}
          <div className="bg-[#DC143C] p-6 border-b-4 border-white mb-6">
             <Link href="/" className="text-4xl font-black text-[#F0EAD6] tracking-tighter shadow-sm text-distressed">
               WC.01X
             </Link>
          </div>
          
          {/* Role Badge */}
          <div className="px-6 mb-10">
            <span className={`px-4 py-1 font-black text-xs uppercase border-2 flex w-fit shadow-[4px_4px_0_#F0EAD6] ${role === 'freelancer' ? 'bg-[#DC143C] text-white border-white' : 'bg-[#C5A945] text-[#1A1A1A] border-[#1A1A1A]'}`}>
              {role}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2 px-4 relative z-10">
            <Link href="/dashboard" className="text-left font-black text-xs uppercase tracking-widest text-[#1A1A1A] bg-[#DC143C] px-4 py-3 border-2 border-white shadow-[4px_4px_0_#F0EAD6] block">
              ⬛ DASHBOARD
            </Link>
            <Link href="/projects" className="text-left font-black text-xs uppercase tracking-widest text-[#F0EAD6] opacity-60 hover:opacity-100 hover:text-[#DC143C] hover:bg-[#1A1A1A] px-4 py-3 transition-colors block">
              📁 MY PROJECTS
            </Link>
            {role === 'freelancer' ? (
              <>
                <button className="text-left font-black text-xs uppercase tracking-widest text-[#F0EAD6] opacity-60 hover:opacity-100 hover:text-[#DC143C] hover:bg-[#1A1A1A] px-4 py-3 transition-colors">
                  ⭐ REPUTATION
                </button>
              </>
            ) : (
              <button className="text-left font-black text-xs uppercase tracking-widest text-[#F0EAD6] opacity-60 hover:opacity-100 hover:text-[#DC143C] hover:bg-[#1A1A1A] px-4 py-3 transition-colors">
                ➕ CREATE PROJECT
              </button>
            )}
            <button className="text-left font-black text-xs uppercase tracking-widest text-[#F0EAD6] opacity-60 hover:opacity-100 hover:text-[#DC143C] hover:bg-[#1A1A1A] px-4 py-3 transition-colors">
              💰 {role === 'freelancer' ? 'EARNINGS' : 'ESCROW'}
            </button>
            <Link href="/disputes/1" className="text-left font-black text-xs uppercase tracking-widest text-[#F0EAD6] opacity-60 hover:opacity-100 hover:text-[#DC143C] hover:bg-[#1A1A1A] px-4 py-3 transition-colors block">
              ⚖️ DISPUTES
            </Link>
          </nav>
        </div>

        {/* Bottom Panel */}
        <div className="p-6 border-t-4 border-white/20 relative z-10">
          <div className="font-mono text-xs text-[#F0EAD6] mb-4 opacity-70">
            0x8F9...A42B
          </div>
          <div className="flex gap-2">
            <button className="bg-[#1A1A1A] text-[#F0EAD6] border-2 border-white text-[10px] font-black px-3 py-1 shadow-[2px_2px_0_#DC143C] hover:translate-x-1 transition-transform uppercase">
              DISCONNECT
            </button>
          </div>
          <div className="mt-6 flex items-center gap-2">
             <span className="font-mono text-[10px] uppercase font-black text-white">NODE: LIVE</span>
             <span className="w-2 h-2 rounded-full bg-[#10B981] animate-flicker"></span>
          </div>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <main className="flex-1 overflow-y-auto px-8 py-12 relative w-full overflow-x-hidden">
        {/* Toggle Utility (For Preview only) */}
        <div className="absolute top-4 right-8 z-50">
          <button 
            onClick={() => setRole(r => r === 'freelancer' ? 'client' : 'freelancer')}
            className="bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] font-black uppercase text-xs px-4 py-2 shadow-[4px_4px_0_#1A1A1A] hover:bg-white transition-all"
          >
            SWITCH ROLE (DEMO)
          </button>
        </div>

        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b-8 border-[#1A1A1A] pb-6 gap-6">
          <div>
            <span className="text-[#DC143C] font-black uppercase text-sm mb-2 block tracking-widest animate-flicker">
              SYSTEM_DASHBOARD
            </span>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none mb-2">
              GM, ANVAY.
            </h1>
          </div>
          <div className="font-mono text-sm font-black uppercase bg-[#1A1A1A] text-[#F0EAD6] px-4 py-2 border-2 border-[#1A1A1A] rotate-[2deg] shadow-[4px_4px_0_#C5A945]">
            28-OCT-2024
          </div>
        </div>

        {/* URGENT BANNER FOR CLIENT */}
        {role === 'client' && (
          <div className="bg-[#DC143C] p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] mb-12 flex flex-col md:flex-row justify-between items-center rotate-[-1deg] animate-jitter-slow">
            <h2 className="text-2xl font-black uppercase text-[#F0EAD6] mb-4 md:mb-0">
              ⚠ ACTION REQUIRED: 2 MILESTONES AWAIT APPROVAL
            </h2>
            <button className="bg-[#1A1A1A] text-[#F0EAD6] px-6 py-3 font-black text-sm uppercase shadow-[4px_4px_0_#C5A945] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              REVIEW NOW →
            </button>
          </div>
        )}

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
              <button className="text-sm border-2 border-[#1A1A1A] px-3 py-1 bg-white shadow-[4px_4px_0_#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6] transition-colors">
                VIEW ALL
              </button>
            </h3>
            
            <div className="space-y-6">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="bg-white border-4 border-[#1A1A1A] p-6 flex flex-col md:flex-row justify-between items-start md:items-center shadow-[8px_8px_0_#1A1A1A] hover:-translate-y-1 transition-transform group">
                  <div className="flex-1 mb-4 md:mb-0 w-full">
                    <h4 className="text-2xl font-black uppercase font-sans">
                      {i === 0 ? 'DEX SMART CONTRACT AUDIT' : i === 1 ? 'ZK-ROLLUP UI DASHBOARD' : 'SOLANA RPC INTEGRATION'}
                    </h4>
                    <p className="font-mono text-xs font-bold text-[#1A1A1A] opacity-60 mt-2">
                      {role === 'freelancer' ? 'CLIENT:' : 'FREELANCER:'} {i === 0 ? '0x1A4...B98C' : i === 1 ? '0xE89...F12A' : '0x4F2...D771'}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="mt-6 flex items-center gap-4 max-w-sm w-full">
                      <div className="flex-1 h-6 border-4 border-[#1A1A1A] relative bg-[#F0EAD6]">
                        <div className={`absolute top-0 left-0 h-full bg-[#DC143C] border-r-4 border-[#1A1A1A]`} style={{ width: i === 0 ? '75%' : i === 1 ? '40%' : '10%' }}></div>
                      </div>
                      <span className="font-mono text-xs font-black">{i === 0 ? '3/4' : i === 1 ? '2/5' : '1/10'}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-4 border-t-4 border-[#1A1A1A] md:border-t-0 md:border-l-4 md:pl-6 pt-4 md:pt-0 w-full md:w-auto">
                    <div className="text-4xl font-black text-[#1A1A1A]">
                      {i === 0 ? '4.5' : i === 1 ? '2.1' : '10.0'} ETH
                    </div>
                    {i === 0 ? (
                      <span className="bg-[#C5A945] text-[#1A1A1A] px-3 py-1 font-black text-xs uppercase border-2 border-[#1A1A1A] animate-flicker">IN PROGRESS</span>
                    ) : (
                      <span className="bg-[#1A1A1A] text-[#F0EAD6] px-3 py-1 font-black text-xs uppercase border-2 border-[#1A1A1A]">PENDING</span>
                    )}
                    <button className="mt-2 text-sm font-black uppercase text-[#DC143C] group-hover:underline">VIEW →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: REPUTATION / FAST ACTIONS */}
          <div className="xl:col-span-1 border-l-8 border-[#1A1A1A] pl-0 xl:pl-12 pt-12 xl:pt-0">
            {role === 'freelancer' ? (
              <>
                <h3 className="text-3xl font-black uppercase border-b-8 border-[#C5A945] pb-4 mb-8 text-[#1A1A1A]">
                  REPUTATION NFT
                </h3>
                <div className="bg-[#1A1A1A] border-4 border-[#C5A945] shadow-[12px_12px_0_#C5A945] p-8 text-[#F0EAD6] rotate-[1deg] relative">
                  <div className="absolute inset-0 halftone opacity-30 pointer-events-none"></div>
                  <span className="text-[#C5A945] font-black uppercase text-xs mb-2 block tracking-widest relative z-10">ON-CHAIN_IDENTITY</span>
                  <h4 className="text-4xl font-black font-sans uppercase mb-6 relative z-10 text-distressed text-[#C5A945]">GOLD TIER</h4>
                  
                  <div className="flex justify-center mb-6 relative z-10">
                    <div className="text-9xl font-black text-[#DC143C] rotate-[-2deg] animate-jitter-slow tracking-tighter">92</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-t-4 border-white/20 pt-6 relative z-10 font-mono text-xs uppercase font-bold">
                    <div>
                      <p className="opacity-60 mb-1">COMPLETED</p>
                      <p className="text-xl">41 JOBS</p>
                    </div>
                    <div>
                      <p className="opacity-60 mb-1">TOTAL VOL</p>
                      <p className="text-xl">82 ETH</p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4 relative z-10">
                    <div>
                      <div className="flex justify-between font-mono text-[10px] mb-1 font-bold"><span>SMART CONTRACTS</span><span>98%</span></div>
                      <div className="h-4 border-2 border-white w-full"><div className="h-full bg-[#DC143C] w-[98%]"></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between font-mono text-[10px] mb-1 font-bold"><span>REACT / NEXTJS</span><span>94%</span></div>
                      <div className="h-4 border-2 border-white w-full"><div className="h-full bg-[#DC143C] w-[94%]"></div></div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
                <>
                <h3 className="text-3xl font-black uppercase border-b-8 border-[#C5A945] pb-4 mb-8 text-[#1A1A1A]">
                  QUICK ACTIONS
                </h3>
                <div className="flex flex-col gap-6">
                  <button className="bg-[#1A1A1A] text-[#F0EAD6] p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0_#DC143C] hover:-translate-x-1 hover:-translate-y-1 transition-transform rotate-[1deg] flex flex-col items-start w-full">
                    <span className="text-4xl mb-4">➕</span>
                    <span className="font-black text-2xl uppercase font-sans">CREATE PROJECT</span>
                    <span className="font-mono text-xs mt-2 opacity-80">Lock funds securely in escrow</span>
                  </button>
                  <button className="bg-[#white] text-[#1A1A1A] p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] hover:-translate-x-1 hover:-translate-y-1 transition-transform rotate-[-1deg] flex flex-col items-start w-full">
                    <span className="text-4xl mb-4">⚖️</span>
                    <span className="font-black text-2xl uppercase font-sans">DISPUTE CENTER</span>
                    <span className="font-mono text-xs mt-2 opacity-80">0 Open Disputes</span>
                  </button>
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
            {[
               { time: "2 MINS AGO", action: "Milestone 3 Approved. 2.5 ETH transferred.", rotate: "rotate-[0.5deg]" },
               { time: "1 HOUR AGO", action: "Client locked 14 ETH in Escrow Contract #X9V2.", rotate: "rotate-[-0.5deg]" },
               { time: "YESTERDAY", action: "Reputation score updated: +2 points.", rotate: "rotate-[0.5deg]" },
               { time: "2 DAYS AGO", action: "Dispute #221 resolved in favor of Freelancer.", rotate: "rotate-[0deg]" },
               { time: "4 DAYS AGO", action: "Project 'DeFi Analytics API' marked COMPLETE.", rotate: "rotate-[-0.5deg]" }
            ].map((activity, i) => (
              <div key={i} className={`bg-white border-2 border-[#1A1A1A] p-4 flex gap-6 items-center ${activity.rotate} shadow-sm max-w-4xl hover:bg-[#F0EAD6] transition-colors`}>
                <span className="font-mono text-[10px] font-black uppercase bg-[#1A1A1A] text-[#F0EAD6] px-2 py-1 shrink-0 w-24 text-center">
                  {activity.time}
                </span>
                <span className="font-bold text-sm font-sans tracking-tight">
                  {activity.action}
                </span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
