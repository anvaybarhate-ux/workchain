import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-[#F0EAD6] py-20 px-8 border-t-8 border-white">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="flex flex-col">
          <div className="text-4xl font-black bg-[#DC143C] p-3 border-2 border-white rotate-[-2deg] w-fit mb-6 shadow-[4px_4px_0_#C5A945]">
            WORKCHAIN
          </div>
          <p className="max-w-xs font-bold uppercase text-[10px] opacity-60 leading-tight tracking-widest text-[#F0EAD6]">
            THE WORLD'S FIRST PEER-TO-PEER LABOR PROTOCOL SECURED BY MILESTONE-BASED SMART CONTRACTS.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-16 font-black uppercase text-xs tracking-[0.2em] text-[#F0EAD6]">
          <div className="flex flex-col space-y-4">
            <span className="text-[#DC143C] text-[10px]">RESOURCES</span>
            <Link href="/docs" className="hover:text-[#DC143C] transition-colors">Docs</Link>
            <Link href="https://github.com" className="hover:text-[#DC143C] transition-colors">Github</Link>
            <Link href="/about" className="hover:text-[#DC143C] transition-colors">DAO</Link>
          </div>
          <div className="flex flex-col space-y-4">
            <span className="text-[#C5A945] text-[10px]">SOCIALS</span>
            <Link href="https://twitter.com" className="hover:text-[#DC143C] transition-colors">Twitter</Link>
            <Link href="https://discord.com" className="hover:text-[#DC143C] transition-colors">Discord</Link>
            <Link href="https://telegram.org" className="hover:text-[#DC143C] transition-colors">Telegram</Link>
          </div>
          <div className="flex flex-col space-y-2 opacity-30 font-mono text-[8px] hidden lg:flex">
            <span>NODE: 8812-XA</span>
            <span>STATUS: LIVE</span>
            <Link href="/tx/demo-hash" className="hover:text-[#DC143C] transition-colors mt-2">TEST TX PAGE</Link>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 text-center border-t border-white/5 pt-10">
        <p className="text-[8px] font-mono opacity-20 uppercase tracking-[0.5em] text-white">COPYRIGHT © 2024 WORKCHAIN PROTOCOL. PEER-TO-PEER LABOUR SYSTEMS INC.</p>
      </div>
    </footer>
  );
}
