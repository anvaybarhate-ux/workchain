"use client";

import React, { useState } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  status: 'ACTIVE' | 'COMPLETE' | 'DISPUTED' | 'PENDING';
  ethValue: string;
  milestoneCurrent: number;
  milestoneTotal: number;
  wallet: string;
  deadline: string;
}

export default function ProjectsPage() {
  const [role, setRole] = useState<'freelancer' | 'client'>('freelancer');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'COMPLETE' | 'DISPUTED'>('ALL');
  const [search, setSearch] = useState('');

  const mockProjects: Project[] = [
    { id: '1', name: 'DeFi Analytics Platform', status: 'ACTIVE', ethValue: '4.2', milestoneCurrent: 3, milestoneTotal: 5, wallet: '0x1A4...B98C', deadline: '24-NOV-2024' },
    { id: '2', name: 'NFT Marketplace UI', status: 'DISPUTED', ethValue: '2.8', milestoneCurrent: 2, milestoneTotal: 4, wallet: '0xE89...F12A', deadline: 'PAUSED' },
    { id: '3', name: 'DAO Governance App', status: 'COMPLETE', ethValue: '6.0', milestoneCurrent: 5, milestoneTotal: 5, wallet: '0x3C2...D453', deadline: 'SETTLED' },
    { id: '4', name: 'Token Vesting Portal', status: 'PENDING', ethValue: '1.5', milestoneCurrent: 1, milestoneTotal: 3, wallet: '0x7F1...A329', deadline: 'AWAITING FUNDING' },
    { id: '5', name: 'Smart Contract Audit', status: 'ACTIVE', ethValue: '3.2', milestoneCurrent: 2, milestoneTotal: 6, wallet: '0x9B4...E561', deadline: '10-DEC-2024' },
    { id: '6', name: 'Web3 Dashboard', status: 'PENDING', ethValue: '0.8', milestoneCurrent: 0, milestoneTotal: 3, wallet: '0x2D8...C890', deadline: 'AWAITING APPROVAL' },
  ];

  const filteredProjects = mockProjects.filter((p) => {
    const matchesFilter = filter === 'ALL' || p.status === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.wallet.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterTabs = ['ALL', 'ACTIVE', 'PENDING', 'COMPLETE', 'DISPUTED'] as const;

  return (
    <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
      
      {/* SIDEBAR (Reusable structural match from Dashboard) */}
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
      <main className="flex-1 overflow-y-auto px-8 py-12 relative w-full overflow-x-hidden">
        
        {/* Toggle Utility (For Preview only) */}
        <div className="absolute top-4 right-8 z-50">
          <button 
            onClick={() => setRole(r => r === 'freelancer' ? 'client' : 'freelancer')}
            className="bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] font-black uppercase text-xs px-4 py-2 shadow-[4px_4px_0_#1A1A1A] hover:bg-white transition-all"
          >
            SWITCH ROLE
          </button>
        </div>

        {/* TOP SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b-8 border-[#1A1A1A] pb-6 gap-6">
          <div>
            <span className="text-[#DC143C] font-black uppercase text-sm mb-2 block tracking-widest animate-flicker">
              MY_PROJECTS
            </span>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none mb-2 text-distressed">
              CONTRACTS.
            </h1>
          </div>
          {role === 'client' && (
            <Link href="/client/create" className="bg-[#DC143C] text-[#F0EAD6] px-8 py-4 text-xl font-black uppercase border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all rotate-[1deg]">
              NEW PROJECT +
            </Link>
          )}
        </div>

        {/* FILTER & SEARCH ROW */}
        <div className="flex flex-col xl:flex-row justify-between gap-6 mb-12">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => {
              const isActive = filter === tab;
              const count = tab === 'ALL' 
                ? mockProjects.length 
                : mockProjects.filter(p => p.status === tab).length;
              
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex items-center gap-3 px-6 py-3 font-black uppercase text-sm border-[3px] transition-all
                    ${isActive 
                      ? 'bg-[#DC143C] text-white border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] -translate-y-1' 
                      : 'bg-transparent text-[#1A1A1A] border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6]'
                    }
                  `}
                >
                  {tab}
                  <span className={`font-mono text-[10px] px-2 py-0.5 border-2 ${isActive ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full xl:w-96">
            <input 
              type="text" 
              placeholder="SEARCH CONTRACTS..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] px-6 py-3 font-mono font-bold uppercase text-sm placeholder:text-[#1A1A1A]/40 outline-none focus:ring-0 focus:border-[#DC143C]"
            />
          </div>
        </div>

        {/* PROJECTS GRID */}
        {filteredProjects.length === 0 ? (
          <div className="w-full py-32 border-4 border-dashed border-[#1A1A1A] flex flex-col items-center justify-center rotate-[-1deg] bg-white opacity-80">
            <h3 className="text-4xl font-black font-sans uppercase mb-4 text-[#DC143C] tracking-tighter">NO_CONTRACTS_FOUND</h3>
            <p className="font-mono text-sm font-bold uppercase">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredProjects.map((project, i) => {
              // Status Styling Configuration
              let statusBg = "bg-[#1A1A1A]";
              let statusText = "text-[#F0EAD6]";
              let fallbackRotation = i % 2 === 0 ? 'rotate-[1deg]' : 'rotate-[-1deg]';
              
              if (project.status === 'ACTIVE') { statusBg = "bg-[#DC143C]"; statusText = "text-white animate-flicker"; fallbackRotation = 'rotate-[0deg]';}
              if (project.status === 'COMPLETE') { statusBg = "bg-[#C5A945]"; statusText = "text-[#1A1A1A]"; fallbackRotation = 'rotate-[-1deg]';}
              if (project.status === 'PENDING') { statusBg = "bg-white"; statusText = "text-[#1A1A1A] border-2 border-[#1A1A1A]"; fallbackRotation = 'rotate-[1deg]'; }

              return (
                <div key={project.id} className={`bg-[#F0EAD6] border-4 border-[#1A1A1A] p-8 shadow-[8px_8px_0_#1A1A1A] torn-edge ${fallbackRotation} hover:-translate-y-2 hover:shadow-[12px_12px_0_#DC143C] transition-all flex flex-col justify-between min-h-[280px]`}>
                  
                  {/* Top Row: Name & Status */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h3 className="text-3xl font-black uppercase font-sans tracking-tight leading-none text-[#1A1A1A] line-clamp-2">
                      {project.name}
                    </h3>
                    <span className={`${statusBg} ${statusText} px-3 py-1 font-black text-[10px] uppercase border-2 border-[#1A1A1A] shrink-0`}>
                      {project.status}
                    </span>
                  </div>

                  {/* Wallet & ETH Value */}
                  <div className="mb-6">
                    <p className="font-mono text-xs font-bold uppercase opacity-60 mb-1">
                      {role === 'freelancer' ? 'CLIENT:' : 'FREELANCER:'} {project.wallet}
                    </p>
                    <p className="text-5xl font-black text-[#1A1A1A] tracking-tighter">
                      {project.ethValue} ETH
                    </p>
                  </div>

                  {/* Progress Bar Component */}
                  <div className="mb-8">
                    <div className="flex justify-between font-mono text-[10px] font-black uppercase mb-2">
                      <span>MILESTONE {project.milestoneCurrent}/{project.milestoneTotal}</span>
                      <span>{Math.round((project.milestoneCurrent/project.milestoneTotal)*100)}%</span>
                    </div>
                    <div className="h-4 border-2 border-[#1A1A1A] bg-white w-full overflow-hidden">
                      <div 
                        className="h-full bg-[#DC143C] border-r-2 border-[#1A1A1A] transition-all duration-1000" 
                        style={{ width: `${(project.milestoneCurrent / project.milestoneTotal) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Bottom Interaction Row */}
                  <div className="pt-4 border-t-4 border-[#1A1A1A] flex justify-between items-center w-full mt-auto">
                    <span className="font-mono text-xs font-black uppercase">
                      DUE: {project.deadline}
                    </span>
                    <Link href={`/projects/${project.id}`} className="font-black text-sm uppercase text-[#DC143C] hover:underline hover:text-[#1A1A1A]">
                      VIEW DETAILS →
                    </Link>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  );
}
