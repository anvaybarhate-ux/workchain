"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';

export default function ConnectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isWalletConnecting, setIsWalletConnecting] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [showWeb3Helper, setShowWeb3Helper] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'freelancer' | 'client' | null>(null);

  const handleWalletConnect = (walletApp: string) => {
    setIsWalletConnecting(walletApp);
    setTimeout(() => {
      setIsWalletConnecting(null);
      setWalletConnected(true);
      setStep(2);
    }, 1500);
  };

  const handleInitialize = () => {
    if (!selectedRole) return;
    router.push('/dashboard');
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4, duration: 0.8 } },
    exit: { opacity: 0, y: -50, transition: { duration: 0.3 } }
  };

  return (
    <div className="bg-[#F0EAD6] min-h-[90vh] pb-32 pt-20 px-4 relative flex flex-col items-center z-10 font-sans">
      <div className="absolute inset-0 halftone opacity-10 pointer-events-none -z-10"></div>
      
      <div className="w-full max-w-2xl mx-auto relative">
        <div className="mb-8 flex justify-center">
          <span className="bg-[#1A1A1A] text-[#DC143C] px-4 py-1 font-mono font-black text-xs uppercase border-4 border-[#DC143C] shadow-[4px_4px_0_#C5A945]">
            STEP 0{step} OF 02
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-[#1A1A1A] text-[#F0EAD6] p-8 md:p-12 border-4 border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-[-1deg]"
            >
              <div className="mb-8">
                <span className="text-[#DC143C] font-mono font-black text-xs uppercase animate-flicker">CONNECT_WALLET</span>
                <h1 className="text-4xl md:text-6xl font-black uppercase text-distressed tracking-tighter mt-2 leading-none">
                  ENTER THE<br/>PROTOCOL
                </h1>
                <p className="font-mono text-sm opacity-80 mt-4 leading-relaxed tracking-tight text-[#F0EAD6]">
                  Select your wallet to begin. No account needed. No KYC. Just your keys.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
                {/* MetaMask */}
                <button 
                  onClick={() => handleWalletConnect('metamask')}
                  disabled={isWalletConnecting !== null}
                  className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] p-8 flex flex-col items-center justify-center hover:border-[#DC143C] hover:shadow-[8px_8px_0_#DC143C] transition-all relative group overflow-hidden"
                >
                  {isWalletConnecting === 'metamask' && (
                    <div className="absolute inset-0 bg-[#DC143C] flex items-center justify-center z-20">
                      <span className="font-mono font-black text-white text-xl animate-jitter">CONNECTING...</span>
                    </div>
                  )}
                  <span className="absolute top-2 right-2 bg-[#C5A945] text-[#1A1A1A] text-[9px] font-black px-2 py-0.5 border-2 border-[#1A1A1A]">MOST POPULAR</span>
                  <span className="text-[4rem] group-hover:scale-110 transition-transform">🦊</span>
                  <span className="font-black text-xl md:text-2xl mt-4 tracking-tighter">METAMASK</span>
                </button>

                {/* WalletConnect */}
                <button 
                  onClick={() => handleWalletConnect('walletconnect')}
                  disabled={isWalletConnecting !== null}
                  className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#C5A945] p-8 flex flex-col items-center justify-center hover:border-[#C5A945] hover:shadow-[8px_8px_0_#C5A945] transition-all relative group overflow-hidden"
                >
                  {isWalletConnecting === 'walletconnect' && (
                    <div className="absolute inset-0 bg-[#C5A945] flex items-center justify-center z-20">
                      <span className="font-mono font-black text-[#1A1A1A] text-xl animate-jitter">CONNECTING...</span>
                    </div>
                  )}
                  <span className="absolute top-2 right-2 bg-[#1A1A1A] text-white text-[9px] font-black px-2 py-0.5 border-2 border-[#1A1A1A]">MOBILE FRIENDLY</span>
                  <span className="text-[4rem] group-hover:scale-110 transition-transform block rotate-45 transform">🔗</span>
                  <span className="font-black text-xl md:text-2xl mt-4 tracking-tighter">WALLETCONNECT</span>
                </button>
              </div>

              {/* Web3 Helper */}
              <div className="mt-12 border-t-2 border-[#F0EAD6]/20 pt-6">
                <button 
                  onClick={() => setShowWeb3Helper(!showWeb3Helper)}
                  className="w-full flex justify-between items-center font-mono text-xs font-black uppercase text-[#C5A945] hover:text-[#DC143C] transition-colors"
                >
                  <span>NEW TO WEB3?</span>
                  <span>{showWeb3Helper ? '-' : '+'}</span>
                </button>
                <AnimatePresence>
                  {showWeb3Helper && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: "auto", opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="py-4 font-mono text-xs text-[#F0EAD6]/70 leading-relaxed font-bold tracking-tight">
                        <p className="mb-2">&gt; A wallet acts as your digital identity and bank account combined.</p>
                        <p className="mb-2">&gt; It proves who you are without requiring an email or password.</p>
                        <p>&gt; We recommend installing the MetaMask extension to get started.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full flex flex-col gap-8"
            >
              <div className="text-center">
                <div className="inline-block bg-[#1A1A1A] text-[#10B981] px-4 py-2 border-4 border-[#1A1A1A] font-mono font-black text-xs shadow-[6px_6px_0_#1A1A1A] mb-8 rotate-[-1deg] animate-flicker">
                  ✓ CONNECTED: 0x8F9...A42B
                </div>
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-[#1A1A1A]">
                  I AM A...
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* FREELANCER CARD */}
                <button 
                  onClick={() => setSelectedRole('freelancer')}
                  className={`bg-[#F0EAD6] p-10 flex flex-col border-4 transition-all ${
                    selectedRole === 'freelancer' 
                      ? 'border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-0 scale-[1.02] bg-white' 
                      : 'border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] rotate-[-2deg] hover:-translate-y-1'
                  }`}
                >
                  <div className="text-[4rem] mb-4 text-center w-full">💼</div>
                  <h3 className="font-black text-3xl uppercase tracking-tighter text-[#1A1A1A] mb-4 text-center w-full">FREELANCER</h3>
                  <div className="font-mono text-xs font-bold text-left space-y-3 opacity-80 uppercase pt-4 border-t-2 border-[#1A1A1A]">
                    <p>• SUBMIT MILESTONES</p>
                    <p>• BUILD ON-CHAIN REPUTATION</p>
                    <p>• GET PAID INSTANTLY</p>
                  </div>
                </button>

                {/* CLIENT CARD */}
                <button 
                  onClick={() => setSelectedRole('client')}
                  className={`bg-[#F0EAD6] p-10 flex flex-col border-4 transition-all ${
                    selectedRole === 'client' 
                      ? 'border-[#C5A945] shadow-[12px_12px_0_#DC143C] rotate-0 scale-[1.02] bg-white' 
                      : 'border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] rotate-[2deg] hover:-translate-y-1'
                  }`}
                >
                  <div className="text-[4rem] mb-4 text-center w-full">🏢</div>
                  <h3 className="font-black text-3xl uppercase tracking-tighter text-[#1A1A1A] mb-4 text-center w-full">CLIENT</h3>
                  <div className="font-mono text-xs font-bold text-left space-y-3 opacity-80 uppercase pt-4 border-t-2 border-[#1A1A1A]">
                    <p>• LOCK ESCROW FUNDS</p>
                    <p>• APPROVE DELIVERABLES</p>
                    <p>• RAISE DISPUTES VIRTUALLY</p>
                  </div>
                </button>
              </div>

              {/* ACTION BUTTON */}
              <AnimatePresence>
                {selectedRole && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex justify-center mt-6"
                  >
                    <button 
                      onClick={handleInitialize}
                      className="w-full bg-[#DC143C] text-[#F0EAD6] px-12 py-6 text-3xl font-black uppercase tracking-tighter border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-4"
                    >
                      INITIALISE PROTOCOL <span className="font-mono">→</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
