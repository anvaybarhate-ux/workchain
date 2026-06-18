"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { useRouter, useParams } from 'next/navigation';
import RequireWallet from '@/components/RequireWallet';
import { Sidebar } from '@/components/layout';
import { getProject, approveMilestone, rejectMilestone, submitMilestone as submitApiMilestone, createDispute } from "@/lib/api";
import { getEscrowContract, getReadProvider } from "@/lib/contracts";
import { formatAddress, formatEth, formatDate, etherscanUrl, shortenHash } from "@/lib/format";
import { uploadFile } from "@/lib/api";
import { ethers } from "ethers";

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const {
    address,
    role,
    signer,
    changeRole,
    shortAddress,
    isCorrectNetwork,
    disconnectWallet,
    isConnected
  } = useWallet();

  const activeRole = role || 'freelancer';
  const handleRoleToggle = () => {
    const newRole = activeRole === 'freelancer' ? 'client' : 'freelancer';
    disconnectWallet();
    localStorage.setItem("workchain_role", newRole);
    router.push('/connect');
  };

  // State Variables
  const [project, setProject] = useState<any>(null);
  const [onChainState, setOnChainState] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [escrowBalance, setEscrowBalance] = useState<bigint>(BigInt(0));
  const [isMock, setIsMock] = useState<boolean>(false);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Forms / User inputs
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proofLink, setProofLink] = useState('');
  const [notes, setNotes] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  
  // Client Dispute Form
  const [disputeStatement, setDisputeStatement] = useState('');
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState<boolean>(false);

  // Client Reject Form
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectSuccess, setRejectSuccess] = useState<boolean>(false);

  // Tx Pending States (legacy — kept for freelancer submit flow)
  const [isTxPending, setIsTxPending] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>('');

  // Approve Flow States
  const [approving, setApproving] = useState<boolean>(false);
  const [approvingMilestone, setApprovingMilestone] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<'WAITING_FOR_SIGNATURE' | 'BROADCASTING' | 'SUCCESS' | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Event Logs State
  const [onChainEvents, setOnChainEvents] = useState<any[]>([]);

  // Asynchronous Data Fetching Function
  const fetchProjectData = async () => {
    if (!id || !address) return;
    try {
      setIsError(false);
      // 1. Fetch Off-chain Project Details from backend API
      const projData = await getProject(id);
      setProject(projData);

      // 2. Fetch On-chain Escrow State if contract exists
      if (projData.contract_address) {
        try {
          const provider = getReadProvider();
          
          // Verify if contract is actually deployed on-chain
          let isMockContract = false;
          try {
            const code = await provider.getCode(projData.contract_address);
            if (code === "0x" || code === "0x00" || !code) {
              isMockContract = true;
            }
          } catch (codeErr) {
            console.warn("Failed to retrieve contract bytecode, assuming mock contract:", codeErr);
            isMockContract = true;
          }

          if (isMockContract) {
            throw new Error("Mock contract address detected (no deployed bytecode)");
          }

          const contract = getEscrowContract(projData.contract_address, provider);
          if (contract) {
            // Fetch main project metadata
            const oChainProj = await contract.getProject();
            setOnChainState(oChainProj);

            // Fetch active balance
            const bal = await provider.getBalance(projData.contract_address);
            setEscrowBalance(bal);

            // Fetch milestones count
            const milestoneCountBig = await contract.getMilestoneCount();
            const milestoneCount = Number(milestoneCountBig);

            // Fetch milestones iteratively
            const list: any[] = [];
            for (let i = 0; i < milestoneCount; i++) {
              const m = await contract.getMilestone(i);
              list.push({
                index: i,
                title: m[0],
                description: m[1],
                amount: m[2],
                deadline: m[3],
                status: Number(m[4]),
                ipfsHash: m[5],
                proofLinks: m[6]
              });
            }
            setMilestones(list);
            setIsMock(false);

            // Fetch recent events
            await fetchOnChainEvents(contract, provider);
          } else {
            throw new Error("Could not initialize contract instance");
          }
        } catch (chainErr) {
          console.warn("Failed to retrieve on-chain contract state, falling back to local DB details:", chainErr);
          setIsMock(true);
          
          // Undeployed / Mock contract fallback: load milestones and status from DB
          const list = (projData.milestones || []).map((m: any, idx: number) => {
            let statusIndex = 0;
            const statusStr = m.status?.toLowerCase();
            if (statusStr === 'active') statusIndex = 1;
            if (statusStr === 'submitted') statusIndex = 2;
            if (statusStr === 'released' || statusStr === 'complete') statusIndex = 3;
            if (statusStr === 'disputed') statusIndex = 4;

            let amountWei = BigInt(0);
            if (m.amount_eth) {
              const parsedAmount = parseFloat(m.amount_eth);
              if (!isNaN(parsedAmount)) {
                amountWei = BigInt(Math.round(parsedAmount * 1e18));
              }
            }

            let deadlineSecs = BigInt(0);
            if (m.deadline) {
              const parsedDate = new Date(m.deadline).getTime();
              if (!isNaN(parsedDate)) {
                deadlineSecs = BigInt(Math.floor(parsedDate / 1000));
              }
            }

            return {
              index: idx,
              title: m.title,
              description: m.description,
              amount: amountWei,
              deadline: deadlineSecs,
              status: statusIndex,
              id: m.id
            };
          });
          setMilestones(list);

          // Find first milestone index that is active/submitted/disputed
          let activeIdx = (projData.milestones || []).findIndex((m: any) => 
            m.status?.toLowerCase() === 'active' || 
            m.status?.toLowerCase() === 'submitted' || 
            m.status?.toLowerCase() === 'disputed'
          );
          if (activeIdx === -1) {
            const allCompleted = (projData.milestones || []).every((m: any) => 
              m.status?.toLowerCase() === 'complete' || m.status?.toLowerCase() === 'released'
            );
            activeIdx = allCompleted ? (projData.milestones || []).length : 0;
          } 

          // Build a dummy tuple matching contract state layout:
          // [client, freelancer, arbiter, totalBudget, currentMilestoneIndex, state, balance]
          const mockOnChainState = new Array(10).fill(null);
          mockOnChainState[7] = activeIdx;
          setOnChainState(mockOnChainState);

          // Fallback balance
          let remainingVal = 0;
          if (projData.milestones) {
            remainingVal = projData.milestones
              .filter((m: any) => m.status?.toLowerCase() !== 'released' && m.status?.toLowerCase() !== 'complete')
              .reduce((sum: number, m: any) => {
                const amt = parseFloat(m.amount_eth);
                return sum + (isNaN(amt) ? 0 : amt);
              }, 0);
          }
          setEscrowBalance(BigInt(Math.round(remainingVal * 1e18)));
        }
      } else {
        // Undeployed project milestones fallback from DB
        setIsMock(true);
        const list = (projData.milestones || []).map((m: any, idx: number) => ({
          index: idx,
          title: m.title,
          description: m.description,
          amount: BigInt(Math.round(parseFloat(m.amount_eth) * 1e18)),
          deadline: m.deadline && !isNaN(new Date(m.deadline).getTime()) 
            ? BigInt(Math.floor(new Date(m.deadline).getTime() / 1000))
            : BigInt(0),
          status: 0, // Pending
          id: m.id
        }));
        setMilestones(list);
      }

    } catch (err) {
      console.error("Error loading project detail:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll on-chain events
  const fetchOnChainEvents = async (contract: any, provider: any) => {
    try {
      const filterSubmitted = contract.filters.MilestoneSubmitted();
      const filterApproved = contract.filters.MilestoneApproved();
      const filterDisputed = contract.filters.DisputeRaised();

      const [submittedEvents, approvedEvents, disputedEvents] = await Promise.all([
        contract.queryFilter(filterSubmitted, -1000),
        contract.queryFilter(filterApproved, -1000),
        contract.queryFilter(filterDisputed, -1000)
      ]);

      const combined = [
        ...submittedEvents.map((e: any) => ({
          action: `Freelancer submitted Milestones deliverables.`,
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
          rotate: Math.random() > 0.5 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]'
        })),
        ...approvedEvents.map((e: any) => ({
          action: `Milestone approved. Payment released.`,
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
          rotate: Math.random() > 0.5 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]'
        })),
        ...disputedEvents.map((e: any) => ({
          action: `Client raised on-chain dispute.`,
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
          rotate: Math.random() > 0.5 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]'
        }))
      ];

      // Fetch block timestamps in parallel
      const resolved = await Promise.all(combined.map(async (item: any) => {
        try {
          const block = await provider.getBlock(item.blockNumber);
          return {
            ...item,
            time: block ? formatDate(block.timestamp) : `BLOCK #${item.blockNumber}`
          };
        } catch {
          return { ...item, time: `BLOCK #${item.blockNumber}` };
        }
      }));

      resolved.sort((a, b) => b.blockNumber - a.blockNumber);
      setOnChainEvents(resolved.slice(0, 5));
    } catch (e) {
      console.warn("Failed to fetch escrow contract events:", e);
    }
  };

  useEffect(() => {
    if (isConnected && address && id) {
      fetchProjectData();

      const interval = setInterval(() => {
        fetchProjectData();
      }, 15000); // Re-fetch on-chain state every 15 seconds

      return () => clearInterval(interval);
    }
  }, [id, address, isConnected, refreshTrigger]);

  // Node timeline states styling mapper
  const getMilestoneState = (statusVal: number) => {
    switch (statusVal) {
      case 0:
        return { label: "PENDING", color: "bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] opacity-50", icon: "-" };
      case 1:
        return { label: "ACTIVE", color: "bg-[#06B6D4] text-white border-4 border-[#1A1A1A] shadow-[0_0_0_8px_rgba(6,182,212,0.3)] animate-pulse rotate-[-2deg]", icon: "●" };
      case 2:
        return { label: "SUBMITTED", color: "bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] rotate-[1deg]", icon: "★" };
      case 3:
      case 5:
        return { label: "RELEASED", color: "bg-[#10B981] text-white border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A]", icon: "✓" };
      case 4:
        return { label: "DISPUTED", color: "bg-[#EC4899] text-white border-4 border-[#DC143C] shadow-[4px_4px_0_#DC143C] animate-jitter", icon: "!" };
      default:
        return { label: "PENDING", color: "bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] opacity-50", icon: "-" };
    }
  };

  // Handle automatic file upload to IPFS and pre-populate ipfsHash state
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      setSubmissionError(null);
      setSubmitSuccess(false);
      setIsSubmitting(true);
      try {
        const uploadRes = await uploadFile(file);
        if (uploadRes && uploadRes.hash) {
          setIpfsHash(uploadRes.hash);
        }
      } catch (err: any) {
        console.error("File upload failed:", err);
        setSubmissionError("FILE_UPLOAD_FAILED: " + (err.message || err));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // FREELANCER: Submit Milestone deliverables (Robust Two-Stage Flow)
  const handleFreelancerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!project) return;
    
    setSubmissionError(null);
    setSubmitSuccess(false);

    if (!ipfsHash || ipfsHash.trim() === "") {
      setSubmissionError("IPFS_HASH_REQUIRED: Enter an IPFS hash or upload a file first.");
      return;
    }

    setIsSubmitting(true);
    setIsTxPending(true);

    try {
      // Check current active milestone index on-chain
      const activeIdx = onChainState ? Number(onChainState[7]) : 0;
      const dbMilestone = project.milestones?.find((m: any) => m.milestone_index === activeIdx);
      if (!dbMilestone) throw new Error("Database milestone index mismatch");

      const proofArray = proofLink.trim() !== "" ? [proofLink.trim()] : [];

      // STAGE 1 — Call backend API
      try {
        await submitApiMilestone(dbMilestone.id, address!, {
          ipfs_hash: ipfsHash.trim(),
          proof_links: proofArray,
          notes: notes.trim()
        });
      } catch (apiErr: any) {
        throw new Error("API_ERROR: " + (apiErr.message || apiErr));
      }

      // STAGE 2 — Call smart contract (Only if backend call succeeds and not mock project)
      if (!isMock) {
        // Use the context signer — do NOT create a new BrowserProvider each time
        if (!signer) throw new Error("SIGNER_MISSING: Reconnect your MetaMask wallet and try again.");

        const contract = getEscrowContract(project.contract_address, signer);
        if (!contract) throw new Error("Could not instantiate contract");

        // gasLimit bypasses ethers v6 eth_estimateGas simulation so MetaMask shows the popup
        const tx = await contract.submitMilestone(activeIdx, ipfsHash.trim(), proofArray, { gasLimit: 400000 });
        setTxHash(tx.hash);
        await tx.wait();
      }

      // STAGE 3 — Show success
      setSubmitSuccess(true);
      
      // Clear Form & Refresh State
      setSelectedFile(null);
      setProofLink('');
      setNotes('');
      setIpfsHash('');
      setRefreshTrigger(prev => prev + 1);

    } catch (err: any) {
      console.error("Freelancer submission error:", err);
      
      // Handle MetaMask specific errors or API errors
      const msg = (err.message || err.toString()) as string;
      const errCode = ((err as any).code as string | undefined)?.toLowerCase() ?? '';
      const errAction = ((err as any).action as string | undefined)?.toLowerCase() ?? '';
      const isEstimateGasFail =
        msg.toLowerCase().includes("missing revert data") ||
        msg.toLowerCase().includes("estimategas") ||
        msg.toLowerCase().includes("call_exception") ||
        errCode === "call_exception" ||
        errAction === "estimategas";

      if (msg.includes("4001") || msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) {
        setSubmissionError("TRANSACTION_REJECTED: You cancelled the MetaMask request. Click the button again to retry.");
      } else if (isEstimateGasFail) {
        setSubmissionError(
          "CONTRACT_REJECTED: The contract rejected this submission. " +
          "Make sure you are connected with the FREELANCER wallet registered for this project. " +
          "Also check that this milestone has not already been submitted on-chain. " +
          "Your wallet address: " + (address ?? "not connected")
        );
      } else if (msg.includes("insufficient funds")) {
        setSubmissionError("INSUFFICIENT_FUNDS: Your wallet does not have enough Sepolia ETH. Get more from sepoliafaucet.com");
      } else if (msg.includes("API_ERROR")) {
        setSubmissionError(msg.replace("API_ERROR: ", ""));
      } else {
        setSubmissionError("Submission failed: " + msg);
      }
    } finally {
      setIsSubmitting(false);
      setIsTxPending(false);
      setTxHash('');
    }
  };

  // CLIENT: Approve Milestone — calls smart contract FIRST, then updates backend
  const handleApproveMilestone = async (
    milestoneIndex: number,
    milestoneId: string,
  ) => {
    if (!signer) {
      setApproveError("SIGNER_MISSING: Disconnect and reconnect your MetaMask wallet.");
      return;
    }
    if (!project?.contract_address) {
      setApproveError("CONTRACT_NOT_FOUND: No escrow contract address for this project.");
      return;
    }

    setApproving(true);
    setApprovingMilestone(milestoneIndex);
    setApproveError(null);
    setTxStatus('WAITING_FOR_SIGNATURE');
    setApproveTxHash(null);

    try {
      if (!isMock) {
        // STAGE 1 — Get escrow contract WITH context signer (triggers MetaMask)
        const contract = getEscrowContract(project.contract_address, signer);
        if (!contract) {
          setApproveError("CONTRACT_ERROR: Could not connect to escrow contract.");
          return;
        }

        // STAGE 2 — Call contract.approveMilestone → MetaMask popup fires here
        const tx = await contract.approveMilestone(milestoneIndex, { gasLimit: 300000 });

        // STAGE 3 — Wait for block confirmation
        setTxStatus('BROADCASTING');
        setApproveTxHash(tx.hash);
        await tx.wait();
      }

      // STAGE 4 — Update backend DB only after on-chain success
      await approveMilestone(milestoneId, address!);

      // STAGE 5 — Success
      setTxStatus('SUCCESS');

      // Auto-dismiss success banner after 10 seconds
      setTimeout(() => {
        setTxStatus(null);
        setApproveTxHash(null);
      }, 10000);

      // Refresh all project data
      setRefreshTrigger(prev => prev + 1);

    } catch (e: unknown) {
      setTxStatus(null);

      if (e instanceof Error) {
        const errMsg = e.message.toLowerCase();
        // Check ethers v6 error code and action properties
        const errCode = ((e as any).code as string | undefined)?.toLowerCase() ?? '';
        const errAction = ((e as any).action as string | undefined)?.toLowerCase() ?? '';
        const isEstimateGasFail =
          errMsg.includes("missing revert data") ||
          errMsg.includes("estimategas") ||
          errMsg.includes("call_exception") ||
          errCode === "call_exception" ||
          errAction === "estimategas";

        if (e.message.includes("4001") || errMsg.includes("user rejected") || errMsg.includes("denied")) {
          setApproveError("APPROVAL_REJECTED: You cancelled the MetaMask request. Click Approve again to retry.");
        } else if (isEstimateGasFail) {
          setApproveError(
            "CONTRACT_REJECTED: The escrow contract rejected this transaction.\n" +
            "Likely cause: the milestone is not in SUBMITTED state on-chain. " +
            "The freelancer must sign the submit transaction in MetaMask — just filling the form is not enough. " +
            "If the freelancer already signed, verify you are connected as the client wallet that deployed this contract."
          );
        } else if (errMsg.includes("insufficient funds")) {
          setApproveError("INSUFFICIENT_GAS: Not enough ETH for gas fees. Get Sepolia ETH from sepoliafaucet.com");
        } else if (errMsg.includes("milestonenotsubmitted") || errMsg.includes("wrong status") || errMsg.includes("not submitted")) {
          setApproveError("CONTRACT_ERROR: Milestone must be submitted by freelancer before you can approve.");
        } else {
          setApproveError("APPROVAL_FAILED: " + e.message);
        }
      } else {
        setApproveError("APPROVAL_FAILED: An unknown error occurred.");
      }
    } finally {
      setApproving(false);
      setApprovingMilestone(null);
    }
  };

  // CLIENT: Reject Milestone — NO contract call needed, just resets DB status
  const handleClientReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !onChainState) return;
    setRejectError(null);
    setRejectSuccess(false);
    setIsTxPending(true);
    try {
      const activeIdx = Number(onChainState[7]);
      const dbMilestone = project.milestones?.find((m: any) => m.milestone_index === activeIdx);
      if (!dbMilestone) throw new Error("Milestone index mismatch");

      await rejectMilestone(dbMilestone.id, address!, rejectFeedback);
      
      setRejectFeedback('');
      setShowRejectForm(false);
      setRejectSuccess(true);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Rejection error:", err);
      setRejectError("REJECTION_FAILED: " + (err.message || err));
    } finally {
      setIsTxPending(false);
    }
  };

  // CLIENT: Raise Dispute — calls contract FIRST, then creates dispute record in backend
  const handleClientDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !onChainState) return;
    if (!signer) {
      alert("SIGNER_MISSING: Disconnect and reconnect your MetaMask wallet.");
      return;
    }
    setIsTxPending(true);
    try {
      const activeIdx = Number(onChainState[7]);
      const dbMilestone = project.milestones?.find((m: any) => m.milestone_index === activeIdx);
      if (!dbMilestone) throw new Error("Milestone index mismatch");

      let disputeIpfsHash = "";
      if (disputeFile) {
        const uploadRes = await uploadFile(disputeFile);
        disputeIpfsHash = uploadRes.hash;
      } else {
        disputeIpfsHash = "QmDefaultDisputeEvidenceHash0000000000000";
      }

      if (!isMock) {
        // STAGE 1 — Call contract raiseDispute with signer (triggers MetaMask)
        const contract = getEscrowContract(project.contract_address, signer);
        if (!contract) throw new Error("Contract offline");

        const tx = await contract.raiseDispute(activeIdx, disputeIpfsHash, disputeStatement);
        setTxHash(tx.hash);
        await tx.wait();
      }

      // STAGE 2 — Only after on-chain success, update backend
      await createDispute(address!, {
        project_id: project.id,
        milestone_id: dbMilestone.id,
        statement: disputeStatement,
        evidence_ipfs: disputeIpfsHash
      });

      setDisputeStatement('');
      setDisputeFile(null);
      setShowDisputeForm(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Dispute error:", err);
      const msg = err.message || err.toString();
      if (msg.includes("4001") || msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) {
        alert("DISPUTE_REJECTED: You cancelled the MetaMask request. Try again.");
      } else {
        alert("DISPUTE_FAILED: " + msg);
      }
    } finally {
      setIsTxPending(false);
      setTxHash('');
    }
  };

  // Resolve current active milestone details
  const getActiveMilestone = () => {
    if (!onChainState || milestones.length === 0) return null;
    const activeIdx = Number(onChainState[7]);
    if (activeIdx < milestones.length) {
      return milestones[activeIdx];
    }
    // Return last if complete
    return milestones[milestones.length - 1];
  };

  const activeMilestone = getActiveMilestone();

  return (
    <RequireWallet>
      <div className="flex min-h-[calc(100vh-3rem)] w-full font-sans bg-[#F0EAD6] relative z-20">
        <Sidebar activePath="/projects" />

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto px-6 md:px-12 py-10 relative w-full overflow-x-hidden">
        
          {/* Toggle Utility */}
          <div className="absolute top-4 right-8 z-50">
            <button 
              onClick={handleRoleToggle}
              className="bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] font-black uppercase text-xs px-4 py-2 shadow-[4px_4px_0_#1A1A1A] hover:bg-white transition-all cursor-pointer"
            >
              SWITCH ROLE
            </button>
          </div>

          {/* BREADCRUMB */}
          <div className="font-mono text-xs font-bold uppercase tracking-widest opacity-60 mb-8 border-b-4 border-[#1A1A1A] pb-4 inline-flex gap-4 items-center">
            <Link href="/projects" className="hover:text-[#DC143C]">MY_PROJECTS</Link> 
            <span>/</span> 
            <span>{project?.title || "PROJECT_DETAILS"}</span>
          </div>

          {/* ERROR STATUS */}
          {isError && (
            <div className="bg-white border-4 border-[#DC143C] p-6 mb-12 shadow-[8px_8px_0_#DC143C] rotate-[-1deg] flex flex-col sm:flex-row justify-between items-center gap-4 animate-jitter-slow">
              <div className="flex items-center gap-4">
                <span className="text-4xl">⚠</span>
                <div>
                  <h4 className="text-2xl font-black text-[#DC143C] font-sans">API_ERROR — BACKEND OFFLINE</h4>
                  <p className="font-mono text-xs font-bold uppercase mt-1">Failed to fetch the project data. The local SQLite or server may be offline.</p>
                </div>
              </div>
              <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="bg-[#DC143C] text-white px-6 py-3 font-black text-sm uppercase border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shrink-0 cursor-pointer"
              >
                RETRY
              </button>
            </div>
          )}

          {/* TRANSACTION PENDING BANNER (freelancer submit) */}
          {isTxPending && (
            <div className="bg-[#1A1A1A] border-4 border-[#DC143C] p-6 mb-12 shadow-[8px_8px_0_#DC143C] rotate-[0.5deg] animate-pulse flex flex-col sm:flex-row justify-between items-center gap-4">
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

          {/* APPROVE TX STATUS BANNER */}
          {txStatus === 'WAITING_FOR_SIGNATURE' && (
            <div className="bg-[#C5A945] border-b-4 border-[#1A1A1A] p-4 mb-6 flex justify-between items-center gap-4 font-mono">
              <div className="flex items-center gap-3">
                <span className="text-xl">⏳</span>
                <span className="font-black uppercase text-[#1A1A1A] text-sm tracking-wider">
                  WAITING FOR METAMASK SIGNATURE — CHECK YOUR POPUP
                </span>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-[#1A1A1A] border-t-transparent animate-spin shrink-0"></div>
            </div>
          )}

          {txStatus === 'BROADCASTING' && (
            <div className="bg-[#7C3AED] border-b-4 border-[#1A1A1A] p-4 mb-6 flex justify-between items-center gap-4 font-mono">
              <div className="flex items-center gap-3">
                <span className="text-xl">📡</span>
                <span className="font-black uppercase text-white text-sm tracking-wider">
                  BROADCASTING TO SEPOLIA...
                </span>
              </div>
              <div className="flex items-center gap-3">
                {approveTxHash && (
                  <a
                    href={etherscanUrl(approveTxHash, "tx")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-black text-xs underline hover:text-[#C5A945]"
                  >
                    {shortenHash(approveTxHash)} ↗
                  </a>
                )}
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0"></div>
              </div>
            </div>
          )}

          {txStatus === 'SUCCESS' && (
            <div className="bg-[#10B981] border-b-4 border-[#1A1A1A] p-4 mb-6 flex justify-between items-center gap-4 font-mono">
              <div className="flex items-center gap-3">
                <span className="text-xl">✓</span>
                <span className="font-black uppercase text-white text-sm tracking-wider">
                  MILESTONE APPROVED — ETH RELEASED TO FREELANCER
                </span>
              </div>
              <div className="flex items-center gap-3">
                {approveTxHash && (
                  <a
                    href={etherscanUrl(approveTxHash, "tx")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-black text-xs underline hover:text-[#1A1A1A]"
                  >
                    {shortenHash(approveTxHash)} ↗
                  </a>
                )}
                <button
                  onClick={() => { setTxStatus(null); setApproveTxHash(null); }}
                  className="text-white font-black text-xs border border-white px-2 py-1 hover:bg-white hover:text-[#10B981] transition-colors cursor-pointer uppercase"
                >
                  DISMISS ✕
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            /* SKELETON LOADERS */
            <div className="h-96 bg-[#1A1A1A] animate-pulse border-4 border-[#1A1A1A]/50 p-12 mb-16">
              <div className="h-6 bg-[#F0EAD6]/20 w-1/4 mb-4"></div>
              <div className="h-10 bg-[#F0EAD6]/20 w-1/2"></div>
            </div>
          ) : (
            <>
              {/* PROJECT HEADER CARD */}
              <div className="bg-[#1A1A1A] text-[#F0EAD6] p-8 md:p-12 border-4 border-[#DC143C] shadow-[8px_8px_0_#C5A945] rotate-[-0.5deg] relative mb-16">
                <div className="absolute inset-0 halftone opacity-20 pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-6 mb-8 border-b-4 border-white/10 pb-8">
                  <div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-distressed leading-none mb-4">
                      {project?.title}
                    </h1>
                    <span className="bg-[#DC143C] text-white px-3 py-1 font-black text-xs uppercase border-2 border-white animate-flicker">
                      {project?.status?.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] p-6 shadow-[8px_8px_0_#DC143C] rotate-[1deg]">
                     <p className="font-mono text-xs font-black uppercase mb-1 opacity-60 w-full text-center">ESCROW BALANCE</p>
                     <p className="font-black text-4xl whitespace-nowrap text-center">
                       {formatEth(escrowBalance)} <span className="text-[#DC143C]">{escrowBalance > 0 ? "LOCKED" : "EMPTY"}</span>
                     </p>
                     {project?.contract_address && (
                       <a 
                         href={etherscanUrl(project.contract_address, "address")} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="font-mono text-[10px] uppercase font-bold tracking-widest text-center w-full block mt-4 hover:underline"
                       >
                         VIEW ON ETHERSCAN ↗
                       </a>
                     )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono text-sm relative z-10 uppercase font-bold">
                  <div>
                    <p className="opacity-50 text-[10px] mb-1">CLIENT WALLET</p>
                    <p>{project?.client_wallet ? formatAddress(project.client_wallet) : "UNDEPLOYED"}</p>
                  </div>
                  <div>
                    <p className="opacity-50 text-[10px] mb-1">FREELANCER WALLET</p>
                    <p>{project?.freelancer_wallet ? formatAddress(project.freelancer_wallet) : "UNDEPLOYED"}</p>
                  </div>
                  <div>
                    <p className="opacity-50 text-[10px] mb-1">TOTAL CONTRACT VALUE</p>
                    <p>{project?.total_value_eth ? parseFloat(project.total_value_eth).toFixed(2) + " ETH" : "0.0 ETH"}</p>
                  </div>
                  <div>
                    <p className="opacity-50 text-[10px] mb-1">DEPLOYED DATE</p>
                    <p>{project?.created_at ? formatDate(Math.floor(new Date(project.created_at).getTime() / 1000)) : "PENDING"}</p>
                  </div>
                </div>
              </div>

              {/* MILESTONE TIMELINE */}
              <section className="mb-16">
                <span className="text-[#DC143C] font-black uppercase text-sm mb-4 block tracking-widest animate-flicker">MILESTONE_CHAIN</span>
                
                <div className="flex gap-4 md:gap-0 justify-between items-start w-full relative mt-8 overflow-x-auto pb-8 pt-4">
                  {/* Background Line */}
                  <div className="absolute top-[30px] left-8 right-8 border-t-8 border-[#1A1A1A] hidden md:block"></div>
                  
                  {milestones.map((m) => {
                    const mState = getMilestoneState(m.status);
                    
                    return (
                      <div key={m.index} className="relative z-10 flex flex-col items-center min-w-[120px]">
                        <div className={`w-[60px] h-[60px] flex items-center justify-center font-black text-2xl ${mState.color}`}>
                          {mState.icon}
                        </div>
                        <div className="text-center mt-6 uppercase">
                          <p className="font-mono text-xs font-black tracking-tighter mb-1 border-b-2 border-[#1A1A1A] inline-block">{m.title}</p>
                          <p className="font-black text-lg text-[#1A1A1A] leading-tight">{formatEth(m.amount)}</p>
                          <p className="font-mono text-[10px] font-bold opacity-60">
                            DUE: {m.deadline > 0 ? formatDate(Number(m.deadline)) : "N/A"}
                          </p>
                          <span className="text-[9px] font-mono font-bold block text-[#DC143C]">{mState.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* TWO COLUMN BOTTOM LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                
                {/* LEFT: ACTIVE MILESTONE EXPANDED PANEL */}
                <div className="lg:col-span-2 space-y-8">
                  <h3 className="text-3xl font-black uppercase text-[#1A1A1A] border-b-8 border-[#1A1A1A] pb-2">ACTIVE_PHASE</h3>
                  
                  {activeMilestone ? (
                    <div className="bg-[#F0EAD6] border-4 border-[#DC143C] shadow-[12px_12px_0_#1A1A1A] rotate-[0.5deg] p-8 md:p-10 torn-edge relative">
                      <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#DC143C] border-2 border-[#DC143C] px-2 py-0.5">
                        M-0{activeMilestone.index + 1}
                      </span>
                      <h2 className="text-4xl font-black font-sans uppercase mt-4 mb-4">{activeMilestone.title}</h2>
                      <p className="font-mono text-sm leading-relaxed font-bold opacity-80 mb-8 max-w-xl">
                        {activeMilestone.description}
                      </p>
                      <div className="font-black text-[4rem] text-[#DC143C] tracking-tighter leading-none mb-8 border-b-4 border-[#1A1A1A] pb-8 block w-full border-dashed">
                        {formatEth(activeMilestone.amount)}
                      </div>

                      {/* DYNAMIC ROLE VIEWS */}
                      {address?.toLowerCase() === project?.freelancer_wallet?.toLowerCase() ? (
                        // FREELANCER SUBMIT AREA
                        <div>
                          {activeMilestone.status === 1 ? ( // Active
                            <form onSubmit={handleFreelancerSubmit}>
                              <h4 className="font-black text-xl uppercase mb-6 flex items-center gap-4">
                                <span className="bg-[#1A1A1A] text-white px-2">↳</span> SUBMIT_DELIVERABLES
                              </h4>
                              
                              {/* Upload Zone */}
                              <div className="border-4 border-dashed border-[#1A1A1A] bg-[#1A1A1A]/5 p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-[#1A1A1A]/10 transition-colors mb-6 text-center relative">
                                <input 
                                  type="file" 
                                  onChange={handleFileChange}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <span className="text-4xl mb-4">📁</span>
                                <span className="font-mono text-sm font-black uppercase tracking-widest">
                                  {selectedFile ? selectedFile.name.toUpperCase() : "DRAG FILES HERE OR CLICK TO UPLOAD"}
                                </span>
                              </div>

                              {/* IPFS Hash input */}
                              <div className="flex flex-col gap-1 mb-6">
                                <label className="font-mono text-[10px] font-black uppercase text-[#DC143C] flex justify-between">
                                  <span>IPFS_HASH *</span>
                                  <span className="opacity-40 font-normal tracking-normal lowercase">(required)</span>
                                </label>
                                <input 
                                  type="text" 
                                  placeholder="QmYourIPFSHashHere..."
                                  value={ipfsHash}
                                  onChange={(e) => {
                                    setIpfsHash(e.target.value);
                                    setSubmissionError(null);
                                  }}
                                  className={`w-full bg-white border-4 px-4 py-3 font-mono text-sm uppercase font-bold focus:outline-none ${
                                    submissionError && (!ipfsHash || ipfsHash.trim() === "")
                                      ? "border-[#DC143C] border-4"
                                      : "border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A]"
                                  }`}
                                />
                                {submissionError && (!ipfsHash || ipfsHash.trim() === "") && (
                                  <span className="font-mono text-xs font-black uppercase text-[#DC143C] mt-1">REQUIRED</span>
                                )}
                              </div>

                              {/* Links & Text */}
                              <div className="flex gap-4 mb-6">
                                <input 
                                  type="text" 
                                  placeholder="GITHUB REPO URL / DELIVERABLE LINK..."
                                  value={proofLink}
                                  onChange={(e) => setProofLink(e.target.value)}
                                  className="flex-1 bg-white border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] px-4 py-3 font-mono text-sm uppercase font-bold focus:outline-none"
                                />
                              </div>
                              
                              <textarea 
                                placeholder="DEVELOPMENT NOTES / PROOF OF COMPLETION..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-white border-4 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] p-4 font-mono text-sm uppercase font-bold h-32 focus:outline-none mb-8 resize-none"
                              ></textarea>

                              <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full bg-[#DC143C] text-white border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] py-6 text-2xl font-black uppercase hover:animate-jitter transition-none cursor-pointer disabled:opacity-50"
                              >
                                {isSubmitting ? "UPLOADING & SIGNING..." : "SIGN & SUBMIT TRANSACTION"}
                              </button>

                              {/* Submission Error Card */}
                              {submissionError && (
                                <div className="bg-[#DC143C]/10 border-4 border-[#DC143C] rotate-[-0.3deg] p-4 mt-6 font-mono text-left w-full">
                                  <span className="text-[10px] font-black text-[#DC143C] block uppercase tracking-widest mb-1">ERROR_LOG:</span>
                                  <span className="font-bold text-[#DC143C] uppercase text-xs block leading-relaxed">{submissionError}</span>
                                  
                                  <div className="mt-3 flex gap-2">
                                    {submissionError.includes("TRANSACTION_REJECTED") && (
                                      <button
                                        type="button"
                                        onClick={() => handleFreelancerSubmit()}
                                        className="bg-[#DC143C] hover:bg-[#1A1A1A] text-white border border-white text-[10px] font-black px-3 py-1 uppercase cursor-pointer"
                                      >
                                        RETRY TRANSACTION
                                      </button>
                                    )}
                                    {submissionError.includes("INSUFFICIENT_FUNDS") && (
                                      <a
                                        href="https://sepoliafaucet.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#C5A945] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] border border-white text-[10px] font-black px-3 py-1 uppercase inline-block"
                                      >
                                        GET SEPOLIA ETH ↗
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Submission Success Card */}
                              {submitSuccess && (
                                <div className="bg-[#10B981]/10 border-4 border-[#10B981] rotate-[0.3deg] p-4 mt-6 font-mono text-left w-full">
                                  <span className="text-[10px] font-black text-[#10B981] block uppercase tracking-widest mb-1">✓ SUCCESS:</span>
                                  <span className="font-bold text-[#10B981] uppercase text-xs block leading-relaxed">
                                    DELIVERABLES SUBMITTED SUCCESSFULLY! AWAITING CLIENT REVIEW.
                                  </span>
                                </div>
                              )}
                            </form>
                          ) : activeMilestone.status === 2 ? ( // Submitted
                            <div className="bg-[#1A1A1A] text-[#F0EAD6] p-6 border-4 border-[#C5A945] text-center font-mono">
                              <h4 className="text-xl font-black text-[#C5A945] mb-2 uppercase animate-flicker">AWAITING CLIENT APPROVAL</h4>
                              <p className="text-xs opacity-60 mb-4">DELIVERABLES SUBMITTED SUCCESSFULLY ON-CHAIN.</p>
                              {activeMilestone.ipfsHash && (
                                <a 
                                  href={`https://ipfs.io/ipfs/${activeMilestone.ipfsHash}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="underline text-sm font-bold text-white block hover:text-[#C5A945]"
                                >
                                  VIEW SUBMITTED PROOF GATEWAY ↗
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="bg-[#1A1A1A] text-[#F0EAD6] p-6 border-4 border-[#10B981] text-center font-mono uppercase text-xs font-bold">
                              Milestone is in state: {getMilestoneState(activeMilestone.status).label}
                            </div>
                          )}
                        </div>
                      ) : address?.toLowerCase() === project?.client_wallet?.toLowerCase() ? (
                        // CLIENT APPROVE AREA
                        <div>
                          {activeMilestone.status === 2 ? ( // Submitted
                            <div>
                              <h4 className="font-black text-xl uppercase mb-6 flex items-center gap-4">
                                <span className="bg-[#1A1A1A] text-white px-2">↳</span> AWAITING_YOUR_REVIEW
                              </h4>
                              
                              {/* Evidence Display */}
                              <div className="bg-white border-4 border-[#1A1A1A] p-6 mb-8 font-mono text-xs font-bold uppercase relative rotate-[-0.5deg]">
                                <div className="absolute top-0 right-0 bg-[#1A1A1A] text-[#F0EAD6] px-3 py-1 -translate-y-3 translate-x-3 text-[10px] tracking-widest">SUBMITTED REVIEW</div>
                                {activeMilestone.ipfsHash && (
                                  <div className="flex items-center gap-3 mb-4 text-[#1A1A1A]/80">
                                    <span>📁</span> IPFS Proof:{" "}
                                    <a 
                                      href={`https://ipfs.io/ipfs/${activeMilestone.ipfsHash}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="underline"
                                    >
                                      {shortenHash(activeMilestone.ipfsHash)} ↗
                                    </a>
                                  </div>
                                )}
                                {activeMilestone.proofLinks && activeMilestone.proofLinks.length > 0 && (
                                  <div className="flex flex-col gap-1 mb-4 text-[#1A1A1A]/80">
                                    <span className="opacity-60">PROOFS:</span>
                                    {activeMilestone.proofLinks.map((link: string, li: number) => (
                                      <a key={li} href={link} target="_blank" rel="noopener noreferrer" className="underline truncate block">
                                        🔗 {link}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* APPROVE ERROR DISPLAY */}
                              {approveError && (
                                <div className="bg-[#DC143C]/10 border-4 border-[#DC143C] rotate-[-0.3deg] p-4 mb-6 font-mono">
                                  <span className="text-[10px] font-black text-[#DC143C] block uppercase tracking-widest mb-1">ERROR_LOG:</span>
                                  <span className="font-bold text-[#DC143C] uppercase text-xs block leading-relaxed">{approveError}</span>
                                  <div className="mt-3 flex gap-2">
                                    {approveError.includes("APPROVAL_REJECTED") && (
                                      <button
                                        onClick={() => {
                                          setApproveError(null);
                                          const dbMilestone = project?.milestones?.find((m: any) => m.milestone_index === activeMilestone.index);
                                          if (dbMilestone) handleApproveMilestone(activeMilestone.index, dbMilestone.id);
                                        }}
                                        className="bg-[#DC143C] hover:bg-[#1A1A1A] text-white border border-white text-[10px] font-black px-3 py-1 uppercase cursor-pointer"
                                      >
                                        RETRY APPROVAL
                                      </button>
                                    )}
                                    {approveError.includes("INSUFFICIENT_GAS") && (
                                      <a
                                        href="https://sepoliafaucet.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#C5A945] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] border border-[#1A1A1A] text-[10px] font-black px-3 py-1 uppercase inline-block"
                                      >
                                        GET SEPOLIA ETH ↗
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                                {/* APPROVE BUTTON — staged loading states */}
                                {(() => {
                                  const dbMilestone = project?.milestones?.find((m: any) => m.milestone_index === activeMilestone.index);
                                  const isThisMilestoneApproving = approvingMilestone === activeMilestone.index;

                                  if (isThisMilestoneApproving && txStatus === 'WAITING_FOR_SIGNATURE') {
                                    return (
                                      <div className="flex-1 flex flex-col items-center gap-2">
                                        <button
                                          disabled
                                          className="w-full bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] py-5 text-xl font-black uppercase opacity-80 cursor-wait animate-pulse"
                                        >
                                          WAITING FOR METAMASK...
                                        </button>
                                        <span className="font-mono text-[10px] font-black uppercase text-[#C5A945] tracking-widest">CHECK YOUR METAMASK POPUP ☝</span>
                                      </div>
                                    );
                                  }

                                  if (isThisMilestoneApproving && txStatus === 'BROADCASTING') {
                                    return (
                                      <div className="flex-1 flex flex-col items-center gap-2">
                                        <button
                                          disabled
                                          className="w-full bg-[#7C3AED] text-white border-4 border-[#1A1A1A] py-5 text-xl font-black uppercase opacity-80 cursor-wait"
                                        >
                                          CONFIRMING ON-CHAIN...
                                        </button>
                                        {approveTxHash && (
                                          <a
                                            href={etherscanUrl(approveTxHash, "tx")}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono text-[10px] font-black uppercase text-[#7C3AED] underline tracking-widest"
                                          >
                                            {shortenHash(approveTxHash)} — VIEW ON ETHERSCAN ↗
                                          </a>
                                        )}
                                      </div>
                                    );
                                  }

                                  if (txStatus === 'SUCCESS' && approvingMilestone === null) {
                                    return (
                                      <button
                                        disabled
                                        className="flex-1 bg-[#10B981] text-white border-4 border-[#1A1A1A] py-5 text-xl font-black uppercase cursor-default"
                                      >
                                        ✓ ETH RELEASED!
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      onClick={() => {
                                        if (dbMilestone) handleApproveMilestone(activeMilestone.index, dbMilestone.id);
                                      }}
                                      disabled={approving}
                                      className={`flex-1 bg-[#C5A945] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] py-5 text-xl font-black uppercase transition-all ${
                                        approving
                                          ? 'opacity-70 cursor-wait'
                                          : 'hover:shadow-none hover:translate-x-1 hover:translate-y-1 cursor-pointer'
                                      }`}
                                    >
                                      ✓ APPROVE — RELEASE {formatEth(activeMilestone.amount)}
                                    </button>
                                  );
                                })()}

                                <button 
                                  onClick={() => {
                                    setShowRejectForm(!showRejectForm);
                                    setShowDisputeForm(false);
                                  }}
                                  disabled={approving}
                                  className="bg-white text-[#1A1A1A] border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] px-8 py-5 text-xl font-black uppercase hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  ✗ REJECT
                                </button>
                              </div>

                              {/* REJECT FEEDBACK FORM */}
                              {showRejectForm && (
                                <form onSubmit={handleClientReject} className="bg-white border-4 border-[#DC143C] p-6 mb-6">
                                  <h5 className="font-black text-sm uppercase text-[#DC143C] mb-3">Provide Rejection Feedback</h5>
                                  <textarea 
                                    placeholder="Explain why these deliverables are rejected..."
                                    value={rejectFeedback}
                                    onChange={(e) => { setRejectFeedback(e.target.value); setRejectError(null); }}
                                    required
                                    className="w-full bg-white border-2 border-[#1A1A1A] p-3 font-mono text-xs font-bold uppercase h-24 mb-4 focus:outline-none"
                                  ></textarea>
                                  {rejectError && (
                                    <p className="font-mono text-xs font-black uppercase text-[#DC143C] mb-3">{rejectError}</p>
                                  )}
                                  <button type="submit" disabled={isTxPending} className="bg-[#DC143C] text-white px-4 py-2 font-black text-xs uppercase border-2 border-black disabled:opacity-50">
                                    {isTxPending ? "SUBMITTING..." : "SUBMIT REJECTION"}
                                  </button>
                                </form>
                              )}

                              <div className="text-center w-full">
                                <button 
                                  onClick={() => {
                                    setShowDisputeForm(!showDisputeForm);
                                    setShowRejectForm(false);
                                  }}
                                  className="font-mono text-xs uppercase text-[#DC143C] font-black underline underline-offset-4 cursor-pointer"
                                >
                                  ⚖ RAISE DISPUTE
                                </button>
                              </div>

                              {/* DISPUTE EVIDENCE FORM */}
                              {showDisputeForm && (
                                <form onSubmit={handleClientDispute} className="bg-white border-4 border-[#EC4899] p-6 mt-6">
                                  <h5 className="font-black text-sm uppercase text-[#EC4899] mb-3">Escalate to On-chain Dispute</h5>
                                  
                                  <textarea 
                                    placeholder="State your dispute reasons..."
                                    value={disputeStatement}
                                    onChange={(e) => setDisputeStatement(e.target.value)}
                                    required
                                    className="w-full bg-white border-2 border-[#1A1A1A] p-3 font-mono text-xs font-bold uppercase h-24 mb-4 focus:outline-none"
                                  ></textarea>
                                  
                                  <div className="mb-4">
                                    <span className="font-mono text-xs font-bold block mb-1">UPLOAD DISPUTE EVIDENCE FILE:</span>
                                    <input 
                                      type="file" 
                                      onChange={(e) => setDisputeFile(e.target.files?.[0] || null)}
                                      className="font-mono text-xs font-bold"
                                    />
                                  </div>

                                  <button type="submit" className="bg-[#EC4899] text-white px-4 py-2 font-black text-xs uppercase border-2 border-black">
                                    CONFIRM & LAUNCH DISPUTE
                                  </button>
                                </form>
                              )}
                            </div>
                          ) : (
                            <div className="bg-[#1A1A1A] text-[#F0EAD6] p-6 border-4 border-[#06B6D4] text-center font-mono uppercase text-xs font-bold">
                              Milestone is in state: {getMilestoneState(activeMilestone.status).label}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-[#1A1A1A] text-[#F0EAD6] p-6 border-4 border-[#C5A945] text-center font-mono uppercase text-xs font-bold">
                          CONNECTED AS OBSERVER. ONLY CONTRACT PARTIES CAN INTERACT.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border-4 border-[#1A1A1A] p-6 text-center">
                      <p className="font-mono text-sm font-bold">NO ON-CHAIN MILESTONES LOCATED.</p>
                    </div>
                  )}
                </div>

                {/* RIGHT: ON-CHAIN ACTIVITY LOG */}
                <div className="lg:col-span-1 border-l-0 lg:border-l-8 border-[#1A1A1A] pt-12 lg:pt-0 lg:pl-10">
                  <h3 className="text-2xl font-black uppercase text-[#1A1A1A] border-b-8 border-[#C5A945] pb-2 mb-8">EVENT_LOG</h3>
                  
                  <div className="flex flex-col gap-6 relative">
                    {onChainEvents.length > 0 ? (
                      <>
                        <div className="absolute left-[11px] top-2 bottom-2 w-1 bg-[#1A1A1A] opacity-20 -z-10"></div>
                        {onChainEvents.map((log, i) => (
                          <div key={i} className={`flex gap-4 ${log.rotate} hover:translate-x-2 transition-transform`}>
                            <div className="w-6 h-6 rounded-full border-4 border-[#1A1A1A] bg-[#C5A945] shrink-0 mt-1"></div>
                            <div>
                              <div className="font-mono text-[10px] font-black tracking-widest text-[#DC143C] bg-[#1A1A1A] px-2 py-0.5 inline-block mb-1">
                                {log.time}
                              </div>
                              <p className="font-bold text-sm leading-tight text-[#1A1A1A] mb-1">
                                {log.action}
                              </p>
                              <a 
                                href={etherscanUrl(log.txHash, "tx")} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="font-mono text-[9px] font-black uppercase text-[#DC143C] hover:underline"
                              >
                                VIEW TX: {shortenHash(log.txHash)} ↗
                              </a>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="bg-white border-2 border-[#1A1A1A] p-6 text-center">
                        <p className="font-mono text-xs font-bold">NO ON-CHAIN CONTRACT EVENTS DETECTED YET.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

        </main>
      </div>
    </RequireWallet>
  );
}
