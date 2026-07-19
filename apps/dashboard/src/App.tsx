/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import WalletView from './components/WalletView';
import CommanderView from './components/CommanderView';
import ComplianceView from './components/ComplianceView';
import CopilotPanel from './components/CopilotPanel';
import Footer from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  AggregatedMetrics, 
  ArbitrageOpportunity, 
  DashboardSettings, 
  WalletState,
  ArbitrageTrade,
  CustomWalletItem,
  GovernanceCardsPayload
} from './types';

// Env-configured wallet addresses (fallback values match AB4/.env — backend/.env is AUTHORITATIVE)
const ENV_WALLET_ADDRESS = import.meta.env.VITE_WALLET_ADDRESS || '0x748Aa8ee067585F5bd02f0988eF6E71f2d662751';
const ENV_EXECUTOR_ADDRESS = import.meta.env.VITE_EXECUTOR_ADDRESS || '0xfE42843EdB3E04Be178A5f2562ff5eD2Bc2e7d59';

// API base for backend calls.
// - For PRODUCTION (Rust backend with real 78 KPI data):  VITE_API_BASE=http://localhost:3001
// - For DEV (Express simulation / UI prototyping):         VITE_API_BASE=http://localhost:3000
// - For DASHBOARD (built-in API):                           VITE_API_BASE=http://localhost:3002
// - For TAURI desktop:                                      VITE_API_BASE=http://localhost:3001
//
// The Rust backend (gRPC :50051 / HTTP :3001) provides real 78 KPI telemetry
// with sub-0.1ms P50 latency. The Express simulation (:3000) is for UI dev only.
// The dashboard server (:3002) has its own built-in API endpoints.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3002';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [settings, setSettings] = useState<DashboardSettings | null>(null);
  const [localProfitTransferMode, setLocalProfitTransferMode] = useState<'AUTO' | 'MANUAL'>('MANUAL');
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [governanceCards, setGovernanceCards] = useState<GovernanceCardsPayload | null>(null);

  const [walletsList, setWalletsList] = useState<CustomWalletItem[]>(() => {
    const saved = localStorage.getItem('allbright_wallets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [
      { id: 'w-1', name: 'AllBright Commander Wallet', address: ENV_WALLET_ADDRESS, chain: 'Arbitrum Mainnet', balance: 42500.0, isActive: true, createdDate: new Date().toISOString() },
      { id: 'w-2', name: 'Flash Loan Executor', address: ENV_EXECUTOR_ADDRESS, chain: 'Ethereum Mainnet', balance: 18250.0, isActive: true, createdDate: new Date().toISOString() },
    ];
  });

  // Sync wallet address from backend env config on first load
  useEffect(() => {
    safeFetchJson('/api/wallet').then(data => {
      if (data?.address && data.address !== '0x...') {
        setWalletsList(prev => {
          const saved = localStorage.getItem('allbright_wallets');
          if (saved) return prev;
          return prev.map((w, i) =>
            i === 0 ? { ...w, address: data.address } : w
          );
        });
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('allbright_wallets', JSON.stringify(walletsList));
  }, [walletsList]);
  
  const [isEmbedded, setIsEmbedded] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [messageBanner, setMessageBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backendUnreachable, setBackendUnreachable] = useState<boolean>(false);
  const [isWalletUpdating, setIsWalletUpdating] = useState<boolean>(false);
  const [transferringProfit, setTransferringProfit] = useState<boolean>(false);

  const [copilotOpen, setCopilotOpen] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? Number(saved) : 256;
  });
  const [copilotCollapsed, setCopilotCollapsed] = useState<boolean>(false);
  const [copilotWidth, setCopilotWidth] = useState<number>(() => {
    const saved = localStorage.getItem('copilotWidth');
    return saved ? Number(saved) : 350;
  });
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    return localStorage.getItem('selectedCurrency') || 'USD';
  });

  const currencyRates: { [key: string]: number } = {
    USD: 1, USDT: 1, BTC: 91850, ETH: 3420.5, SOL: 145, BNB: 580,
    XRP: 0.60, ADA: 0.38, DOGE: 0.12, SHIB: 0.000018, LINK: 18.75, DOT: 6.20,
    MATIC: 0.25, UNI: 6.50, AAVE: 92.00, AVAX: 18.50,
  };

  const currencySymbols: { [key: string]: string } = {
    USD: '$', USDT: '₮', BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: 'BNB',
    XRP: 'XRP', ADA: '₳', DOGE: 'Ð', SHIB: 'SHIB', LINK: '⬡', DOT: 'DOT',
    MATIC: 'MATIC', UNI: 'UNI', AAVE: 'AAVE', AVAX: 'AVAX',
  };

  const convertAndFormat = (usdValue: number, minFractionDigits = 2) => {
    const rate = currencyRates[selectedCurrency] || 1;
    const value = usdValue / rate;
    const symbol = currencySymbols[selectedCurrency] || '$';

    if (selectedCurrency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: minFractionDigits, maximumFractionDigits: minFractionDigits }).format(value);
    } else if (selectedCurrency === 'USDT') {
      return `${symbol}${new Intl.NumberFormat('en-US', { minimumFractionDigits: minFractionDigits, maximumFractionDigits: minFractionDigits }).format(value)} USDT`;
    } else {
      return `${symbol} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: Math.max(minFractionDigits, 4), maximumFractionDigits: Math.max(minFractionDigits, 4) }).format(value)}`;
    }
  };

  useEffect(() => { localStorage.setItem('selectedCurrency', selectedCurrency); }, [selectedCurrency]);

  const [themeMode, setThemeMode] = useState<'dark' | 'bright' | 'dusty-blue'>(() => {
    return (localStorage.getItem('themeMode') as 'dark' | 'bright' | 'dusty-blue') || 'dark';
  });

  useEffect(() => { localStorage.setItem('themeMode', themeMode); }, [themeMode]);

  useEffect(() => { localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed)); }, [sidebarCollapsed]);

  useEffect(() => { localStorage.setItem('sidebarWidth', String(sidebarWidth)); }, [sidebarWidth]);

  useEffect(() => { localStorage.setItem('copilotCollapsed', String(copilotCollapsed)); }, [copilotCollapsed]);

  useEffect(() => { localStorage.setItem('copilotWidth', String(copilotWidth)); }, [copilotWidth]);

  useEffect(() => { setIsEmbedded(window.self !== window.top); }, []);

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(API_BASE + url, options);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return null;
      return await res.json();
    } catch (err) {
      console.warn(`Silently caught fetch error for ${url}:`, err);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mData, oData, sData, wData, gData] = await Promise.all([
          safeFetchJson('/api/metrics'),
          safeFetchJson('/api/opportunities'),
          safeFetchJson('/api/settings'),
          safeFetchJson('/api/wallet'),
          safeFetchJson('/api/governance/cards'),
        ]);

        if (mData) setMetrics(mData);
        if (oData) setOpportunities(Array.isArray(oData) ? oData : (oData.opportunities || []));
        if (sData) {
          const merged = { ...(sData.settings || sData), profitTransferMode: localProfitTransferMode };
          setSettings(merged);
        }
        if (wData) setWallet(wData);
        if (gData) setGovernanceCards(gData as GovernanceCardsPayload);

        // Surface a non-blocking warning when the backend is unreachable so
        // users are not silently shown empty/mock data.
        const allFailed = [mData, oData, sData, wData, gData].every(r => r === null);
        setBackendUnreachable(allFailed);
      } catch (err) {
        console.error('Error pooling real-time metrics:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      console.log('Received postMessage event:', data);

      if (data.type === 'ALLBRIGHT_AUTH_TOKEN') {
        const token = data.payload?.token;
        if (token) {
          setAuthToken(token);
          setMessageBanner({ type: 'success', text: `Connected to Allbright parent portal. Token: ${token.slice(0, 15)}...` });
          setTimeout(() => setMessageBanner(null), 6000);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExecuteTrade = async (oppId: string): Promise<boolean> => {
    setExecutingId(oppId);
    setMessageBanner(null);
    try {
      const response = await fetch(API_BASE + '/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: oppId }),
      });
      const resData = await response.json();
      if (!response.ok) {
        setMessageBanner({ type: 'error', text: resData.error || 'Execution reverted.' });
        setExecutingId(null);
        return false;
      }
      if (resData.trade?.status === 'SUCCESS') {
        setMessageBanner({ type: 'success', text: `Success! Profit: +${convertAndFormat(resData.trade.netProfitUsd)}` });
      }
      setExecutingId(null);
      setTimeout(() => setMessageBanner(null), 8000);
      return true;
    } catch (err) {
      setMessageBanner({ type: 'error', text: 'Network error.' });
      setExecutingId(null);
      return false;
    }
  };

  const handleUpdateSettings = async (updated: Partial<DashboardSettings>): Promise<boolean> => {
    try {
      if (updated.profitTransferMode) {
        setLocalProfitTransferMode(updated.profitTransferMode);
      }
      setSettings(prev => prev ? { ...prev, ...updated } : prev);

      const response = await fetch(API_BASE + '/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings({ ...data.settings, profitTransferMode: localProfitTransferMode });
        }
        return true;
      }
      console.warn('Settings update failed:', response.status);
      return false;
    } catch (err) {
      console.warn('Settings update error:', err);
      return false;
    }
  };

  const handleDeposit = async (amount: number, token: string): Promise<{ success: boolean; error?: string }> => {
    setIsWalletUpdating(true);
    try {
      const response = await fetch(API_BASE + '/api/wallet/deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, token }) });
      const data = await response.json();
      setIsWalletUpdating(false);
      if (response.ok) { setWallet(data.wallet); return { success: true }; }
      return { success: false, error: data.error };
    } catch (err) { setIsWalletUpdating(false); return { success: false, error: 'Network error.' }; }
  };

  const handleWithdraw = async (amount: number, token: string): Promise<{ success: boolean; error?: string }> => {
    setIsWalletUpdating(true);
    try {
      const response = await fetch(API_BASE + '/api/wallet/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, token }) });
      const data = await response.json();
      setIsWalletUpdating(false);
      if (response.ok) { setWallet(data.wallet); return { success: true }; }
      return { success: false, error: data.error };
    } catch (err) { setIsWalletUpdating(false); return { success: false, error: 'Network error.' }; }
  };

  const handleTransferProfit = async () => {
    setTransferringProfit(true);
    setMessageBanner(null);
    try {
      const response = await fetch(API_BASE + '/api/wallet/transfer-profit', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await response.json();
      if (response.ok) {
        setMessageBanner({ type: 'success', text: `Transferred ${convertAndFormat(data.transferredAmountUsdc)}` });
      } else {
        setMessageBanner({ type: 'error', text: data.error || 'Failed to transfer.' });
      }
    } catch (err) { setMessageBanner({ type: 'error', text: 'Network error.' }); }
    finally { setTransferringProfit(false); setTimeout(() => setMessageBanner(null), 8000); }
  };

  const handleKillSwitch = async () => {
    try {
      // Stop all trading operations (best-effort — ignore non-JSON responses)
      try {
        await fetch(API_BASE + '/api/system/kill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // Endpoint may not exist in simulation mode — ignore
      }

      // Clear all opportunities and reset executing state
      setOpportunities([]);
      setExecutingId(null);

      // Show confirmation banner
      setMessageBanner({
        type: 'error',
        text: '🛑 KILL SWITCH ACTIVATED: All operations halted. All positions closed.'
      });

      // Clear banner after 10 seconds
      setTimeout(() => setMessageBanner(null), 10000);
    } catch (err) {
      setMessageBanner({
        type: 'error',
        text: '⚠️ KILL SWITCH ERROR: Failed to halt operations. Manual intervention required!'
      });
      setTimeout(() => setMessageBanner(null), 10000);
    }
  };

  const getThemeBgClass = () => {
    switch (themeMode) {
      case 'bright': return 'bg-slate-100 text-slate-800';
      case 'dusty-blue': return 'bg-[#0f172a] text-slate-200';
      default: return 'bg-[#020617] text-slate-100';
    }
  };

  const totalBalanceActive = walletsList.filter(w => w.isActive).reduce((sum, w) => sum + w.balance, 0);
  const mergedWallet = wallet 
    ? { ...wallet, totalValueUsd: totalBalanceActive }
    : { connected: true, address: ENV_WALLET_ADDRESS, network: 'Arbitrum Mainnet', balances: {}, totalValueUsd: totalBalanceActive, transactions: [] };

  const defaultSettings: DashboardSettings = {
    minProfitThresholdPct: 0.15, maxGasFeeUsd: 120, slippagePct: 0.5, autoExecute: false,
    selectedNetwork: 'Arbitrum Mainnet', ownerWalletAddress: ENV_WALLET_ADDRESS, profitTargetUsd: 0,
    profitTargetAuto: true, growthRate: 1.2, growthRateAuto: true, riskMode: 'BALANCED',
    riskModeAuto: true, stability: 85, stabilityAuto: true, fleetCapacity: 'AUTO', fleetCapacityAuto: true,
    chainsSelection: 'AUTO', chainsSelectionAuto: true,
    accumulatedProfitsUsd: 0, profitTransferMinThresholdUsd: 100, profitTransferMode: 'MANUAL'
  };

  const effectiveSettings = (settings || defaultSettings) as DashboardSettings;
  const settingsWithLocalMode = { ...effectiveSettings, profitTransferMode: localProfitTransferMode };

  const targetSet = settings?.profitTargetUsd || 0;
  const totalNetProfit = metrics?.totalProfitUsd || 0;
  const targetPct = targetSet > 0 ? Math.round((totalNetProfit / targetSet) * 100) : 0;

  return (
    <ErrorBoundary>
      <div className={`flex min-h-screen font-sans ${getThemeBgClass()}`} id="app-root-container">
        <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isEmbedded={isEmbedded} 
        themeMode={themeMode}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        onKillSwitch={handleKillSwitch}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          wallet={wallet || { totalValueUsd: 0, address: '', network: '', balances: {}, transactions: [], connected: true }}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          copilotOpen={copilotOpen}
          onToggleCopilot={() => setCopilotOpen(!copilotOpen)}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
          convertAndFormat={convertAndFormat}
          targetPct={targetPct}
          targetGoalUsd={targetSet}
          targetProfitUsd={totalNetProfit}
        />

        <div className="flex-1 flex overflow-hidden min-h-0">
          <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] w-full mx-auto flex flex-col" id="app-main-content">
            <div className="flex-1">
              {backendUnreachable && (
                <div
                  id="backend-unreachable-banner"
                  className="mb-4 flex items-center space-x-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold">Backend unreachable.</span> Live data is unavailable — showing the last known or default state. Verify the API server is running and reachable.
                  </div>
                </div>
              )}
              {activeTab === 'dashboard' && (
                <DashboardView metrics={metrics} opportunities={opportunities} settings={settingsWithLocalMode} onExecuteTrade={handleExecuteTrade} executingId={executingId} messageBanner={messageBanner} themeMode={themeMode} onTransferProfit={handleTransferProfit} transferringProfit={transferringProfit} onUpdateSettings={handleUpdateSettings} convertAndFormat={convertAndFormat} />
              )}
              {activeTab === 'command' && (
                <CommanderView settings={settingsWithLocalMode} onUpdateSettings={handleUpdateSettings} convertAndFormat={convertAndFormat} themeMode={themeMode} />
              )}
              {activeTab === 'wallet' && (
                <WalletView wallet={wallet} settings={settingsWithLocalMode} isUpdating={isWalletUpdating} themeMode={themeMode} convertAndFormat={convertAndFormat} walletsList={walletsList} onUpdateWalletsList={setWalletsList} onUpdateSettings={handleUpdateSettings} />
              )}
              {activeTab === 'compliance' && (
                <ComplianceView governanceCards={governanceCards} themeMode={themeMode} />
              )}
            </div>

            <Footer themeMode={themeMode} backendUnreachable={backendUnreachable} />
          </main>

          <CopilotPanel 
            themeMode={themeMode} 
            isOpen={copilotOpen} 
            onClose={() => setCopilotOpen(false)}
            isCollapsed={copilotCollapsed}
            onToggleCollapse={() => setCopilotCollapsed(!copilotCollapsed)}
            width={copilotWidth}
            onWidthChange={setCopilotWidth}
          />
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
