"use client";

import React, { useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';

export default function ErrorToast() {
  const { error, setError, connectWallet, switchToSepolia } = useWallet();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  if (!error) return null;

  const isMetaMaskNotFound = error.includes("METAMASK_NOT_FOUND");
  const isConnectionRejected = error.includes("CONNECTION_REJECTED");
  const isWrongNetwork = error.includes("WRONG_NETWORK");
  const isSwitchRejected = error.includes("SWITCH_REJECTED");

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] border-4 border-[#DC143C] shadow-[8px_8px_0_#DC143C] p-6 max-w-sm w-full rotate-[-1deg] transition-all duration-300">
      <button 
        onClick={() => setError(null)}
        className="absolute top-2 right-3 font-mono font-black text-xs text-[#DC143C] hover:text-[#F0EAD6] transition-colors uppercase tracking-wider"
      >
        DISMISS ✕
      </button>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] font-black text-[#DC143C] tracking-widest uppercase">
          ERROR_LOG
        </span>

        <div className="font-mono text-xs font-bold text-[#F0EAD6] uppercase tracking-wide leading-relaxed pr-12">
          {isMetaMaskNotFound ? (
            <div>
              METAMASK NOT FOUND. PLEASE{" "}
              <a 
                href="https://metamask.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-white font-black hover:text-[#C5A945] inline-flex items-center gap-0.5"
              >
                INSTALL METAMASK ↗
              </a>
            </div>
          ) : isConnectionRejected ? (
            <div className="flex flex-col gap-3">
              <span>CONNECTION REJECTED: YOU REJECTED THE METAMASK REQUEST.</span>
              <button 
                onClick={connectWallet}
                className="self-start bg-[#DC143C] text-white border-2 border-white font-mono font-black px-3 py-1 text-[10px] hover:bg-white hover:text-[#DC143C] transition-all"
              >
                RETRY CONNECTION
              </button>
            </div>
          ) : isWrongNetwork ? (
            <div className="flex flex-col gap-3">
              <span>WRONG NETWORK: YOU ARE NOT ON SEPOLIA TESTNET.</span>
              <button 
                onClick={switchToSepolia}
                className="self-start bg-[#C5A945] text-[#1A1A1A] border-2 border-[#1A1A1A] font-mono font-black px-3 py-1 text-[10px] hover:bg-[#F0EAD6] transition-all"
              >
                SWITCH TO SEPOLIA
              </button>
            </div>
          ) : isSwitchRejected ? (
            <div>
              SWITCH REJECTED: PLEASE SWITCH TO SEPOLIA TESTNET MANUALLY IN YOUR METAMASK WALLET.
            </div>
          ) : (
            <span>{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}
