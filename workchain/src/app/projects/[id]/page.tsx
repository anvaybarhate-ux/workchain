"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function ProjectDetail() {
  const [role, setRole] = useState<'freelancer' | 'client'>('freelancer');
  const [uploadLink, setUploadLink] = useState('');
  const [notes, setNotes] = useState('');

  const milestones = [
    { id: 1, name: "SYSTEM ARCHITECTURE", amount: "0.5 ETH", date: "01-OCT-24", status: 'DONE' },
    { id: 2, name: "SMART CONTRACTS", amount: "1.2 ETH", date: "15-OCT-24", status: 'DONE' },
    { id: 3, name: "BACKEND API", amount: "1.0 ETH", date: "28-OCT-24", status: 'ACTIVE' },
    { id: 4, name: "FRONTEND UI", amount: "0.8 ETH", date: "10-NOV-24", status: 'PENDING' },
    { id: 5, name: "AUDIT & LAUNCH", amount: "0.7 ETH", date: "24-NOV-24", status: 'PENDING' }
  ];

  const activityLog = [
    { time: "2 HRS AGO", action: "Client requested clarification on API docs.", rotate: "rotate-[1deg]" },
    { time: "1 DAY AGO", action: "Milestone 2 payment (1.2 ETH) released.", rotate: "rotate-[-1deg]" },
    { time: "1 DAY AGO", action: "Client approved Milestone 2 deliverables.", rotate: "rotate-[0deg]" },
    { time: "3 DAYS AGO", action: "Freelancer submitted Milestone 2 deliverables.", rotate: "rotate-[0.5deg]" },
    { time: "15 DAYS AGO", action: "Milestone 1 payment (0.5 ETH) released.", rotate: "rotate-[-0.5deg]" }
  ];

  return (
    <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
      
      {/* SIDEBAR */}
      <aside className="w-[260px] bg-[#1A1A1A] border-r-4 border-[#DC143C] flex flex-col justify-between hidden md:flex shrink-0 z-30 relative shadow-[12px_12px_0_#DC143C]">
        <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
        <div>
          <div className="bg-[#DC143C] p-6 border-b-4 border-white mb-6">
             <Link href="/" className="text-4xl font-black text-[#F0EAD6] tracking-tighter shadow-sm text-distressed">
               WC.01X
             </Link>
          </div>
          
          <div className="px-6 mb-10">
            <span className={`px-4 py-1 font-black text-xs uppercase border-2 flex w-fit shadow-[4px_4px_0_#F0EAD6] ${role === 'freelancer' ? 'bg-[#DC143C] text-white border-white' : 'bg-[#C5A945] text-[#1A1A1A] border-[#1A1A1A]'}`}>
              {role}
            </span>
          </div>

          <nav className="flex flex-col gap-2 px-4 relative z-10">
            <Link href="/dashboard" className="text-left font-black text-xs uppercase tracking-widest text-[#F0EAD6] opacity-60 hover:opacity-100 hover:text-[#DC143C] hover:bg-[#1A1A1A] px-4 py-3 transition-colors block">
              ⬛ DASHBOARD
            </Link>
            <Link href="/projects" className="text-left font-black text-xs uppercase tracking-widest text-[#1A1A1A] bg-[#DC143C] px-4 py-3 border-2 border-white shadow-[4px_4px_0_#F0EAD6] block">
              📁 MY PROJECTS
            </Link>
            {role === 'freelancer' ? (
              <button className="text-left font-black text-xs uppercase tracking-widest text-[#F0EAD6] opacity-60 hover:opacity-100 hover:text-[#DC143C] hover:bg-[#1A1A1A] px-4 py-3 transition-colors">
                ⭐ REPUTATION
              </button>
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

        <div className="p-6 border-t-4 border-white/20 relative z-10">
          <div className="font-mono text-xs text-[#F0EAD6] mb-4 opacity-70">
            0x8F9...A42B
          </div>
          <button className="bg-[#1A1A1A] text-[#F0EAD6] border-2 border-white text-[10px] font-black px-3 py-1 shadow-[2px_2px_0_#DC143C] hover:translate-x-1 transition-transform uppercase">
            DISCONNECT
          </button>
          <div className="mt-6 flex items-center gap-2">
             <span className="font-mono text-[10px] uppercase font-black text-white">NODE: LIVE</span>
             <span className="w-2 h-2 rounded-full bg-[#10B981] animate-flicker"></span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto px-6 md:px-12 py-10 relative w-full overflow-x-hidden">
        
        {/* Toggle Utility (For Preview only) */}
        <div className="absolute top-4 right-8 z-50">
          <button 
            onClick={() => setRole(r => r === 'freelancer' ? 'client' : 'freelancer')}
            className="bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] font-black uppercase text-xs px-4 py-2 shadow-[4px_4px_0_#1A1A1A] hover:bg-white transition-all"
          >
            SWITCH ROLE
          </button>
        </div>

        {/* BREADCRUMB */}
        <div className="font-mono text-xs font-bold uppercase tracking-widest opacity-60 mb-8 border-b-4 border-[#1A1A1A] pb-4 inline-flex gap-4 items-center">
          <Link href="/projects" className="hover:text-[#DC143C]">MY_PROJECTS</Link> 
          <span>/</span> 
          <span>DeFi Analytics Platform</span>
        </div>

        {/* PROJECT HEADER CARD */}
        <div className="bg-[#1A1A1A] text-[#F0EAD6] p-8 md:p-12 border-4 border-[#DC143C] shadow-[8px_8px_0_#C5A945] rotate-[-0.5deg] relative mb-16">
          <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-6 mb-8 border-b-4 border-white/10 pb-8">
            <div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-distressed leading-none mb-4">
                DeFi Analytics<br/>Platform
              </h1>
              <span className="bg-[#DC143C] text-white px-3 py-1 font-black text-xs uppercase border-2 border-white animate-flicker">
                ACTIVE
              </span>
            </div>
            
            <div className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#DC143C] rotate-[1deg]">
               <p className="font-mono text-xs font-black uppercase mb-1 opacity-60 w-full text-center">ESCROW BALANCE</p>
               <p className="font-black text-4xl whitespace-nowrap text-center">2.5 ETH <span className="text-[#DC143C]">LOCKED</span></p>
               <a href="#" className="font-mono text-[10px] uppercase font-bold tracking-widest text-center w-full block mt-4 hover:underline">
                 VIEW ON ETHERSCAN ↗
               </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono text-sm relative z-10 uppercase font-bold">
            <div>
              <p className="opacity-50 text-[10px] mb-1">CLIENT WALLET</p>
              <p>0x1A4...B98C</p>
            </div>
            <div>
              <p className="opacity-50 text-[10px] mb-1">FREELANCER WALLET</p>
              <p>0x8F9...A42B</p>
            </div>
            <div>
              <p className="opacity-50 text-[10px] mb-1">TOTAL CONTRACT VALUE</p>
              <p>4.2 ETH</p>
            </div>
            <div>
              <p className="opacity-50 text-[10px] mb-1">DEPLOYED DATE</p>
              <p>15-SEP-2024</p>
            </div>
          </div>
        </div>

        {/* MILESTONE TIMELINE */}
        <section className="mb-16">
          <span className="text-[#DC143C] font-black uppercase text-sm mb-4 block tracking-widest animate-flicker">MILESTONE_CHAIN</span>
          
          <div className="flex gap-4 md:gap-0 justify-between items-start w-full relative mt-8 overflow-x-auto pb-8 pt-4">
            {/* Background Line */}
            <div className="absolute top-[30px] left-8 right-8 border-t-8 border-[#1A1A1A] hidden md:block"></div>
            
            {milestones.map((m) => {
              let nodeStyle = "";
              let content = "";
              
              if (m.status === 'DONE') {
                nodeStyle = "bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A]";
                content = "✓";
              } else if (m.status === 'ACTIVE') {
                nodeStyle = "bg-[#DC143C] text-white border-4 border-[#1A1A1A] shadow-[0_0_0_8px_rgba(220,20,60,0.3)] animate-pulse rotate-[-2deg]";
                content = "●";
              } else if (m.status === 'PENDING') {
                nodeStyle = "bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] opacity-50";
                content = "-";
              } else if (m.status === 'DISPUTED') {
                 nodeStyle = "bg-[#1A1A1A] text-white border-4 border-[#DC143C] shadow-[4px_4px_0_#DC143C] animate-jitter";
                 content = "!";
              }

              return (
                <div key={m.id} className="relative z-10 flex flex-col items-center min-w-[120px]">
                  <div className={`w-[60px] h-[60px] flex items-center justify-center font-black text-2xl ${nodeStyle}`}>
                    {content}
                  </div>
                  <div className="text-center mt-6 uppercase">
                    <p className="font-mono text-xs font-black tracking-tighter mb-1 border-b-2 border-[#1A1A1A] inline-block">{m.name}</p>
                    <p className="font-black text-lg text-[#1A1A1A] leading-tight">{m.amount}</p>
                    <p className="font-mono text-[10px] font-bold opacity-60">{m.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* TWO COLUMN BOTTOM LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* LEFT: ACTIVE MILESTONE EXPANDED PANEL */}
          <div className="lg:col-span-2 space-y-8">
            <h3 className="text-3xl font-black uppercase text-[#1A1A1A] border-b-8 border-[#1A1A1A] pb-2">ACTIVE_PHASE</h3>
            
            <div className="bg-[#F0EAD6] border-4 border-[#DC143C] shadow-[12px_12px_0_#1A1A1A] rotate-[0.5deg] p-8 md:p-10 torn-edge relative">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#DC143C] border-2 border-[#DC143C] px-2 py-0.5">M-03</span>
              <h2 className="text-4xl font-black font-sans uppercase mt-4 mb-4">BACKEND API DEVELOPMENT</h2>
              <p className="font-mono text-sm leading-relaxed font-bold opacity-80 mb-8 max-w-xl">
                Develop all necessary smart contract adapter pipelines and JSON RPC endpoints. The API must cover full CRUD operations for escrow state and milestone tracking. Test coverage minimum 95%.
              </p>
              <div className="font-black text-[4rem] text-[#DC143C] tracking-tighter leading-none mb-8 border-b-4 border-[#1A1A1A] pb-8 block w-full border-dashed">
                1.0 ETH
              </div>

              {/* DYNAMIC ROLE VIEWS */}
              {role === 'freelancer' ? (
                // FREELANCER SUBMIT AREA
                <div>
                  <h4 className="font-black text-xl uppercase mb-6 flex items-center gap-4">
                    <span className="bg-[#1A1A1A] text-white px-2">↳</span> SUBMIT_DELIVERABLES
                  </h4>
                  
                  {/* Upload Zone */}
                  <div className="border-4 border-dashed border-[#1A1A1A] bg-[#1A1A1A]/5 p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-[#1A1A1A]/10 transition-colors mb-6 text-center">
                    <span className="text-4xl mb-4">📁</span>
                    <span className="font-mono text-sm font-black uppercase tracking-widest">DRAG FILES HERE OR CLICK TO UPLOAD</span>
                  </div>

                  {/* Links & Text */}
                  <div className="flex gap-4 mb-6">
                    <input 
                      type="text" 
                      placeholder="GITHUB REPO URL..."
                      value={uploadLink}
                      onChange={(e) => setUploadLink(e.target.value)}
                      className="flex-1 bg-white border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] px-4 font-mono text-sm uppercase font-bold focus:outline-none"
                    />
                    <button className="bg-[#1A1A1A] text-[#F0EAD6] px-6 py-3 font-black text-xs uppercase shadow-[4px_4px_0_#DC143C] hover:translate-x-1 hover:-translate-y-1 transition-transform">
                      ADD LINK
                    </button>
                  </div>
                  
                  <textarea 
                    placeholder="DEVELOPMENT NOTES / PROOF OF COMPLETION..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] p-4 font-mono text-sm uppercase font-bold h-32 focus:outline-none mb-8 resize-none"
                  ></textarea>

                  <button className="w-full bg-[#DC143C] text-white border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] py-6 text-2xl font-black uppercase hover:animate-jitter transition-none">
                    SIGN & SUBMIT TRANSACTION
                  </button>
                </div>
              ) : (
                // CLIENT APPROVE AREA
                <div>
                  <h4 className="font-black text-xl uppercase mb-6 flex items-center gap-4">
                    <span className="bg-[#1A1A1A] text-white px-2">↳</span> AWAITING_YOUR_REVIEW
                  </h4>
                  
                  {/* Evidence Display */}
                  <div className="bg-white border-4 border-[#1A1A1A] p-6 mb-8 font-mono text-xs font-bold uppercase relative rotate-[-0.5deg]">
                    <div className="absolute top-0 right-0 bg-[#1A1A1A] text-[#F0EAD6] px-3 py-1 -translate-y-3 translate-x-3 text-[10px] tracking-widest">SUBMITTED: 28-OCT-24</div>
                    <div className="flex items-center gap-3 mb-4 text-[#1A1A1A]/80">
                      <span>🔗</span> <a href="#" className="underline">github.com/workchain/api-adapter-v2</a>
                    </div>
                    <div className="flex items-center gap-3 mb-6 text-[#1A1A1A]/80 border-b-2 border-dashed border-[#1A1A1A] pb-4">
                      <span>📁</span> <a href="#" className="underline">coverage_report.pdf</a> (2.4MB)
                    </div>
                    <p className="opacity-80 leading-relaxed italic">
                      "All CRUD operations implemented. Integration test coverage is at 98%. Ready for review."
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 mb-4">
                    <button className="flex-1 bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] py-5 text-xl font-black uppercase hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                      ✓ APPROVE — RELEASE 1.0 ETH
                    </button>
                    <button className="bg-white text-[#1A1A1A] border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] px-8 py-5 text-xl font-black uppercase hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                      ✗ REJECT
                    </button>
                  </div>
                  
                  <div className="text-center w-full">
                    <a href="#" className="font-mono text-xs uppercase text-[#DC143C] font-black underline underline-offset-4">
                      ⚖ RAISE DISPUTE
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: ACTIVITY LOG */}
          <div className="lg:col-span-1 border-l-0 lg:border-l-8 border-[#1A1A1A] pt-12 lg:pt-0 lg:pl-10">
            <h3 className="text-2xl font-black uppercase text-[#1A1A1A] border-b-8 border-[#C5A945] pb-2 mb-8">EVENT_LOG</h3>
            
            <div className="flex flex-col gap-6 relative">
              {/* Timeline Line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-1 bg-[#1A1A1A] opacity-20 -z-10"></div>
              
              {activityLog.map((log, i) => (
                <div key={i} className={`flex gap-4 ${log.rotate} hover:translate-x-2 transition-transform`}>
                  <div className="w-6 h-6 rounded-full border-4 border-[#1A1A1A] bg-[#C5A945] shrink-0 mt-1"></div>
                  <div>
                    <div className="font-mono text-[10px] font-black tracking-widest text-[#DC143C] bg-[#1A1A1A] px-2 py-0.5 inline-block mb-1">
                      {log.time}
                    </div>
                    <p className="font-bold text-sm leading-tight text-[#1A1A1A]">
                      {log.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>

      </main>
    </div>
  );
}
