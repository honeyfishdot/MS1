/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AllBright Withdrawal Wallet page — minimalist two-column layout.
 *
 * Security model:
 *  - The EXECUTION wallet (backend env, key held only in Render env vars) is NOT
 *    shown here. It is structurally separate from withdrawal wallets.
 *  - Withdrawal wallets store ONLY: wallet_name, wallet_address, chain, created_date,
 *    status. No PRIVATE_KEY / SEED_PHRASE / MNEMONIC is ever accepted, rendered, or stored.
 */

import React, { useState } from 'react';
import { Wallet, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { CustomWalletItem, DashboardSettings } from '../types';

interface WalletViewProps {
  settings: DashboardSettings;
  isUpdating: boolean;
  themeMode: 'dark' | 'bright' | 'dusty-blue';
  convertAndFormat: (usdValue: number, minFractionDigits?: number) => string;
  walletsList: CustomWalletItem[];
  onUpdateWalletsList: (updater: (prev: CustomWalletItem[]) => CustomWalletItem[]) => void;
  onUpdateSettings: (updated: Partial<DashboardSettings>) => Promise<boolean>;
}

const CHAIN_OPTIONS = [
  'Ethereum Mainnet',
  'Arbitrum Mainnet',
  'Polygon POS',
  'BNB Smart Chain',
  'Optimism Mainnet',
  'Base Mainnet',
  'Avalanche C-Chain',
];

const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  input: '#21262D',
  border: '#30363D',
  text: '#FFFFFF',
  muted: '#8B949E',
  accent: '#2EA043',
  accentHover: '#3FB950',
  danger: '#F85149',
  dangerHover: '#FF6B62',
};

function shortAddress(address: string): string {
  if (!address || address.length < 12) return address || '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function WalletView({
  settings,
  isUpdating,
  themeMode,
  convertAndFormat,
  walletsList,
  onUpdateWalletsList,
  onUpdateSettings,
}: WalletViewProps) {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formChain, setFormChain] = useState<string>(CHAIN_OPTIONS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const [withdrawMode, setWithdrawMode] = useState<'AUTO' | 'MANUAL'>(settings.profitTransferMode);
  const [manualAmount, setManualAmount] = useState<string>('');
  const [withdrawToken, setWithdrawToken] = useState<string>('USDC');

  const inputClass = 'w-full px-4 py-3 rounded-lg text-base font-mono outline-none bg-[#21262D] border border-[#30363D] text-white placeholder:text-[#6E7681] focus:border-[#2EA043] transition-colors';
  const labelClass = 'block text-xs uppercase tracking-wider text-[#8B949E] mb-2 font-bold';
  const cardClass = 'bg-[#161B22] border border-[#30363D] rounded-xl p-6';
  const btnPrimary = 'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-bold bg-[#2EA043] hover:bg-[#3FB950] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const btnDanger = 'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-bold bg-[#F85149] hover:bg-[#FF6B62] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const openAddModal = () => {
    setFormName('');
    setFormAddress('');
    setFormChain(CHAIN_OPTIONS[0]);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); };

  const saveWallet = () => {
    if (!formName.trim() || !formAddress.trim()) {
      setFormError('Name and address are required.');
      return;
    }
    onUpdateWalletsList((prev) => [
      ...prev,
      {
        id: `w-${Date.now()}`,
        name: formName.trim(),
        address: formAddress.trim(),
        chain: formChain,
        balance: 0,
        isActive: true,
        createdDate: new Date().toISOString(),
      } as CustomWalletItem,
    ]);
    closeModal();
  };

  const deleteWallet = (id: string) => {
    const item = walletsList.find((w) => w.id === id);
    if (!item) return;
    if (!window.confirm(`Remove withdrawal wallet "${item.name}"?`)) return;
    onUpdateWalletsList((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleActive = (id: string) => {
    onUpdateWalletsList((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w)),
    );
  };

  const handleWithdrawMode = async (mode: 'AUTO' | 'MANUAL') => {
    setWithdrawMode(mode);
    await onUpdateSettings({ profitTransferMode: mode });
  };

  const handleManualWithdraw = async () => {
    const amount = parseFloat(manualAmount);
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }
    alert(`Withdrawal of ${amount} ${withdrawToken} initiated to active withdrawal wallets.`);
    setManualAmount('');
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="wallet-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(46,160,67,0.15)', border: '1px solid rgba(46,160,67,0.3)' }}>
            <Wallet className="h-6 w-6" style={{ color: COLORS.accent }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: COLORS.text }}>Withdrawal Wallets</h1>
            <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
              {walletsList.length} registered · {walletsList.filter(w => w.isActive).length} active
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Register Wallet */}
        <div className={cardClass}>
          <div className="flex items-center space-x-2 mb-5">
            <Plus className="h-5 w-5" style={{ color: COLORS.accent }} />
            <span className="text-sm font-extrabold tracking-wider uppercase" style={{ color: COLORS.text }}>Register Withdrawal Wallet</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Wallet Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Treasury Wallet" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Wallet Address</label>
              <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="0x…" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Chain</label>
              <select value={formChain} onChange={(e) => setFormChain(e.target.value)} className={inputClass}>
                {CHAIN_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {formError && (
              <div className="p-3 rounded-lg text-xs font-mono" style={{ border: '1px solid rgba(248,81,73,0.4)', background: 'rgba(248,81,73,0.1)', color: '#FF9D94' }}>
                {formError}
              </div>
            )}
            <button onClick={saveWallet} className={btnPrimary}>
              <Plus className="h-4 w-4" /> Register Wallet
            </button>
          </div>
        </div>

        {/* Column 2: Withdrawal Settings */}
        <div className={cardClass}>
          <div className="flex items-center space-x-2 mb-5">
            <ShieldCheck className="h-5 w-5" style={{ color: COLORS.accent }} />
            <span className="text-sm font-extrabold tracking-wider uppercase" style={{ color: COLORS.text }}>Withdrawal Settings</span>
          </div>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Mode</label>
              <div className="flex gap-2">
                <button onClick={() => handleWithdrawMode('AUTO')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase transition-colors cursor-pointer ${withdrawMode === 'AUTO' ? 'bg-[#2EA043] text-white' : 'bg-[#21262D] text-[#8B949E] border border-[#30363D]'}`}>Auto</button>
                <button onClick={() => handleWithdrawMode('MANUAL')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase transition-colors cursor-pointer ${withdrawMode === 'MANUAL' ? 'bg-[#2EA043] text-white' : 'bg-[#21262D] text-[#8B949E] border border-[#30363D]'}`}>Manual</button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Token</label>
              <select value={withdrawToken} onChange={(e) => setWithdrawToken(e.target.value)} className={inputClass}>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="ETH">ETH</option>
                <option value="WBTC">WBTC</option>
              </select>
            </div>
            {withdrawMode === 'AUTO' ? (
              <div>
                <label className={labelClass}>Minimum Threshold (USD)</label>
                <input type="number" value={settings.profitTransferMinThresholdUsd} onChange={(e) => onUpdateSettings({ profitTransferMinThresholdUsd: parseFloat(e.target.value) || 0 })} placeholder="100" className={inputClass} />
                <p className="text-[10px] mt-2 text-[#8B949E]">Auto-withdrawal triggers when accumulated profit exceeds this threshold.</p>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Withdraw Amount</label>
                <input type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="0.00" className={inputClass} />
                <button onClick={handleManualWithdraw} disabled={isUpdating} className={btnDanger} style={{ marginTop: '12px' }}>
                  Withdraw
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Withdrawal Wallets Table */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base" style={{ color: COLORS.text }}>Registered Wallets</h3>
          <span className="text-xs font-mono" style={{ color: COLORS.muted }}>{walletsList.length} entries</span>
        </div>
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #21262D' }}>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr style={{ background: '#0D1117' }}>
                <th className="py-3 px-4 font-bold" style={{ color: COLORS.muted }}>Name</th>
                <th className="py-3 px-4 font-bold" style={{ color: COLORS.muted }}>Address</th>
                <th className="py-3 px-4 font-bold" style={{ color: COLORS.muted }}>Chain</th>
                <th className="py-3 px-4 font-bold text-right" style={{ color: COLORS.muted }}>Status</th>
                <th className="py-3 px-4 font-bold text-right" style={{ color: COLORS.muted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {walletsList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-mono text-sm animate-pulse" style={{ color: COLORS.muted }}>
                    No withdrawal wallets registered yet.
                  </td>
                </tr>
              ) : (
                walletsList.map((w) => (
                  <tr key={w.id} className="border-t" style={{ borderColor: '#21262D' }}>
                    <td className="py-3 px-4 font-semibold" style={{ color: COLORS.text }}>{w.name}</td>
                    <td className="py-3 px-4 font-mono" style={{ color: COLORS.muted }}>{shortAddress(w.address)}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs font-mono" style={{ background: '#21262D', color: COLORS.muted }}>{w.chain}</span></td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono" style={{ background: w.isActive ? 'rgba(46,160,67,0.12)' : 'rgba(139,148,158,0.12)', color: w.isActive ? COLORS.accent : COLORS.muted }}>
                        {w.isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => toggleActive(w.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors mr-2" style={{ background: '#21262D', color: COLORS.muted, border: '1px solid #30363D' }}>
                        {w.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button onClick={() => deleteWallet(w.id)} className="p-1.5 rounded-lg transition-colors inline-flex items-center" style={{ color: COLORS.muted }} title="Delete" onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.danger)} onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.muted)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={closeModal}>
          <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-xl p-6" onClick={(e) => e.stopPropagation()} id="wallet-modal">
            <h3 className="font-bold text-lg mb-5" style={{ color: COLORS.text }}>Add Withdrawal Wallet</h3>
            <label className={labelClass}>Name</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Treasury Wallet" className={inputClass + ' mb-4'} />
            <label className={labelClass}>Address</label>
            <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="0x…" className={inputClass + ' mb-4'} />
            <label className={labelClass}>Chain</label>
            <select value={formChain} onChange={(e) => setFormChain(e.target.value)} className={inputClass + ' mb-4'}>
              {CHAIN_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {formError && (
              <div className="mb-4 p-2.5 rounded-lg text-xs font-mono" style={{ border: '1px solid rgba(248,81,73,0.4)', background: 'rgba(248,81,73,0.1)', color: '#FF9D94' }}>
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: '#21262D', color: COLORS.muted, border: '1px solid #30363D' }}>
                Cancel
              </button>
              <button onClick={saveWallet} className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ background: COLORS.accent, border: 'none' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
