"use client";

import React from 'react';
import { useWallet } from '@/context/WalletContext';

export default function WrongNetworkBanner() {
  const { isConnected, isCorrectNetwork, switchToSepolia } = useWallet();

  if (!isConnected || isCorrectNetwork) {
    return null;
  }

  return (
    <div className="w-full sticky top-[64px] left-0 z-40 bg-[#DC143C] border-b-4 border-[#1A1A1A] py-3 px-8 flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-300">
      <span className="font-mono font-black uppercase text-[#F0EAD6] text-xs md:text-sm tracking-wide text-center md:text-left flex items-center gap-2">
        <span className="animate-ping h-2.5 w-2.5 rounded-full bg-[#F0EAD6] inline-block duration-1000"></span>
        ⚠ WRONG_NETWORK — YOU ARE NOT ON SEPOLIA. ALL TRANSACTIONS WILL FAIL.
      </span>
      <button
        onClick={switchToSepolia}
        className="bg-[#F0EAD6] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-mono font-black uppercase text-xs tracking-wide px-4 py-2"
      >
        SWITCH TO SEPOLIA
      </button>
    </div>
  );
}
