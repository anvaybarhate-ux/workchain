import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative px-8 pt-40 pb-32 md:pt-20 md:pb-40 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center max-w-7xl mx-auto">
          <div className="lg:col-span-8 relative z-20">
            <div className="mb-4 flex gap-3">
              <span className="bg-[#DC143C] text-white px-3 py-1 text-xs font-black uppercase tracking-tighter border-2 border-[#1A1A1A]">
                ESCROW PROTECTED
              </span>
              <span className="bg-white text-[#1A1A1A] px-3 py-1 text-xs font-black uppercase tracking-tighter border-2 border-[#1A1A1A]">
                VERIFIED CONTRACTS
              </span>
            </div>
            <h2 className="text-[5rem] md:text-[8rem] xl:text-[10rem] font-black leading-[0.8] uppercase tracking-tighter text-distressed font-sans">
              WORK<br />
              <span className="text-[#DC143C]">CHAIN</span>
            </h2>
            <div className="mt-10 max-w-2xl bg-[#1A1A1A] text-[#F0EAD6] p-8 border-l-8 border-[#DC143C] rotate-[1.5deg] shadow-[10px_10px_0_#C5A945] animate-jitter-slow">
              <p className="text-2xl md:text-3xl font-black uppercase leading-tight font-sans">
                Peer-to-peer labor protocol. Secure payments via <span className="text-[#DC143C]">IMMUTABLE CODE</span>. Zero middleman fees.
              </p>
            </div>
            <div className="mt-12 flex flex-wrap gap-6">
              <Link href="/client/create" className="bg-[#DC143C] text-[#F0EAD6] px-10 py-5 text-2xl font-black uppercase border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                POST PROJECT
              </Link>
              <Link href="/explore" className="bg-white text-[#1A1A1A] px-10 py-5 text-2xl font-black uppercase border-4 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F0EAD6] transition-all">
                BROWSE GIGS
              </Link>
            </div>
          </div>

          {/* Visual Side */}
          <div className="lg:col-span-4 relative h-[400px] md:h-[500px] mt-16 lg:mt-0 flex items-center justify-center">
            <div className="w-full h-full bg-[#DC143C] torn-edge rotate-[3deg] relative overflow-hidden border-4 border-[#1A1A1A]">
              <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=800" alt="Tech Abstract" className="w-full h-full object-cover mix-blend-multiply grayscale contrast-150 opacity-40" />
              <div className="absolute inset-0 halftone opacity-20"></div>
            </div>
            <div className="absolute -bottom-8 -left-8 bg-[#C5A945] p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] rotate-[-4deg] animate-jitter-slow flex flex-col items-center">
              {/* @ts-expect-error - Custom element from Iconify */}
              <iconify-icon icon="lucide:shield-check" className="text-6xl text-[#1A1A1A]"></iconify-icon>
              <p className="font-black text-xs mt-2 uppercase tracking-tighter">TRUST_SCORE: 100</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section / Feature Overview */}
      <section className="bg-[#1A1A1A] text-[#F0EAD6] py-16 px-8 border-y-4 border-white relative z-20">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-around items-center gap-8">
            <div className="text-center font-sans tracking-tighter">
                <p className="text-5xl md:text-7xl font-black text-[#DC143C]">$12.4M</p>
                <p className="text-sm font-bold uppercase tracking-widest mt-2">TOTAL VALUE LOCKED</p>
            </div>
            <div className="text-center font-sans tracking-tighter">
                <p className="text-5xl md:text-7xl font-black text-[#C5A945]">8,402</p>
                <p className="text-sm font-bold uppercase tracking-widest mt-2">ACTIVE PROJECTS</p>
            </div>
            <div className="text-center font-sans tracking-tighter">
                <p className="text-5xl md:text-7xl font-black">0.05%</p>
                <p className="text-sm font-bold uppercase tracking-widest mt-2">DISPUTE RATE</p>
            </div>
        </div>
      </section>

      {/* Milestone Flow (How it works) */}
      <section className="py-32 bg-[#1A1A1A] text-white px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <span className="text-[#DC143C] font-black uppercase text-xl mb-2 block tracking-widest animate-flicker">SYSTEM_LOG</span>
            <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter font-sans">HOW IT WORKS</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="bg-[#F0EAD6] text-[#1A1A1A] p-8 border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] rotate-[-1deg]">
              <span className="text-5xl font-black mb-4 block font-sans">01</span>
              <h5 className="text-xl font-black uppercase mb-2 font-sans">Fund Escrow</h5>
              <p className="text-xs font-bold leading-relaxed">Client locks funds in smart contract. Transparent verification on-chain.</p>
            </div>
            {/* Step 2 */}
            <div className="bg-[#F0EAD6] text-[#1A1A1A] p-8 border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] md:translate-y-6 rotate-[1deg]">
              <span className="text-5xl font-black mb-4 block font-sans">02</span>
              <h5 className="text-xl font-black uppercase mb-2 font-sans">Work Phase</h5>
              <p className="text-xs font-bold leading-relaxed">Freelancer submits milestones. All data secured via decentralized protocols.</p>
            </div>
            {/* Step 3 */}
            <div className="bg-[#F0EAD6] text-[#1A1A1A] p-8 border-4 border-[#1A1A1A] shadow-[8px_8px_0_#DC143C] rotate-[-2deg]">
              <span className="text-5xl font-black mb-4 block font-sans">03</span>
              <h5 className="text-xl font-black uppercase mb-2 font-sans">Validation</h5>
              <p className="text-xs font-bold leading-relaxed">Client approves deliverables. Contract triggers automatic payment release.</p>
            </div>
            {/* Step 4 */}
            <div className="bg-[#F0EAD6] text-[#1A1A1A] p-8 border-4 border-[#C5A945] shadow-[8px_8px_0_#1A1A1A] md:translate-y-6 rotate-[2deg]">
              <span className="text-5xl font-black mb-4 block font-sans">04</span>
              <h5 className="text-xl font-black uppercase mb-2 font-sans">Settlement</h5>
              <p className="text-xs font-bold leading-relaxed">Instant payouts. No delays, no high commissions, no middlemen.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-40 bg-[#DC143C] relative overflow-hidden flex items-center justify-center border-t-8 border-[#1A1A1A]">
        <div className="absolute inset-0 halftone opacity-10"></div>
        <div className="relative z-10 text-center px-4">
          <h2 className="text-6xl md:text-9xl font-black text-[#F0EAD6] leading-none uppercase tracking-tighter text-distressed font-sans">
            JOIN THE<br />REVOLUTION
          </h2>
          <div className="mt-12">
            <Link href="/connect" className="bg-[#1A1A1A] text-[#F0EAD6] px-16 py-6 text-3xl font-black uppercase border-4 border-white hover:bg-white hover:text-[#1A1A1A] transition-all transform hover:scale-105 inline-block font-sans shadow-[8px_8px_0_#C5A945]">
              ENTER APP
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
