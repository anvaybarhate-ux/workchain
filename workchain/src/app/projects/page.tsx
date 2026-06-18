"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout';
import RequireWallet from '@/components/RequireWallet';
import { getProjects } from "@/lib/api";
import { getEscrowContract, getReadProvider } from "@/lib/contracts";
import { formatAddress, formatEth, formatDate } from "@/lib/format";

export default function ProjectsPage() {
  const router = useRouter();
  const {
    address,
    isConnected,
    role,
    changeRole,
    disconnectWallet
  } = useWallet();

  const activeRole = role || 'freelancer';
  const [projects, setProjects] = useState<any[]>([]);
  const [escrowMilestones, setEscrowMilestones] = useState<Record<string, { current: number, total: number }>>({});
  
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'COMPLETE' | 'DISPUTED'>('ALL');
  const [search, setSearch] = useState('');
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleRoleToggle = () => {
    const newRole = activeRole === 'freelancer' ? 'client' : 'freelancer';
    disconnectWallet();
    localStorage.setItem("workchain_role", newRole);
    router.push('/connect');
  };

  const fetchProjectsData = async () => {
    if (!address) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await getProjects(address);
      setProjects(data);

      // Fetch on-chain milestones count and progress index
      data.forEach(async (project: any) => {
        if (project.contract_address) {
          try {
            const provider = getReadProvider();
            const contract = getEscrowContract(project.contract_address, provider);
            if (contract) {
              const state = await contract.getProject();
              const totalCountBig = await contract.getMilestoneCount();
              const totalCount = Number(totalCountBig);
              const activeIndex = Number(state[7]);
              let approvedCount = activeIndex;

              if (activeIndex < totalCount) {
                const activeMilestone = await contract.getMilestone(activeIndex);
                const activeMilestoneStatus = Number(activeMilestone[4]);
                if (activeMilestoneStatus === 4) { // MilestoneStatus.Released
                  approvedCount = activeIndex + 1;
                }
              } else {
                approvedCount = totalCount;
              }

              setEscrowMilestones(prev => ({
                ...prev,
                [project.contract_address]: { current: approvedCount, total: totalCount }
              }));
            }
          } catch (onChainErr) {
            console.warn(`Error fetching on-chain state for project ${project.id}:`, onChainErr);
          }
        }
      });

    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchProjectsData();

      const interval = setInterval(() => {
        fetchProjectsData();
      }, 30000); // Polling every 30 seconds

      return () => clearInterval(interval);
    }
  }, [address, isConnected, refreshTrigger]);

  // Tab count calculations
  const activeProjectsCount = projects.filter(p => p.status?.toLowerCase() === 'active').length;
  const pendingProjectsCount = projects.filter(p => p.status?.toLowerCase() === 'pending').length;
  const completeProjectsCount = projects.filter(p => p.status?.toLowerCase() === 'complete').length;
  const disputedProjectsCount = projects.filter(p => p.status?.toLowerCase() === 'disputed').length;

  const filteredProjects = projects.filter((p) => {
    const matchesFilter = filter === 'ALL' || p.status?.toLowerCase() === filter.toLowerCase();
    const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase()) || 
                          (p.contract_address && p.contract_address.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const filterTabs = ['ALL', 'ACTIVE', 'PENDING', 'COMPLETE', 'DISPUTED'] as const;

  const getFormattedDeadline = (dateStr: string | null | undefined) => {
    if (!dateStr) return "NO DEADLINE";
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return "NO DEADLINE";
    return formatDate(Math.floor(parsed.getTime() / 1000));
  };

  return (
    <RequireWallet>
      <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
        <Sidebar activePath="/projects" />

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto px-8 py-12 relative w-full overflow-x-hidden">
      
        {/* Toggle Utility */}
        <div className="absolute top-4 right-8 z-50">
          <button 
            onClick={handleRoleToggle}
            className="bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] font-black uppercase text-xs px-4 py-2 shadow-[4px_4px_0_#1A1A1A] hover:bg-white transition-all cursor-pointer"
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
          {activeRole === 'client' && (
            <button 
              onClick={() => router.push("/client/create")}
              className="bg-[#DC143C] text-[#F0EAD6] px-8 py-4 text-xl font-black uppercase border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all rotate-[1deg] cursor-pointer"
            >
              NEW PROJECT +
            </button>
          )}
        </div>

        {/* ERROR STATE */}
        {isError && (
          <div className="bg-white border-4 border-[#DC143C] p-6 mb-12 shadow-[8px_8px_0_#DC143C] rotate-[-1deg] flex flex-col sm:flex-row justify-between items-center gap-4 animate-jitter-slow">
            <div className="flex items-center gap-4">
              <span className="text-4xl">⚠</span>
              <div>
                <h4 className="text-2xl font-black text-[#DC143C] font-sans">API_ERROR — BACKEND OFFLINE</h4>
                <p className="font-mono text-xs font-bold uppercase mt-1">Failed to fetch project listings. The backend database may be offline.</p>
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

        {/* FILTER & SEARCH ROW */}
        <div className="flex flex-col xl:flex-row justify-between gap-6 mb-12">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => {
              const isActive = filter === tab;
              let count = projects.length;
              if (tab === 'ACTIVE') count = activeProjectsCount;
              if (tab === 'PENDING') count = pendingProjectsCount;
              if (tab === 'COMPLETE') count = completeProjectsCount;
              if (tab === 'DISPUTED') count = disputedProjectsCount;
              
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex items-center gap-3 px-6 py-3 font-black uppercase text-sm border-[3px] transition-all cursor-pointer
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

        {/* LOADING / SKELETON CARDS */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#1A1A1A] animate-pulse border-4 border-[#1A1A1A]/50 p-8 min-h-[280px] flex flex-col justify-between">
                <div className="h-6 bg-[#F0EAD6]/20 w-3/4"></div>
                <div className="h-10 bg-[#F0EAD6]/20 w-1/2"></div>
                <div className="h-12 bg-[#F0EAD6]/20 w-full mt-4"></div>
              </div>
            ))}
          </div>
        ) : (
          /* PROJECTS GRID */
          filteredProjects.length === 0 ? (
            <div className="w-full py-32 border-4 border-dashed border-[#1A1A1A] flex flex-col items-center justify-center rotate-[-1deg] bg-white opacity-80">
              <h3 className="text-4xl font-black font-sans uppercase mb-4 text-[#DC143C] tracking-tighter">
                NO_{filter}_CONTRACTS_FOUND
              </h3>
              <p className="font-mono text-sm font-bold uppercase">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredProjects.map((project, i) => {
                // Status Styling Configuration
                let statusBg = "bg-[#1A1A1A]";
                let statusText = "text-[#F0EAD6]";
                let fallbackRotation = i % 2 === 0 ? 'rotate-[1deg]' : 'rotate-[-1deg]';
                
                const rawStatus = project.status?.toUpperCase();
                if (rawStatus === 'ACTIVE') { statusBg = "bg-[#DC143C]"; statusText = "text-white animate-flicker"; fallbackRotation = 'rotate-[0deg]';}
                if (rawStatus === 'COMPLETE') { statusBg = "bg-[#C5A945]"; statusText = "text-[#1A1A1A]"; fallbackRotation = 'rotate-[-1deg]';}
                if (rawStatus === 'PENDING') { statusBg = "bg-white"; statusText = "text-[#1A1A1A] border-2 border-[#1A1A1A]"; fallbackRotation = 'rotate-[1deg]'; }

                // Milestone progress calculation
                const onChainMilestone = escrowMilestones[project.contract_address] || { current: 0, total: project.milestones?.length || 1 };
                const approvedCount = onChainMilestone.current;
                const totalCount = onChainMilestone.total;
                const percent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

                const rawVal = parseFloat(project.total_value_eth || 0);
                const weiVal = BigInt(Math.round(rawVal * 1e18));

                // Resolve other party wallet address
                const otherWallet = activeRole === 'freelancer' ? project.client_wallet : project.freelancer_wallet;

                return (
                  <div key={project.id} className={`bg-[#F0EAD6] border-4 border-[#1A1A1A] p-8 shadow-[8px_8px_0_#1A1A1A] torn-edge ${fallbackRotation} hover:-translate-y-2 hover:shadow-[12px_12px_0_#DC143C] transition-all flex flex-col justify-between min-h-[280px]`}>
                    
                    {/* Top Row: Name & Status */}
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <h3 className="text-3xl font-black uppercase font-sans tracking-tight leading-none text-[#1A1A1A] line-clamp-2">
                        {project.title}
                      </h3>
                      <span className={`${statusBg} ${statusText} px-3 py-1 font-black text-[10px] uppercase border-2 border-[#1A1A1A] shrink-0`}>
                        {project.status?.toUpperCase()}
                      </span>
                    </div>

                    {/* Wallet & ETH Value */}
                    <div className="mb-6">
                      <p className="font-mono text-xs font-bold uppercase opacity-60 mb-1">
                        {activeRole === 'freelancer' ? 'CLIENT:' : 'FREELANCER:'} {otherWallet ? formatAddress(otherWallet) : "NOT_SPECIFIED"}
                      </p>
                      <p className="text-5xl font-black text-[#1A1A1A] tracking-tighter">
                        {formatEth(weiVal)}
                      </p>
                    </div>

                    {/* Progress Bar Component */}
                    <div className="mb-8">
                      <div className="flex justify-between font-mono text-[10px] font-black uppercase mb-2">
                        <span>MILESTONE {approvedCount}/{totalCount}</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="h-4 border-2 border-[#1A1A1A] bg-white w-full overflow-hidden">
                        <div 
                          className="h-full bg-[#DC143C] border-r-2 border-[#1A1A1A] transition-all duration-1000" 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Bottom Interaction Row */}
                    <div className="pt-4 border-t-4 border-[#1A1A1A] flex justify-between items-center w-full mt-auto">
                      <span className="font-mono text-xs font-black uppercase">
                        DUE: {getFormattedDeadline(project.end_date)}
                      </span>
                      <button 
                        onClick={() => router.push("/projects/" + project.id)}
                        className="font-black text-sm uppercase text-[#DC143C] hover:underline hover:text-[#1A1A1A] cursor-pointer"
                      >
                        VIEW DETAILS →
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
      </div>
    </RequireWallet>
  );
}
