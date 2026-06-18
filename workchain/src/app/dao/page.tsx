"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Dispute {
  id: string;
  title: string;
  ethStake: string;
  freelancer: string;
  client: string;
  freelancerVotes: number;
  clientVotes: number;
  initialTimeLeft: number; // in seconds
  status: 'OPEN' | 'VOTING' | 'RESOLVED';
  winner?: 'freelancer' | 'client';
  txHash?: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  votesFor: number;
  votesAgainst: number;
  durationLeft: string;
  status?: 'PASSING' | 'FAILING' | 'LIKELY TO FAIL';
  category: 'FEE_CHANGE' | 'PROTOCOL_UPGRADE' | 'DISPUTE_POLICY' | 'OTHER';
}

export default function DAOPage() {
  // Navigation & filter states
  const [disputeFilter, setDisputeFilter] = useState<'ALL' | 'OPEN' | 'VOTING' | 'RESOLVED'>('ALL');
  const [proposalFilter, setProposalFilter] = useState<'ALL' | 'FEE_CHANGE' | 'PROTOCOL_UPGRADE' | 'DISPUTE_POLICY' | 'OTHER'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [newProposalDesc, setNewProposalDesc] = useState('');
  const [newProposalCategory, setNewProposalCategory] = useState<'FEE_CHANGE' | 'PROTOCOL_UPGRADE' | 'DISPUTE_POLICY' | 'OTHER'>('FEE_CHANGE');
  const [newProposalDuration, setNewProposalDuration] = useState<3 | 7 | 14>(7);

  // Voting states
  const [votedDisputes, setVotedDisputes] = useState<Record<string, 'freelancer' | 'client'>>({});
  const [votedProposals, setVotedProposals] = useState<Record<string, 'for' | 'against'>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Staking states
  const [userStake, setUserStake] = useState<number>(0);
  const [totalStaked, setTotalStaked] = useState<number>(2400000);

  // Dispute mock data
  const [disputes, setDisputes] = useState<Dispute[]>([
    {
      id: 'D-0042',
      title: 'NFT Marketplace UI',
      ethStake: '1.2',
      freelancer: '0xab12...ef56',
      client: '0xcc34...aa78',
      freelancerVotes: 58,
      clientVotes: 42,
      initialTimeLeft: 189082, // 2 days 4 hours 31 minutes 22 seconds
      status: 'OPEN',
    },
    {
      id: 'D-0043',
      title: 'DEX Liquidity Mining Engine',
      ethStake: '0.8',
      freelancer: '0x7e8a...56bc',
      client: '0x99dd...88cc',
      freelancerVotes: 71,
      clientVotes: 29,
      initialTimeLeft: 66120, // 18 hours 22 minutes
      status: 'VOTING',
    },
    {
      id: 'D-0044',
      title: 'Solana Multisig Wallet',
      ethStake: '0.8',
      freelancer: '0x44d1...ff22',
      client: '0x33b2...bb99',
      freelancerVotes: 85,
      clientVotes: 15,
      initialTimeLeft: 0,
      status: 'RESOLVED',
      winner: 'freelancer',
      txHash: '0x1a2b3c4d5e6f7g8h9i0j',
    },
  ]);

  // Proposal mock data
  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: 'WIP-001',
      title: 'Reduce voting period from 7 days to 3 days',
      description: 'Shorten active community arbitration rounds to accelerate funds release on clear-cut disputes.',
      proposedBy: '0xabc123...def456',
      votesFor: 847,
      votesAgainst: 234,
      durationLeft: '3 DAYS REMAINING',
      category: 'DISPUTE_POLICY',
    },
    {
      id: 'WIP-002',
      title: 'Add Polygon network support',
      description: 'Expand the Workchain protocol suite to Polygon POS to offer stakers near-zero gas fee provisions.',
      proposedBy: '0xdef456...789abc',
      votesFor: 1204,
      votesAgainst: 89,
      durationLeft: '5 DAYS REMAINING',
      category: 'PROTOCOL_UPGRADE',
    },
    {
      id: 'WIP-003',
      title: 'Increase arbiter stake requirement',
      description: 'Double the minimum required staked WRKC tokens to lock community votes and minimize node dilution.',
      proposedBy: '0x456789...123def',
      votesFor: 456,
      votesAgainst: 678,
      durationLeft: '2 DAYS REMAINING',
      status: 'LIKELY TO FAIL',
      category: 'FEE_CHANGE',
    },
  ]);

  // Countdown timer useEffect
  useEffect(() => {
    const timer = setInterval(() => {
      setDisputes((prevDisputes) =>
        prevDisputes.map((d) => {
          if (d.initialTimeLeft > 0) {
            return { ...d, initialTimeLeft: d.initialTimeLeft - 1 };
          }
          return d;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return 'EXPIRED';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (d > 0) return `${d}D ${h}H ${m}M`;
    if (h > 0) return `${h}H ${m}M ${s}S`;
    return `${m}M ${s}S`;
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const handleCastDisputeVote = (disputeId: string, side: 'freelancer' | 'client') => {
    if (votedDisputes[disputeId]) {
      showToast('ALREADY VOTED!');
      return;
    }
    setVotedDisputes((prev) => ({ ...prev, [disputeId]: side }));

    // Adjust votes locally
    setDisputes((prev) =>
      prev.map((d) => {
        if (d.id === disputeId) {
          const addFree = side === 'freelancer' ? 1 : 0;
          const addClient = side === 'client' ? 1 : 0;
          const total = d.freelancerVotes + d.clientVotes + 1;
          const newFreePct = Math.round(((d.freelancerVotes + addFree) / total) * 100);
          return {
            ...d,
            freelancerVotes: newFreePct,
            clientVotes: 100 - newFreePct,
          };
        }
        return d;
      })
    );
    showToast('VOTE RECORDED!');
  };

  const handleCastProposalVote = (proposalId: string, side: 'for' | 'against') => {
    if (votedProposals[proposalId]) {
      showToast('ALREADY VOTED!');
      return;
    }
    setVotedProposals((prev) => ({ ...prev, [proposalId]: side }));

    // Adjust votes locally
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === proposalId) {
          const forVal = p.votesFor + (side === 'for' ? 1 : 0);
          const againstVal = p.votesAgainst + (side === 'against' ? 1 : 0);
          return {
            ...p,
            votesFor: forVal,
            votesAgainst: againstVal,
          };
        }
        return p;
      })
    );
    showToast('VOTE CAST!');
  };

  const handleStake = () => {
    setUserStake((prev) => prev + 100);
    setTotalStaked((prev) => prev + 100);
    showToast('STAKED 100 WRKC!');
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposalTitle || !newProposalDesc) {
      alert('Please fill out proposal title and specifications!');
      return;
    }

    if (userStake < 100) {
      alert('INSUFFICIENT WRKC: YOU NEED AT LEAST 100 WRKC STAKED TO SUBMIT!');
      return;
    }

    // Add to proposals
    const newProp: Proposal = {
      id: `WIP-${String(proposals.length + 1).padStart(3, '0')}`,
      title: newProposalTitle,
      description: newProposalDesc,
      proposedBy: '0x8f9a3c...0000',
      votesFor: 1,
      votesAgainst: 0,
      durationLeft: `${newProposalDuration} DAYS REMAINING`,
      category: newProposalCategory,
    };

    setProposals([newProp, ...proposals]);
    setIsModalOpen(false);
    setNewProposalTitle('');
    setNewProposalDesc('');
    showToast('PROPOSAL LIVE!');
  };

  // Filter lists
  const filteredDisputes = disputes.filter((d) => {
    if (disputeFilter === 'ALL') return true;
    return d.status === disputeFilter;
  });

  const filteredProposals = proposals.filter((p) => {
    if (proposalFilter === 'ALL') return true;
    return p.category === proposalFilter;
  });

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-[#F0EAD6] text-[#1A1A1A] font-mono overflow-x-hidden relative">
      
      {/* ─── HERO SECTION ─── */}
      <section className="bg-[#1A1A1A] text-[#F0EAD6] py-32 px-8 relative flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
        <div className="max-w-5xl relative z-10 w-full">
          <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.3em] block mb-4 animate-flicker">
            GOVERNANCE_MODULE
          </span>
          <h1 className="text-6xl md:text-9xl font-sans font-black uppercase tracking-tighter leading-none mb-2 select-none">
            COMMUNITY
          </h1>
          <h1 className="text-6xl md:text-9xl font-sans font-black uppercase tracking-tighter leading-none mb-8 text-[#DC143C] glitch-text select-none">
            GOVERNED.
          </h1>
          <p className="font-mono text-sm md:text-base font-bold uppercase tracking-tight text-[#F0EAD6]/55 max-w-xl mx-auto mb-12">
            Disputes resolved by the community. Fees set by vote. Power held by participants.
          </p>

          {/* Stat Row */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <div className="bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] rotate-[-1deg] px-8 py-4 text-2xl font-black uppercase font-sans whitespace-nowrap">
              24 OPEN VOTES
            </div>
            <div className="bg-[#DC143C] text-white border-4 border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] rotate-[1deg] px-8 py-4 text-2xl font-black uppercase font-sans whitespace-nowrap">
              892 ACTIVE VOTERS
            </div>
          </div>
        </div>

        {/* Torn Edge Border Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#F0EAD6] torn-edge z-20"></div>
      </section>

      {/* ─── HOW DAO WORKS ─── */}
      <section className="bg-[#F0EAD6] py-24 px-8 relative z-10 flex flex-col items-center">
        <div className="max-w-7xl w-full">
          <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-2">
            HOW_IT_WORKS
          </span>
          <h2 className="text-5xl md:text-7xl font-sans font-black uppercase tracking-tighter text-[#1A1A1A] mb-12">
            THE RULES.
          </h2>

          {/* 4 Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="bg-white border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] rotate-[-1deg] p-6 hover:-translate-y-1 transition-transform flex flex-col gap-4">
              <div className="text-4xl">🔐</div>
              <h3 className="font-sans font-black text-xl uppercase text-[#1A1A1A] tracking-tight">
                01 STAKE TO VOTE
              </h3>
              <p className="font-mono text-xs opacity-80 uppercase font-bold tracking-tight leading-relaxed">
                You must hold WRKC tokens to participate in governance votes. Staking proves skin in the game.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] rotate-[1deg] p-6 hover:-translate-y-1 transition-transform flex flex-col gap-4">
              <div className="text-4xl">📝</div>
              <h3 className="font-sans font-black text-xl uppercase text-[#1A1A1A] tracking-tight">
                02 PROPOSE
              </h3>
              <p className="font-mono text-xs opacity-80 uppercase font-bold tracking-tight leading-relaxed">
                Any staked member can submit a governance proposal — fee changes, protocol upgrades, dispute policy.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border-4 border-[#DC143C] shadow-[8px_8px_0_#1A1A1A] rotate-[-2deg] p-6 hover:-translate-y-1 transition-transform flex flex-col gap-4">
              <div className="text-4xl">⚖️</div>
              <h3 className="font-sans font-black text-xl uppercase text-[#1A1A1A] tracking-tight">
                03 VOTE
              </h3>
              <p className="font-mono text-xs opacity-80 uppercase font-bold tracking-tight leading-relaxed">
                7-day voting window. One staked token = one vote. Results are binding and executed on-chain.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white border-4 border-[#C5A945] shadow-[8px_8px_0_#DC143C] rotate-[2deg] p-6 hover:-translate-y-1 transition-transform flex flex-col gap-4">
              <div className="text-4xl">⚡</div>
              <h3 className="font-sans font-black text-xl uppercase text-[#1A1A1A] tracking-tight">
                04 EXECUTE
              </h3>
              <p className="font-mono text-xs opacity-80 uppercase font-bold tracking-tight leading-relaxed">
                Passed proposals execute automatically via smart contract. No admin needed. No delays. Pure code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ACTIVE DISPUTES SECTION ─── */}
      <section className="bg-[#1A1A1A] py-24 px-8 text-[#F0EAD6] relative flex flex-col items-center">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
        <div className="max-w-7xl w-full relative z-10">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b-8 border-white/10 pb-6 gap-6">
            <div>
              <span className="text-[#C5A945] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-2 animate-flicker">
                ACTIVE_DISPUTES
              </span>
              <h2 className="text-5xl md:text-7xl font-sans font-black uppercase tracking-tighter text-white">
                OPEN VOTES.
              </h2>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'OPEN', 'VOTING', 'RESOLVED'] as const).map((filter) => {
                const isActive = disputeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setDisputeFilter(filter)}
                    className={`font-black text-xs uppercase tracking-wider px-5 py-2.5 border-2 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#DC143C] text-white border-white shadow-[2px_2px_0_white] -translate-y-0.5' 
                        : 'bg-transparent text-[#F0EAD6]/60 border-[#F0EAD6]/30 hover:text-white hover:border-white'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dispute Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {filteredDisputes.map((disp, i) => {
              const rotate = i % 2 === 0 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]';
              const votedSide = votedDisputes[disp.id];
              const alreadyVoted = !!votedSide;

              return (
                <div 
                  key={disp.id}
                  className={`bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] p-8 shadow-[8px_8px_0_#DC143C] hover:-translate-y-2 hover:shadow-[12px_12px_0_#C5A945] transition-all flex flex-col justify-between min-h-[460px] relative overflow-hidden ${rotate}`}
                >
                  {/* Top Strip */}
                  <div className={`absolute top-0 left-0 right-0 h-2.5 ${disp.status === 'RESOLVED' ? 'bg-[#C5A945]' : 'bg-[#DC143C]'}`}></div>
                  
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 mt-2">
                      <span className="font-mono text-[#C5A945] text-xs font-black uppercase">
                        DISPUTE #{disp.id}
                      </span>
                      {disp.status === 'RESOLVED' ? (
                        <span className="bg-[#C5A945] text-[#1A1A1A] border border-[#1A1A1A] px-2 py-0.5 text-[9px] font-black uppercase">
                          RESOLVED
                        </span>
                      ) : (
                        <span className="bg-[#DC143C] text-white border border-[#1A1A1A] px-2 py-0.5 text-[9px] font-black uppercase animate-flicker">
                          {disp.status}
                        </span>
                      )}
                    </div>

                    <h3 className="font-sans font-black text-2xl uppercase tracking-tight text-[#1A1A1A] leading-tight mb-2">
                      {disp.title}
                    </h3>
                    <div className="text-3xl font-black text-[#DC143C] tracking-tighter mb-4">
                      {disp.ethStake} ETH AT STAKE
                    </div>

                    <div className="font-mono text-[9px] font-bold uppercase opacity-60 mb-6 flex justify-between">
                      <span>FREE: {disp.freelancer}</span>
                      <span>VS</span>
                      <span>CLI: {disp.client}</span>
                    </div>

                    {/* Progress details */}
                    {disp.status !== 'RESOLVED' ? (
                      <div className="mb-6">
                        <div className="font-mono text-[10px] font-black uppercase mb-2 text-[#1A1A1A]">
                          VOTING CLOSES IN: {formatCountdown(disp.initialTimeLeft)}
                        </div>
                        {/* Vote bar */}
                        <div className="h-6 border-2 border-[#1A1A1A] flex bg-white overflow-hidden w-full mb-2">
                          <div 
                            className="bg-[#DC143C] flex items-center justify-center font-mono text-[9px] text-white font-black"
                            style={{ width: `${disp.freelancerVotes}%` }}
                          >
                            {disp.freelancerVotes}%
                          </div>
                          <div 
                            className="bg-[#C5A945] flex items-center justify-center font-mono text-[9px] text-[#1A1A1A] font-black"
                            style={{ width: `${disp.clientVotes}%` }}
                          >
                            {disp.clientVotes}%
                          </div>
                        </div>
                        <div className="flex justify-between font-mono text-[9px] font-bold text-[#1A1A1A]/70">
                          <span>FREELANCER [████░]</span>
                          <span>|</span>
                          <span>[░████] CLIENT</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#1A1A1A]/5 border-2 border-dashed border-[#1A1A1A] p-4 font-mono text-xs font-bold uppercase tracking-tight mb-6">
                        <div className="text-[#10B981] font-black text-lg mb-1">
                          ✓ FREELANCER WON
                        </div>
                        <div className="text-[#1A1A1A] opacity-80 mb-2">
                          {disp.ethStake} ETH RELEASED
                        </div>
                        <a 
                          href="https://sepolia.etherscan.io" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#DC143C] underline font-black block text-[10px]"
                        >
                          TX: {disp.txHash?.substring(0, 12)}...
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {disp.status !== 'RESOLVED' ? (
                    <div className="flex flex-col gap-2">
                      {alreadyVoted ? (
                        <div className="w-full bg-[#10B981] text-white border-2 border-[#1A1A1A] py-3 text-xs font-black uppercase text-center rotate-[-1deg]">
                          ✓ CAST: {votedSide.toUpperCase()}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleCastDisputeVote(disp.id, 'freelancer')}
                            className="flex-1 bg-[#DC143C] text-white border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-1 active:translate-y-1 font-sans font-black text-xs py-3 uppercase transition-all cursor-pointer"
                          >
                            VOTE FREE
                          </button>
                          <button 
                            onClick={() => handleCastDisputeVote(disp.id, 'client')}
                            className="flex-1 bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-1 active:translate-y-1 font-sans font-black text-xs py-3 uppercase transition-all cursor-pointer"
                          >
                            VOTE CLIENT
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button className="w-full bg-[#1A1A1A] text-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[4px_4px_0_#DC143C] py-3 text-xs font-black uppercase hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#DC143C] transition-all cursor-pointer">
                      VIEW RESULT →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── GOVERNANCE PROPOSALS ─── */}
      <section className="bg-[#F0EAD6] py-24 px-8 relative z-10 flex flex-col items-center">
        <div className="max-w-7xl w-full">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b-8 border-[#1A1A1A] pb-6 gap-6">
            <div>
              <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-2">
                PROTOCOL_PROPOSALS
              </span>
              <h2 className="text-5xl md:text-7xl font-sans font-black uppercase tracking-tighter text-[#1A1A1A]">
                ACTIVE PROPOSALS.
              </h2>
            </div>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#DC143C] text-white border-4 border-[#1A1A1A] shadow-[6px_6px_0_#DC143C] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_#DC143C] active:translate-x-1 active:translate-y-1 active:shadow-none font-sans font-black uppercase text-sm px-6 py-3 cursor-pointer shrink-0"
            >
              SUBMIT PROPOSAL +
            </button>
          </div>

          {/* Proposals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProposals.map((prop, idx) => {
              const totalVotes = prop.votesFor + prop.votesAgainst;
              const forPct = totalVotes > 0 ? Math.round((prop.votesFor / totalVotes) * 100) : 0;
              const hasVotedFor = votedProposals[prop.id] === 'for';
              const hasVotedAgainst = votedProposals[prop.id] === 'against';
              const rotate = idx % 2 === 0 ? 'rotate-[-0.5deg]' : 'rotate-[0.5deg]';

              return (
                <div 
                  key={prop.id}
                  className={`bg-white border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] p-8 hover:-translate-y-1 transition-transform flex flex-col justify-between min-h-[400px] ${rotate}`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-mono text-[#DC143C] text-xs font-black uppercase">
                        {prop.id} // {prop.category.replace('_', ' ')}
                      </span>
                      {prop.status && (
                        <span className="bg-[#DC143C] text-white border border-[#1A1A1A] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                          {prop.status}
                        </span>
                      )}
                    </div>

                    <h3 className="font-sans font-black text-xl uppercase tracking-tight text-[#1A1A1A] leading-tight mb-4">
                      {prop.title}
                    </h3>
                    <p className="font-mono text-xs opacity-75 uppercase leading-relaxed mb-6">
                      {prop.description}
                    </p>

                    <div className="font-mono text-[9px] font-bold uppercase opacity-55 mb-6">
                      PROPOSED BY: {prop.proposedBy}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between font-mono text-[10px] font-black uppercase mb-2">
                        <span>FOR: {prop.votesFor} | AGAINST: {prop.votesAgainst}</span>
                        <span>{forPct}% FOR</span>
                      </div>
                      <div className="h-4 border-2 border-[#1A1A1A] bg-[#F0EAD6] overflow-hidden w-full">
                        <div 
                          className="h-full bg-[#DC143C] border-r border-[#1A1A1A]"
                          style={{ width: `${forPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex gap-2 mb-4">
                      <button 
                        onClick={() => handleCastProposalVote(prop.id, 'for')}
                        className={`flex-1 border-2 border-[#1A1A1A] py-2 font-mono text-xs font-black uppercase transition-all cursor-pointer ${
                          hasVotedFor 
                            ? 'bg-[#10B981] text-white' 
                            : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6]'
                        }`}
                      >
                        {hasVotedFor ? '✓ FOR' : 'VOTE FOR'}
                      </button>
                      <button 
                        onClick={() => handleCastProposalVote(prop.id, 'against')}
                        className={`flex-1 border-2 border-[#1A1A1A] py-2 font-mono text-xs font-black uppercase transition-all cursor-pointer ${
                          hasVotedAgainst 
                            ? 'bg-[#DC143C] text-white' 
                            : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6]'
                        }`}
                      >
                        {hasVotedAgainst ? '✗ AGAINST' : 'VOTE AGAINST'}
                      </button>
                    </div>
                    
                    <div className="font-mono text-[10px] text-[#C5A945] font-black uppercase tracking-wider text-right">
                      {prop.durationLeft}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── TOKEN SECTION ─── */}
      <section className="bg-[#1A1A1A] py-24 px-8 text-[#F0EAD6] relative flex flex-col items-center">
        {/* Halftone Top Border Overlay */}
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
        <div className="absolute top-0 left-0 right-0 h-8 bg-[#F0EAD6] torn-edge z-20 transform rotate-180"></div>
        
        <div className="max-w-7xl w-full relative z-10 mt-6">
          <span className="text-[#C5A945] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-2 animate-flicker">
            TOKEN_ECONOMICS
          </span>
          <h2 className="text-5xl md:text-7xl font-sans font-black uppercase tracking-tighter text-white mb-16">
            WRKC TOKEN.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Card 1: Utility */}
            <div className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] p-8 rotate-[-1deg] flex flex-col gap-6">
              <h3 className="font-sans font-black text-2xl uppercase tracking-tight text-[#1A1A1A] border-b-4 border-[#1A1A1A] pb-3 flex items-center gap-2">
                <span>🎯</span> TOKEN UTILITY
              </h3>
              <ul className="font-mono text-xs uppercase font-bold space-y-4 tracking-tight leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#DC143C] shrink-0">•</span>
                  <span>STAKE TO VOTE IN GOVERNANCE CHAMBERS</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#DC143C] shrink-0">•</span>
                  <span>DISPUTE ARBITRATION REWARDS & FEE POOLS</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#DC143C] shrink-0">•</span>
                  <span>FEE DISCOUNTS & PRESTIGE BADGES FOR STAKERS</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#DC143C] shrink-0">•</span>
                  <span>ACCESS TO PREMIUM VERIFIED CONTRACT PROVISIONS</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Distribution */}
            <div className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#C5A945] shadow-[8px_8px_0_#C5A945] p-8 rotate-[1deg] flex flex-col justify-between gap-6">
              <div>
                <h3 className="font-sans font-black text-2xl uppercase tracking-tight text-[#1A1A1A] border-b-4 border-[#1A1A1A] pb-3 flex items-center gap-2 mb-6">
                  <span>📊</span> DISTRIBUTION
                </h3>
                
                <div className="flex flex-col gap-4 font-mono text-xs uppercase font-bold tracking-tight">
                  <div className="flex justify-between items-center">
                    <span>COMMUNITY STAKING</span>
                    <span className="font-black text-[#DC143C]">40%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>TREASURY RESERVE</span>
                    <span className="font-black text-[#C5A945]">25%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>TEAM ALLOCATION</span>
                    <span className="font-black">20%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>ADVISORS & SEED</span>
                    <span className="font-black opacity-60">15%</span>
                  </div>
                </div>
              </div>

              {/* Stacked CSS bar */}
              <div className="h-8 border-4 border-[#1A1A1A] flex bg-white w-full overflow-hidden mt-6">
                <div className="bg-[#DC143C] h-full" style={{ width: '40%' }} title="Community: 40%"></div>
                <div className="bg-[#C5A945] h-full" style={{ width: '25%' }} title="Treasury: 25%"></div>
                <div className="bg-[#1A1A1A] h-full" style={{ width: '20%' }} title="Team: 20%"></div>
                <div className="bg-[#1A1A1A]/20 h-full" style={{ width: '15%' }} title="Advisors: 15%"></div>
              </div>
            </div>

            {/* Card 3: Staking */}
            <div className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] p-8 rotate-[-0.5deg] flex flex-col justify-between gap-6">
              <div>
                <h3 className="font-sans font-black text-2xl uppercase tracking-tight text-[#1A1A1A] border-b-4 border-[#1A1A1A] pb-3 flex items-center gap-2">
                  <span>⚡</span> STAKING REWARDS
                </h3>
                
                <div className="mt-6 flex flex-col gap-3 font-mono">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold opacity-60">CURRENT ESTIMATED APY</span>
                    <span className="text-4xl font-black text-[#DC143C]">12.4%</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t-2 border-[#1A1A1A]/10 pt-4 text-xs uppercase font-bold">
                    <span>TOTAL LOCKED</span>
                    <span className="font-black">{(totalStaked / 1000000).toFixed(1)}M WRKC</span>
                  </div>

                  <div className="flex justify-between items-center text-xs uppercase font-bold">
                    <span>YOUR STAKE</span>
                    <span className="font-black text-[#C5A945]">{userStake} WRKC</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleStake}
                className="w-full bg-[#DC143C] text-white border-4 border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none font-sans font-black uppercase text-sm py-4 transition-all cursor-pointer mt-6"
              >
                STAKE NOW
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] border-4 border-[#DC143C] shadow-[4px_4px_0_#DC143C] p-4 rotate-[-1deg] animate-flicker">
          <span className="font-mono text-xs font-black text-white tracking-widest uppercase">
            {toastMessage}
          </span>
        </div>
      )}

      {/* ─── PROPOSAL MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 flex items-center justify-center p-4">
          <div className="bg-[#F0EAD6] border-4 border-[#DC143C] shadow-[16px_16px_0_#1A1A1A] rotate-[-1deg] p-8 md:p-10 max-w-2xl w-full relative">
            
            <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-2">
              SUBMIT_PROPOSAL
            </span>
            <h2 className="text-4xl md:text-5xl font-sans font-black uppercase tracking-tighter text-[#1A1A1A] mb-8 leading-none">
              New Proposal.
            </h2>

            <form onSubmit={handleSubmitProposal} className="space-y-6 font-mono text-xs uppercase font-bold tracking-tight">
              {/* Proposal Title */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black tracking-wider text-[#1A1A1A]">PROPOSAL TITLE *</label>
                <input 
                  type="text" 
                  required
                  placeholder="E.G. REDUCE PROTOCOL GAS SUBSIDIES BY 5%"
                  value={newProposalTitle}
                  onChange={(e) => setNewProposalTitle(e.target.value.toUpperCase())}
                  className="w-full bg-[#F0EAD6] border-4 border-[#1A1A1A] p-4 font-black text-xs uppercase placeholder:opacity-30 shadow-[4px_4px_0_#1A1A1A] outline-none focus:border-[#DC143C]"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black tracking-wider text-[#1A1A1A]">SPECIFICATIONS *</label>
                <textarea 
                  rows={5}
                  required
                  placeholder="OUTLINE THE DYNAMIC CHANGES IN DETAIL..."
                  value={newProposalDesc}
                  onChange={(e) => setNewProposalDesc(e.target.value.toUpperCase())}
                  className="w-full bg-[#F0EAD6] border-4 border-[#1A1A1A] p-4 font-black text-xs uppercase placeholder:opacity-30 shadow-[4px_4px_0_#1A1A1A] outline-none focus:border-[#DC143C] resize-none"
                />
              </div>

              {/* Category Select & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black tracking-wider text-[#1A1A1A]">CATEGORY *</label>
                  <select 
                    value={newProposalCategory}
                    onChange={(e: any) => setNewProposalCategory(e.target.value)}
                    className="w-full bg-[#F0EAD6] border-4 border-[#1A1A1A] p-3 font-black text-xs uppercase shadow-[4px_4px_0_#1A1A1A] outline-none cursor-pointer"
                  >
                    <option value="FEE_CHANGE">FEE_CHANGE</option>
                    <option value="PROTOCOL_UPGRADE">PROTOCOL_UPGRADE</option>
                    <option value="DISPUTE_POLICY">DISPUTE_POLICY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black tracking-wider text-[#1A1A1A]">VOTING DURATION *</label>
                  <div className="flex gap-2">
                    {([3, 7, 14] as const).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setNewProposalDuration(dur)}
                        className={`flex-1 border-2 py-2.5 font-black text-center cursor-pointer transition-all ${
                          newProposalDuration === dur 
                            ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' 
                            : 'bg-transparent text-[#1A1A1A] border-[#1A1A1A]/40 hover:border-[#1A1A1A]'
                        }`}
                      >
                        {dur} DAYS
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Warning Box */}
              <div className="bg-[#DC143C]/10 border-4 border-[#DC143C] p-4 text-[#DC143C] leading-normal font-mono text-[10px] font-bold">
                ⚠️ SUBMITTING A PROPOSAL REQUIRES 100 WRKC TOKENS STAKED. THIS CANNOT BE UNDONE.
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white text-[#1A1A1A] border-4 border-[#1A1A1A] py-4 text-sm font-black uppercase shadow-[4px_4px_0_#1A1A1A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-grow bg-[#DC143C] text-white border-4 border-[#1A1A1A] py-4 text-sm font-black uppercase shadow-[4px_4px_0_#1A1A1A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                >
                  SUBMIT PROPOSAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 mix-blend-overlay opacity-10">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.15 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

    </div>
  );
}
