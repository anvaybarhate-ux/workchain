"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { useParams, useRouter } from 'next/navigation';
import RequireWallet from '@/components/RequireWallet';
import { Sidebar } from '@/components/layout';
import { getDispute, castVote as castVoteApi, submitEvidence as submitEvidenceApi, uploadFile, resolveDispute as resolveDisputeApi } from "@/lib/api";
import { getEscrowContract, getReadProvider } from "@/lib/contracts";
import { formatAddress, formatCountdown, etherscanUrl, shortenHash } from "@/lib/format";
import { ethers } from "ethers";

export default function DisputeRoom() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { address, isConnected } = useWallet();

  // State Variables
  const [dispute, setDispute] = useState<any>(null);
  const [onChainDispute, setOnChainDispute] = useState<any>(null);
  const [countdownStr, setCountdownStr] = useState<string>("LOADING...");
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [voteTxHash, setVoteTxHash] = useState<string>("");
  const [isMock, setIsMock] = useState<boolean>(false);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Evidence submit states
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceStatement, setEvidenceStatement] = useState<string>("");
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState<boolean>(false);

  // General Tx Pending State
  const [isTxPending, setIsTxPending] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [isVoting, setIsVoting] = useState<boolean>(false);

  // Asynchronous detail and contract fetching
  const fetchDisputeData = async () => {
    if (!id || !address) return;
    try {
      setIsError(false);
      // 1. Fetch Off-chain Dispute Details from backend API
      const dispData = await getDispute(id);
      setDispute(dispData);

      // 2. Fetch On-chain Escrow State if project contract exists
      if (dispData?.project?.contract_address) {
        try {
          const provider = getReadProvider();
          
          // Verify if contract is actually deployed on-chain
          let isMockContract = false;
          try {
            const code = await provider.getCode(dispData.project.contract_address);
            if (code === "0x" || code === "0x00" || !code) {
              isMockContract = true;
            }
          } catch (codeErr) {
            console.warn("Failed to check dispute contract bytecode, assuming mock:", codeErr);
            isMockContract = true;
          }

          if (isMockContract) {
            throw new Error("Mock contract address detected (no deployed bytecode)");
          }

          const contract = getEscrowContract(dispData.project.contract_address, provider);
          if (contract) {
            const oChainDisp = await contract.currentDispute();
            setOnChainDispute(oChainDisp);

            // Check if this wallet already voted on-chain
            const alreadyVoted = await contract.hasVoted(address);
            setHasVoted(alreadyVoted);
            setIsMock(false);
          }
        } catch (chainErr) {
          console.warn("Failed to retrieve on-chain dispute room state, falling back to local DB details:", chainErr);
          setIsMock(true);
        }
      } else {
        setIsMock(true);
      }
    } catch (err) {
      console.error("Error loading dispute details:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll state every 10 seconds
  useEffect(() => {
    if (isConnected && address && id) {
      fetchDisputeData();

      const interval = setInterval(() => {
        fetchDisputeData();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [id, address, isConnected, refreshTrigger]);

  // Helper to extract voting deadline from contract struct
  const getVotingDeadline = () => {
    if (!onChainDispute) return 0;
    if (onChainDispute.votingDeadline !== undefined) return Number(onChainDispute.votingDeadline);
    if (onChainDispute[6] !== undefined) return Number(onChainDispute[6]);
    return 0;
  };

  // Tick countdown timer every second
  useEffect(() => {
    const deadline = getVotingDeadline();
    if (deadline === 0) return;

    const timer = setInterval(() => {
      const formatted = formatCountdown(deadline);
      setCountdownStr(formatted);
    }, 1000);

    return () => clearInterval(timer);
  }, [onChainDispute]);

  const deadlineVal = getVotingDeadline();
  const nowVal = Math.floor(Date.now() / 1000);
  const isUrgent = deadlineVal > 0 && (deadlineVal - nowVal) < 3600 && (deadlineVal - nowVal) > 0;
  const isExpired = deadlineVal > 0 && nowVal >= deadlineVal;

  // Extract real votes
  const votesFreelancer = onChainDispute ? Number(onChainDispute.votesFreelancer ?? onChainDispute[4]) : 0;
  const votesClient = onChainDispute ? Number(onChainDispute.votesClient ?? onChainDispute[5]) : 0;
  const totalVotes = votesFreelancer + votesClient;

  const freelancerPct = totalVotes > 0 ? Math.round((votesFreelancer / totalVotes) * 100) : 50;
  const clientPct = totalVotes > 0 ? Math.round((votesClient / totalVotes) * 100) : 50;

  // Wallet Role Checks
  const isFreelancer = address?.toLowerCase() === dispute?.project?.freelancer_wallet?.toLowerCase();
  const isClient = address?.toLowerCase() === dispute?.project?.client_wallet?.toLowerCase();
  const isDisputeParty = isFreelancer || isClient;

  const isResolved = onChainDispute ? (onChainDispute.resolved ?? onChainDispute[7]) : false;
  const isVoteDisabled = isDisputeParty || isResolved || isExpired || hasVoted || !address;

  // SUBMIT EVIDENCE HANDLER
  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispute) return;
    setIsSubmittingEvidence(true);
    setIsTxPending(true);
    try {
      let ipfsHash = "";
      if (evidenceFile) {
        const uploadRes = await uploadFile(evidenceFile);
        ipfsHash = uploadRes.hash;
      } else {
        ipfsHash = "QmDefaultDisputeEvidenceHash0000000000000";
      }

      if (!isMock) {
        if (!window.ethereum) throw new Error("MetaMask is required to submit evidence transactions");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const contract = getEscrowContract(dispute.project.contract_address, signer);
        if (!contract) throw new Error("Could not load Escrow Contract");

        const tx = await contract.submitEvidence(ipfsHash);
        setTxHash(tx.hash);
        await tx.wait();
      }

      // Send to FastAPI Backend
      await submitEvidenceApi(id, address!, {
        ipfs_hash: ipfsHash,
        statement: evidenceStatement
      });

      setEvidenceFile(null);
      setEvidenceStatement("");
      setRefreshTrigger(prev => prev + 1);
      alert("Evidence submitted successfully!");
    } catch (err: any) {
      console.error("Evidence submission failed:", err);
      alert("Submission failed: " + (err.message || err));
    } finally {
      setIsSubmittingEvidence(false);
      setIsTxPending(false);
      setTxHash("");
    }
  };

  // CAST VOTE HANDLER
  const handleCastVote = async (voteForFreelancer: boolean) => {
    if (!dispute) return;
    setIsVoting(true);
    setIsTxPending(true);
    try {
      if (!isMock) {
        if (!window.ethereum) throw new Error("MetaMask is required to cast votes on-chain");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const contract = getEscrowContract(dispute.project.contract_address, signer);
        if (!contract) throw new Error("Could not load Escrow Contract");

        const tx = await contract.castVote(voteForFreelancer);
        setTxHash(tx.hash);
        setVoteTxHash(tx.hash);
        await tx.wait();
      }

      // Submit API Vote
      await castVoteApi(id, {
        wallet_address: address!,
        vote: voteForFreelancer ? "freelancer" : "client"
      });

      setHasVoted(true);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Voting failed:", err);
      alert("Voting transaction failed: " + (err.message || err));
    } finally {
      setIsVoting(false);
      setIsTxPending(false);
      setTxHash("");
    }
  };

  // EXECUTE RESOLUTION HANDLER
  const handleExecuteResolution = async () => {
    if (!dispute) return;
    setIsResolving(true);
    setIsTxPending(true);
    try {
      if (!isMock) {
        if (!window.ethereum) throw new Error("MetaMask is required to resolve disputes on-chain");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const contract = getEscrowContract(dispute.project.contract_address, signer);
        if (!contract) throw new Error("Could not load Escrow Contract");

        const tx = await contract.resolveDispute();
        setTxHash(tx.hash);
        await tx.wait();
      } else {
        // Resolve mock dispute directly via the mock API endpoint
        await resolveDisputeApi(id);
      }

      setRefreshTrigger(prev => prev + 1);
      alert("Dispute resolved successfully!");
    } catch (err: any) {
      console.error("Resolution execution failed:", err);
      alert("Resolution transaction failed: " + (err.message || err));
    } finally {
      setIsResolving(false);
      setIsTxPending(false);
      setTxHash("");
    }
  };

  // Determine winner address
  const winnerAddress = onChainDispute ? (onChainDispute.winner ?? onChainDispute[8]) : "";
  const freelancerWon = winnerAddress.toLowerCase() === dispute?.project?.freelancer_wallet?.toLowerCase();
  const showResolveButton = isExpired && !isResolved && dispute?.status !== "resolved";

  return (
    <RequireWallet>
      <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
        <Sidebar activePath="/disputes" />

        <div className="flex-1 font-sans min-h-screen relative z-20">

        {/* TOP ALERT BAR */}
        <div className="bg-[#DC143C] border-b-4 border-[#1A1A1A] py-4 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center relative z-30">
          <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
          <h2 className="font-black text-[#F0EAD6] text-lg md:text-xl uppercase tracking-tight relative z-10">
            DISPUTE #D-{dispute ? dispute.id.slice(0, 4).toUpperCase() : "LOADING"} // {dispute?.project?.title || "PROJECT"} // {dispute?.milestone?.amount_eth || "0.0"} ETH AT STAKE
          </h2>
          <div className={`font-mono font-black text-2xl md:text-3xl text-white tracking-widest relative z-10 mt-2 md:mt-0 ${isUrgent ? 'animate-flicker text-[#C5A945]' : ''}`}>
            {countdownStr}
          </div>
        </div>

        {/* TRANSACTION PENDING BANNER */}
        {isTxPending && (
          <div className="bg-[#1A1A1A] border-4 border-[#DC143C] p-6 m-6 shadow-[8px_8px_0_#DC143C] rotate-[0.5deg] animate-pulse flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl text-[#DC143C] animate-flicker">⏳</span>
              <div>
                <h4 className="text-2xl font-black text-white font-sans uppercase">TRANSACTION PENDING</h4>
                <p className="font-mono text-xs font-bold uppercase text-[#F0EAD6]/80 mt-1">WAITING FOR ON-CHAIN CONFIRMATION... DO NOT LEAVE THIS PAGE</p>
              </div>
            </div>
            {txHash && (
              <a 
                href={etherscanUrl(txHash, "tx")} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-[#DC143C] text-white px-6 py-3 font-black text-sm uppercase border-4 border-white shadow-[4px_4px_0_white] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shrink-0"
              >
                VIEW TX: {shortenHash(txHash)} ↗
              </a>
            )}
          </div>
        )}

        {/* MAIN HEADING */}
        <section className="bg-[#1A1A1A] py-16 px-8 text-center relative">
          <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
          <span className="text-[#DC143C] font-black uppercase text-lg mb-4 block tracking-widest animate-flicker relative z-10">
            COMMUNITY_ARBITRATION
          </span>
          <h1 className="text-6xl md:text-[8rem] font-black uppercase text-[#F0EAD6] tracking-tighter text-distressed leading-none relative z-10">
            THE DISPUTE.
          </h1>
        </section>

        {isLoading ? (
          <div className="bg-[#F0EAD6] py-16 px-8 text-center">
            <div className="h-64 bg-[#1A1A1A] border-4 border-[#1A1A1A]/50 animate-pulse p-12">
              <div className="h-6 bg-[#F0EAD6]/20 w-1/4 mb-4"></div>
              <div className="h-10 bg-[#F0EAD6]/20 w-1/2"></div>
            </div>
          </div>
        ) : (
          <>
            {/* EVIDENCE SECTION — TWO COLUMNS */}
            <section className="bg-[#F0EAD6] py-16 px-6 md:px-12 relative">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* FREELANCER EVIDENCE */}
                <div className="bg-[#F0EAD6] border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] rotate-[-1deg] p-8 relative">
                  <h3 className="text-2xl font-black uppercase text-[#DC143C] mb-2 tracking-tight">FREELANCER_EVIDENCE</h3>
                  <p className="font-mono text-xs font-bold uppercase opacity-60 mb-6 border-b-4 border-[#1A1A1A] pb-4">
                    {dispute?.project?.freelancer_wallet ? formatAddress(dispute.project.freelancer_wallet) : "UNKNOWN"}
                  </p>

                  {/* Files & gateway link */}
                  <div className="mb-6">
                    <h4 className="font-black text-sm uppercase tracking-widest mb-2">SUBMITTED_FILES</h4>
                    {dispute?.freelancer_evidence_ipfs ? (
                      <a 
                        href={`https://ipfs.io/ipfs/${dispute.freelancer_evidence_ipfs}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="border-2 border-[#1A1A1A] px-3 py-2 flex justify-between items-center font-mono text-xs font-bold uppercase bg-white hover:bg-[#DC143C] hover:text-white transition-colors"
                      >
                        <span>EVIDENCE_GATEWAY ↗</span>
                        <span className="opacity-60">IPFS: {shortenHash(dispute.freelancer_evidence_ipfs)}</span>
                      </a>
                    ) : (
                      <div className="border-2 border-[#1A1A1A] border-dashed px-3 py-2 text-center font-mono text-xs font-bold uppercase opacity-60">
                        NO EVIDENCE SUBMITTED YET
                      </div>
                    )}
                  </div>

                  {/* Statement */}
                  <div className="mb-8">
                    <h4 className="font-black text-sm uppercase tracking-widest mb-2">STATEMENT</h4>
                    <div className="bg-white border-4 border-[#1A1A1A] p-4 font-mono text-xs font-bold leading-relaxed min-h-[100px]">
                      {dispute?.freelancer_statement ? dispute.freelancer_statement : "Awaiting freelancer written argument..."}
                    </div>
                  </div>

                  {/* Form if party and has not uploaded yet */}
                  {isFreelancer && !dispute?.freelancer_evidence_ipfs && !isResolved && (
                    <form onSubmit={handleEvidenceSubmit} className="bg-white border-4 border-[#DC143C] p-6 mt-6 shadow-[4px_4px_0_#DC143C]">
                      <h4 className="font-black text-sm uppercase text-[#DC143C] mb-4">SUBMIT EVIDENCE FILE & ARGUMENT</h4>
                      
                      <div className="mb-4">
                        <span className="font-mono text-xs font-bold block mb-1">UPLOAD PROOF FILE:</span>
                        <input 
                          type="file" 
                          required
                          onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                          className="font-mono text-xs font-bold"
                        />
                      </div>
                      
                      <textarea 
                        required
                        value={evidenceStatement}
                        onChange={(e) => setEvidenceStatement(e.target.value)}
                        placeholder="State your side of the dispute arguments clearly..."
                        className="w-full bg-[#F0EAD6]/35 border-2 border-[#1A1A1A] p-3 font-mono text-xs font-bold uppercase h-24 mb-4 focus:outline-none"
                      ></textarea>

                      <button 
                        type="submit" 
                        disabled={isSubmittingEvidence}
                        className="w-full bg-[#DC143C] text-white border-2 border-black font-black text-xs uppercase py-3 shadow-[2px_2px_0_black]"
                      >
                        {isSubmittingEvidence ? "UPLOADING & SIGNING..." : "CONFIRM & SUBMIT EVIDENCE"}
                      </button>
                    </form>
                  )}
                </div>

                {/* CLIENT EVIDENCE */}
                <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] rotate-[1deg] p-8 relative">
                  <h3 className="text-2xl font-black uppercase text-[#1A1A1A] mb-2 tracking-tight">CLIENT_EVIDENCE</h3>
                  <p className="font-mono text-xs font-bold uppercase opacity-60 mb-6 border-b-4 border-[#1A1A1A] pb-4">
                    {dispute?.project?.client_wallet ? formatAddress(dispute.project.client_wallet) : "UNKNOWN"}
                  </p>

                  {/* Files & gateway link */}
                  <div className="mb-6">
                    <h4 className="font-black text-sm uppercase tracking-widest mb-2">SUBMITTED_FILES</h4>
                    {dispute?.client_evidence_ipfs ? (
                      <a 
                        href={`https://ipfs.io/ipfs/${dispute.client_evidence_ipfs}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="border-2 border-[#1A1A1A] px-3 py-2 flex justify-between items-center font-mono text-xs font-bold uppercase bg-white hover:bg-[#C5A945] hover:text-[#1A1A1A] transition-colors"
                      >
                        <span>EVIDENCE_GATEWAY ↗</span>
                        <span className="opacity-60">IPFS: {shortenHash(dispute.client_evidence_ipfs)}</span>
                      </a>
                    ) : (
                      <div className="border-2 border-[#1A1A1A] border-dashed px-3 py-2 text-center font-mono text-xs font-bold uppercase opacity-60">
                        NO EVIDENCE SUBMITTED YET
                      </div>
                    )}
                  </div>

                  {/* Statement */}
                  <div className="mb-8">
                    <h4 className="font-black text-sm uppercase tracking-widest mb-2">STATEMENT</h4>
                    <div className="bg-white border-4 border-[#1A1A1A] p-4 font-mono text-xs font-bold leading-relaxed min-h-[100px]">
                      {dispute?.client_statement ? dispute.client_statement : "Awaiting client written argument..."}
                    </div>
                  </div>

                  {/* Form if client and has not uploaded yet */}
                  {isClient && !dispute?.client_evidence_ipfs && !isResolved && (
                    <form onSubmit={handleEvidenceSubmit} className="bg-white border-4 border-black p-6 mt-6 shadow-[4px_4px_0_#C5A945]">
                      <h4 className="font-black text-sm uppercase text-[#1A1A1A] mb-4">SUBMIT EVIDENCE FILE & ARGUMENT</h4>
                      
                      <div className="mb-4">
                        <span className="font-mono text-xs font-bold block mb-1">UPLOAD PROOF FILE:</span>
                        <input 
                          type="file" 
                          required
                          onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                          className="font-mono text-xs font-bold"
                        />
                      </div>
                      
                      <textarea 
                        required
                        value={evidenceStatement}
                        onChange={(e) => setEvidenceStatement(e.target.value)}
                        placeholder="State your side of the dispute arguments clearly..."
                        className="w-full bg-[#F0EAD6]/35 border-2 border-[#1A1A1A] p-3 font-mono text-xs font-bold uppercase h-24 mb-4 focus:outline-none"
                      ></textarea>

                      <button 
                        type="submit" 
                        disabled={isSubmittingEvidence}
                        className="w-full bg-[#1A1A1A] text-white border-2 border-black font-black text-xs uppercase py-3 shadow-[2px_2px_0_#C5A945]"
                      >
                        {isSubmittingEvidence ? "UPLOADING & SIGNING..." : "CONFIRM & SUBMIT EVIDENCE"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </section>

            {/* TORN EDGE DIVIDER */}
            <div className="h-16 bg-[#F0EAD6] torn-edge -mt-8 relative z-20"></div>

            {/* VOTE SECTION */}
            <section className="bg-[#1A1A1A] py-20 px-6 md:px-12 text-white relative">
              <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
              <div className="max-w-5xl mx-auto relative z-10">
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-[#F0EAD6] text-center mb-16 text-distressed">
                  CAST_VOTE
                </h2>

                {/* VOTE TALLY BARS */}
                <div className="mb-12">
                  <div className="flex justify-between font-black text-xl uppercase mb-4">
                    <span className="text-[#DC143C]">FREELANCER [{freelancerPct}%]</span>
                    <span className="text-[#C5A945]">[{clientPct}%] CLIENT</span>
                  </div>
                  <div className="h-16 w-full flex border-4 border-white overflow-hidden bg-[#1A1A1A]">
                    <div 
                      className="bg-[#DC143C] flex items-center justify-center font-black text-2xl text-white transition-all duration-1000"
                      style={{ width: `${freelancerPct}%` }}
                    >
                      {votesFreelancer} VOTE{votesFreelancer !== 1 ? 'S' : ''}
                    </div>
                    <div 
                      className="bg-[#C5A945] flex items-center justify-center font-black text-2xl text-[#1A1A1A] transition-all duration-1000"
                      style={{ width: `${clientPct}%` }}
                    >
                      {votesClient} VOTE{votesClient !== 1 ? 'S' : ''}
                    </div>
                  </div>
                  <p className="font-mono text-xs font-bold uppercase tracking-widest text-center mt-4 opacity-60">
                    TOTAL COMMUNITY VOTES: {totalVotes}
                  </p>
                </div>

                {/* VOTE BUTTONS or CONFIRMED STATE */}
                {!hasVoted ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16">
                    <button 
                      onClick={() => handleCastVote(true)}
                      disabled={isVoteDisabled || isVoting}
                      className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] p-8 text-xl font-black uppercase hover:animate-jitter hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all disabled:opacity-40 disabled:hover:animate-none cursor-pointer"
                    >
                      VOTE: FREELANCER
                    </button>
                    <button 
                      onClick={() => handleCastVote(false)}
                      disabled={isVoteDisabled || isVoting}
                      className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#C5A945] shadow-[8px_8px_0_#C5A945] p-8 text-xl font-black uppercase hover:animate-jitter hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all disabled:opacity-40 disabled:hover:animate-none cursor-pointer"
                    >
                      VOTE: CLIENT
                    </button>
                  </div>
                ) : (
                  <div className="text-center mb-16">
                    <div className="inline-block bg-[#10B981] text-white px-8 py-4 border-4 border-white font-black text-2xl uppercase shadow-[8px_8px_0_#C5A945] rotate-[-1deg] animate-flicker">
                      ✓ VOTE RECORDED ON-CHAIN
                    </div>
                    {voteTxHash && (
                      <p className="font-mono text-xs font-bold uppercase mt-6 opacity-40">
                        TX: <a href={etherscanUrl(voteTxHash, "tx")} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#C5A945]">{shortenHash(voteTxHash)}</a>
                      </p>
                    )}
                  </div>
                )}

                {/* ARBITER INFO */}
                <div className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] p-6 rotate-[-0.5deg] max-w-2xl mx-auto">
                  <h4 className="font-black text-lg uppercase mb-4 border-b-4 border-[#1A1A1A] pb-2">ARBITER_PROTOCOL</h4>
                  <div className="font-mono text-xs font-bold uppercase leading-loose space-y-1">
                    <p>DISPUTE STATUS: {dispute?.status?.toUpperCase()}</p>
                    <p>REQUIRED VOTING DEADLINE: {dispute?.voting_deadline ? new Date(dispute.voting_deadline).toLocaleString("en-US") : "N/A"}</p>
                    <p>STAKE REQUIRED: 0.01 ETH PER VOTE</p>
                    <p>RESOLUTION: MAJORITY (&gt;50%) AFTER EXPIRATION</p>
                  </div>
                </div>
              </div>
            </section>

            {/* TORN EDGE */}
            <div className="h-16 bg-[#1A1A1A] torn-edge -mt-8 relative z-20"></div>

            {/* OUTCOME SECTION (Resolved State Preview) */}
            {isResolved && (
              <section className="bg-[#F0EAD6] py-20 px-6 md:px-12 relative">
                <div className="max-w-4xl mx-auto">
                  <div className={`border-8 border-[#1A1A1A] shadow-[16px_16px_0_#1A1A1A] p-12 text-center rotate-[1deg] relative ${freelancerWon ? 'bg-[#10B981]' : 'bg-[#C5A945]'}`}>
                    <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
                    <div className="relative z-10">
                      <span className="font-mono text-xs font-black uppercase tracking-widest block mb-4 text-[#1A1A1A]">DISPUTE RESOLUTION SUMMARY</span>
                      <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-[#1A1A1A] text-distressed mb-6">
                        {freelancerWon ? "FREELANCER WON" : "CLIENT WON"}
                      </h2>
                      <p className="font-mono text-sm font-bold uppercase mb-8 text-[#1A1A1A]">
                        THE DECISION HAS BEEN FINALIZED ON-CHAIN VIA DECENTRALIZED MAJORITY VOTE
                      </p>
                      <div className="inline-block bg-[#1A1A1A] text-[#F0EAD6] border-4 border-white px-8 py-4 font-black text-xl uppercase rotate-[-1deg]">
                        FUNDS RELEASED: {dispute?.milestone?.amount_eth || "0.0"} ETH
                      </div>
                      {dispute?.tx_hash_resolution && (
                        <p className="font-mono text-xs font-bold uppercase mt-6 text-[#1A1A1A]">
                          RESOLUTION TX:{" "}
                          <a 
                            href={etherscanUrl(dispute.tx_hash_resolution, "tx")} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="underline font-black"
                          >
                            {shortenHash(dispute.tx_hash_resolution)} ↗
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* EXECUTE RESOLUTION BUTTON */}
            {showResolveButton && (
              <section className="bg-[#F0EAD6] py-16 px-6 md:px-12 text-center relative">
                <div className="max-w-2xl mx-auto">
                  <button 
                    onClick={handleExecuteResolution}
                    disabled={isResolving}
                    className="bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] p-8 text-2xl font-black uppercase hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all cursor-pointer w-full disabled:opacity-40"
                  >
                    {isResolving ? "RESOLVING CONTRACT..." : "EXECUTE ON-CHAIN RESOLUTION ⚖"}
                  </button>
                  <p className="font-mono text-xs font-bold uppercase mt-4 opacity-60">
                    VOTING DEADLINE HAS EXPIRED. THE MAJORITY DECISION CAN NOW BE OFFICIALLY SEALED AND DISBURSED.
                  </p>
                </div>
              </section>
            )}
          </>
        )}

        {/* BACK NAVIGATION */}
        <section className="bg-[#F0EAD6] py-8 px-12 border-t-4 border-[#1A1A1A]">
          <Link href="/projects" className="font-black text-sm uppercase text-[#DC143C] hover:underline">
            BACK TO MY PROJECTS
          </Link>
        </section>
      </div>
    </div>
    </RequireWallet>
  );
}
