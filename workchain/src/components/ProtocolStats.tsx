"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { getFactoryContract, getReadProvider, API_URL } from "@/lib/contracts";

export default function ProtocolStats() {
  const [totalProjects, setTotalProjects] = useState<string>("—");
  const [activeProjects, setActiveProjects] = useState<string>("—");
  const [ethLocked, setEthLocked] = useState<string>("—");
  const [disputeRate, setDisputeRate] = useState<string>("—");

  const ethLockedCache = useRef<{ amount: string; timestamp: number } | null>(null);

  const fetchEthLocked = async (provider: ethers.Provider) => {
    const now = Date.now();
    if (ethLockedCache.current && now - ethLockedCache.current.timestamp < 5 * 60 * 1000) {
      return ethLockedCache.current.amount;
    }

    try {
      const res = await fetch(`${API_URL}/api/projects`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const projects = await res.json();

      const validProjects = projects.filter((p: any) => p.contract_address);

      const balancePromises = validProjects.map(async (p: any) => {
        try {
          const balance = await provider.getBalance(p.contract_address);
          return balance;
        } catch (e) {
          console.warn(`Failed to fetch escrow balance for ${p.contract_address}:`, e);
          return BigInt(0);
        }
      });

      const balances = await Promise.all(balancePromises);
      const sumWei = balances.reduce((sum: bigint, bal: bigint) => sum + bal, BigInt(0));
      const formatted = parseFloat(ethers.formatEther(sumWei)).toFixed(2);

      ethLockedCache.current = {
        amount: formatted,
        timestamp: now
      };
      return formatted;
    } catch (err) {
      console.warn("Error fetching locked ETH:", err);
      return ethLockedCache.current ? ethLockedCache.current.amount : "0.00";
    }
  };

  const fetchDisputeRate = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reputation/leaderboard?limit=100`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const freelancers = await res.json();
      if (Array.isArray(freelancers) && freelancers.length > 0) {
        const sum = freelancers.reduce((s: number, f: any) => s + parseFloat(f.dispute_rate || 0), 0);
        const avg = sum / freelancers.length;
        return avg.toFixed(2) + "%";
      }
      return "0.00%";
    } catch (err) {
      console.warn("Error fetching dispute rate:", err);
      return "0.00%";
    }
  };

  const fetchData = async () => {
    const provider = getReadProvider();

    // 1. Total Projects (on-chain)
    try {
      const factory = getFactoryContract(provider);
      const total = await factory.getTotalProjects();
      setTotalProjects(total.toString());
    } catch (err) {
      console.warn("Error fetching total projects:", err);
    }

    // 2. Active Projects (from API)
    try {
      const res = await fetch(`${API_URL}/api/projects?status=active`);
      if (res.ok) {
        const data = await res.json();
        setActiveProjects(data.length.toString());
      }
    } catch (err) {
      console.warn("Error fetching active projects:", err);
    }

    // 3. Total ETH Locked
    const lockedVal = await fetchEthLocked(provider);
    setEthLocked(lockedVal);

    // 4. Dispute Rate
    const rateVal = await fetchDisputeRate();
    setDisputeRate(rateVal);
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-[#1A1A1A] text-[#F0EAD6] py-16 px-8 border-y-4 border-white relative z-20">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-center">
        {/* TVL */}
        <div className="text-center font-sans tracking-tighter col-span-2 md:col-span-1">
          <p className="text-4xl md:text-5xl font-black text-[#DC143C] truncate">
            {ethLocked !== "—" ? `${ethLocked} ETH` : "—"}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-2">ETH LOCKED</p>
        </div>

        {/* Total Projects */}
        <div className="text-center font-sans tracking-tighter">
          <p className="text-4xl md:text-5xl font-black text-[#F0EAD6] truncate">
            {totalProjects}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-2">TOTAL PROJECTS</p>
        </div>

        {/* Active Projects */}
        <div className="text-center font-sans tracking-tighter">
          <p className="text-4xl md:text-5xl font-black text-[#C5A945] truncate">
            {activeProjects}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-2">ACTIVE PROJECTS</p>
        </div>

        {/* Dispute Rate */}
        <div className="text-center font-sans tracking-tighter">
          <p className="text-4xl md:text-5xl font-black truncate">
            {disputeRate}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-2">DISPUTE RATE</p>
        </div>

        {/* Platform Fee */}
        <div className="text-center font-sans tracking-tighter col-span-2 md:col-span-1">
          <p className="text-4xl md:text-5xl font-black text-[#F0EAD6]/50">
            ~0%
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-2">PLATFORM FEE</p>
        </div>
      </div>
    </section>
  );
}
