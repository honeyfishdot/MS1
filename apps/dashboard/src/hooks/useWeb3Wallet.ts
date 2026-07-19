 /**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Web3 Wallet Integration Hook
 * Provides MetaMask, WalletConnect, and Coinbase Wallet connection
 * for the AllBright flash-loan arbitrage dashboard.
 */

import { useState, useEffect, useCallback } from 'react';

// Ethers.js types (lazy-loaded to avoid breaking if not installed)
type BrowserProvider = any;
type Signer = any;

export interface Web3WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string;
  provider: 'metamask' | 'walletconnect' | 'coinbase' | null;
  error: string | null;
  connecting: boolean;
}

export interface Web3WalletActions {
  connectMetaMask: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  connectCoinbase: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
  getSigner: () => Promise<Signer | null>;
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  137: 'Polygon POS',
  42161: 'Arbitrum Mainnet',
  10: 'Optimism Mainnet',
  8453: 'Base Mainnet',
  56: 'BNB Smart Chain',
  43114: 'Avalanche C-Chain',
};

export function useWeb3Wallet(): Web3WalletState & Web3WalletActions {
  const [state, setState] = useState<Web3WalletState>({
    connected: false,
    address: null,
    chainId: null,
    balance: '0',
    provider: null,
    error: null,
    connecting: false,
  });

  // Track ethers reference
  const [ethers, setEthers] = useState<any>(null);

  // Lazy-load ethers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // @ts-ignore - ethers is optional and lazy-loaded; type declarations may not be installed
        const mod = await import('ethers');
        if (!cancelled) setEthers(mod);
      } catch {
        // ethers not installed — will use window.ethereum directly
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getProvider = useCallback(async (): Promise<BrowserProvider | null> => {
    if (typeof window === 'undefined') return null;
    const { ethereum } = window as any;
    if (!ethereum) return null;
    if (ethers) {
      return new ethers.BrowserProvider(ethereum);
    }
    return ethereum;
  }, [ethers]);

  const updateBalance = useCallback(async (address: string, prov: any) => {
    try {
      let bal: string;
      if (ethers && prov.getBalance) {
        const wei = await prov.getBalance(address);
        bal = ethers.formatEther(wei);
      } else if (prov.request) {
        const hex = await prov.request({ method: 'eth_getBalance', params: [address, 'latest'] });
        const wei = BigInt(hex);
        bal = (Number(wei) / 1e18).toFixed(6);
      } else {
        bal = '0';
      }
      setState(prev => ({ ...prev, balance: bal }));
    } catch { /* silent */ }
  }, [ethers]);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setState(prev => ({ ...prev, connected: false, address: null, balance: '0' }));
    } else {
      setState(prev => ({ ...prev, address: accounts[0] }));
      const prov = (window as any).ethereum;
      if (prov && accounts[0]) updateBalance(accounts[0], prov);
    }
  }, [updateBalance]);

  const handleChainChanged = useCallback((chainIdHex: string) => {
    const chainId = parseInt(chainIdHex, 16);
    setState(prev => ({ ...prev, chainId }));
  }, []);

  // Listen for MetaMask events
  useEffect(() => {
    const { ethereum } = window as any;
    if (!ethereum) return;
    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [handleAccountsChanged, handleChainChanged]);

  const connectMetaMask = useCallback(async () => {
    setState(prev => ({ ...prev, connecting: true, error: null }));
    try {
      const { ethereum } = window as any;
      if (!ethereum || !ethereum.isMetaMask) {
        throw new Error('MetaMask not detected. Please install MetaMask extension.');
      }
      const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
      const chainIdHex: string = await ethereum.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);
      const prov = await getProvider();
      setState(prev => ({
        ...prev,
        connected: true,
        address: accounts[0],
        chainId,
        provider: 'metamask',
        connecting: false,
        error: null,
      }));
      if (prov && accounts[0]) updateBalance(accounts[0], prov);
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        connecting: false,
        error: err.message || 'Failed to connect MetaMask',
      }));
    }
  }, [getProvider, updateBalance]);

  const connectWalletConnect = useCallback(async () => {
    setState(prev => ({ ...prev, connecting: true, error: null }));
    try {
      // WalletConnect v2 requires @walletconnect/web3wallet package
      // For now, fallback to MetaMask if available
      const { ethereum } = window as any;
      if (ethereum?.isMetaMask) {
        await connectMetaMask();
        return;
      }
      throw new Error(
        'WalletConnect requires @walletconnect/web3wallet. ' +
        'Install with: npm install @walletconnect/web3wallet @walletconnect/core'
      );
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        connecting: false,
        error: err.message || 'Failed to connect WalletConnect',
      }));
    }
  }, [connectMetaMask]);

  const connectCoinbase = useCallback(async () => {
    setState(prev => ({ ...prev, connecting: true, error: null }));
    try {
      const { ethereum } = window as any;
      if (ethereum?.isCoinbaseWallet) {
        const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
        const chainIdHex: string = await ethereum.request({ method: 'eth_chainId' });
        setState(prev => ({
          ...prev,
          connected: true,
          address: accounts[0],
          chainId: parseInt(chainIdHex, 16),
          provider: 'coinbase',
          connecting: false,
          error: null,
        }));
      } else {
        throw new Error('Coinbase Wallet not detected.');
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        connecting: false,
        error: err.message || 'Failed to connect Coinbase Wallet',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      address: null,
      chainId: null,
      balance: '0',
      provider: null,
      error: null,
      connecting: false,
    });
  }, []);

  const switchChain = useCallback(async (targetChainId: number) => {
    try {
      const { ethereum } = window as any;
      if (!ethereum) throw new Error('No wallet detected');
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + targetChainId.toString(16) }],
      });
    } catch (err: any) {
      // Chain not added — prompt to add
      if (err.code === 4902) {
        try {
          const { ethereum } = window as any;
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + targetChainId.toString(16),
              chainName: CHAIN_NAMES[targetChainId] || `Chain ${targetChainId}`,
              rpcUrls: ['https://eth.llamarpc.com'],
            }],
          });
        } catch { /* user rejected */ }
      }
    }
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    try {
      const { ethereum } = window as any;
      if (!ethereum || !state.address) throw new Error('Wallet not connected');
      const signature: string = await ethereum.request({
        method: 'personal_sign',
        params: [message, state.address],
      });
      return signature;
    } catch {
      return null;
    }
  }, [state.address]);

  const getSigner = useCallback(async (): Promise<Signer | null> => {
    try {
      const prov = await getProvider();
      if (!prov || !ethers) return null;
      return await prov.getSigner();
    } catch {
      return null;
    }
  }, [getProvider, ethers]);

  return {
    ...state,
    connectMetaMask,
    connectWalletConnect,
    connectCoinbase,
    disconnect,
    switchChain,
    signMessage,
    getSigner,
  };
}