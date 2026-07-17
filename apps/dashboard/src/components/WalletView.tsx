/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { WalletState, DashboardSettings, CustomWalletItem } from '../types';

interface WalletViewProps {
  wallet: WalletState | null;
  settings: DashboardSettings;
  onDeposit: (amount: number, token: string) => Promise<{ success: boolean; error?: string }>;
  onWithdraw: (amount: number, token: string) => Promise<{ success: boolean; error?: string }>;
  onTransferProfit: () => Promise<void>;
  transferringProfit: boolean;
  isUpdating: boolean;
  themeMode: 'dark' | 'bright' | 'dusty-blue';
  convertAndFormat: (usdValue: number, minFractionDigits?: number) => string;
  walletsList: CustomWalletItem[];
  onUpdateWalletsList: (updater: (prev: CustomWalletItem[]) => CustomWalletItem[]) => void;
  onUpdateSettings: (updated: Partial<DashboardSettings>) => Promise<boolean>;
}

type SortField = 'name' | 'address' | 'chain' | 'balance';
type SortOrder = 'asc' | 'desc';

const CHAIN_OPTIONS = [
  'Ethereum Mainnet',
  'Arbitrum Mainnet',
  'Polygon POS',
  'BNB Smart Chain',
  'Optimism Mainnet',
  'Base Mainnet',
  'Avalanche C-Chain',
];

function shortAddress(address: string): string {
  if (!address || address.length < 12) return address || '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function WalletView({
  wallet,
  settings,
  onDeposit,
  onWithdraw,
  onTransferProfit,
  transferringProfit,
  isUpdating,
  themeMode,
  convertAndFormat,
  walletsList,
  onUpdateWalletsList,
  onUpdateSettings,
}: WalletViewProps) {
  const [sortField, setSortField] = useState<SortField>('balance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showKeys, setShowKeys] = useState<boolean>(false);
  const [revealId, setRevealId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formChain, setFormChain] = useState<string>(CHAIN_OPTIONS[0]);
  const [formBalance, setFormBalance] = useState<string>('');

  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositToken, setDepositToken] = useState<string>('USDC');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawToken, setWithdrawToken] = useState<string>('USDC');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const getThemeStyles = () => {
    switch (themeMode) {
      case 'bright':
        return {
          card: 'bg-white border border-slate-200 rounded-2xl p-4 shadow-sm',
          textMuted: 'text-slate-500',
          textWhite: 'text-slate-900',
          inputBg: 'bg-slate-100 border border-slate-200 text-slate-900 focus:border-teal-500',
          tableBg: 'bg-white border border-slate-200 rounded-2xl overflow-hidden',
          tableHeader: 'bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]',
          tableRow: 'border-b border-slate-100 hover:bg-slate-50/50',
          btnSecondary: 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700',
          btnPrimary: 'bg-teal-600 hover:bg-teal-700 text-white',
          badgeMuted: 'bg-slate-100 text-slate-600',
        };
      case 'dusty-blue':
        return {
          card: 'bg-[#1b283d] border border-[#2b3b54] rounded-2xl p-4',
          textMuted: 'text-slate-300',
          textWhite: 'text-white',
          inputBg: 'bg-[#121c2b] border border-[#2b3b54] text-white focus:border-teal-400',
          tableBg: 'bg-[#131d2c] border border-[#2b3b54] rounded-2xl overflow-hidden',
          tableHeader: 'bg-[#1e2e47] text-sky-200 font-bold border-b border-[#2b3b54] uppercase tracking-wider text-[10px]',
          tableRow: 'border-b border-[#25354e]/50 hover:bg-[#1a293f]',
          btnSecondary: 'bg-[#24324a] hover:bg-[#2d3e5c] border border-[#314363] text-sky-200',
          btnPrimary: 'bg-gradient-to-r from-teal-500 to-teal-600 text-slate-950 font-bold',
          badgeMuted: 'bg-[#131b27] text-sky-200',
        };
      case 'dark':
      default:
        return {
          card: 'bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4',
          textMuted: 'text-slate-400',
          textWhite: 'text-white',
          inputBg: 'bg-slate-950 border border-slate-800 text-white focus:border-teal-500',
          tableBg: 'bg-slate-950/40 border border-slate-800/80 rounded-2xl overflow-hidden',
          tableHeader: 'bg-slate-950 text-slate-300 font-bold border-b border-slate-800/60 uppercase tracking-wider text-[10px]',
          tableRow: 'border-b border-slate-800/30 hover:bg-slate-800/20',
          btnSecondary: 'bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300',
          btnPrimary: 'bg-teal-500 hover:bg-teal-600 text-slate-950 font-extrabold',
          badgeMuted: 'bg-slate-800 text-slate-300',
        };
    }
  };

  const styles = getThemeStyles();

  const sortedWallets = [...walletsList].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') comparison = a.name.localeCompare(b.name);
    else if (sortField === 'address') comparison = a.address.localeCompare(b.address);
    else if (sortField === 'chain') comparison = a.chain.localeCompare(b.chain);
    else if (sortField === 'balance') comparison = a.balance - b.balance;
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const totalTrackedUsd = walletsList.reduce((sum, w) => sum + (w.balance || 0), 0);
  const activeCount = walletsList.filter((w) => w.isActive).length;

  const openAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormAddress('');
    setFormChain(CHAIN_OPTIONS[0]);
    setFormBalance('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: CustomWalletItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormAddress(item.address);
    setFormChain(item.chain);
    setFormBalance(String(item.balance));
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const saveWallet = () => {
    if (!formName.trim() || !formAddress.trim()) {
      setFormError('Name and address are required.');
      return;
    }
    const balance = parseFloat(formBalance) || 0;
    if (editingId) {
      onUpdateWalletsList((prev) =>
        prev.map((w) => (w.id === editingId ? { ...w, name: formName.trim(), address: formAddress.trim(), chain: formChain, balance } : w)),
      );
    } else {
      const newItem: CustomWalletItem = {
        id: `w-${Date.now()}`,
        name: formName.trim(),
        address: formAddress.trim(),
        // Private keys are never stored from UI input nor displayed in plaintext.
        privateKey: 'REDACTED',
        chain: formChain,
        balance,
        isActive: true,
      };
      onUpdateWalletsList((prev) => [...prev, newItem]);
    }
    closeModal();
  };

  const deleteWallet = (id: string) => {
    const item = walletsList.find((w) => w.id === id);
    if (!item) return;
    if (!window.confirm(`Remove "${item.name}"?`)) return;
    onUpdateWalletsList((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleActive = (id: string) => {
    onUpdateWalletsList((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w)),
    );
  };

  const handleTransferMode = async (mode: 'AUTO' | 'MANUAL') => {
    setActionError(null);
    await onUpdateSettings({ profitTransferMode: mode });
  };

  const handleDepositSubmit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      setActionError('Enter a valid deposit amount.');
      return;
    }
    setActionError(null);
    const res = await onDeposit(amount, depositToken);
    if (!res.success) setActionError(res.error || 'Deposit failed.');
    else setDepositAmount('');
  };

  const handleWithdrawSubmit = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setActionError('Enter a valid withdraw amount.');
      return;
    }
    setActionError(null);
    const res = await onWithdraw(amount, withdrawToken);
    if (!res.success) setActionError(res.error || 'Withdrawal failed.');
    else setWithdrawAmount('');
  };

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="space-y-6 animate-fadeIn" id="wallet-view">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-teal-500/15 rounded-xl text-teal-400 border border-teal-500/30">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className={`text-xl font-sans font-extrabold tracking-tight ${styles.textWhite}`}>Wallet Manager</h1>
            <p className={`text-xs ${styles.textMuted} mt-0.5`}>
              {walletsList.length} tracked · {activeCount} active · {convertAndFormat(totalTrackedUsd)} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeys((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all ${styles.btnSecondary}`}
            title={showKeys ? 'Hide key status' : 'Show key status'}
          >
            {showKeys ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showKeys ? 'Hide Keys' : 'Show Keys'}
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-teal-500 hover:bg-teal-600 text-slate-950 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Wallet
          </button>
        </div>
      </div>

      {/* Profit Transfer Controls */}
      <div className={styles.card} id="profit-transfer-controls">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Send className="h-4 w-4 text-teal-400" />
            <span className={`text-xs font-extrabold tracking-wide uppercase ${styles.textWhite}`}>Profit Transfer</span>
            <span className="text-[10px] font-mono text-slate-500">
              min {convertAndFormat(settings.profitTransferMinThresholdUsd)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTransferMode('AUTO')}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                settings.profitTransferMode === 'AUTO'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/50'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => handleTransferMode('MANUAL')}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                settings.profitTransferMode === 'MANUAL'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/50'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => onTransferProfit()}
              disabled={transferringProfit}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                transferringProfit
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-teal-500 hover:bg-teal-600 text-slate-950 cursor-pointer'
              }`}
            >
              {transferringProfit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {transferringProfit ? 'Transferring…' : 'Transfer Profit'}
            </button>
          </div>
        </div>
        <p className={`text-[10px] ${styles.textMuted} mt-2`}>
          Transfers sweep accumulated profits above the configured minimum threshold to the owner wallet. Keys remain REDACTED and are never shown.
        </p>
      </div>

      {/* Deposit / Withdraw */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={styles.card}>
          <div className="flex items-center space-x-2 mb-3">
            <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
            <span className={`text-xs font-extrabold tracking-wide uppercase ${styles.textWhite}`}>Deposit</span>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={`text-[10px] uppercase tracking-wider ${styles.textMuted}`}>Amount</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1 px-3 py-2 rounded-xl ${styles.inputBg} text-sm font-mono outline-none"
              />
            </div>
            <select
              value={depositToken}
              onChange={(e) => setDepositToken(e.target.value)}
              className="px-3 py-2 rounded-xl ${styles.inputBg} text-sm font-mono outline-none"
            >
              {['USDC', 'USDT', 'ETH', 'WBTC'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={handleDepositSubmit}
              disabled={isUpdating}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                isUpdating ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
              }`}
            >
              Deposit
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className="flex items-center space-x-2 mb-3">
            <ArrowUpFromLine className="h-4 w-4 text-rose-400" />
            <span className={`text-xs font-extrabold tracking-wide uppercase ${styles.textWhite}`}>Withdraw</span>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={`text-[10px] uppercase tracking-wider ${styles.textMuted}`}>Amount</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1 px-3 py-2 rounded-xl ${styles.inputBg} text-sm font-mono outline-none"
              />
            </div>
            <select
              value={withdrawToken}
              onChange={(e) => setWithdrawToken(e.target.value)}
              className="px-3 py-2 rounded-xl ${styles.inputBg} text-sm font-mono outline-none"
            >
              {['USDC', 'USDT', 'ETH', 'WBTC'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={handleWithdrawSubmit}
              disabled={isUpdating}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                isUpdating ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 text-slate-950'
              }`}
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono">
          {actionError}
        </div>
      )}

      {/* Wallets Table */}
      <div className={styles.tableBg} id="wallets-table">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-sans font-bold text-base ${styles.textWhite}`}>Tracked Wallets</h3>
          <span className="text-[10px] font-mono text-slate-500">{walletsList.length} entries</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/15">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className={styles.tableHeader}>
                <th onClick={() => handleSort('name')} className="py-2.5 px-3 font-bold cursor-pointer hover:text-white select-none">
                  Name{sortIndicator('name')}
                </th>
                <th onClick={() => handleSort('address')} className="py-2.5 px-3 font-bold cursor-pointer hover:text-white select-none">
                  Address{sortIndicator('address')}
                </th>
                <th onClick={() => handleSort('chain')} className="py-2.5 px-3 font-bold cursor-pointer hover:text-white select-none">
                  Chain{sortIndicator('chain')}
                </th>
                <th onClick={() => handleSort('balance')} className="py-2.5 px-3 font-bold cursor-pointer hover:text-white select-none">
                  Balance{sortIndicator('balance')}
                </th>
                <th className="py-2.5 px-3 font-bold">Key</th>
                <th className="py-2.5 px-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {sortedWallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs animate-pulse">
                    No wallets yet. Click “Add Wallet” to get started.
                  </td>
                </tr>
              ) : (
                sortedWallets.map((w) => (
                  <tr key={w.id} className={styles.tableRow}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono ${styles.textMuted}`}>
                          {w.isActive ? '●' : '○'}
                        </span>
                        <span className={`font-semibold ${styles.textWhite}`}>{w.name}</span>
                      </div>
                    </td>
                    <td className={`py-2.5 px-3 font-mono ${styles.textMuted}`}>{shortAddress(w.address)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${styles.badgeMuted}`}>{w.chain}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{convertAndFormat(w.balance)}</td>
                    <td className="py-2.5 px-3">
                      {showKeys ? (
                        <button
                          onClick={() => setRevealId(revealId === w.id ? null : w.id)}
                          className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-teal-400 transition-all"
                          title="Reveal key status"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {revealId === w.id ? w.privateKey : 'REDACTED'}
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-600">••••••••</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleActive(w.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${styles.btnSecondary}`}
                          title={w.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {w.isActive ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => openEditModal(w)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800/40 transition-all"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteWallet(w.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/40 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className={`${styles.card} w-full max-w-md`}
            onClick={(e) => e.stopPropagation()}
            id="wallet-modal"
          >
            <h3 className={`font-sans font-bold text-base ${styles.textWhite} mb-4`}>
              {editingId ? 'Edit Wallet' : 'Add Wallet'}
            </h3>

            <label className={`text-[10px] uppercase tracking-wider ${styles.textMuted}`}>Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Commander Wallet"
              className={`w-full mt-1 mb-3 px-3 py-2 rounded-xl ${styles.inputBg} text-sm font-mono outline-none`}
            />

            <label className={`text-[10px] uppercase tracking-wider ${styles.textMuted}`}>Address</label>
            <input
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="0x…"
              className="w-full mt-1 mb-3 px-3 py-2 rounded-xl ${styles.inputBg} text-sm font-mono outline-none"
            />

            <label className={`text-[10px] uppercase tracking-wider ${styles.textMuted}`}>Chain</label>
            <select
              value={formChain}
              onChange={(e) => setFormChain(e.target.value)}
              className={`w-full mt-1 mb-3 px-3 py-2 rounded-xl ${styles.inputBg} text-sm font-mono outline-none`}
            >
              {CHAIN_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label className={`text-[10px] uppercase tracking-wider ${styles.textMuted}`}>Balance (USD)</label>
            <input
              type="number"
              value={formBalance}
              onChange={(e) => setFormBalance(e.target.value)}
              placeholder="0.00"
              className="w-full mt-1 mb-3 px-3 py-2 rounded-xl ${styles.inputBg} text-sm font-mono outline-none"
            />

            {formError && (
              <div className="mb-3 p-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[11px] font-mono">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button onClick={closeModal} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${styles.btnSecondary}`}>
                Cancel
              </button>
              <button
                onClick={saveWallet}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-teal-500 hover:bg-teal-600 text-slate-950"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
