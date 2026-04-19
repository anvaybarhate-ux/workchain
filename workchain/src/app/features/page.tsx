"use client";

import React from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';

export default function FeaturesPage() {
  const slideInLeft: Variants = {
    hidden: { x: -100, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: "spring", bounce: 0.4, duration: 0.8 } }
  };
  
  const slideInRight: Variants = {
    hidden: { x: 100, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: "spring", bounce: 0.4, duration: 0.8 } }
  };

  const popIn: Variants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { type: "spring", bounce: 0.5, duration: 0.6 } }
  };

  return (
    <>
      {/* HERO */}
      <section className="bg-[#1A1A1A] py-32 text-center border-b-8 border-white relative z-20">
        <div className="absolute inset-0 halftone opacity-10"></div>
        <div className="relative z-10 max-w-5xl mx-auto px-4">
          <span className="text-[#DC143C] font-black uppercase text-xl mb-4 block tracking-widest animate-flicker">
            SYSTEM_FEATURES
          </span>
          <h1 className="text-[5rem] md:text-[8rem] font-black uppercase text-[#F0EAD6] tracking-tighter text-distressed font-sans leading-none mb-6">
            WHAT WE DO
          </h1>
          <p className="text-[#F0EAD6] opacity-80 font-mono text-xl md:text-2xl font-bold max-w-2xl mx-auto">
            Core modules powering the trustless labor protocol.
          </p>
        </div>
      </section>

      {/* 1. Trustless Escrow */}
      <section className="bg-[#F0EAD6] py-32 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={slideInLeft} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <span className="bg-[#DC143C] text-white px-3 py-1 font-black text-sm uppercase border-2 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A]">
              01 / ESCROW
            </span>
            <h2 className="text-5xl md:text-7xl font-black uppercase font-sans tracking-tighter mt-6 mb-6 text-[#1A1A1A]">
              FUNDS LOCKED<br/>BY CODE.
            </h2>
            <p className="text-[#1A1A1A] font-bold text-lg mb-8 max-w-lg leading-relaxed">
              Eliminate payment risk completely. Funds are deposited into a transparent smart contract before work begins and released explicitly upon milestone approval.
            </p>
            <ul className="space-y-4 font-mono font-bold text-sm">
              <li className="flex items-center gap-3"><span className="text-[#DC143C] text-xl">✓</span> Immutable terms</li>
              <li className="flex items-center gap-3"><span className="text-[#DC143C] text-xl">✓</span> Multi-sig security protocols</li>
              <li className="flex items-center gap-3"><span className="text-[#DC143C] text-xl">✓</span> 100% transparent on-chain balances</li>
            </ul>
          </motion.div>
          <motion.div variants={popIn} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex justify-center">
            <div className="bg-[#DC143C] w-full max-w-md p-12 border-4 border-[#1A1A1A] shadow-[12px_12px_0_#C5A945] rotate-[2deg] animate-jitter-slow flex flex-col items-center justify-center relative min-h-[300px]">
              <div className="absolute inset-0 halftone opacity-30"></div>
              {/* @ts-expect-error custom element */}
              <iconify-icon icon="lucide:lock" className="text-[8rem] text-[#F0EAD6] relative z-10 mb-4"></iconify-icon>
              <div className="absolute top-10 flex gap-4 animate-bounce">
                <span className="bg-[#C5A945] p-2 border-2 border-[#1A1A1A] text-[#1A1A1A] font-black">ETH</span>
                <span className="bg-[#C5A945] p-2 border-2 border-[#1A1A1A] text-[#1A1A1A] font-black translate-y-4">USDC</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="h-16 bg-[#F0EAD6] torn-edge -mt-8 relative z-20"></div>

      {/* 2. Milestone Payments */}
      <section className="bg-[#1A1A1A] py-32 px-8 text-white relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={slideInLeft} initial="hidden" whileInView="visible" viewport={{ once: true }} className="order-2 lg:order-1 flex justify-center">
            <div className="bg-[#F0EAD6] text-[#1A1A1A] w-full max-w-lg p-8 border-4 border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-[-1deg] relative">
              <div className="flex justify-between items-center relative z-10">
                {[
                  { step: "1", label: "DEFINE" },
                  { step: "2", label: "LOCK" },
                  { step: "3", label: "SUBMIT" },
                  { step: "4", label: "APPROVE" },
                  { step: "5", label: "PAID", highlight: true }
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center relative gap-2">
                    <div className={`w-12 h-12 flex items-center justify-center font-black text-xl border-4 border-[#1A1A1A] ${s.highlight ? 'bg-[#DC143C] text-[#F0EAD6]' : 'bg-[#C5A945] text-[#1A1A1A]'} z-10`}>
                      {s.step}
                    </div>
                    <span className="text-[10px] font-black tracking-tighter">{s.label}</span>
                    {i !== 4 && <div className="absolute top-6 left-12 w-[2vw] max-w-[30px] border-t-4 border-[#1A1A1A] -z-10"></div>}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          <motion.div variants={slideInRight} initial="hidden" whileInView="visible" viewport={{ once: true }} className="order-1 lg:order-2">
            <span className="bg-[#C5A945] text-[#1A1A1A] px-3 py-1 font-black text-sm uppercase border-2 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A]">
              02 / MILESTONES
            </span>
            <h2 className="text-5xl md:text-7xl font-black uppercase font-sans tracking-tighter mt-6 mb-6 text-[#F0EAD6]">
              STEP-BY-STEP<br/>SETTLEMENT.
            </h2>
            <p className="text-[#F0EAD6] opacity-80 font-bold text-lg mb-8 max-w-lg leading-relaxed">
              No more massive upfront risks. Break large projects into manageable chunks. Get paid for exactly the work reviewed and approved.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="h-16 bg-[#1A1A1A] torn-edge -mt-8 relative z-20"></div>

      {/* 3. Transparent Disputes */}
      <section className="bg-[#DC143C] py-32 px-8 text-[#F0EAD6] relative">
        <div className="absolute inset-0 halftone opacity-20"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div variants={slideInLeft} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="bg-[#1A1A1A] text-white px-3 py-1 font-black text-sm uppercase border-2 border-white shadow-[4px_4px_0_#C5A945]">
              03 / DISPUTES
            </span>
            <h2 className="text-5xl md:text-7xl font-black uppercase font-sans tracking-tighter mt-6 mb-6">
              DECENTRALIZED<br/>ARBITRATION.
            </h2>
            <p className="font-bold text-lg mb-8 max-w-lg leading-relaxed">
              When disagreements happen, anonymous community arbiters review the evidence. No centralized tech support making arbitrary decisions behind closed doors.
            </p>
          </motion.div>
          <motion.div variants={popIn} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex justify-center">
            <div className="bg-[#F0EAD6] text-[#1A1A1A] w-full max-w-sm p-6 border-4 border-[#1A1A1A] shadow-[12px_12px_0_#1A1A1A] rotate-[2deg]">
              <h3 className="font-black text-center text-xl mb-6 border-b-4 border-[#1A1A1A] pb-2">COMMUNITY VOTE</h3>
              <div className="flex justify-between font-bold text-sm mb-2">
                <span>FREELANCER</span>
                <span>CLIENT</span>
              </div>
              <div className="h-10 w-full flex border-4 border-[#1A1A1A]">
                <div className="bg-[#1A1A1A] text-white flex items-center justify-center font-black w-[72%]">72%</div>
                <div className="bg-[#C5A945] flex items-center justify-center font-black w-[28%] text-xs">28%</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="h-16 bg-[#DC143C] torn-edge -mt-8 relative z-20"></div>

      {/* 4. On-Chain Reputation */}
      <section className="bg-[#C5A945] py-32 px-8 text-[#1A1A1A] relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={slideInLeft} initial="hidden" whileInView="visible" viewport={{ once: true }} className="order-2 lg:order-1 flex justify-center">
            <div className="bg-[#1A1A1A] text-white w-full max-w-sm aspect-square flex flex-col items-center justify-center border-4 border-[#F0EAD6] shadow-[12px_12px_0_#1A1A1A] rotate-[-2deg] clip-path-hex relative p-8">
              <span className="bg-[#C5A945] text-[#1A1A1A] px-4 py-1 font-black text-xl border-2 border-white absolute top-8">
                GOLD TIER
              </span>
              <h4 className="text-8xl font-black font-sans text-distressed mt-12 mb-2">92</h4>
              <p className="font-bold tracking-widest opacity-80">TRUST SCORE</p>
              <div className="absolute bottom-8 font-mono text-xs opacity-50">
                0x8...A4F2
              </div>
            </div>
          </motion.div>
          <motion.div variants={slideInRight} initial="hidden" whileInView="visible" viewport={{ once: true }} className="order-1 lg:order-2">
            <span className="bg-[#1A1A1A] text-white px-3 py-1 font-black text-sm uppercase border-2 border-white shadow-[4px_4px_0_#F0EAD6]">
              04 / REPUTATION
            </span>
            <h2 className="text-5xl md:text-7xl font-black uppercase font-sans tracking-tighter mt-6 mb-6">
              PORTABLE<br/>IDENTITY.
            </h2>
            <p className="font-bold text-lg mb-8 max-w-lg leading-relaxed">
              Your hard work shouldn't be locked inside a Web2 silo. On Workchain, your feedback history and reputation score is minted as a dynamic NFT.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="h-16 bg-[#C5A945] torn-edge -mt-8 relative z-20"></div>

      {/* 5. Near-Zero Fees */}
      <section className="bg-[#F0EAD6] py-32 px-8 text-[#1A1A1A] relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={slideInLeft} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="bg-[#DC143C] text-white px-3 py-1 font-black text-sm uppercase border-2 border-[#1A1A1A] shadow-[4px_4px_0_#C5A945]">
              05 / ECONOMICS
            </span>
            <h2 className="text-5xl md:text-7xl font-black uppercase font-sans tracking-tighter mt-6 mb-6">
              KEEP WHAT<br/>YOU EARN.
            </h2>
            <p className="font-bold text-lg mb-8 max-w-lg leading-relaxed">
              Traditional platforms extract massive 20% taxes from your labor. Here, the only cost is network gas. Zero profit-seeking middlemen.
            </p>
          </motion.div>
          <motion.div variants={popIn} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex items-end justify-center h-64 gap-8">
            <div className="flex flex-col items-center">
              <motion.div initial={{ height: 0 }} whileInView={{ height: "160px" }} viewport={{ once: true }} className="w-16 md:w-24 bg-[#DC143C] border-4 border-[#1A1A1A] relative flex justify-center pt-2">
                <span className="font-black text-white">20%</span>
              </motion.div>
              <span className="mt-4 font-black text-sm">UPWORK</span>
            </div>
            <div className="flex flex-col items-center">
              <motion.div initial={{ height: 0 }} whileInView={{ height: "160px" }} viewport={{ once: true }} className="w-16 md:w-24 bg-[#DC143C] border-4 border-[#1A1A1A] relative flex justify-center pt-2">
                <span className="font-black text-white">20%</span>
              </motion.div>
              <span className="mt-4 font-black text-sm">FIVERR</span>
            </div>
            <div className="flex flex-col items-center">
              <motion.div initial={{ height: 0 }} whileInView={{ height: "24px" }} viewport={{ once: true }} className="w-16 md:w-24 bg-[#C5A945] border-4 border-[#1A1A1A] relative justify-center pt-2 overflow-visible z-10 flex">
                <span className="font-black text-[#1A1A1A] absolute -top-8 whitespace-nowrap bg-white px-2 border-2 border-[#1A1A1A]">~ 0%</span>
              </motion.div>
              <span className="mt-4 font-black text-sm">WORKCHAIN</span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="h-16 bg-[#F0EAD6] torn-edge -mt-8 relative z-20"></div>

      {/* 6. Security First */}
      <section className="bg-[#1A1A1A] py-32 px-8 text-white relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={slideInLeft} initial="hidden" whileInView="visible" viewport={{ once: true }} className="order-2 lg:order-1 flex justify-center">
            <div className="border-8 border-[#F0EAD6] aspect-square w-full max-w-sm rounded-[3rem] rounded-tl-sm rounded-br-sm p-12 relative rotate-[3deg] shadow-[12px_12px_0_#DC143C]">
              <div className="space-y-6">
                {[
                  "NON-CUSTODIAL WALLETS",
                  "FULLY OPEN-SOURCE",
                  "HALBORN AUDITED",
                  "ANTI-SYBIL RESISTANCE",
                  "NO KYC REQUIRED"
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.2 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4 border-b-2 border-white/20 pb-2"
                  >
                    <span className="text-[#C5A945] font-black text-xl">✓</span>
                    <span className="text-sm font-bold tracking-widest">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
          <motion.div variants={slideInRight} initial="hidden" whileInView="visible" viewport={{ once: true }} className="order-1 lg:order-2">
            <span className="bg-[#F0EAD6] text-[#1A1A1A] px-3 py-1 font-black text-sm uppercase border-2 border-[#1A1A1A] shadow-[4px_4px_0_#DC143C]">
              06 / SECURITY
            </span>
            <h2 className="text-5xl md:text-7xl font-black uppercase font-sans tracking-tighter mt-6 mb-6 text-[#F0EAD6]">
              BULLETPROOF<br/>INFRASTRUCTURE.
            </h2>
            <p className="opacity-80 font-bold text-lg mb-8 max-w-lg leading-relaxed text-[#F0EAD6]">
              Your assets and reputation are protected by mathematically verified cryptographic proofs. Period.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-40 bg-[#DC143C] relative overflow-hidden flex items-center justify-center border-t-8 border-white z-30">
        <div className="absolute inset-0 halftone opacity-10"></div>
        <div className="relative z-10 text-center px-4">
          <h2 className="text-6xl md:text-9xl font-black text-[#F0EAD6] leading-none uppercase tracking-tighter text-distressed font-sans">
            READY TO<br/>BUILD?
          </h2>
          <div className="mt-12">
            <Link href="/connect" className="bg-[#1A1A1A] text-[#F0EAD6] px-16 py-6 text-3xl font-black uppercase border-4 border-white hover:bg-white hover:text-[#1A1A1A] transition-all transform hover:scale-105 inline-block font-sans shadow-[8px_8px_0_#C5A945]">
              CONNECT WALLET
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
