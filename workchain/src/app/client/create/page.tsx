"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RequireWallet from '@/components/RequireWallet';
import { Sidebar } from '@/components/layout';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { getFactoryContract } from '@/lib/contracts';
import { ethers } from 'ethers';
import { createProject, createUser } from '@/lib/api';
import { etherscanUrl, formatAddress, shortenHash } from '@/lib/format';

interface Milestone {
  title: string;
  description?: string;
  amount_eth: string;
  deadline?: string;
}

export default function CreateProjectForm() {
  const router = useRouter();
  const { address, signer, isConnected, isCorrectNetwork, switchToSepolia } = useWallet();

  // Wizard Steps: 1 = Details, 2 = Milestones, 3 = Review & Lock
  const [step, setStep] = useState<number>(1);

  // Form Inputs State
  const [projectName, setProjectName] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [freelancerAddress, setFreelancerAddress] = useState<string>('');
  const [category, setCategory] = useState<string>('development');
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: 'MILESTONE 1: ARCHITECTURE DESIGN', amount_eth: '0.3', description: '' },
    { title: 'MILESTONE 2: CONTRACT DEVELOPMENT', amount_eth: '0.4', description: '' },
    { title: 'MILESTONE 3: SECURITY AUDIT', amount_eth: '0.3', description: '' },
  ]);

  const [selectedCurrency, setSelectedCurrency] = useState<string>('ETH');
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,eur,inr');
        if (res.ok) {
          const data = await res.json();
          if (data.ethereum) {
            setExchangeRates({
              USD: data.ethereum.usd,
              EUR: data.ethereum.eur,
              INR: data.ethereum.inr,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch exchange rates", err);
      }
    };
    fetchRates();
  }, []);

  const getEthAmount = (amountStr: string) => {
    const val = parseFloat(amountStr);
    if (isNaN(val)) return 0;
    if (selectedCurrency === 'ETH') return val;
    if (exchangeRates[selectedCurrency]) {
      return val / exchangeRates[selectedCurrency];
    }
    return 0;
  };


  // Tx / Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [loadingText, setLoadingText] = useState<string>('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    txHash: string;
    escrowAddress: string | null;
    totalEth: number;
  } | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem('workchain_role') as 'freelancer' | 'client';
    if (storedRole === 'freelancer') {
      router.push('/dashboard');
    }
  }, [router]);

  // Dynamic values
  const totalEth = milestones.reduce((sum, m) => sum + getEthAmount(m.amount_eth), 0);

  // Reset Form State completely
  const handleCreateAnother = () => {
    setStep(1);
    setProjectName('');
    setProjectDescription('');
    setFreelancerAddress('');
    setCategory('development');
    setMilestones([
      { title: 'MILESTONE 1: ARCHITECTURE DESIGN', amount_eth: '0.3', description: '' },
      { title: 'MILESTONE 2: CONTRACT DEVELOPMENT', amount_eth: '0.4', description: '' },
      { title: 'MILESTONE 3: SECURITY AUDIT', amount_eth: '0.3', description: '' },
    ]);
    setIsLoading(false);
    setLoadingStage(0);
    setLoadingText('');
    setTxHash(null);
    setError(null);
    setIsSuccess(false);
    setSuccessData(null);
  };

  // Milestone Helpers
  const addMilestone = () => {
    setError(null);
    setMilestones([
      ...milestones,
      { title: `MILESTONE ${milestones.length + 1}: SPECIFY WORK`, amount_eth: '0.0', description: '' }
    ]);
  };

  const removeMilestone = (index: number) => {
    setError(null);
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    setError(null);
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setMilestones(updated);
  };

  // Input cleaners that clear errors when typing
  const handleNameChange = (val: string) => {
    setError(null);
    setProjectName(val.toUpperCase());
  };

  const handleFreelancerChange = (val: string) => {
    setError(null);
    setFreelancerAddress(val);
  };

  const handleDescChange = (val: string) => {
    setError(null);
    setProjectDescription(val.toUpperCase());
  };

  // Wizard Step Navigation
  const handleNextStep1 = () => {
    setError(null);
    if (!projectName.trim()) {
      setError("Fill project name first");
      return;
    }
    if (!ethers.isAddress(freelancerAddress)) {
      setError("INVALID_ADDRESS: Freelancer wallet address is not valid.");
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    setError(null);
    if (milestones.length === 0) {
      setError("Add at least one milestone.");
      return;
    }
    const hasInvalidAmount = milestones.some(m => !m.amount_eth || getEthAmount(m.amount_eth) <= 0);
    if (hasInvalidAmount) {
      setError("All milestones need an ETH amount greater than 0.");
      return;
    }
    const hasInvalidTitle = milestones.some(m => !m.title.trim());
    if (hasInvalidTitle) {
      setError("All milestones need a title.");
      return;
    }
    setStep(3);
  };

  // Smart Contract & DB transaction executor
  const handleLockFunds = async () => {
    if (!address || !signer) {
      setError("WALLET_NOT_CONNECTED: Please connect MetaMask first.");
      return;
    }

    if (milestones.length === 0) {
      setError("Add at least one milestone.");
      return;
    }

    const hasInvalidAmount = milestones.some(m => !m.amount_eth || getEthAmount(m.amount_eth) <= 0);
    if (hasInvalidAmount) {
      setError("All milestones need an ETH amount greater than 0.");
      return;
    }

    try {
      // STAGE 1 — PREPARING
      setLoadingStage(1);
      setLoadingText("PREPARING_TRANSACTION...");
      setIsLoading(true);
      setError(null);

      const totalWei = ethers.parseEther(totalEth.toFixed(18));

      const titles = milestones.map(m => m.title);
      const descriptions = milestones.map(m => m.description || "");
      const amounts = milestones.map(m => ethers.parseEther(getEthAmount(m.amount_eth).toFixed(18)));
      const deadlines = milestones.map(m =>
        m.deadline
          ? Math.floor(new Date(m.deadline).getTime() / 1000)
          : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
      );

      if (!ethers.isAddress(freelancerAddress)) {
        setError("INVALID_ADDRESS: Freelancer wallet address is not valid.");
        setIsLoading(false);
        setLoadingStage(0);
        return;
      }

      const factory = getFactoryContract(signer);

      // STAGE 2 — WAITING FOR SIGNATURE
      setLoadingStage(2);
      setLoadingText("WAITING_FOR_SIGNATURE...");

      const tx = await factory.createProject(
        freelancerAddress,
        titles,
        descriptions,
        amounts,
        deadlines,
        { value: totalWei }
      );

      // STAGE 3 — BROADCASTING
      setLoadingStage(3);
      setLoadingText("BROADCASTING_TO_SEPOLIA...");
      setTxHash(tx.hash);

      const receipt = await tx.wait();

      let escrowAddress: string | null = null;
      try {
        const factoryInterface = factory.interface;
        for (const log of receipt.logs) {
          try {
            const parsed = factoryInterface.parseLog(log);
            if (parsed?.name === "ProjectCreated") {
              escrowAddress = parsed.args[0];
              break;
            }
          } catch {
            continue;
          }
        }
      } catch {
        // escrowAddress stays null, not critical
      }

      // Pre-register user profiles in the off-chain DB to satisfy constraints
      try {
        await createUser({ wallet_address: address, role: 'client' });
      } catch { /* ignore */ }
      try {
        await createUser({ wallet_address: freelancerAddress, role: 'freelancer' });
      } catch { /* ignore */ }

      // Save project records to database
      await createProject(address, {
        title: projectName,
        description: projectDescription || "No specifications provided.",
        freelancer_wallet: freelancerAddress,
        category: category.toLowerCase(),
        contract_address: escrowAddress,
        tx_hash_deploy: tx.hash,
        total_value_eth: totalEth,
        milestones: milestones.map((m, i) => ({
          title: m.title,
          description: m.description || "",
          amount_eth: getEthAmount(m.amount_eth),
          deadline: m.deadline || null,
          milestone_index: i
        }))
      });

      // STAGE 4 — SUCCESS
      setLoadingStage(4);
      setIsLoading(false);
      setIsSuccess(true);
      setSuccessData({
        txHash: tx.hash,
        escrowAddress,
        totalEth
      });

    } catch (e: unknown) {
      setIsLoading(false);
      setLoadingStage(0);

      if (e instanceof Error) {
        const errMsg = e.message.toLowerCase();
        if (e.message.includes("4001") || errMsg.includes("user rejected") || errMsg.includes("denied")) {
          setError("TRANSACTION_REJECTED: You cancelled the MetaMask request. Click the button again to retry.");
        } else if (errMsg.includes("insufficient funds")) {
          setError("INSUFFICIENT_FUNDS: Your wallet does not have enough Sepolia ETH. Get more from sepoliafaucet.com");
        } else if (errMsg.includes("nonce")) {
          setError("NONCE_ERROR: Reset MetaMask account in Settings → Advanced → Clear Activity Tab Data");
        } else {
          setError("TRANSACTION_FAILED: " + e.message);
        }
      } else {
        setError("TRANSACTION_FAILED: An unknown error occurred.");
      }
    }
  };

  // Button disabled logic & validation reason
  const isCorrectChain = isCorrectNetwork;
  const missingName = !projectName.trim();
  const emptyMilestones = milestones.length === 0;
  const totalEthZero = totalEth <= 0;

  let disabledReason = "";
  if (!isConnected) disabledReason = "Connect wallet first";
  else if (!isCorrectChain) disabledReason = "Switch to Sepolia first";
  else if (isLoading) disabledReason = "Transaction in progress";
  else if (missingName) disabledReason = "Fill project name first";
  else if (emptyMilestones) disabledReason = "Add milestones first";
  else if (totalEthZero) disabledReason = "Add ETH amounts first";

  const isDisabled = !!disabledReason;

  // Custom styling block for brutalist animations
  const inlineStyles = `
    @keyframes pulseCrimson {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.5; }
    }
    .animate-pulse-crimson {
      animation: pulseCrimson 1.2s infinite ease-in-out;
    }
    @keyframes spinBorder {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .animate-spin-border {
      animation: spinBorder 1.5s linear infinite;
    }
    @keyframes scaleCheck {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .animate-scale-check {
      animation: scaleCheck 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes glitch {
      0% { text-shadow: 2px -2px 0 #DC143C, -2px 2px 0 #C5A945; }
      50% { text-shadow: -2px 2px 0 #DC143C, 2px -2px 0 #C5A945; }
      100% { text-shadow: 2px -2px 0 #DC143C, -2px 2px 0 #C5A945; }
    }
    .animate-glitch {
      animation: glitch 1s infinite steps(2);
    }
  `;

  return (
    <RequireWallet>
      <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
        <Sidebar activePath="/client/create" />
        <style>{inlineStyles}</style>

        <main className="flex-grow px-8 py-12 relative w-full overflow-x-hidden">
          
          {/* HEADER */}
          <div className="mb-12 border-b-8 border-[#1A1A1A] pb-6">
            <span className="text-[#DC143C] font-black text-xs uppercase tracking-[0.3em] block mb-3 animate-flicker font-mono">
              ESCROW_PROVISIONS
            </span>
            <h1 className="text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none font-sans text-distressed">
              NEW PROJECT.
            </h1>
          </div>

          {isSuccess && successData ? (
            /* STAGE 4 — SUCCESS SCREEN */
            <div className="max-w-4xl bg-[#F0EAD6] border-4 border-[#C5A945] shadow-[16px_16px_0_#DC143C] rotate-[-1deg] p-12 text-center relative z-30">
              <div className="absolute top-4 right-4 bg-[#1A1A1A] text-white font-mono text-[9px] font-black px-2 py-0.5 border-2 border-white">
                TX_RECEIPT: COLD_CUSTODY_LOCK
              </div>

              <div className="w-24 h-24 rounded-full border-4 border-[#DC143C] flex items-center justify-center mx-auto mb-6 bg-white shadow-[4px_4px_0_#1A1A1A]">
                <span className="text-6xl font-black text-[#DC143C] animate-scale-check">✓</span>
              </div>

              <h2 className="text-5xl font-black uppercase tracking-tight text-[#1A1A1A] mb-2 animate-glitch">
                CONTRACT_DEPLOYED.
              </h2>
              <div className="text-xs font-mono font-black text-[#C5A945] tracking-[0.25em] uppercase mb-8">
                FUNDS LOCKED ON ETHEREUM
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto bg-white border-2 border-[#1A1A1A] p-4 mb-8 shadow-[4px_4px_0_#1A1A1A] font-mono">
                <div>
                  <div className="text-xs opacity-60 uppercase font-black">LOCKED</div>
                  <div className="text-2xl font-black text-[#DC143C]">{successData.totalEth} ETH</div>
                </div>
                <div>
                  <div className="text-xs opacity-60 uppercase font-black">STRUCTURE</div>
                  <div className="text-2xl font-black text-[#1A1A1A]">{milestones.length} MILESTONES</div>
                </div>
              </div>

              {/* TX Hash box */}
              <div className="bg-[#1A1A1A] border-4 border-[#C5A945] p-6 max-w-xl mx-auto mb-6 text-left shadow-[8px_8px_0_#1A1A1A] font-mono">
                <span className="text-[10px] font-black text-[#C5A945] block uppercase tracking-widest mb-1">TX_HASH:</span>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-white font-bold text-sm tracking-tight break-all">{shortenHash(successData.txHash)}</span>
                  <button 
                    onClick={() => window.open(etherscanUrl(successData.txHash, "tx"), "_blank")}
                    className="bg-[#DC143C] hover:bg-[#C5A945] text-white border-2 border-white px-3 py-1 text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
                  >
                    VIEW ON ETHERSCAN ↗
                  </button>
                </div>
              </div>

              {/* Escrow Contract Box */}
              {successData.escrowAddress && (
                <div className="bg-[#1A1A1A] border-4 border-[#C5A945] p-6 max-w-xl mx-auto mb-10 text-left shadow-[8px_8px_0_#1A1A1A] font-mono">
                  <span className="text-[10px] font-black text-[#C5A945] block uppercase tracking-widest mb-1">ESCROW_CONTRACT:</span>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-white font-bold text-sm tracking-tight break-all">{formatAddress(successData.escrowAddress)}</span>
                    <button 
                      onClick={() => window.open(etherscanUrl(successData.escrowAddress!, "address"), "_blank")}
                      className="bg-[#DC143C] hover:bg-[#C5A945] text-white border-2 border-white px-3 py-1 text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
                    >
                      VIEW ON ETHERSCAN ↗
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center font-mono">
                <button 
                  onClick={() => router.push("/projects")}
                  className="w-full sm:w-auto bg-[#DC143C] text-[#F0EAD6] px-8 py-4 text-xl font-black uppercase border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] active:translate-x-1 active:translate-y-1 active:shadow-none hover:bg-white hover:text-[#DC143C] transition-all cursor-pointer"
                >
                  VIEW PROJECT →
                </button>
                <button 
                  onClick={handleCreateAnother}
                  className="w-full sm:w-auto bg-[#F0EAD6] text-[#1A1A1A] px-8 py-4 text-xl font-black uppercase border-4 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all cursor-pointer"
                >
                  CREATE ANOTHER
                </button>
              </div>
            </div>
          ) : (
            /* WIZARD & FORMS */
            <div className="max-w-4xl bg-white border-4 border-[#1A1A1A] shadow-[12px_12px_0_#1A1A1A] p-8 md:p-12 rotate-[-0.5deg] relative z-30">
              <div className="absolute top-4 right-4 bg-[#1A1A1A] text-white font-mono text-[9px] font-black px-2 py-0.5 border-2 border-white">
                FORM: ESCROW_LOCK_01
              </div>

              {/* Step indicator header */}
              <div className="flex justify-between items-center mb-8 border-b-4 border-[#1A1A1A] pb-4 font-mono">
                {[
                  { name: '01_DETAILS', num: 1 },
                  { name: '02_MILESTONES', num: 2 },
                  { name: '03_REVIEW', num: 3 }
                ].map((s, index) => {
                  const isActive = step === s.num;
                  const isCompleted = step > s.num;
                  return (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className={`text-[10px] md:text-xs font-black px-2.5 py-1 border-2 ${
                        isActive 
                          ? 'bg-[#DC143C] text-[#F0EAD6] border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A]' 
                          : isCompleted 
                          ? 'bg-[#10B981] text-white border-[#1A1A1A]' 
                          : 'bg-[#F0EAD6]/50 text-[#1A1A1A]/40 border-[#1A1A1A]/20'
                      }`}>
                        {s.name}
                      </span>
                      {index < 2 && <span className="text-[#1A1A1A]/20 font-black">⟶</span>}
                    </div>
                  );
                })}
              </div>

              {step === 1 && (
                /* STEP 1: DETAILS */
                <div className="space-y-8 font-mono text-sm">
                  <div className="flex flex-col gap-2">
                    <label className="font-black text-xs uppercase tracking-widest text-[#1A1A1A]">PROJECT_TITLE *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="E.G., DEFI LIQUIDITY MINING SMART CONTRACT"
                      value={projectName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full bg-[#F0EAD6] border-4 border-[#1A1A1A] px-4 py-3 font-bold uppercase text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 outline-none focus:border-[#DC143C] shadow-[4px_4px_0_#1A1A1A]"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-black text-xs uppercase tracking-widest text-[#1A1A1A]">CATEGORY</label>
                    <select
                      value={category}
                      onChange={(e) => { setError(null); setCategory(e.target.value); }}
                      className="w-full bg-[#F0EAD6] border-4 border-[#1A1A1A] px-4 py-3 font-bold uppercase text-[#1A1A1A] outline-none focus:border-[#DC143C] shadow-[4px_4px_0_#1A1A1A]"
                    >
                      <option value="development">DEVELOPMENT</option>
                      <option value="design">DESIGN</option>
                      <option value="marketing">MARKETING</option>
                      <option value="writing">WRITING</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-black text-xs uppercase tracking-widest text-[#1A1A1A]">FREELANCER_WALLET_ADDRESS *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="0x..."
                      value={freelancerAddress}
                      onChange={(e) => handleFreelancerChange(e.target.value)}
                      className="w-full bg-[#F0EAD6] border-4 border-[#1A1A1A] px-4 py-3 font-bold text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 outline-none focus:border-[#DC143C] shadow-[4px_4px_0_#1A1A1A]"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-black text-xs uppercase tracking-widest text-[#1A1A1A]">SPECIFICATION_DETAILS</label>
                    <textarea 
                      rows={4}
                      placeholder="OUTLINE PROTOCOLS, SCOPE, REQUISITES..."
                      value={projectDescription}
                      onChange={(e) => handleDescChange(e.target.value)}
                      className="w-full bg-[#F0EAD6] border-4 border-[#1A1A1A] px-4 py-3 font-bold uppercase text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 outline-none focus:border-[#DC143C] shadow-[4px_4px_0_#1A1A1A] resize-none"
                    />
                  </div>

                  {error && (
                    <div className="bg-[#DC143C]/10 border-4 border-[#DC143C] rotate-[-0.3deg] p-4 mt-4 font-mono">
                      <span className="text-[10px] font-black text-[#DC143C] block uppercase tracking-widest mb-1">ERROR_LOG:</span>
                      <span className="font-bold text-[#DC143C] uppercase text-xs">{error}</span>
                    </div>
                  )}

                  <div className="pt-6 flex justify-end">
                    <button 
                      onClick={handleNextStep1}
                      className="w-full sm:w-auto bg-[#DC143C] text-white px-8 py-4 text-xl font-black uppercase border-4 border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all shadow-[8px_8px_0_#C5A945] cursor-pointer"
                    >
                      SPECIFY MILESTONES →
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                /* STEP 2: MILESTONES */
                <div className="space-y-8 font-mono text-sm">
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <h3 className="font-black text-xl uppercase tracking-tighter text-[#1A1A1A]">MILESTONES_BREAKDOWN</h3>
                        <select
                          value={selectedCurrency}
                          onChange={(e) => setSelectedCurrency(e.target.value)}
                          className="bg-white border-2 border-[#1A1A1A] px-2 py-1 font-black text-xs uppercase shadow-[2px_2px_0_#1A1A1A] outline-none"
                        >
                          <option value="ETH">ETH</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="INR">INR</option>
                        </select>
                      </div>
                      <button 
                        type="button" 
                        onClick={addMilestone}
                        className="bg-[#C5A945] text-[#1A1A1A] border-2 border-[#1A1A1A] px-3 py-1 font-black text-xs uppercase hover:bg-white transition-all shadow-[2px_2px_0_#1A1A1A] cursor-pointer"
                      >
                        ADD MILESTONE +
                      </button>
                    </div>

                    <div className="space-y-4">
                      {milestones.map((m, idx) => (
                        <div key={idx} className="border-2 border-[#1A1A1A] p-4 bg-[#F0EAD6]/30 flex flex-col gap-4 relative">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-xs uppercase text-[#1A1A1A]">MILESTONE #{idx + 1}</span>
                            {milestones.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeMilestone(idx)}
                                className="bg-[#DC143C] text-white border-2 border-[#1A1A1A] px-2 py-0.5 font-black text-xs hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                              >
                                ✕ REMOVE
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-black uppercase text-[#1A1A1A]">TITLE *</label>
                              <input 
                                type="text"
                                required
                                placeholder="E.G. CONTRACT DESIGN SCHEMA"
                                value={m.title}
                                onChange={(e) => updateMilestone(idx, 'title', e.target.value.toUpperCase())}
                                className="bg-white border-2 border-[#1A1A1A] px-3 py-1.5 font-bold uppercase text-xs"
                              />
                            </div>
                            
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-black uppercase text-[#1A1A1A]">VALUE ({selectedCurrency}) *</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number"
                                  step={selectedCurrency === 'ETH' ? "0.001" : "1"}
                                  required
                                  placeholder="0.00"
                                  value={m.amount_eth}
                                  onChange={(e) => updateMilestone(idx, 'amount_eth', e.target.value)}
                                  className="w-full bg-white border-2 border-[#1A1A1A] px-3 py-1.5 font-bold text-xs"
                                />
                                <span className="font-black text-xs">{selectedCurrency}</span>
                              </div>
                              {selectedCurrency !== 'ETH' && exchangeRates[selectedCurrency] && (
                                <span className="text-[10px] font-bold text-[#10B981]">
                                  ≈ {getEthAmount(m.amount_eth).toFixed(4)} ETH
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-black uppercase text-[#1A1A1A]">DESCRIPTION</label>
                              <input 
                                type="text"
                                placeholder="BRIEF EXPLANATION OF EXPECTED DELIVERABLES..."
                                value={m.description || ''}
                                onChange={(e) => updateMilestone(idx, 'description', e.target.value.toUpperCase())}
                                className="bg-white border-2 border-[#1A1A1A] px-3 py-1.5 font-bold uppercase text-xs"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-black uppercase text-[#1A1A1A]">DEADLINE (OPTIONAL)</label>
                              <input 
                                type="date"
                                value={m.deadline || ''}
                                onChange={(e) => updateMilestone(idx, 'deadline', e.target.value)}
                                className="bg-white border-2 border-[#1A1A1A] px-3 py-1.5 font-bold text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Budget Sum Display */}
                  <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center bg-[#F0EAD6] p-6 border-4 border-[#1A1A1A] shadow-[4px_4px_0_#C5A945]">
                    <div>
                      <h4 className="font-black text-lg uppercase tracking-tight text-[#1A1A1A]">TOTAL_ESCROW_VALUATION</h4>
                      <p className="text-xs opacity-60">Sum total of all milestone allocations</p>
                    </div>
                    <div className="text-4xl font-black text-[#DC143C] tracking-tighter shrink-0 text-right">
                      {totalEth.toFixed(4)} ETH
                      {selectedCurrency !== 'ETH' && (
                        <div className="text-sm text-[#1A1A1A] mt-1 tracking-normal font-bold uppercase">
                          ≈ {milestones.reduce((sum, m) => sum + (parseFloat(m.amount_eth) || 0), 0).toFixed(2)} {selectedCurrency}
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-[#DC143C]/10 border-4 border-[#DC143C] rotate-[-0.3deg] p-4 mt-4 font-mono">
                      <span className="text-[10px] font-black text-[#DC143C] block uppercase tracking-widest mb-1">ERROR_LOG:</span>
                      <span className="font-bold text-[#DC143C] uppercase text-xs">{error}</span>
                    </div>
                  )}

                  <div className="pt-6 flex justify-between gap-4">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="bg-[#F0EAD6] text-[#1A1A1A] px-6 py-4 text-sm font-black uppercase border-2 border-[#1A1A1A] hover:bg-white transition-all cursor-pointer"
                    >
                      ← DETAILS
                    </button>
                    <button 
                      onClick={handleNextStep2}
                      className="bg-[#DC143C] text-white px-8 py-4 text-xl font-black uppercase border-4 border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all shadow-[8px_8px_0_#C5A945] cursor-pointer"
                    >
                      REVIEW ESCROW →
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                /* STEP 3: REVIEW & LOCK */
                <div className="space-y-8 font-mono text-sm">
                  
                  {isLoading ? (
                    /* LOADING STAGE RENDERING */
                    <div className="border-4 border-[#1A1A1A] p-8 bg-[#1A1A1A] text-white space-y-8 shadow-[8px_8px_0_#C5A945]">
                      <div className="flex items-center justify-between border-b-2 border-[#C5A945] pb-3">
                        <span className="text-[#C5A945] font-black uppercase tracking-widest text-sm">TRANSACTION_STATUS</span>
                        {loadingStage === 2 ? (
                          <span className="w-3.5 h-3.5 rounded-full bg-[#DC143C] animate-pulse-crimson"></span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full bg-[#10B981] animate-flicker"></span>
                        )}
                      </div>

                      <div className="text-center py-6">
                        {loadingStage === 1 && (
                          <div className="space-y-4">
                            <div className="w-12 h-12 rounded-full border-4 border-t-transparent border-[#C5A945] animate-spin-border mx-auto"></div>
                            <div className="font-bold text-[#C5A945] uppercase tracking-wider text-lg">PREPARING_TRANSACTION...</div>
                            <p className="text-xs text-white/50">Compiling specs and formatting milestone targets.</p>
                          </div>
                        )}

                        {loadingStage === 2 && (
                          <div className="space-y-4">
                            <div className="text-5xl animate-bounce">🦊</div>
                            <div className="font-black text-[#DC143C] uppercase tracking-wider text-xl animate-jitter">WAITING_FOR_SIGNATURE...</div>
                            <div className="text-[#C5A945] font-black text-sm uppercase tracking-widest">
                              CHECK YOUR METAMASK POPUP ☝
                            </div>
                            <p className="text-xs text-white/50 max-w-md mx-auto">Authorize the transaction inside your browser wallet extension to deposit and lock escrow capital.</p>
                          </div>
                        )}

                        {loadingStage === 3 && (
                          <div className="space-y-4">
                            <div className="w-12 h-12 rounded-full border-4 border-t-transparent border-[#10B981] animate-spin mx-auto"></div>
                            <div className="font-bold text-[#10B981] uppercase tracking-wider text-lg">BROADCASTING_TO_SEPOLIA...</div>
                            {txHash && (
                              <div className="bg-white/10 border-2 border-white/20 p-3 max-w-md mx-auto text-left font-mono">
                                <span className="text-[10px] text-white/40 block">TX:</span>
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-white text-xs">{shortenHash(txHash)}</span>
                                  <a 
                                    href={etherscanUrl(txHash, "tx")} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[#10B981] text-xs hover:underline font-black"
                                  >
                                    VIEW ON ETHERSCAN ↗
                                  </a>
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-white/50">Waiting for on-chain block confirmations. Typically takes 10-15 seconds.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* FORM REVIEW SUMMARY */
                    <div className="space-y-8">
                      <div className="bg-[#F0EAD6]/40 border-2 border-[#1A1A1A] p-6 space-y-4 shadow-[4px_4px_0_#1A1A1A]">
                        <h4 className="font-black text-base border-b-2 border-[#1A1A1A]/10 pb-2 text-[#1A1A1A] uppercase tracking-wide">
                          ESCROW_LEDGER_LEDGER
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                          <div>
                            <span className="opacity-50 block uppercase">PROJECT_TITLE:</span>
                            <span className="font-bold uppercase text-sm block">{projectName}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block uppercase">CATEGORY:</span>
                            <span className="font-bold uppercase block text-sm">{category}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block uppercase">FREELANCER_WALLET:</span>
                            <span className="font-bold block tracking-tight text-sm text-[#DC143C]">{freelancerAddress}</span>
                          </div>
                          <div>
                            <span className="opacity-50 block uppercase">CLIENT_WALLET (YOU):</span>
                            <span className="font-bold block tracking-tight text-sm">{address}</span>
                          </div>
                        </div>

                        {projectDescription && (
                          <div className="text-xs font-mono border-t border-[#1A1A1A]/10 pt-3">
                            <span className="opacity-50 block uppercase">SPECIFICATION_DETAILS:</span>
                            <p className="font-bold uppercase mt-1 leading-normal">{projectDescription}</p>
                          </div>
                        )}
                      </div>

                      {/* Milestones Overview */}
                      <div className="space-y-3">
                        <h4 className="font-black text-xs uppercase tracking-widest text-[#1A1A1A]">MILESTONES OVERVIEW</h4>
                        <div className="border-2 border-[#1A1A1A] divide-y-2 divide-[#1A1A1A] bg-white">
                          {milestones.map((m, i) => (
                            <div key={i} className="flex justify-between items-center p-3 text-xs">
                              <div>
                                <span className="font-black text-[#DC143C] mr-2">#{i + 1}</span>
                                <span className="font-bold uppercase">{m.title}</span>
                              </div>
                              <span className="font-black shrink-0">
                                {selectedCurrency === 'ETH' 
                                  ? `${m.amount_eth} ETH`
                                  : `${m.amount_eth} ${selectedCurrency} (≈${getEthAmount(m.amount_eth).toFixed(4)} ETH)`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Valuation Box */}
                      <div className="flex justify-between items-center bg-[#F0EAD6] p-6 border-4 border-[#1A1A1A] shadow-[4px_4px_0_#C5A945]">
                        <div>
                          <h4 className="font-black text-lg uppercase tracking-tight text-[#1A1A1A]">TOTAL_ESCROW_VALUATION</h4>
                          <p className="text-xs opacity-60">Locked value to be deposited in smart contract</p>
                        </div>
                        <div className="text-4xl font-black text-[#DC143C] tracking-tighter shrink-0 text-right">
                          {totalEth.toFixed(4)} ETH
                          {selectedCurrency !== 'ETH' && (
                            <div className="text-sm text-[#1A1A1A] mt-1 tracking-normal font-bold uppercase">
                              ≈ {milestones.reduce((sum, m) => sum + (parseFloat(m.amount_eth) || 0), 0).toFixed(2)} {selectedCurrency}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* LOCK FUNDS BUTTON */}
                      <div className="pt-4 flex flex-col gap-2 items-center w-full">
                        <button 
                          onClick={handleLockFunds}
                          disabled={isDisabled}
                          className={`w-full text-center px-8 py-5 text-2xl font-black uppercase border-4 border-[#1A1A1A] transition-all cursor-pointer ${
                            isDisabled
                              ? 'opacity-50 cursor-not-allowed bg-[#DC143C]/40 text-white/50 shadow-none'
                              : 'bg-[#DC143C] text-white shadow-[12px_12px_0_#1A1A1A] animate-jitter hover:bg-[#1A1A1A]'
                          }`}
                        >
                          LOCK FUNDS & DEPLOY CONTRACT
                        </button>
                        
                        {isDisabled && (
                          <div className="text-center font-mono text-[#DC143C] text-xs font-black uppercase tracking-wider mt-1">
                            ⚠ {disabledReason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-[#DC143C]/10 border-4 border-[#DC143C] rotate-[-0.3deg] p-4 mt-6 font-mono text-left">
                      <span className="text-[10px] font-black text-[#DC143C] block uppercase tracking-widest mb-1">ERROR_LOG:</span>
                      <span className="font-bold text-[#DC143C] uppercase text-xs block leading-relaxed">{error}</span>
                      
                      {/* Interactive Error Actions */}
                      <div className="mt-3 flex gap-2">
                        {error.includes("TRANSACTION_REJECTED") && (
                          <button
                            onClick={() => { setError(null); handleLockFunds(); }}
                            className="bg-[#DC143C] hover:bg-[#1A1A1A] text-white border border-white text-[10px] font-black px-3 py-1 uppercase cursor-pointer"
                          >
                            RETRY TRANSACTION
                          </button>
                        )}
                        {error.includes("INSUFFICIENT_FUNDS") && (
                          <a
                            href="https://sepoliafaucet.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#C5A945] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] border border-white text-[10px] font-black px-3 py-1 uppercase inline-block"
                          >
                            GET SEPOLIA ETH ↗
                          </a>
                        )}
                        {error.includes("WRONG_NETWORK") && (
                          <button
                            onClick={() => { setError(null); switchToSepolia(); }}
                            className="bg-[#DC143C] hover:bg-[#1A1A1A] text-white border border-white text-[10px] font-black px-3 py-1 uppercase cursor-pointer"
                          >
                            SWITCH TO SEPOLIA
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!isLoading && (
                    <div className="pt-6 flex justify-between gap-4 font-mono">
                      <button 
                        type="button"
                        onClick={() => { setError(null); setStep(2); }}
                        className="bg-[#F0EAD6] text-[#1A1A1A] px-6 py-4 text-sm font-black uppercase border-2 border-[#1A1A1A] hover:bg-white transition-all cursor-pointer"
                      >
                        ← MILESTONES
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </RequireWallet>
  );
}
