"use client";

import React from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();
  const {
    address,
    isConnected,
    isConnecting,
    isCorrectNetwork,
    shortAddress,
    balance,
    connectWallet,
    disconnectWallet
  } = useWallet();

  const handleConnect = async () => {
    await connectWallet();
    const storedRole = localStorage.getItem("workchain_role");
    if (!storedRole) {
      router.push('/connect');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <nav className="flex flex-wrap justify-between items-center px-8 py-10 relative z-10 gap-8">
      <div className="flex items-start">
        <div className="flex flex-col">
          <Link href="/" className="text-4xl font-black bg-[#1A1A1A] text-[#F0EAD6] px-4 py-1 border-4 border-[#DC143C] shadow-[-4px_4px_0_#C5A945]">
            WC.01X
          </Link>
          <div className="mt-2 flex gap-2">
            <span className="text-[10px] bg-[#C5A945] text-[#1A1A1A] font-bold px-2 py-0.5">V.2.5</span>
            <span className="text-[10px] bg-[#1A1A1A] text-white font-bold px-2 py-0.5">MAINNET</span>
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="flex-1 max-w-xl relative hidden md:block">
        <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] flex items-center px-4 py-2 shadow-[4px_4px_0_#1A1A1A]">
          {/* @ts-expect-error - Custom element from Iconify */}
          <iconify-icon icon="lucide:search" className="text-xl mr-3 opacity-60"></iconify-icon>
          <input type="text" placeholder="SEARCH FOR VERIFIED TALENT..." className="bg-transparent border-none outline-none w-full font-bold uppercase text-sm placeholder:text-[#1A1A1A]/30 focus:ring-0" />
          <button className="bg-[#1A1A1A] text-[#F0EAD6] px-4 py-1 font-black uppercase text-xs hover:bg-[#DC143C] transition-all ml-2 cursor-pointer">FIND</button>
        </div>
      </div>
      
      <div className="flex space-x-6 items-center">
        <div className="hidden lg:flex space-x-6 font-black uppercase text-sm">
          <Link href="/hire/0x8f9a3C42B1d71ef2Ca90001aa42b000000000000" className="hover:text-[#DC143C] transition-all">HIRE</Link>
          <Link href="/explore" className="hover:text-[#DC143C] transition-all">WORK</Link>
          <Link href="/features" className="hover:text-[#DC143C] transition-all">ESCROW</Link>
        </div>
        
        {!isConnected ? (
          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-[#DC143C] text-white px-6 py-3 font-black uppercase text-lg border-4 border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all shadow-[6px_6px_0_#1A1A1A] animate-jitter inline-block cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {/* Network Badge */}
            <div className={`px-3 py-1 font-mono text-xs font-black border-2 border-[#1A1A1A] ${isCorrectNetwork ? 'bg-[#10B981] text-[#1A1A1A]' : 'bg-[#DC143C] text-[#F0EAD6]'}`}>
              {isCorrectNetwork ? "● SEPOLIA" : "⚠ WRONG NET"}
            </div>
            
            {/* Address Pill */}
            <div className="bg-[#1A1A1A] text-[#F0EAD6] border-2 border-[#C5A945] shadow-[4px_4px_0_#C5A945] px-4 py-2 font-mono text-xs font-black">
              {shortAddress}
            </div>

            {/* Balance */}
            {balance !== null && (
              <div className="font-mono text-xs text-[#C5A945] font-black uppercase">
                {balance} ETH
              </div>
            )}

            {/* Disconnect Button */}
            <button 
              onClick={disconnectWallet}
              className="border-2 border-[#DC143C] text-[#DC143C] px-3 py-1 font-mono text-xs font-black hover:bg-[#DC143C] hover:text-white transition-all cursor-pointer"
            >
              DISCONNECT
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

