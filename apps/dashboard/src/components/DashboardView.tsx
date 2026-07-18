/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE || '';
import { 
  ArrowUpRight, 
  Percent, 
  DollarSign, 
  Info,
  Loader2,
  CheckCircle,
  AlertCircle,
  Target,
  Zap,
  Gauge,
  Activity,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { AggregatedMetrics, ArbitrageOpportunity, DashboardSettings } from '../types';

interface DashboardViewProps {
  metrics: AggregatedMetrics | null;
  opportunities: ArbitrageOpportunity[];
  settings: DashboardSettings;
  onExecuteTrade: (oppId: string) => Promise<boolean>;
  executingId: string | null;
  messageBanner: { type: 'success' | 'error', text: string } | null;
  themeMode: 'dark' | 'bright' | 'dusty-blue';
  onTransferProfit?: () => Promise<void>;
  transferringProfit?: boolean;
  onUpdateSettings: (updated: Partial<DashboardSettings>) => Promise<boolean>;
  convertAndFormat: (usdValue: number, minFractionDigits?: number) => string;
}

type SortField = 'netProfitUsd' | 'discrepancyPct' | 'buyPrice';
type SortOrder = 'asc' | 'desc';

export default function DashboardView({
  metrics,
  opportunities,
  settings,
  onExecuteTrade,
  executingId,
  messageBanner,
  themeMode,
  onTransferProfit,
  transferringProfit = false,
  onUpdateSettings,
  convertAndFormat,
}: DashboardViewProps) {
  const [filterToken, setFilterToken] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('netProfitUsd');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Format currencies beautifully using top-level converter
  const formatCurrency = (val: number, minimumFractionDigits = 2) => {
    return convertAndFormat(val, minimumFractionDigits);
  };

  const getThemeStyles = () => {
    switch (themeMode) {
      case 'bright':
        return {
          card: 'relative overflow-hidden bg-white border border-slate-300 rounded-2xl p-4 shadow-sm',
          textMuted: 'text-slate-500',
          textTitle: 'text-slate-800 font-bold',
          textWhite: 'text-slate-900',
          accentText: 'text-teal-600',
          chartBg: 'bg-white border border-slate-300 rounded-2xl p-6 shadow-sm',
          gridStroke: '#e2e8f0',
          chartText: '#64748b',
          tooltipBg: '#ffffff',
          tooltipBorder: '#e2e8f0',
          tooltipText: '#0f172a',
          bannerSuccess: 'bg-emerald-50 border-emerald-300 text-emerald-800',
          bannerError: 'bg-rose-50 border-rose-300 text-rose-800',
          targetBox: 'bg-slate-100 border border-slate-300 text-slate-800',
        };
      case 'dusty-blue':
        return {
          card: 'relative overflow-hidden bg-[#1e293b] border border-[#475569] rounded-2xl p-4 shadow-md',
          textMuted: 'text-slate-300',
          textTitle: 'text-sky-100 font-bold',
          textWhite: 'text-white',
          accentText: 'text-sky-400',
          chartBg: 'bg-[#1e293b] border border-[#475569] rounded-2xl p-6 shadow-md',
          gridStroke: '#334155',
          chartText: '#94a3b8',
          tooltipBg: '#1b2536',
          tooltipBorder: '#475569',
          tooltipText: '#ffffff',
          bannerSuccess: 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300',
          bannerError: 'bg-rose-900/30 border-rose-500/40 text-rose-300',
          targetBox: 'bg-[#334155] border border-[#475569] text-sky-100',
        };
      case 'dark':
      default:
        return {
          card: 'relative overflow-hidden bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl',
          textMuted: 'text-slate-400',
          textTitle: 'text-white font-bold',
          textWhite: 'text-white',
          accentText: 'text-teal-400',
          chartBg: 'bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl',
          gridStroke: '#334155',
          chartText: '#94a3b8',
          tooltipBg: '#0f172a',
          tooltipBorder: '#334155',
          tooltipText: '#f8fafc',
          bannerSuccess: 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300',
          bannerError: 'bg-rose-900/30 border-rose-500/40 text-rose-300',
          targetBox: 'bg-slate-800 border border-slate-700 text-white',
        };
    }
  };

  const styles = getThemeStyles();

  // Get tokens from opportunities for filtering options
  const tokenPairs = ['ALL', ...Array.from(new Set(opportunities.map(o => o.tokenPair)))];

  // Sorting & Filtering Opportunities
  const filteredOpps = opportunities
    .filter(o => filterToken === 'ALL' || o.tokenPair === filterToken)
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'netProfitUsd') {
        comparison = a.netProfitUsd - b.netProfitUsd;
      } else if (sortField === 'discrepancyPct') {
        comparison = a.discrepancyPct - b.discrepancyPct;
      } else if (sortField === 'buyPrice') {
        comparison = a.buyPrice - b.buyPrice;
      }
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

  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(5); // seconds

  // Listen for parent refreshInterval changes and manual refresh events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.refreshInterval && typeof e.detail.refreshInterval === 'number') {
        setRefreshInterval(e.detail.refreshInterval);
      }
    };
    window.addEventListener('parent-refresh-interval' as any, handler as EventListener);
    return () => window.removeEventListener('parent-refresh-interval' as any, handler as EventListener);
  }, []);

  // Metrics parameters — target MUST come from live commander/DAO config (no hardcoded fallback)
  const targetSet = settings.profitTargetUsd || 0;
  const totalNetProfit = metrics?.totalProfitUsd || 0;
  const achievementPct = targetSet > 0 ? Math.round((totalNetProfit / targetSet) * 100) : 0;

  // Compact metrics — derived from real backend data (no fabricated defaults)
  const totalArbitrageDetected = metrics?.activeTradesCount || 0;
  const executedCount = metrics?.successfulTradesCount || 0;
  const winRate = metrics && (metrics.successfulTradesCount + metrics.failedTradesCount) > 0
    ? (((metrics.successfulTradesCount) / (metrics.successfulTradesCount + metrics.failedTradesCount)) * 100).toFixed(1)
    : "0.0";
  const avgProfitPerTrade = metrics && metrics.successfulTradesCount > 0 ? (metrics.totalProfitUsd / metrics.successfulTradesCount) : 0;
  const avgGasCostPerTrade = metrics?.avgGasCostUsd ?? null;
  const scanLatencyMs = metrics?.scanLatencyMs ?? null;
  const avgTradeLatencyMs = metrics?.avgTradeLatencyMs ?? null;
  const p50LatencyMs = metrics?.p50LatencyMs ?? null;
  const p95LatencyMs = metrics?.p95LatencyMs ?? null;
  const p99LatencyMs = metrics?.p99LatencyMs ?? null;
  const throughputRps = metrics?.throughputRps ?? null;
  const stageLatency = metrics?.stageLatencyMs;
  const mevAttackPct = metrics?.mevAttackPct ?? null;

  return (
    <div className="space-y-6 animate-fadeIn" id="dashboard-view">
      {/* Notifications/Execution Banner */}
      {messageBanner && (
        <div
          id="status-banner"
          className={`flex items-center space-x-3 p-4 rounded-xl border transition-all ${
            messageBanner.type === 'success' ? styles.bannerSuccess : styles.bannerError
          }`}
        >
          {messageBanner.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-semibold">{messageBanner.text}</span>
        </div>
      )}

      {/* Target Achievement Widget - Compact version (no duplicate header) */}
      <div className="flex justify-end mb-2" id="target-achievement-badge">
        <div className="relative">
          <div 
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl cursor-pointer select-none transition-all ${styles.targetBox}`}
            onMouseEnter={() => setIsTooltipOpen(true)}
            onMouseLeave={() => setIsTooltipOpen(false)}
            onClick={() => setIsTooltipOpen(!isTooltipOpen)}
            title="Target Achievement: Shows percentage of profit target reached. Click for details."
          >
            <Target className="h-3.5 w-3.5 text-teal-400" />
            <span className="font-bold text-xs">Target:</span>
            <span className="text-teal-400 font-bold font-mono text-xs">{achievementPct}%</span>
            {isTooltipOpen && (
              <div className="absolute top-10 right-0 w-64 p-3 rounded-xl border border-teal-500/20 bg-slate-950/95 backdrop-blur-md shadow-2xl z-50 text-xs text-slate-300 font-sans animate-fadeIn">
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div><span className="text-slate-500">Goal:</span> {formatCurrency(targetSet)}</div>
                  <div><span className="text-slate-500">Profit:</span> {formatCurrency(totalNetProfit)}</div>
                  <div><span className="text-slate-500">Gap:</span> {formatCurrency(Math.max(0, targetSet - totalNetProfit))}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refresh Interval Selector */}
      <div className="flex justify-end mb-4">
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl ${styles.targetBox}`}>
          <span title="Data refresh rate">
            <RefreshCw className="h-3.5 w-3.5 text-teal-400" />
          </span>
          <span className="text-[10px] font-mono text-slate-400">Auto-refresh:</span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-transparent text-xs font-mono font-bold text-teal-400 focus:outline-none cursor-pointer"
            title="Select how often dashboard data refreshes automatically"
          >
            <option value="1">1s</option>
            <option value="2">2s</option>
            <option value="5">5s</option>
            <option value="10">10s</option>
            <option value="15">15s</option>
            <option value="20">20s</option>
            <option value="30">30s</option>
          </select>
        </div>
      </div>

      {/* Compact Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        
        {/* Metric 1: Total Arbitrage Detected */}
        <div className={styles.card} id="metric-detected" title="Arbitrage loops scanned: Total number of cross-DEX arbitrage opportunities detected by the scanning engine. This includes all potential profit routes analyzed across multiple decentralized exchanges.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Detected</span>
            <div className="p-1 bg-teal-500/10 rounded text-teal-400">
              <Activity className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className={`text-lg font-mono font-bold tracking-tight ${styles.textWhite}`}>
              {totalArbitrageDetected.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-none">Arb loops scanned</p>
        </div>

        {/* Metric 2: Executed */}
        <div className={styles.card} id="metric-executed" title="Successful swaps: Number of arbitrage trades that completed without reverting. Each executed trade represents a profitable cross-DEX swap with no gas waste or failed transactions.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Executed</span>
            <div className="p-1 bg-emerald-500/10 rounded text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className={`text-lg font-mono font-bold tracking-tight ${styles.textWhite}`}>
              {executedCount}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-none">Successful swaps</p>
        </div>

        {/* Metric 3: Win Rate */}
        <div className={styles.card} id="metric-winrate" title="Win Rate: Percentage of trades that completed successfully without reverting. Calculated as (successful trades / total trades) × 100. Higher is better — indicates consistent profitable execution.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Win Rate</span>
            <div className="p-1 bg-teal-500/10 rounded text-teal-400">
              <Percent className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg font-mono font-bold tracking-tight text-teal-400">
              {winRate}%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-none">Zero-reversion sweeps</p>
        </div>

        {/* Metric 4: Avg Profit per Trade */}
        <div className={styles.card} id="metric-avg-profit" title="Average Profit: Mean net profit per successful arbitrage trade after gas costs. Calculated as (total profit USD / successful trades). Higher values indicate more profitable routing strategies.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Avg Profit</span>
            <div className="p-1 bg-sky-500/10 rounded text-sky-400">
              <DollarSign className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className={`text-lg font-mono font-bold tracking-tight ${styles.textWhite}`}>
              {formatCurrency(avgProfitPerTrade)}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-none">Net yield per route</p>
        </div>

        {/* Metric 5: Avg Gas Cost per Trade */}
        <div className={styles.card} id="metric-avg-gas" title="Average Gas Cost: Mean transaction fee paid per arbitrage trade on Arbitrum L2. Lower costs increase net profit margins. This metric helps optimize trade sizing and execution timing.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Avg Gas Cost</span>
            <div className="p-1 bg-rose-500/10 rounded text-rose-400">
              <Zap className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className={`text-lg font-mono font-bold tracking-tight text-rose-400`}>
              {avgGasCostPerTrade !== null ? formatCurrency(avgGasCostPerTrade) : '—'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-none">L2 Arbitrum gas avg</p>
        </div>

        {/* Metric 6: Scan Latency */}
        <div className={styles.card} id="metric-latency" title="Scan Latency: Time taken to scan mempool and detect arbitrage opportunities. Lower latency means faster opportunity detection and execution. Critical for competitive arbitrage in volatile markets.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Scan Latency</span>
            <div className="p-1 bg-amber-500/10 rounded text-amber-400">
              <Gauge className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className={`text-lg font-mono font-bold tracking-tight text-amber-400`}>
              {scanLatencyMs !== null ? `${scanLatencyMs}ms` : '—'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-none">Mempool scan speed</p>
        </div>

        {/* Metric 7: Security */}
        <div className={`${styles.card} col-span-2 sm:col-span-1 xl:col-span-1`} id="metric-security" title="Security Status: MEV attack prevention rate and frontrunning protection. Shows percentage of malicious relay attempts blocked. 100% protection ensures safe transaction ordering and prevents sandwich attacks.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Security</span>
            <div className="p-1 bg-emerald-500/10 rounded text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-[11px] font-mono font-bold ${styles.textWhite}`}>
              MEV Attack: <span className="text-teal-400">{mevAttackPct !== null ? `${mevAttackPct.toFixed(2)}%` : '—'}</span>
            </div>
          <div className="text-[10px] font-mono font-medium text-slate-400 mt-0.5 leading-none">
               Frontrun: <span className="text-emerald-400">{mevAttackPct !== null ? `${(100 - mevAttackPct).toFixed(2)}%` : '—'}</span>
             </div>
           </div>
           <p className="text-[9px] text-slate-500 mt-1 font-mono leading-none truncate">
             {mevAttackPct !== null ? `Live MEV block rate: ${(100 - mevAttackPct).toFixed(2)}%` : 'Awaiting live data'}
           </p>
        </div>

        {/* Metric 8: Avg Trade Latency */}
        <div className={styles.card} id="metric-avg-trade-latency" title="Average Trade Latency: Mean end-to-end execution time per arbitrage trade in milliseconds. Lower values indicate faster trade completion and reduced MEV exposure.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Avg Trade Latency</span>
            <div className="p-1 bg-indigo-500/10 rounded text-indigo-400">
              <Activity className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className={`text-lg font-mono font-bold tracking-tight text-indigo-400`}>
              {avgTradeLatencyMs !== null ? `${avgTradeLatencyMs.toFixed(2)}ms` : '—'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-none">End-to-end execution</p>
        </div>

        {/* Metric 9: P50/P95/P99 Latency */}
        <div className={`${styles.card} col-span-2 sm:col-span-1 xl:col-span-2`} id="metric-percentile-latency" title="Latency Percentiles: P50 (median), P95, and P99 execution latencies. Lower percentiles mean more consistent and predictable trade execution timing.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Latency Percentiles</span>
            <div className="p-1 bg-violet-500/10 rounded text-violet-400">
              <Gauge className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2 space-y-0.5">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">P50</span>
              <span className="text-violet-300 font-bold">{p50LatencyMs !== null ? `${p50LatencyMs.toFixed(3)}ms` : '—'}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">P95</span>
              <span className="text-violet-300 font-bold">{p95LatencyMs !== null ? `${p95LatencyMs.toFixed(3)}ms` : '—'}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">P99</span>
              <span className="text-violet-300 font-bold">{p99LatencyMs !== null ? `${p99LatencyMs.toFixed(3)}ms` : '—'}</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 mt-1 font-mono leading-none">Execution latency distribution</p>
        </div>

        {/* Metric 10: Throughput RPS */}
        <div className={styles.card} id="metric-throughput" title="Throughput: Estimated requests processed per second based on current scan latency. Higher throughput means more opportunities analyzed per unit time.">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${styles.textMuted}`}>Throughput</span>
            <div className="p-1 bg-cyan-500/10 rounded text-cyan-400">
              <RefreshCw className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className={`text-lg font-mono font-bold tracking-tight text-cyan-400`}>
              {throughputRps !== null ? `${throughputRps} rps` : '—'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono leading-none">Scans per second</p>
        </div>

      </div>

      {/* Stage Latency Breakdown */}
      {stageLatency && (
        <div className={styles.chartBg} id="stage-latency-breakdown">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-sans font-bold text-base ${styles.textWhite}`}>Pipeline Stage Latency</h3>
              <p className={`text-xs ${styles.textMuted}`}>Per-stage execution breakdown from M009 Latency Tracker</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { key: 'detection', label: 'Detection', color: 'bg-blue-500' },
              { key: 'decision', label: 'Decision', color: 'bg-purple-500' },
              { key: 'simulation', label: 'Simulation', color: 'bg-amber-500' },
              { key: 'signing', label: 'Signing', color: 'bg-rose-500' },
              { key: 'bundle', label: 'Bundle', color: 'bg-teal-500' },
              { key: 'relay', label: 'Relay', color: 'bg-orange-500' },
              { key: 'inclusion', label: 'Inclusion', color: 'bg-emerald-500' },
            ].map(stage => (
              <div key={stage.key} className={`${styles.card} !p-3`}>
                <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{stage.label}</div>
                <div className={`text-sm font-mono font-bold ${styles.textWhite} mt-1`}>
                  {(stageLatency as any)[stage.key]?.toFixed(3) ?? '—'}ms
                </div>
                <div className={`h-1 rounded-full ${stage.color} mt-2 opacity-60`} style={{ width: `${Math.min(100, ((stageLatency as any)[stage.key] || 0) / Math.max(...Object.values(stageLatency)) * 100)}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Full-Width Profit Trend Chart */}
      <div className={styles.chartBg} id="profit-trend-chart">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`font-sans font-bold text-base ${styles.textWhite}`}>Cumulative Profit Trend</h3>
            <p className={`text-xs ${styles.textMuted}`}>Total net profit accumulated across all flash-loan sweeps (7-day interval)</p>
          </div>
          <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-mono ${styles.targetBox}`}>
            <span>Network:</span>
            <span className="text-teal-500 font-bold">{settings.selectedNetwork}</span>
          </div>
        </div>

        <div className="h-72 w-full">
          {metrics && metrics.profitTrend && metrics.profitTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metrics.profitTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={styles.gridStroke} />
                <XAxis 
                  dataKey="date" 
                  stroke={styles.chartText} 
                  fontSize={10} 
                  fontFamily="monospace"
                  tickLine={false}
                />
                <YAxis 
                  stroke={styles.chartText} 
                  fontSize={10} 
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: styles.tooltipBg,
                    borderColor: styles.tooltipBorder,
                    borderRadius: '12px',
                    color: styles.tooltipText,
                  }}
                  itemStyle={{ color: '#0d9488', fontFamily: 'monospace', fontSize: '12px' }}
                  labelStyle={{ color: styles.chartText, fontSize: '11px', fontFamily: 'monospace' }}
                  formatter={(value: any) => [`$${parseFloat(value).toLocaleString()}`, 'Cumulative Profit']}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#0d9488" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono animate-pulse">
              Gathering trend metrics...
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* REAL-TIME ARBITRAGE OPPORTUNITY TABLE */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className={styles.chartBg} id="opportunity-table">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`font-sans font-bold text-base ${styles.textWhite}`}>Live Arbitrage Opportunities</h3>
            <p className={`text-xs ${styles.textMuted}`}>Cross-DEX price discrepancies detected on-chain — sorted by net profit</p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Token Filter */}
            <select
              value={filterToken}
              onChange={(e) => setFilterToken(e.target.value)}
              className={`text-xs rounded-xl px-3 py-1.5 font-mono bg-slate-950 border border-slate-800 text-slate-300 focus:border-teal-500`}
            >
              {tokenPairs.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            
            {/* Manual Refresh */}
            <button
              onClick={async () => {
                try {
                  // Re-fetch opportunities from the running simulation backend
                  const res = await fetch(API_BASE + '/api/opportunities');
                  if (res.ok) {
                    const data: ArbitrageOpportunity[] = await res.json();
                    // Update parent state via event — App listens and re-fetches
                    window.dispatchEvent(new CustomEvent('refresh-opportunities', { detail: data }));
                  }
                } catch (e) { /* silent */ }
              }}
              className="px-2 py-1.5 rounded-xl text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all font-mono"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/15">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th 
                  onClick={() => handleSort('netProfitUsd')}
                  className="py-2.5 px-3 font-bold cursor-pointer hover:text-white select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Net Profit</span>
                    {sortField === 'netProfitUsd' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="py-2.5 px-3 font-bold">Pair</th>
                <th className="py-2.5 px-3 font-bold">Route</th>
                <th 
                  onClick={() => handleSort('buyPrice')}
                  className="py-2.5 px-3 font-bold cursor-pointer hover:text-white select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Buy Price</span>
                    {sortField === 'buyPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="py-2.5 px-3 font-bold">Sell Price</th>
                <th 
                  onClick={() => handleSort('discrepancyPct')}
                  className="py-2.5 px-3 font-bold cursor-pointer hover:text-white select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Spread %</span>
                    {sortField === 'discrepancyPct' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="py-2.5 px-3 font-bold">Gas Est.</th>
                <th className="py-2.5 px-3 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {filteredOpps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-mono text-xs animate-pulse">
                    {opportunities.length === 0
                      ? 'Scanning on-chain DEX pools for price discrepancies...'
                      : 'No opportunities match the current filter.'}
                  </td>
                </tr>
              ) : (
                filteredOpps.map((opp) => {
                  const isExecuting = executingId === opp.id;
                  return (
                    <tr 
                      key={opp.id}
                      className="hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                        {formatCurrency(opp.netProfitUsd)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-200 font-medium">
                        {opp.tokenPair}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[10px]">
                        {opp.buyDex} → {opp.sellDex}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {formatCurrency(opp.buyPrice, 6)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {formatCurrency(opp.sellPrice, 6)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                        {opp.discrepancyPct.toFixed(3)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {formatCurrency(opp.estimatedGasFeeUsd)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onExecuteTrade(opp.id)}
                          disabled={isExecuting}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1 mx-auto ${
                            isExecuting
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-teal-500 hover:bg-teal-600 text-slate-950 cursor-pointer'
                          }`}
                        >
                          {isExecuting ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Executing...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-3 w-3" />
                              <span>Execute</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 font-mono">
          <span>
            {filteredOpps.length} opportunity{filteredOpps.length !== 1 ? 'ies' : 'y'} detected
            {filterToken !== 'ALL' ? ` for ${filterToken}` : ''}
          </span>
          <span className="text-[9px] text-slate-600">
            Real on-chain DEX pool prices — refreshed every 20s
          </span>
        </div>
      </div>

    </div>
  );
}
