/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, Wallet, Sun, Moon, Droplet, Sparkles, Target } from 'lucide-react';
import { WalletState } from '../types';

interface HeaderProps {
  wallet: WalletState;
  themeMode: 'dark' | 'bright' | 'dusty-blue';
  onThemeChange: (theme: 'dark' | 'bright' | 'dusty-blue') => void;
  copilotOpen: boolean;
  onToggleCopilot: () => void;
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  convertAndFormat: (usdValue: number, minFractionDigits?: number) => string;
  // Target metric
  targetPct: number;
  targetGoalUsd: number;
  targetProfitUsd: number;
}

export default function Header({
  wallet,
  themeMode,
  onThemeChange,
  copilotOpen,
  onToggleCopilot,
  selectedCurrency,
  onCurrencyChange,
  convertAndFormat,
  targetPct,
  targetGoalUsd,
  targetProfitUsd,
}: HeaderProps) {
  const getThemeClasses = () => {
    switch (themeMode) {
      case 'bright':
        return {
          header: 'border-b border-slate-300 bg-white text-slate-800',
          border: 'border-slate-300',
          selectBg: 'bg-slate-100 border border-slate-300 text-slate-700',
          optionClass: 'bg-white text-slate-800',
          targetBg: 'bg-slate-100 border-slate-300',
          targetText: 'text-slate-700',
        };
      case 'dusty-blue':
        return {
          header: 'border-b border-[#475569] bg-[#1e293b] text-white',
          border: 'border-[#475569]',
          selectBg: 'bg-[#334155] border border-[#475569] text-sky-200',
          optionClass: 'bg-[#1e293b] text-sky-200',
          targetBg: 'bg-[#334155] border-[#475569]',
          targetText: 'text-sky-100',
        };
      case 'dark':
      default:
        return {
          header: 'border-b border-slate-700 bg-slate-900 text-white',
          border: 'border-slate-700',
          selectBg: 'bg-slate-800 border border-slate-700 text-slate-300',
          optionClass: 'bg-slate-900 text-slate-300',
          targetBg: 'bg-slate-800 border-slate-700',
          targetText: 'text-slate-200',
        };
    }
  };

  const styles = getThemeClasses();

  return (
    <header
      className={`h-16 flex items-center justify-between px-6 shrink-0 z-20 ${styles.header}`}
      id="app-header"
    >
      {/* Left: Branding + Target Metric */}
      <div className="flex items-center space-x-4 shrink-0">
        <div className="flex items-center space-x-3">
          <h2 className="text-xs font-sans font-extrabold tracking-wider text-teal-400 uppercase whitespace-nowrap">
            AllBright V01
          </h2>
          <div className="flex items-center space-x-1.5 text-[8px] text-teal-400 font-mono font-bold px-2 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/20 whitespace-nowrap">
            <Activity className="h-2.5 w-2.5 text-teal-400 animate-pulse" />
            <span className="tracking-wider uppercase">140M/1ms/2026</span>
          </div>
        </div>

        {/* Target Metric */}
        <div className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${styles.targetBg}`}>
          <Target className="h-3.5 w-3.5 text-teal-400" />
          <div className="flex items-center space-x-3 text-[10px] font-mono">
            <span className={`font-bold ${styles.targetText}`}>
              Target: <span className="text-teal-400">{targetPct}%</span>
            </span>
            <span className={`${styles.targetText}`}>
              Goal: {convertAndFormat(targetGoalUsd)}
            </span>
            <span className={`${styles.targetText}`}>
              Profit: {convertAndFormat(targetProfitUsd)}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center space-x-3">
        {/* Theme Toggle */}
        <div
          className={`flex items-center p-1 rounded-xl space-x-1 ${styles.selectBg}`}
          id="theme-controls"
        >
          <button
            id="theme-btn-bright"
            onClick={() => onThemeChange('bright')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              themeMode === 'bright'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Bright Theme"
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            id="theme-btn-dark"
            onClick={() => onThemeChange('dark')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              themeMode === 'dark'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Dark Theme"
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
          <button
            id="theme-btn-dusty"
            onClick={() => onThemeChange('dusty-blue')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              themeMode === 'dusty-blue'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Dusty Blue Theme"
          >
            <Droplet className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Currency Selector */}
        <div
          className={`flex items-center rounded-xl px-3 py-1.5 ${styles.selectBg}`}
          id="currency-selector-container"
        >
          <select
            id="currency-selector"
            value={selectedCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="USD" className={styles.optionClass}>USD ($)</option>
            <option value="USDT" className={styles.optionClass}>USDT (₮)</option>
            <option value="BTC" className={styles.optionClass}>BTC (₿)</option>
            <option value="ETH" className={styles.optionClass}>ETH (Ξ)</option>
            <option value="SOL" className={styles.optionClass}>SOL (◎)</option>
            <option value="BNB" className={styles.optionClass}>BNB</option>
            <option value="XRP" className={styles.optionClass}>XRP</option>
            <option value="ADA" className={styles.optionClass}>ADA (₳)</option>
            <option value="DOGE" className={styles.optionClass}>DOGE (Ð)</option>
            <option value="LINK" className={styles.optionClass}>LINK</option>
            <option value="DOT" className={styles.optionClass}>DOT</option>
            <option value="SHIB" className={styles.optionClass}>SHIB</option>
            <option value="MATIC" className={styles.optionClass}>MATIC</option>
            <option value="UNI" className={styles.optionClass}>UNI</option>
            <option value="AAVE" className={styles.optionClass}>AAVE</option>
            <option value="AVAX" className={styles.optionClass}>AVAX</option>
          </select>
        </div>

        {/* Wallet Balance */}
        <div
          className={`flex items-center rounded-xl px-3 py-1.5 space-x-2 bg-teal-950/20 border ${styles.border}`}
          id="wallet-balance-indicator"
        >
          <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          <Wallet className="h-3.5 w-3.5 text-teal-400" />
          <div className="flex flex-col items-start leading-none space-y-0.5">
            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500">
              Aggregate
            </span>
            <span className="text-xs font-mono font-bold text-teal-300">
              {convertAndFormat(wallet.totalValueUsd)}
            </span>
          </div>
        </div>

        {/* Copilot Toggle */}
        <button
          id="toggle-copilot-panel"
          onClick={onToggleCopilot}
          className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            copilotOpen
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-slate-950 shadow-md font-extrabold'
              : 'bg-slate-950/45 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Copilot"
        >
          <Sparkles
            className={`h-3.5 w-3.5 ${
              copilotOpen ? 'text-slate-950' : 'text-teal-400 animate-pulse'
            }`}
          />
          <span>Copilot</span>
        </button>
      </div>
    </header>
  );
}
