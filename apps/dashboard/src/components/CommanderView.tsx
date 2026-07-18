/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE || '';
import { Gauge, SlidersHorizontal, Target, Sparkles, Zap, ShieldAlert, Activity, Anchor, Cpu, Layers } from 'lucide-react';
import { DashboardSettings } from '../types';

interface CommanderViewProps {
  settings: DashboardSettings;
  onUpdateSettings: (updated: Partial<DashboardSettings>) => Promise<boolean>;
  convertAndFormat: (usdValue: number, minimumFractionDigits?: number) => string;
  themeMode: 'dark' | 'bright' | 'dusty-blue';
}

export default function CommanderView({ settings, onUpdateSettings, convertAndFormat, themeMode }: CommanderViewProps) {
  const [pipelineToggles, setPipelineToggles] = useState({ preflight: 'auto', simulation: 'auto', live: 'manual' });
  const [deployState, setDeployState] = useState<'idle' | 'deploying' | 'success'>('idle');
  const [deployProgress, setDeployProgress] = useState(0);
  const [deployTxHash, setDeployTxHash] = useState('');
  const [backendMode, setBackendMode] = useState<string>('paper');
  const [deployMode, setDeployMode] = useState<'manual' | 'autonomous'>('manual');
  const [preflightPassed, setPreflightPassed] = useState<boolean | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [pendingStage, setPendingStage] = useState<string | null>(null);

  const formatCurrency = (val: number, minimumFractionDigits = 2) => convertAndFormat(val, minimumFractionDigits);

  const getThemeStyles = () => {
    switch (themeMode) {
      case 'bright':
        return { card: 'bg-white border border-slate-300 p-6 rounded-2xl shadow-sm', textWhite: 'text-slate-900', textMuted: 'text-slate-500', inputBg: 'bg-slate-100 border border-slate-300 text-slate-900 focus:border-teal-500', border: 'border-slate-300', containerBg: 'space-y-6 max-w-7xl mx-auto p-6 animate-fadeIn', innerCard: 'bg-slate-50 border border-slate-300 rounded-xl p-4 flex flex-col justify-between', tableBg: 'bg-white border border-slate-300 rounded-xl overflow-hidden', tableHeader: 'bg-slate-50 text-slate-600 font-bold border-b border-slate-300', tableRow: 'border-b border-slate-200 hover:bg-slate-50/50', btnPrimary: 'bg-teal-600 hover:bg-teal-700 text-white', btnSecondary: 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700', dropzone: 'border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/50' };
      case 'dusty-blue':
        return { card: 'bg-[#1e293b] border border-[#475569] p-6 rounded-2xl', textWhite: 'text-white', textMuted: 'text-slate-300', inputBg: 'bg-[#334155] border border-[#475569] text-white focus:border-teal-400', border: 'border-[#475569]', containerBg: 'space-y-6 max-w-7xl mx-auto p-6 animate-fadeIn', innerCard: 'bg-[#334155] border border-[#475569] rounded-xl p-4 flex flex-col justify-between', tableBg: 'bg-[#1e293b] border border-[#475569] rounded-xl overflow-hidden', tableHeader: 'bg-[#334155] text-sky-200 font-bold border-b border-[#475569]', tableRow: 'border-b border-[#475569]/50 hover:bg-[#334155]/50', btnPrimary: 'bg-gradient-to-r from-teal-500 to-teal-600 text-slate-950 font-bold', btnSecondary: 'bg-[#334155] hover:bg-[#475569] border border-[#475569] text-sky-200', dropzone: 'border-2 border-dashed border-[#475569] hover:border-teal-400 bg-[#1e293b]/40' };
      case 'dark':
      default:
        return { card: 'bg-slate-900 border border-slate-700 p-6 rounded-2xl', textWhite: 'text-white', textMuted: 'text-slate-400', inputBg: 'bg-slate-800 border border-slate-700 text-white focus:border-teal-500', border: 'border-slate-700', containerBg: 'space-y-6 max-w-7xl mx-auto p-6 animate-fadeIn', innerCard: 'bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between', tableBg: 'bg-slate-900 border border-slate-700 rounded-xl overflow-hidden', tableHeader: 'bg-slate-800 text-slate-300 font-bold border-b border-slate-700', tableRow: 'border-b border-slate-700/50 hover:bg-slate-800/50', btnPrimary: 'bg-teal-500 hover:bg-teal-600 text-slate-950 font-extrabold', btnSecondary: 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300', dropzone: 'border-2 border-dashed border-slate-700 hover:border-teal-500 bg-slate-900/20' };
    }
  };
  const styles = getThemeStyles();

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const [pf, sim, dep] = await Promise.all([
          fetch(API_BASE + '/api/preflight/status').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(API_BASE + '/api/simulation/status').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(API_BASE + '/api/deploy/status').then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (pf) setPreflightPassed(pf.passed);
        if (sim) setSimRunning(sim.running);
        if (dep) {
          if (dep.backend_mode) setBackendMode(dep.backend_mode);
          if (dep.awaiting_approval) {
            setAwaitingApproval(true);
            setPendingStage(dep.pending_stage || 'next stage');
          } else {
            setAwaitingApproval(false);
            setPendingStage(null);
          }
          if (dep.stage && dep.stage !== 'idle') { setDeployState('success'); setDeployTxHash(dep.txHash); }
        }
      } catch (e) {}
    };
    fetchPipeline();
    const iv = setInterval(fetchPipeline, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className={styles.containerBg} id="commander-view-root">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/10 pb-4">
        <div>
          <div className="flex items-center space-x-2.5"><div className="p-2 bg-teal-500/15 rounded-xl text-teal-400 border border-teal-500/30"><SlidersHorizontal className="h-5 w-5" /></div><h1 className={`text-xl font-sans font-extrabold tracking-tight ${styles.textWhite}`}>Command Console</h1></div>
          <p className={`text-xs ${styles.textMuted} mt-1 max-w-3xl`}>Configure automated execution parameters and target metrics.</p>
        </div>
      </div>

      <div className={`${styles.card} border-teal-500/15 bg-slate-900/30 backdrop-blur-md relative overflow-hidden`} id="commander-control-room">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 via-emerald-400 to-sky-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/20">
          <div className="flex items-center space-x-3"><div className="p-2 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20 shadow-inner"><Gauge className="h-5 w-5 text-teal-400" /></div><div><h3 className={`font-sans font-extrabold text-sm tracking-tight ${styles.textWhite}`}>Autonomous Control Knobs</h3><p className={`text-[11px] ${styles.textMuted} mt-0.5`}>Let the background state engine calibrate variables dynamically in response to volatile on-chain gas environments.</p></div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-5">
          <div className={styles.innerCard} id="ctrl-profit-target">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center space-x-2"><Target className="h-4 w-4 text-teal-400" /><span className={`text-xs font-extrabold tracking-wide uppercase ${styles.textWhite}`}>Profit Target</span></div><button onClick={() => onUpdateSettings({ profitTargetAuto: !settings.profitTargetAuto })} className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${settings.profitTargetAuto ? 'bg-teal-500 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-400 border border-slate-700/50'}`}>{settings.profitTargetAuto ? 'Auto' : 'Manual'}</button></div>
            {settings.profitTargetAuto ? (<div className="py-2.5 px-3 bg-teal-950/10 border border-teal-500/10 rounded-lg flex items-center justify-between text-xs"><span className="text-teal-400 font-mono font-semibold flex items-center space-x-1"><Sparkles className="h-3 w-3 animate-spin shrink-0" /><span>AI Optimized</span></span><span className="font-mono font-bold text-teal-200">{formatCurrency(settings.profitTargetUsd * 1.5)} USDC</span></div>) : (<div className="space-y-2"><div className="flex items-center justify-between text-xs font-mono text-slate-400"><span>Target Range:</span><span className="text-teal-300 font-bold">{formatCurrency(settings.profitTargetUsd)}</span></div><input type="range" min="100" max="2000" step="50" value={settings.profitTargetUsd} onChange={(e) => onUpdateSettings({ profitTargetUsd: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500" /></div>)}
            <p className="text-[10px] text-slate-500 mt-2 font-mono">Dynamic target parameters based on AMM volume spreads</p>
          </div>
          <div className={styles.innerCard} id="ctrl-growth-scale">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center space-x-2"><Zap className="h-4 w-4 text-amber-400" /><span className={`text-xs font-extrabold tracking-wide uppercase ${styles.textWhite}`}>Growth Scale</span></div><button onClick={() => onUpdateSettings({ growthRateAuto: !settings.growthRateAuto })} className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${settings.growthRateAuto ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 font-black shadow-sm' : 'bg-slate-800 text-slate-400 border border-slate-700/50'}`}>{settings.growthRateAuto ? 'Auto' : 'Manual'}</button></div>
            {settings.growthRateAuto ? (<div className="py-2.5 px-3 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-center justify-between text-xs"><span className="text-amber-400 font-mono font-semibold flex items-center space-x-1"><Sparkles className="h-3 w-3 animate-spin shrink-0" /><span>Copilot Model Active</span></span><span className="font-mono font-bold text-amber-200">{((settings.growthRate || 1.2) * 1.3).toFixed(1)}x leverage</span></div>) : (<div className="space-y-2"><div className="flex items-center justify-between text-xs font-mono text-slate-400"><span>Multiplier:</span><span className="text-amber-400 font-bold">{(settings.growthRate || 1.0).toFixed(1)}x</span></div><input type="range" min="0.5" max="5.0" step="0.1" value={settings.growthRate} onChange={(e) => onUpdateSettings({ growthRate: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" /></div>)}
            <p className="text-[10px] text-slate-500 mt-2 font-mono">Simulated sizing leverage multiplier for arbitrage routes</p>
          </div>
          <div className={styles.innerCard} id="ctrl-risk-mode">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center space-x-2"><ShieldAlert className="h-4 w-4 text-rose-400" /><span className={`text-xs font-extrabold tracking-wide uppercase ${styles.textWhite}`}>Risk Profile</span></div><button onClick={() => onUpdateSettings({ riskModeAuto: !settings.riskModeAuto })} className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${settings.riskModeAuto ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25 font-black shadow-sm' : 'bg-slate-800 text-slate-400 border border-slate-700/50'}`}>{settings.riskModeAuto ? 'Auto' : 'Manual'}</button></div>
            {settings.riskModeAuto ? (<div className="py-2.5 px-3 bg-rose-500/5 border border-rose-500/10 rounded-lg flex items-center justify-between text-xs"><span className="text-rose-400 font-mono font-semibold flex items-center space-x-1"><Activity className="h-3 w-3 animate-pulse shrink-0" /><span>Dynamic Profiling</span></span><span className="font-mono font-bold text-rose-300">{settings.riskMode === 'AGGRESSIVE' ? 'CONSERVATIVE (Slippage Safe)' : 'BALANCED'}</span></div>) : (<div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-lg text-xs font-mono">{(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const).map((mode) => (<button key={mode} onClick={() => onUpdateSettings({ riskMode: mode })} className={`flex-1 py-1 px-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer truncate ${settings.riskMode === mode ? 'bg-rose-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-slate-200'}`}>{mode === 'CONSERVATIVE' ? 'Safe' : mode === 'BALANCED' ? 'Bal' : 'Risk'}</button>))}</div>)}
            <p className="text-[10px] text-slate-500 mt-2 font-mono">Aggressiveness of on-chain frontrunning shielding</p>
          </div>
          <div className={styles.innerCard} id="ctrl-stability">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center space-x-2"><Anchor className="h-4 w-4 text-sky-400" /><span className={`text-xs font-extrabold tracking-wide uppercase ${styles.textWhite}`}>Stability Threshold</span></div><button onClick={() => onUpdateSettings({ stabilityAuto: !settings.stabilityAuto })} className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${settings.stabilityAuto ? 'bg-sky-500/15 text-sky-400 border border-sky-500/25 font-black shadow-sm' : 'bg-slate-800 text-slate-400 border border-slate-700/50'}`}>{settings.stabilityAuto ? 'Auto' : 'Manual'}</button></div>
            {settings.stabilityAuto ? (<div className="py-2.5 px-3 bg-sky-500/5 border border-sky-500/10 rounded-lg flex items-center justify-between text-xs"><span className="text-sky-400 font-mono font-semibold flex items-center space-x-1"><Sparkles className="h-3 w-3 animate-spin shrink-0" /><span>Autonomous Calibration</span></span><span className="font-mono font-bold text-sky-300">Score: {settings.stability || 85}%</span></div>) : (<div className="space-y-2"><div className="flex items-center justify-between text-xs font-mono text-slate-400"><span>Min Liquidity Score:</span><span className="text-sky-400 font-bold">{settings.stability || 85}%</span></div><input type="range" min="10" max="100" step="5" value={settings.stability || 85} onChange={(e) => onUpdateSettings({ stability: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" /></div>)}
            <p className="text-[10px] text-slate-500 mt-2 font-mono">Minimum AMM pool depth & stability factor</p>
          </div>
          <div className={styles.innerCard} id="ctrl-fleet-capacity">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center space-x-2"><Cpu className="h-4 w-4 text-indigo-400" /><span className={`text-xs font-extrabold tracking-wide uppercase ${styles.textWhite}`}>Fleet Allocation</span></div><button onClick={() => onUpdateSettings({ fleetCapacityAuto: !settings.fleetCapacityAuto })} className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${settings.fleetCapacityAuto ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-black shadow-sm' : 'bg-slate-800 text-slate-400 border border-slate-700/50'}`}>{settings.fleetCapacityAuto ? 'Auto' : 'Manual'}</button></div>
            {settings.fleetCapacityAuto ? (<div className="py-2.5 px-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg flex items-center justify-between text-xs"><span className="text-indigo-400 font-mono font-semibold flex items-center space-x-1"><Sparkles className="h-3 w-3 animate-spin shrink-0" /><span>AI Capacity allocation</span></span><span className="font-mono font-bold text-indigo-300">Auto Capacity Active</span></div>) : (<div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-lg text-xs font-mono">{(['25%', '50%', '75%', '100%'] as const).map((cap) => (<button key={cap} onClick={() => onUpdateSettings({ fleetCapacity: cap })} className={`flex-1 py-1 px-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer truncate ${settings.fleetCapacity === cap ? 'bg-indigo-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-slate-200'}`}>{cap}</button>))}</div>)}
            <p className="text-[10px] text-slate-500 mt-2 font-mono">Maximum portion of vault collateral to deploy per route</p>
          </div>
          <div className={styles.innerCard} id="ctrl-chain-sourcing">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center space-x-2"><Layers className="h-4 w-4 text-emerald-400" /><span className={`text-xs font-extrabold tracking-wide uppercase ${styles.textWhite}`}>Chain Sourcing</span></div><button onClick={() => onUpdateSettings({ chainsSelectionAuto: !settings.chainsSelectionAuto })} className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${settings.chainsSelectionAuto ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-black shadow-sm' : 'bg-slate-800 text-slate-400 border border-slate-700/50'}`}>{settings.chainsSelectionAuto ? 'Auto' : 'Manual'}</button></div>
            {settings.chainsSelectionAuto ? (<div className="py-2.5 px-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center justify-between text-xs"><span className="text-emerald-400 font-mono font-semibold flex items-center space-x-1"><Sparkles className="h-3 w-3 animate-spin shrink-0" /><span>Optimal Path Auto</span></span><span className="font-mono font-bold text-emerald-300">Sourcing S-Tier Chains</span></div>) : (<div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-lg text-xs font-mono">{(['TOP_25', 'TOP_50', 'ALL'] as const).map((ch) => (<button key={ch} onClick={() => onUpdateSettings({ chainsSelection: ch })} className={`flex-1 py-1 px-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer truncate ${settings.chainsSelection === ch ? 'bg-emerald-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-slate-200'}`}>{ch === 'TOP_25' ? 'Top 25' : ch === 'TOP_50' ? 'Top 50' : 'All'}</button>))}</div>)}
            <p className="text-[10px] text-slate-500 mt-2 font-mono">DEX liquidity pools cluster limits</p>
          </div>
        </div>
      </div>

      <div className={styles.card} id="deployment-pipeline-card">
        <div className="flex items-center space-x-2 border-b border-slate-700/30 pb-4 mb-4"><GitBranch className="h-5 w-5 text-teal-400" /><div><h2 className={`text-sm font-bold ${styles.textWhite}`}>Deployment Pipeline</h2><p className={`text-[10px] ${styles.textMuted} mt-0.5`}>Manage pipeline execution constraints. Auto will let compiler tests trigger downstream transitions.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={styles.innerCard}>
            <div className="flex justify-between items-center mb-3"><span className="text-[10px] font-bold text-teal-400 font-mono tracking-widest uppercase">1. PREFLIGHT</span><div className="flex bg-slate-800/60 p-0.5 rounded border border-slate-700 text-[9px] font-mono"><button onClick={() => setPipelineToggles(prev => ({ ...prev, preflight: 'auto' }))} className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all ${pipelineToggles.preflight === 'auto' ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>Auto</button><button onClick={() => setPipelineToggles(prev => ({ ...prev, preflight: 'manual' }))} className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all ${pipelineToggles.preflight === 'manual' ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>Manual</button></div></div>
            <p className={`text-xs ${styles.textMuted} leading-relaxed`}>Validates on-chain parameters, check ABI endpoint health, verifies balance thresholds, and parses env secrets.</p>
            <div className="mt-4 pt-3 border-t border-slate-700/30 flex justify-between items-center text-[10px] font-mono"><span className={styles.textMuted}>Preflight State</span><span className={preflightPassed === false ? 'text-rose-400 font-bold flex items-center gap-1' : 'text-emerald-400 font-bold flex items-center gap-1'}><span className={`h-1.5 w-1.5 rounded-full animate-pulse ${preflightPassed === false ? 'bg-rose-400' : 'bg-emerald-400'}`} /><span>{preflightPassed === null ? 'Checking...' : preflightPassed ? 'Ready (Passed)' : 'FAILED — Check .env'}</span></span></div>
          </div>
          <div className={styles.innerCard}>
            <div className="flex justify-between items-center mb-3"><span className="text-[10px] font-bold text-amber-400 font-mono tracking-widest uppercase">2. SIMULATION</span><div className="flex bg-slate-800/60 p-0.5 rounded border border-slate-700 text-[9px] font-mono"><button onClick={() => setPipelineToggles(prev => ({ ...prev, simulation: 'auto' }))} className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all ${pipelineToggles.simulation === 'auto' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>Auto</button><button onClick={() => setPipelineToggles(prev => ({ ...prev, simulation: 'manual' }))} className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all ${pipelineToggles.simulation === 'manual' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>Manual</button></div></div>
            <p className={`text-xs ${styles.textMuted} leading-relaxed`}>Simulates routes over local forks to evaluate exact swap slippage and potential frontrunning bundle profitability.</p>
            <div className="mt-4 pt-3 border-t border-slate-700/30 flex justify-between items-center text-[10px] font-mono"><span className={styles.textMuted}>Sim Cycle</span><span className="text-amber-400 font-bold flex items-center gap-1"><span className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-pulse" /><span>{simRunning ? 'Simulating...' : 'Idle (Ready)'}</span></span></div>
          </div>
          <div className={`${styles.innerCard} min-h-[220px]`}>
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-rose-400 font-mono tracking-widest uppercase">3. LIVE ENGINE</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${backendMode === 'live' ? 'bg-rose-500 text-slate-950' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>{backendMode === 'live' ? 'LIVE' : 'SIMULATION / PAPER'}</span>
                </div>
                <div className="flex bg-slate-800/60 p-0.5 rounded border border-slate-700 text-[9px] font-mono">
                  <button onClick={() => setBackendMode('paper')} className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${backendMode === 'paper' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>Paper</button>
                  <button onClick={() => setBackendMode('live')} className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${backendMode === 'live' ? 'bg-rose-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>Live</button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-mono">Deploy Mode</span>
                <div className="flex bg-slate-800/60 p-0.5 rounded border border-slate-700 text-[9px] font-mono">
                  <button onClick={() => setDeployMode('manual')} className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${deployMode === 'manual' ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>Manual</button>
                  <button onClick={() => setDeployMode('autonomous')} className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${deployMode === 'autonomous' ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}>Autonomous</button>
                </div>
              </div>
            </div>
            <p className={`text-xs ${styles.textMuted} leading-relaxed`}>Initiates actual smart contracts, requesting multi-hop arbitrage flashloans to private builders directly.</p>
            <div className="mt-4 pt-3 border-t border-slate-700/30 space-y-3">
                            {awaitingApproval && deployState === 'idle' && (<button onClick={async () => { try { const res = await fetch(API_BASE + '/api/deployment/approve', { method: 'POST' }); const data = await res.json(); if (!res.ok) { alert('Approval failed: ' + (data?.error || 'backend error')); return; } setAwaitingApproval(false); setPendingStage(null); setDeployProgress(data.progress || 50); if (data.stage === 'Completed' || data.stage === 'Live') { setDeployState('success'); setDeployProgress(100); setDeployTxHash(data.txHash || ''); } } catch (err) { alert('Approval error: ' + (err as Error).message); } }} className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-mono font-bold text-xs tracking-wide uppercase transition-all shadow-md hover:shadow-lg hover:shadow-teal-950/20 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1.5"><Check className="h-3.5 w-3.5 text-white" /><span>Approve Advance to {pendingStage || 'Next Stage'}</span></button>)}
               {deployState === 'idle' && (<button onClick={async () => { const isLive = backendMode === 'live'; const ok = window.confirm(isLive ? "SYSTEM CONFIRMATION REQUIRED:\nDeploy to LIVE? This triggers REAL on-chain execution with the configured wallet." : "SIMULATION DEPLOY:\nThis triggers a PAPER/simulation deploy only. No real funds, no on-chain execution."); if (!ok) return; setDeployState('deploying'); setDeployProgress(0); try { const res = await fetch(API_BASE + '/api/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: isLive ? 'live' : 'paper', mode: deployMode, pipelineToggles, settings, backendMode }) }); const data = await res.json(); if (!res.ok || !data.deploy) { setDeployState('idle'); alert('Deploy failed: ' + (data?.error || 'backend error')); return; } const startedAt = Date.now(); const poll = setInterval(async () => { try { const dep = await fetch(API_BASE + '/api/deploy/status').then(r => r.ok ? r.json() : null); if (dep) { if (typeof dep.progress === 'number') setDeployProgress(Math.max(0, Math.min(100, dep.progress))); if (dep.txHash) setDeployTxHash(dep.txHash); if (dep.stage && dep.stage !== 'idle') { clearInterval(poll); setDeployTxHash(dep.txHash || data.deploy.txHash || ''); setDeployState('success'); setDeployProgress(100); return; } } } catch (e) {} if (Date.now() - startedAt > 60000) { clearInterval(poll); setDeployState('idle'); alert('Deploy timed out waiting for backend confirmation.'); } }, 1500); } catch (err) { setDeployState('idle'); alert('Deploy error: ' + (err as Error).message); } }} className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-mono font-bold text-xs tracking-wide uppercase transition-all shadow-md hover:shadow-lg hover:shadow-rose-950/20 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1.5"><Zap className="h-3.5 w-3.5 text-white animate-pulse" /><span>{isLive ? 'Auto Deploy to Live' : 'Deploy (Simulation / Paper)'}</span></button>)}
              {deployState === 'deploying' && (<div className="space-y-2"><div className="flex justify-between items-center text-[10px] font-mono text-rose-400"><span className="flex items-center gap-1.5"><svg className="animate-spin h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>Deploying Smart Contract...</span></span><span className="animate-pulse text-xs">{deployProgress}%</span></div><div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-rose-500 to-red-500 animate-[pulse_1.5s_infinite]" style={{ width: `${deployProgress}%` }} /></div></div>)}
              {deployState === 'success' && (<div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center font-mono animate-fadeIn"><div className="flex items-center justify-center space-x-1.5 text-xs font-bold mb-1"><Check className="h-4 w-4 text-emerald-400" /><span>CONTRACT DEPLOYED</span></div><p className="text-[9px] text-slate-400 truncate font-mono">Tx: {deployTxHash || 'pending'}</p><button onClick={() => setDeployState('idle')} className="mt-2 text-[9px] text-teal-400 hover:underline cursor-pointer">Reset Status</button></div>)}
              <div className="flex justify-between items-center text-[10px] font-mono"><span className={styles.textMuted}>Execution State</span>{deployState === 'success' ? (<span className="text-emerald-400 font-bold flex items-center gap-1"><span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" /><span>Live (Active)</span></span>) : deployState === 'deploying' ? (<span className="text-rose-400 font-bold flex items-center gap-1"><span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-ping" /><span>Deploying...</span></span>) : (<span className="text-slate-400 font-bold flex items-center gap-1"><span className="h-1.5 w-1.5 bg-slate-500 rounded-full" /><span>Awaiting Trigger</span></span>)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

