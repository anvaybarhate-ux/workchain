"use client";

import React from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { useRouter, usePathname } from 'next/navigation';

interface SidebarProps {
  activePath: string;
}

export default function Sidebar({ activePath }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    address,
    role,
    changeRole,
    shortAddress,
    isCorrectNetwork,
    disconnectWallet
  } = useWallet();

  const activeRole = role || 'freelancer';

  const handleRoleToggle = () => {
    const newRole = activeRole === 'freelancer' ? 'client' : 'freelancer';
    disconnectWallet();
    localStorage.setItem("workchain_role", newRole);
    router.push('/connect');
  };

  const handleDisconnect = () => {
    disconnectWallet();
    router.push('/connect');
  };

  const getLinkClass = (path: string) => {
    const isActive = activePath === path;
    if (isActive) {
      return "text-left font-black text-xs uppercase tracking-widest text-[#1A1A1A] bg-[#DC143C] px-4 py-3 border-2 border-white shadow-[4px_4px_0_#F0EAD6] block transition-all";
    }
    return "text-left font-black text-xs uppercase tracking-widest text-[#F0EAD6] opacity-60 hover:opacity-100 hover:text-[#DC143C] hover:bg-[#1A1A1A] px-4 py-3 transition-all block";
  };

  return (
    <aside className="w-[260px] bg-[#1A1A1A] border-r-4 border-[#DC143C] flex flex-col justify-between hidden md:flex shrink-0 z-30 relative shadow-[12px_12px_0_#DC143C]">
      <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
      <div>
        {/* Logo */}
        <div className="bg-[#DC143C] p-6 border-b-4 border-white mb-6">
          <Link href="/" className="text-4xl font-black text-[#F0EAD6] tracking-tighter shadow-sm text-distressed">
            WC.01X
          </Link>
        </div>
        
        {/* Role Badge / Switcher */}
        <div className="px-6 mb-10">
          <button 
            onClick={handleRoleToggle}
            className={`px-4 py-1 font-black text-xs uppercase border-2 flex items-center gap-1.5 w-fit shadow-[4px_4px_0_#F0EAD6] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer ${
              activeRole === 'freelancer' 
                ? 'bg-[#DC143C] text-white border-white hover:bg-white hover:text-[#DC143C]' 
                : 'bg-[#C5A945] text-[#1A1A1A] border-[#1A1A1A] hover:bg-white hover:text-[#C5A945]'
            }`}
            title="Click to Switch Role"
          >
            {activeRole.toUpperCase()} ⇆
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 px-4 relative z-10">
          <Link href="/dashboard" className={getLinkClass('/dashboard')}>
            DASHBOARD
          </Link>
          <Link href="/projects" className={getLinkClass('/projects')}>
            MY PROJECTS
          </Link>
          {activeRole === 'freelancer' ? (
            <>
              <Link href="/freelancer/reputation" className={getLinkClass('/freelancer/reputation')}>
                REPUTATION
              </Link>
              <Link href="/freelancer/earnings" className={getLinkClass('/freelancer/earnings')}>
                EARNINGS
              </Link>
            </>
          ) : (
            <>
              <Link href="/client/create" className={getLinkClass('/client/create')}>
                CREATE PROJECT
              </Link>
              <Link href="/client/reputation" className={getLinkClass('/client/reputation')}>
                REPUTATION
              </Link>
              <Link href="/client/escrow" className={getLinkClass('/client/escrow')}>
                ESCROW
              </Link>
            </>
          )}
          <Link href="/disputes" className={getLinkClass('/disputes')}>
            DISPUTES
          </Link>
        </nav>
      </div>

      {/* Bottom Panel */}
      <div className="p-6 border-t-4 border-white/20 relative z-10">
        <div className="font-mono text-xs text-[#F0EAD6] mb-4 opacity-70">
          {shortAddress || "NOT CONNECTED"}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDisconnect}
            className="bg-[#1A1A1A] text-[#F0EAD6] border-2 border-white text-[10px] font-black px-3 py-1 shadow-[2px_2px_0_#DC143C] hover:translate-x-1 transition-transform uppercase cursor-pointer"
          >
            DISCONNECT
          </button>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase font-black text-white">
            {isCorrectNetwork ? "● SEPOLIA LIVE" : "⚠ WRONG NET"}
          </span>
          <span className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-[#10B981]' : 'bg-[#DC143C]'} animate-flicker`}></span>
        </div>
      </div>
    </aside>
  );
}
