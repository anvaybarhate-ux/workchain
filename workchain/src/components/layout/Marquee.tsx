import React from 'react';

export function Marquee() {
  return (
    <header className="fixed top-0 w-full z-40 bg-[#DC143C] text-[#F0EAD6] h-12 flex items-center overflow-hidden border-b-4 border-[#1A1A1A]">
      <div className="animate-marquee flex items-center space-x-12 uppercase font-black text-xs tracking-[0.2em]">
        <span>WORKCHAIN PROTOCOL ACTIVE</span>
        <span>•</span>
        <span>ESCROW SECURED [NODE: 0x9fA2]</span>
        <span>•</span>
        <span>PEER-TO-PEER SETTLEMENT</span>
        <span>•</span>
        <span>VERIFIED ON-CHAIN REPUTATION</span>
        <span>•</span>
        <span>SMART CONTRACTS ACTIVE</span>
        <span>•</span>
        {/* Repeat string to ensure seamless loop visually */}
        <span>WORKCHAIN PROTOCOL ACTIVE</span>
        <span>•</span>
        <span>ESCROW SECURED [NODE: 0x9fA2]</span>
        <span>•</span>
        <span>PEER-TO-PEER SETTLEMENT</span>
        <span>•</span>
      </div>
    </header>
  );
}
