"use client";

import React, { useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';

export default function RequireWallet({ children }: { children: React.ReactNode }) {
  const { 
    isConnected, 
    isConnecting, 
    isInitializing,
    isCorrectNetwork, 
    connectWallet, 
    switchToSepolia,
    role
  } = useWallet();
  const router = useRouter();

  useEffect(() => {
    // If connected but role is not selected, redirect to /connect to select role
    if (!isInitializing && isConnected && isCorrectNetwork && !role) {
      router.push('/connect');
    }
  }, [isInitializing, isConnected, isCorrectNetwork, role, router]);

  // STATE 0 — Initializing session
  if (isInitializing) {
    return (
      <div className="bg-[#F0EAD6] min-h-[80vh] flex items-center justify-center py-20 px-4 relative font-sans">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
        <div className="bg-[#1A1A1A] text-[#F0EAD6] p-12 border-4 border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-[-1deg] text-center max-w-lg mx-auto relative z-10 w-full flex flex-col items-center justify-center">
          <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-widest block mb-4 animate-flicker">
            INITIALIZING
          </span>
          <div className="w-16 h-16 border-4 border-[#DC143C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-xs font-bold text-[#F0EAD6]/60 uppercase tracking-wide leading-relaxed">
            RESTORE_SESSION... PLEASE WAIT
          </p>
        </div>
      </div>
    );
  }

  // STATE 1 — Not connected
  if (!isConnected) {
    return (
      <div className="bg-[#F0EAD6] min-h-[80vh] flex items-center justify-center py-20 px-4 relative font-sans">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
        <div className="bg-[#1A1A1A] text-[#F0EAD6] p-12 border-4 border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-[-1deg] text-center max-w-lg mx-auto relative z-10 w-full">
          <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-widest block mb-4 animate-flicker">
            ACCESS_RESTRICTED
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase text-[#F0EAD6] tracking-tighter leading-none mb-4 font-sans text-distressed">
            CONNECT WALLET
          </h1>
          <p className="font-mono text-xs font-bold text-[#F0EAD6]/60 uppercase tracking-wide leading-relaxed mb-8">
            You need to connect your MetaMask wallet to access this page.
          </p>
          <button 
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-[#DC143C] text-white border-4 border-white shadow-[8px_8px_0_white] font-black uppercase text-xl p-5 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:translate-x-2 active:translate-y-2 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait"
          >
            {isConnecting ? (
              <span className="animate-pulse">CONNECTING...</span>
            ) : (
              <span>CONNECT WALLET</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // STATE 2 — Connected but wrong network
  if (!isCorrectNetwork) {
    return (
      <div className="bg-[#F0EAD6] min-h-[80vh] flex items-center justify-center py-20 px-4 relative font-sans">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
        <div className="bg-[#1A1A1A] text-[#F0EAD6] p-12 border-4 border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-[-1deg] text-center max-w-lg mx-auto relative z-10 w-full">
          <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-widest block mb-4 animate-flicker">
            WRONG_NETWORK
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase text-[#DC143C] tracking-tighter leading-none mb-4 font-sans text-distressed">
            WRONG NETWORK
          </h1>
          <p className="font-mono text-xs font-bold text-[#F0EAD6]/60 uppercase tracking-wide leading-relaxed mb-8">
            You are connected but not to Sepolia Testnet. Switch network to continue.
          </p>
          <button 
            onClick={switchToSepolia}
            className="w-full bg-[#C5A945] text-[#1A1A1A] border-4 border-white shadow-[8px_8px_0_white] font-black uppercase text-xl p-5 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:translate-x-2 active:translate-y-2 cursor-pointer flex items-center justify-center gap-3"
          >
            <span>SWITCH TO SEPOLIA ⇆</span>
          </button>
        </div>
      </div>
    );
  }

  // STATE 3 — Connected, correct network, but no role selected yet
  if (!role) {
    return (
      <div className="bg-[#F0EAD6] min-h-[80vh] flex items-center justify-center py-20 px-4 relative font-sans">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none"></div>
        <div className="bg-[#1A1A1A] text-[#F0EAD6] p-12 border-4 border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-[-1deg] text-center max-w-lg mx-auto relative z-10 w-full flex flex-col items-center justify-center">
          <span className="text-[#DC143C] font-mono font-black text-xs uppercase tracking-widest block mb-4 animate-flicker">
            ROLE_REQUIRED
          </span>
          <div className="w-16 h-16 border-4 border-[#DC143C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-xs font-bold text-[#F0EAD6]/60 uppercase tracking-wide leading-relaxed">
            REDIRECTING TO ROLE SELECTION...
          </p>
        </div>
      </div>
    );
  }

  // STATE 4 — Connected, correct network, and role selected
  return <>{children}</>;
}
