"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DisputeRoom() {
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<'freelancer' | 'client' | null>(null);
  const [countdown, setCountdown] = useState({ days: 2, hours: 4, minutes: 31, seconds: 22 });

  // Live countdown timer
  useEffect(() => {
    const totalInitial = countdown.days * 86400 + countdown.hours * 3600 + countdown.minutes * 60 + countdown.seconds;
    let remaining = totalInitial;

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const d = Math.floor(remaining / 86400);
      const h = Math.floor((remaining % 86400) / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      setCountdown({ days: d, hours: h, minutes: m, seconds: s });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  const isUrgent = countdown.days === 0 && countdown.hours < 1;

  const freelancerVotes = 58;
  const clientVotes = 42;

  const handleVote = (side: 'freelancer' | 'client') => {
    setVotedFor(side);
    setHasVoted(true);
  };

  return (
    <div className="font-sans bg-[#F0EAD6] min-h-screen relative z-20">

      {/* TOP ALERT BAR */}
      <div className="bg-[#DC143C] border-b-4 border-[#1A1A1A] py-4 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center relative z-30">
        <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
        <h2 className="font-black text-[#F0EAD6] text-lg md:text-xl uppercase tracking-tight relative z-10">
          ⚖ DISPUTE #D-0042 // NFT MARKETPLACE UI // 1.2 ETH AT STAKE
        </h2>
        <div className={`font-mono font-black text-2xl md:text-3xl text-white tracking-widest relative z-10 mt-2 md:mt-0 ${isUrgent ? 'animate-flicker text-[#C5A945]' : ''}`}>
          {pad(countdown.days)}D {pad(countdown.hours)}H {pad(countdown.minutes)}M {pad(countdown.seconds)}S
        </div>
      </div>

      {/* MAIN HEADING */}
      <section className="bg-[#1A1A1A] py-16 px-8 text-center relative">
        <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
        <span className="text-[#DC143C] font-black uppercase text-lg mb-4 block tracking-widest animate-flicker relative z-10">
          COMMUNITY_ARBITRATION
        </span>
        <h1 className="text-6xl md:text-[8rem] font-black uppercase text-[#F0EAD6] tracking-tighter text-distressed leading-none relative z-10">
          THE DISPUTE.
        </h1>
      </section>

      {/* EVIDENCE SECTION — TWO COLUMNS */}
      <section className="bg-[#F0EAD6] py-16 px-6 md:px-12 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* FREELANCER EVIDENCE */}
          <div className="bg-[#F0EAD6] border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] rotate-[-1deg] p-8 relative">
            <h3 className="text-2xl font-black uppercase text-[#DC143C] mb-2 tracking-tight">⚡ FREELANCER_EVIDENCE</h3>
            <p className="font-mono text-xs font-bold uppercase opacity-60 mb-6 border-b-4 border-[#1A1A1A] pb-4">0xE89...F12A</p>

            {/* Files */}
            <div className="space-y-3 mb-6">
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">SUBMITTED_FILES</h4>
              {[
                { name: "milestone_2_deliverables.zip", hash: "QmX7...3kF9" },
                { name: "test_coverage_report.pdf", hash: "QmA4...8vR2" },
                { name: "screenshot_progress.png", hash: "QmB1...7jK4" }
              ].map((file, i) => (
                <div key={i} className="border-2 border-[#1A1A1A] px-3 py-2 flex justify-between items-center font-mono text-xs font-bold uppercase bg-white">
                  <span>📄 {file.name}</span>
                  <span className="opacity-40">IPFS: {file.hash}</span>
                </div>
              ))}
            </div>

            {/* Proof Links */}
            <div className="mb-6">
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">PROOF_LINKS</h4>
              <div className="space-y-2 font-mono text-xs font-bold">
                <div className="border-2 border-[#1A1A1A] px-3 py-2 bg-white">🔗 github.com/dev/nft-marketplace-ui</div>
                <div className="border-2 border-[#1A1A1A] px-3 py-2 bg-white">🔗 vercel.app/nft-preview-deploy</div>
              </div>
            </div>

            {/* Statement */}
            <div className="mb-4">
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">STATEMENT</h4>
              <div className="bg-white border-4 border-[#1A1A1A] p-4 font-mono text-xs font-bold leading-relaxed">
                &quot;All deliverables for Milestone 2 were submitted on time. The client changed scope mid-sprint
                without amending the contract. Original specification was fully met. I have deployed a working
                preview and all tests pass. The rejection is unjustified.&quot;
              </div>
            </div>
            <p className="font-mono text-[10px] font-bold uppercase opacity-40">SUBMITTED: 25-OCT-2024 14:32 UTC</p>
          </div>

          {/* CLIENT EVIDENCE */}
          <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] rotate-[1deg] p-8 relative">
            <h3 className="text-2xl font-black uppercase text-[#1A1A1A] mb-2 tracking-tight">🏢 CLIENT_EVIDENCE</h3>
            <p className="font-mono text-xs font-bold uppercase opacity-60 mb-6 border-b-4 border-[#1A1A1A] pb-4">0x1A4...B98C</p>

            {/* Files */}
            <div className="space-y-3 mb-6">
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">SUBMITTED_FILES</h4>
              {[
                { name: "original_spec_v1.pdf", hash: "QmC3...9pL1" },
                { name: "chat_logs_with_freelancer.txt", hash: "QmD8...2nM5" },
              ].map((file, i) => (
                <div key={i} className="border-2 border-[#1A1A1A] px-3 py-2 flex justify-between items-center font-mono text-xs font-bold uppercase bg-white">
                  <span>📄 {file.name}</span>
                  <span className="opacity-40">IPFS: {file.hash}</span>
                </div>
              ))}
            </div>

            {/* Proof Links */}
            <div className="mb-6">
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">PROOF_LINKS</h4>
              <div className="space-y-2 font-mono text-xs font-bold">
                <div className="border-2 border-[#1A1A1A] px-3 py-2 bg-white">🔗 figma.com/client-design-spec-v2</div>
              </div>
            </div>

            {/* Statement */}
            <div className="mb-4">
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">STATEMENT</h4>
              <div className="bg-white border-4 border-[#1A1A1A] p-4 font-mono text-xs font-bold leading-relaxed">
                &quot;The delivered UI does not match the design specification provided. Multiple components 
                are missing responsive behavior and the NFT gallery grid is broken on mobile. I communicated 
                required changes via chat before the deadline. Work is incomplete.&quot;
              </div>
            </div>
            <p className="font-mono text-[10px] font-bold uppercase opacity-40">SUBMITTED: 26-OCT-2024 09:15 UTC</p>
          </div>
        </div>
      </section>

      {/* TORN EDGE DIVIDER */}
      <div className="h-16 bg-[#F0EAD6] torn-edge -mt-8 relative z-20"></div>

      {/* VOTE SECTION */}
      <section className="bg-[#1A1A1A] py-20 px-6 md:px-12 text-white relative">
        <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-[#F0EAD6] text-center mb-16 text-distressed">
            CAST_VOTE
          </h2>

          {/* VOTE TALLY BARS */}
          <div className="mb-12">
            <div className="flex justify-between font-black text-xl uppercase mb-4">
              <span className="text-[#DC143C]">FREELANCER [{freelancerVotes}%]</span>
              <span className="text-[#C5A945]">[{clientVotes}%] CLIENT</span>
            </div>
            <div className="h-16 w-full flex border-4 border-white overflow-hidden">
              <div 
                className="bg-[#DC143C] flex items-center justify-center font-black text-2xl text-white transition-all duration-1000"
                style={{ width: `${freelancerVotes}%` }}
              >
                {freelancerVotes}%
              </div>
              <div 
                className="bg-[#C5A945] flex items-center justify-center font-black text-2xl text-[#1A1A1A] transition-all duration-1000"
                style={{ width: `${clientVotes}%` }}
              >
                {clientVotes}%
              </div>
            </div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-center mt-4 opacity-60">
              24 NODES VOTED • QUORUM: 15 / 30
            </p>
          </div>

          {/* VOTE BUTTONS or CONFIRMED STATE */}
          {!hasVoted ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16">
              <button 
                onClick={() => handleVote('freelancer')}
                className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] p-8 text-xl font-black uppercase hover:animate-jitter hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all"
              >
                ⚡ VOTE: FREELANCER
              </button>
              <button 
                onClick={() => handleVote('client')}
                className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#C5A945] shadow-[8px_8px_0_#C5A945] p-8 text-xl font-black uppercase hover:animate-jitter hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all"
              >
                🏢 VOTE: CLIENT
              </button>
            </div>
          ) : (
            <div className="text-center mb-16">
              <div className="inline-block bg-[#10B981] text-[#1A1A1A] px-8 py-4 border-4 border-white font-black text-2xl uppercase shadow-[8px_8px_0_#C5A945] rotate-[-1deg] animate-flicker">
                ✓ VOTE RECORDED ON-CHAIN — {votedFor === 'freelancer' ? 'FREELANCER' : 'CLIENT'}
              </div>
              <p className="font-mono text-xs font-bold uppercase mt-6 opacity-40">
                TX: 0x9f8a...3b2c • BLOCK: #18,442,891
              </p>
            </div>
          )}

          {/* ARBITER INFO */}
          <div className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] p-6 rotate-[-0.5deg] max-w-2xl mx-auto">
            <h4 className="font-black text-lg uppercase mb-4 border-b-4 border-[#1A1A1A] pb-2">ARBITER_PROTOCOL</h4>
            <div className="font-mono text-xs font-bold uppercase leading-loose space-y-1">
              <p>DISPUTE TYPE: DELIVERABLE QUALITY</p>
              <p>REQUIRED QUORUM: 30 ARBITER NODES</p>
              <p>CURRENT NODES: 24 / 30</p>
              <p>STAKE REQUIRED: 0.01 ETH PER VOTE</p>
              <p>RESOLUTION: MAJORITY (&gt;50%) AFTER QUORUM</p>
              <p>APPEAL WINDOW: 48 HOURS POST-VERDICT</p>
            </div>
          </div>
        </div>
      </section>

      {/* TORN EDGE */}
      <div className="h-16 bg-[#1A1A1A] torn-edge -mt-8 relative z-20"></div>

      {/* OUTCOME SECTION (Resolved State Preview) */}
      <section className="bg-[#F0EAD6] py-20 px-6 md:px-12 relative">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#C5A945] border-8 border-[#1A1A1A] shadow-[16px_16px_0_#1A1A1A] p-12 text-center rotate-[1deg] relative">
            <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
            <div className="relative z-10">
              <span className="font-mono text-xs font-black uppercase tracking-widest block mb-4">DISPUTE RESOLUTION PROJECTION</span>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] text-distressed mb-6">
                FREELANCER WINS
              </h2>
              <p className="font-mono text-sm font-bold uppercase mb-8">
                PROJECTED BASED ON CURRENT VOTE TALLY • NOT FINAL UNTIL QUORUM
              </p>
              <div className="inline-block bg-[#1A1A1A] text-[#F0EAD6] border-4 border-white px-8 py-4 font-black text-xl uppercase rotate-[-1deg]">
                1.2 ETH → FREELANCER WALLET
              </div>
              <p className="font-mono text-[10px] font-bold uppercase mt-6 opacity-50">
                PROJECTED TX: PENDING • APPEAL WINDOW: 48H POST-VERDICT
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BACK NAVIGATION */}
      <section className="bg-[#F0EAD6] py-8 px-12 border-t-4 border-[#1A1A1A]">
        <Link href="/projects" className="font-black text-sm uppercase text-[#DC143C] hover:underline">
          ← BACK TO MY PROJECTS
        </Link>
      </section>
    </div>
  );
}
