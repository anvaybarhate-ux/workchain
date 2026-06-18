"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface NavItem {
  id: string;
  label: string;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'getting-started',
    title: 'GETTING STARTED',
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'connect-wallet', label: 'Connect Wallet' },
      { id: 'choose-role', label: 'Choose Your Role' },
    ],
  },
  {
    id: 'for-freelancers',
    title: 'FOR FREELANCERS',
    items: [
      { id: 'browse-projects', label: 'Browse Projects' },
      { id: 'submit-milestones', label: 'Submit Milestones' },
      { id: 'reputation-system', label: 'Reputation System' },
      { id: 'earning-payments', label: 'Earning Payments' },
    ],
  },
  {
    id: 'for-clients',
    title: 'FOR CLIENTS',
    items: [
      { id: 'post-project', label: 'Post a Project' },
      { id: 'lock-funds', label: 'Lock Funds in Escrow' },
      { id: 'approve-milestones', label: 'Approve Milestones' },
      { id: 'raise-dispute', label: 'Raise a Dispute' },
    ],
  },
  {
    id: 'smart-contracts',
    title: 'SMART CONTRACTS',
    items: [
      { id: 'escrow-contract', label: 'Escrow Contract' },
      { id: 'reputation-nft', label: 'Reputation NFT' },
      { id: 'dispute-mechanism', label: 'Dispute Mechanism' },
      { id: 'contract-addresses', label: 'Contract Addresses' },
    ],
  },
  {
    id: 'security',
    title: 'SECURITY',
    items: [
      { id: 'reentrancy-protection', label: 'Reentrancy Protection' },
      { id: 'access-control', label: 'Access Control' },
      { id: 'audit-information', label: 'Audit Information' },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    items: [
      { id: 'common-questions', label: 'Common Questions' },
    ],
  },
];

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: 'Is Workchain free to use?',
    a: 'Only gas fees apply. No platform commission. Compare: Upwork 20%, Fiverr 20%, Workchain ~0%.',
  },
  {
    q: 'What happens if a client disappears?',
    a: 'Funds are locked in the smart contract. After the milestone deadline passes, the freelancer can raise a dispute.',
  },
  {
    q: 'Can reputation be faked?',
    a: 'No. Every score update is triggered by real on-chain events. No admin can manually alter your score.',
  },
  {
    q: 'What blockchain is Workchain on?',
    a: 'Currently deployed on Ethereum Sepolia testnet. Mainnet and multi-chain support in roadmap.',
  },
  {
    q: 'How long does dispute resolution take?',
    a: 'Community voting runs for 7 days. After the deadline, anyone can call resolveDispute() to finalize.',
  },
];

export default function DocsPage() {
  const [activeItem, setActiveItem] = useState<string>('introduction');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'getting-started': false,
    'for-freelancers': false,
    'for-clients': false,
    'smart-contracts': false,
    'security': false,
    'faq': false,
  });

  const [faqOpenStates, setFaqOpenStates] = useState<Record<number, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const toggleFaq = (index: number) => {
    setFaqOpenStates((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage('COPIED!');
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const getSectionTitleById = (itemId: string): string => {
    for (const section of NAV_SECTIONS) {
      const match = section.items.find((item) => item.id === itemId);
      if (match) return match.label.toUpperCase();
    }
    return itemId.toUpperCase();
  };

  return (
    <div className="flex-grow flex min-h-[calc(100vh-3rem)] w-full font-mono bg-[#F0EAD6] text-[#1A1A1A] relative z-20 overflow-hidden">
      
      {/* ─── LEFT SIDEBAR ─── */}
      <aside className="w-[280px] bg-[#1A1A1A] border-r-4 border-[#1A1A1A] flex flex-col justify-between shrink-0 relative overflow-y-auto z-30 select-none">
        <div>
          {/* Logo Block */}
          <div className="bg-[#DC143C] p-6 border-b-4 border-[#1A1A1A] flex flex-col items-center">
            <Link href="/" className="text-3xl font-black text-white tracking-tighter border-2 border-white px-3 py-1 font-sans rotate-[-1.5deg] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#1A1A1A] transition-all">
              WC.01X
            </Link>
            <span className="text-[#C5A945] font-mono text-[9px] font-black tracking-widest mt-3 uppercase">
              DOCUMENTATION
            </span>
          </div>

          {/* Navigation Sections */}
          <nav className="flex flex-col py-4">
            {NAV_SECTIONS.map((section) => {
              const isCollapsed = collapsedSections[section.id];
              return (
                <div key={section.id} className="flex flex-col border-b border-[#F0EAD6]/10 last:border-b-0">
                  {/* Section Header */}
                  <div 
                    onClick={() => toggleSection(section.id)}
                    className="flex justify-between items-center py-4 px-6 text-[#F0EAD6] font-black uppercase text-xs tracking-wider cursor-pointer hover:text-[#DC143C] transition-colors select-none"
                  >
                    <span>{section.title}</span>
                    <span className={`transform transition-transform duration-200 text-[#C5A945] font-mono text-sm ${isCollapsed ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>

                  {/* Section Items */}
                  {!isCollapsed && (
                    <div className="flex flex-col bg-[#1A1A1A] pl-4 pb-2">
                      {section.items.map((item) => {
                        const isActive = activeItem === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveItem(item.id)}
                            className={`w-full text-left py-2 px-6 text-xs uppercase tracking-wide transition-all ${
                              isActive 
                                ? 'bg-[#DC143C] text-white font-black border-l-4 border-[#C5A945]' 
                                : 'text-[#F0EAD6]/60 hover:text-[#F0EAD6] hover:bg-[#F0EAD6]/5'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 bg-[#1A1A1A] border-t border-[#F0EAD6]/10 text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-flicker"></span>
            <span className="font-mono text-[9px] text-[#F0EAD6] font-black uppercase tracking-wider">
              SEPOLIA TESTNET
            </span>
          </div>
          <div className="font-mono text-[9px] text-[#C5A945] font-black break-all uppercase tracking-tight">
            FACTORY: 0x4D1838...30E8
          </div>
        </div>
      </aside>

      {/* ─── RIGHT CONTENT AREA ─── */}
      <main className="flex-1 overflow-y-auto px-6 md:px-12 py-12 relative bg-[#F0EAD6] flex flex-col justify-between">
        
        {/* Active Content Renderer */}
        <div className="max-w-4xl w-full mx-auto">
          {activeItem === 'introduction' && (
            <div>
              <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-2">
                INTRODUCTION
              </span>
              <h1 className="text-5xl md:text-7xl font-sans font-black uppercase tracking-tighter text-[#1A1A1A] leading-none mb-6">
                What is <span className="text-distressed glitch-text">Workchain</span>?
              </h1>

              {/* Intro Block */}
              <div className="border-l-8 border-[#DC143C] bg-white border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] rotate-[-0.5deg] p-8 mb-10">
                <p className="font-mono text-sm font-bold uppercase tracking-tight leading-relaxed text-[#1A1A1A]">
                  Workchain is a trustless, decentralized labor protocol that eliminates standard payroll middlemen. 
                  By utilizing secure milestone-locked escrow contracts and decentralized community-driven arbitration chambers, 
                  Workchain ensures clients and freelancers are perfectly protected by immutable smart contract logic.
                </p>
              </div>

              {/* Quick Start Card */}
              <div className="bg-[#1A1A1A] text-[#F0EAD6] p-8 border-4 border-[#C5A945] shadow-[8px_8px_0_#C5A945] rotate-[0.5deg] mb-10 relative">
                <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
                <h3 className="text-[#C5A945] font-mono font-black text-xs uppercase tracking-[0.25em] mb-6">
                  QUICK_START
                </h3>

                <div className="flex flex-col gap-6 font-mono text-xs uppercase font-bold tracking-tight">
                  <div className="flex gap-4 items-center">
                    <span className="bg-[#DC143C] text-white font-black text-xs px-3 py-1.5 border border-white shrink-0">
                      01
                    </span>
                    <span>Connect your MetaMask wallet inside the application navbar or at /connect</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="bg-[#C5A945] text-[#1A1A1A] font-black text-xs px-3 py-1.5 border border-[#1A1A1A] shrink-0">
                      02
                    </span>
                    <span>Choose your primary protocol profile role: Freelancer or Client</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="bg-[#F0EAD6] text-[#1A1A1A] font-black text-xs px-3 py-1.5 border border-[#1A1A1A] shrink-0">
                      03
                    </span>
                    <span>Start your first decentralized escrow project agreement immediately</span>
                  </div>
                </div>
              </div>

              {/* Code block */}
              <div className="mb-10">
                <h4 className="font-mono text-xs font-black uppercase text-[#1A1A1A] mb-3">
                  // INITIALIZE WALLET CONNECTION
                </h4>
                <pre className="bg-[#0D0D0D] text-[#F0EAD6] p-6 border-4 border-[#1A1A1A] shadow-[6px_6px_0_#DC143C] font-mono text-xs md:text-sm overflow-x-auto leading-relaxed">
                  <code>
                    <span className="text-[#666]">// Connect to Workchain</span>{"\n"}
                    <span className="text-[#DC143C]">const</span> provider = <span className="text-[#DC143C]">new</span> ethers.<span className="text-[#C5A945]">BrowserProvider</span>(window.ethereum);{"\n"}
                    <span className="text-[#DC143C]">const</span> signer = <span className="text-[#DC143C]">await</span> provider.getSigner();{"\n"}
                    <span className="text-[#DC143C]">const</span> address = <span className="text-[#DC143C]">await</span> signer.getAddress();
                  </code>
                </pre>
              </div>

              {/* Next Button */}
              <button 
                onClick={() => setActiveItem('connect-wallet')}
                className="w-full bg-[#DC143C] text-white border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[6px_6px_0_#1A1A1A] active:translate-x-1 active:translate-y-1 active:shadow-none font-sans font-black uppercase text-xl p-5 text-center transition-all cursor-pointer"
              >
                NEXT: CONNECT WALLET →
              </button>
            </div>
          )}

          {activeItem === 'contract-addresses' && (
            <div>
              <span className="text-[#C5A945] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-2">
                SMART_CONTRACTS
              </span>
              <h1 className="text-5xl md:text-7xl font-sans font-black uppercase tracking-tighter text-[#1A1A1A] leading-none mb-6">
                ON-CHAIN IMMUTABLE LOGIC
              </h1>

              {/* Contract Addresses Card */}
              <div className="bg-[#1A1A1A] text-[#F0EAD6] border-4 border-[#C5A945] shadow-[8px_8px_0_#C5A945] p-8 mb-10 rotate-[0.5deg] relative">
                <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
                <h3 className="text-[#C5A945] font-mono font-black text-xs uppercase tracking-[0.25em] mb-6">
                  CONTRACT_ADDRESSES
                </h3>

                <div className="flex flex-col gap-6 font-mono text-xs md:text-sm">
                  {/* Row 1: Factory */}
                  <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="block text-[10px] text-white/50 mb-1">WorkchainFactory</span>
                      <span className="text-white font-black select-all">0x4D1838574F935Da21fFF7b3a1B4d5C0477Cd30E8</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => handleCopy('0x4D1838574F935Da21fFF7b3a1B4d5C0477Cd30E8')}
                        className="bg-[#DC143C] text-white text-[10px] font-black px-3 py-1.5 border border-white hover:bg-white hover:text-[#DC143C] transition-colors"
                      >
                        COPY
                      </button>
                      <a 
                        href="https://sepolia.etherscan.io/address/0x4D1838574F935Da21fFF7b3a1B4d5C0477Cd30E8"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-[#1A1A1A] text-[10px] font-black px-3 py-1.5 border border-white hover:bg-[#C5A945] transition-colors"
                      >
                        ETHERSCAN ↗
                      </a>
                    </div>
                  </div>

                  {/* Row 2: Reputation */}
                  <div className="pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="block text-[10px] text-white/50 mb-1">WorkchainReputation</span>
                      <span className="text-white font-black select-all">0x3454531985547A580942B2b40f01bde82B64085f</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => handleCopy('0x3454531985547A580942B2b40f01bde82B64085f')}
                        className="bg-[#DC143C] text-white text-[10px] font-black px-3 py-1.5 border border-white hover:bg-white hover:text-[#DC143C] transition-colors"
                      >
                        COPY
                      </button>
                      <a 
                        href="https://sepolia.etherscan.io/address/0x3454531985547A580942B2b40f01bde82B64085f"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-[#1A1A1A] text-[10px] font-black px-3 py-1.5 border border-white hover:bg-[#C5A945] transition-colors"
                      >
                        ETHERSCAN ↗
                      </a>
                    </div>
                  </div>

                  {/* Network Badge */}
                  <div className="bg-[#10B981] text-[#1A1A1A] border-2 border-[#1A1A1A] px-3 py-1 w-fit font-black text-[10px]">
                    NETWORK: SEPOLIA TESTNET
                  </div>
                </div>
              </div>

              {/* Key Functions List */}
              <div className="mb-10">
                <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-6">
                  KEY_FUNCTIONS
                </span>

                <div className="flex flex-col gap-4">
                  {[
                    { fn: 'createProject(freelancer, titles, amounts, deadlines) → address', desc: 'Sponsors deploy individual escrow smart contracts with specific milestone valuations.', rotate: 'rotate-[-0.3deg]', shadow: 'shadow-[6px_6px_0_#DC143C]' },
                    { fn: 'submitMilestone(index, ipfsHash, proofLinks)', desc: 'Freelancers upload and submit proof of labor deliverables to IPFS directly.', rotate: 'rotate-[0.3deg]', shadow: 'shadow-[6px_6px_0_#C5A945]' },
                    { fn: 'approveMilestone(index)', desc: 'Clients verify deliverables and unlock specific milestone cold-locked tokens.', rotate: 'rotate-[-0.2deg]', shadow: 'shadow-[6px_6px_0_#1A1A1A]' },
                    { fn: 'raiseDispute(index, evidenceHash)', desc: 'Initiates community voting to arbitrate and distribute locked funds.', rotate: 'rotate-[0.2deg]', shadow: 'shadow-[6px_6px_0_#DC143C]' },
                    { fn: 'castVote(voteForFreelancer)', desc: 'Decentralized arbiter nodes cast weight backing either freelancer or client views.', rotate: 'rotate-[-0.3deg]', shadow: 'shadow-[6px_6px_0_#C5A945]' },
                    { fn: 'resolveDispute()', desc: 'Finalizes the voting process, releases funds to the victor, and adjusts scores.', rotate: 'rotate-[0.3deg]', shadow: 'shadow-[6px_6px_0_#1A1A1A]' },
                  ].map((item, idx) => (
                    <div key={idx} className={`bg-white border-4 border-[#1A1A1A] p-6 ${item.shadow} ${item.rotate}`}>
                      <code className="font-mono text-xs md:text-sm font-black text-[#1A1A1A] block mb-2 break-all">
                        {item.fn}
                      </code>
                      <p className="font-mono text-xs opacity-75 uppercase">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ABI snippet code block */}
              <div className="mb-10">
                <h4 className="font-mono text-xs font-black uppercase text-[#1A1A1A] mb-3">
                  // FACTORY ABI SNIPPET
                </h4>
                <pre className="bg-[#0D0D0D] text-[#F0EAD6] p-6 border-4 border-[#1A1A1A] shadow-[6px_6px_0_#DC143C] font-mono text-xs md:text-sm overflow-x-auto leading-relaxed">
                  <code>
                    [{"\n"}
                    &nbsp;&nbsp;{"{"}{"\n"}
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#DC143C]">&quot;inputs&quot;</span>: [],{"\n"}
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#DC143C]">&quot;name&quot;</span>: <span className="text-[#C5A945]">&quot;createProject&quot;</span>,{"\n"}
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#DC143C]">&quot;outputs&quot;</span>: [{"{"}<span className="text-[#DC143C]">&quot;internalType&quot;</span>: <span className="text-[#C5A945]">&quot;address&quot;</span>, <span className="text-[#DC143C]">&quot;name&quot;</span>: <span className="text-[#C5A945]">&quot;&quot;</span>, <span className="text-[#DC143C]">&quot;type&quot;</span>: <span className="text-[#C5A945]">&quot;address&quot;</span>{"}"}],{"\n"}
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#DC143C]">&quot;stateMutability&quot;</span>: <span className="text-[#C5A945]">&quot;payable&quot;</span>,{"\n"}
                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#DC143C]">&quot;type&quot;</span>: <span className="text-[#C5A945]">&quot;function&quot;</span>{"\n"}
                    &nbsp;&nbsp;{"}"}{"\n"}
                    ]
                  </code>
                </pre>
              </div>

              {/* Next Button */}
              <button 
                onClick={() => setActiveItem('common-questions')}
                className="w-full bg-[#1A1A1A] text-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#DC143C] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[6px_6px_0_#DC143C] active:translate-x-1 active:translate-y-1 active:shadow-none font-sans font-black uppercase text-xl p-5 text-center transition-all cursor-pointer"
              >
                NEXT: COMMON QUESTIONS →
              </button>
            </div>
          )}

          {activeItem === 'common-questions' && (
            <div>
              <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-2">
                FAQ
              </span>
              <h1 className="text-5xl md:text-7xl font-sans font-black uppercase tracking-tighter text-[#1A1A1A] leading-none mb-10">
                COMMON QUESTIONS
              </h1>

              {/* Accordion List */}
              <div className="flex flex-col gap-6">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = faqOpenStates[idx] || false;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleFaq(idx)}
                      className="border-4 border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] transition-all duration-300 cursor-pointer select-none bg-white"
                    >
                      {/* Accordion Header */}
                      <div className="bg-[#1A1A1A] text-[#F0EAD6] p-5 flex justify-between items-center font-black uppercase text-sm md:text-base">
                        <span>{item.q}</span>
                        <span className="text-[#C5A945] font-mono text-xl">{isOpen ? '-' : '+'}</span>
                      </div>

                      {/* Accordion Answer */}
                      {isOpen && (
                        <div className="border-t-4 border-[#1A1A1A] p-5 bg-[#F0EAD6] font-mono text-xs md:text-sm font-bold uppercase tracking-tight leading-relaxed text-[#1A1A1A]">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMING SOON PLACEHOLDERS */}
          {activeItem !== 'introduction' && activeItem !== 'contract-addresses' && activeItem !== 'common-questions' && (
            <div className="flex justify-center items-center py-20">
              <div className="bg-[#1A1A1A] text-[#F0EAD6] border-4 border-[#C5A945] shadow-[8px_8px_0_#C5A945] rotate-[-1deg] p-12 text-center max-w-xl w-full relative">
                <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
                <span className="text-[#C5A945] font-mono font-black text-xs uppercase tracking-[0.25em] block mb-4">
                  {getSectionTitleById(activeItem)}
                </span>
                <h2 className="text-4xl md:text-5xl font-sans font-black uppercase tracking-tighter mb-4 text-[#F0EAD6] text-distressed">
                  DOCS INCOMING
                </h2>
                <p className="font-mono text-xs font-bold uppercase opacity-60">
                  This section is being written. Protocol logs compiled.
                </p>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] border-4 border-[#DC143C] shadow-[4px_4px_0_#DC143C] p-4 rotate-[-1deg] animate-flicker">
          <span className="font-mono text-xs font-black text-white tracking-widest uppercase">
            {toastMessage}
          </span>
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
