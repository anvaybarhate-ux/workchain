"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Global types for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  chainId: number | null;
  role: 'freelancer' | 'client' | null;
  error: string | null;
  balance: string | null;
  ensName: string | null;
  isCorrectNetwork: boolean;
  shortAddress: string | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToSepolia: () => Promise<void>;
  changeRole: (newRole: 'freelancer' | 'client') => Promise<void>;
  setError: (err: string | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_HEX = "0xaa36a7";
const SEPOLIA_CONFIG = {
  chainId: "0xaa36a7",
  chainName: "Sepolia Testnet",
  nativeCurrency: {
    name: "SepoliaETH",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: [
    "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12ebd445c558" // Placeholder rpc url
  ],
  blockExplorerUrls: [
    "https://sepolia.etherscan.io"
  ]
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [chainId, setChainId] = useState<number | null>(null);
  const [role, setRole] = useState<'freelancer' | 'client' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;
  const shortAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const connectWallet = async () => {
    if (isConnecting) return; // Prevent concurrent permissions request triggers

    if (typeof window === "undefined" || !window.ethereum) {
      setError("METAMASK_NOT_FOUND: Install MetaMask from metamask.io");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Force MetaMask account selection/login dialog to always appear
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();
      setSigner(signer);
      const bal = await provider.getBalance(accounts[0]);

      const currentChainId = Number(network.chainId);
      setAddress(accounts[0]);
      setChainId(currentChainId);
      setIsConnected(true);
      setBalance(ethers.formatEther(bal).slice(0, 6));

      localStorage.setItem("workchain_address", accounts[0]);

      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        setError("WRONG_NETWORK");
        await switchToSepolia();
      }

      // Auto-register user with backend
      const storedRole = localStorage.getItem("workchain_role") as 'freelancer' | 'client' | null;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        await fetch(`${apiUrl}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: accounts[0],
            role: storedRole || role || "freelancer",
            ens_name: `${accounts[0].slice(0, 6).toUpperCase()}.ETH`,
            bio: "DECENTRALIZED FREELANCE OPERATOR ON WORKCHAIN.",
            skills: ["SOLIDITY", "REACT"],
            hourly_rate_eth: 0.08,
            availability: true
          })
        });
      } catch (backendErr) {
        // Already exists or offline backend - ignore silently
      }

    } catch (err: any) {
      if (err.code === 4001) {
        setError("CONNECTION_REJECTED: You rejected the MetaMask request.");
      } else if (err.code === -32002 || err.message?.toLowerCase().includes("already pending")) {
        setError("CONNECTION_PENDING: A MetaMask connection request is already pending. Please open MetaMask to approve the request.");
      } else {
        setError("CONNECTION_FAILED: " + err.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setIsConnected(false);
    setChainId(null);
    setSigner(null);
    setBalance(null);
    setRole(null);
    setError(null);
    setEnsName(null);
    localStorage.removeItem("workchain_address");
    localStorage.removeItem("workchain_role");
  };

  const switchToSepolia = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_HEX }]
      });
      setChainId(SEPOLIA_CHAIN_ID);
      setError(null);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [SEPOLIA_CONFIG]
          });
          setChainId(SEPOLIA_CHAIN_ID);
          setError(null);
        } catch (addError) {
          console.error("Failed to add Sepolia network:", addError);
        }
      } else if (switchError.code === 4001) {
        setError("SWITCH_REJECTED: Please switch to Sepolia manually.");
      } else {
        console.error("Failed to switch to Sepolia network:", switchError);
      }
    }
  };

  const changeRole = async (newRole: 'freelancer' | 'client') => {
    setRole(newRole);
    localStorage.setItem("workchain_role", newRole);

    if (address) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        await fetch(`${apiUrl}/api/users/${address}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole })
        });
      } catch (err) {
        // Ignore errors silently
      }
    }
  };

  // Mount Persistence
  useEffect(() => {
    const storedRole = localStorage.getItem("workchain_role") as 'freelancer' | 'client' | null;

    if (storedRole) {
      setRole(storedRole);
    }

    setIsInitializing(false);
  }, []);

  // Event Listeners
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const bal = await provider.getBalance(accounts[0]);
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
        setAddress(accounts[0]);
        setBalance(ethers.formatEther(bal).slice(0, 6));
        setIsConnected(true);
        localStorage.setItem("workchain_address", accounts[0]);
      }
    };

    const handleChainChanged = (hexChainId: string) => {
      setChainId(parseInt(hexChainId, 16));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        isInitializing,
        chainId,
        role,
        error,
        balance,
        ensName,
        isCorrectNetwork,
        shortAddress,
        signer,
        connectWallet,
        disconnectWallet,
        switchToSepolia,
        changeRole,
        setError
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
