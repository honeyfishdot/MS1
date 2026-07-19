/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ArbitrageOpportunity {
  id: string;
  tokenPair: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  discrepancyPct: number;
  estimatedProfitUsd: number;
  estimatedGasFeeUsd: number;
  netProfitUsd: number;
  route: string[];
  timestamp: number;
}

export interface ArbitrageTrade {
  id: string;
  tokenPair: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  volume: number;
  grossProfitUsd: number;
  gasFeeUsd: number;
  netProfitUsd: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  txHash: string;
  timestamp: number;
  network: string;
  error?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRADE_INFLOW' | 'TRADE_OUTFLOW' | 'GAS_FEE';
  amount: number;
  token: string;
  timestamp: number;
  txHash: string;
}

export interface WalletState {
  connected: boolean;
  address: string;
  network: string;
  balances: { [token: string]: number };
  totalValueUsd: number;
  transactions: WalletTransaction[];
}

export interface DashboardSettings {
  minProfitThresholdPct: number;
  maxGasFeeUsd: number;
  slippagePct: number;
  autoExecute: boolean;
  selectedNetwork: string;
  ownerWalletAddress: string;
  profitTargetUsd: number;
  profitTargetAuto: boolean;
  growthRate: number;
  growthRateAuto: boolean;
  riskMode: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  riskModeAuto: boolean;
  stability: number; // stability parameter from 1 to 100
  stabilityAuto: boolean;
  fleetCapacity: '25%' | '50%' | '75%' | '100%' | 'AUTO';
  fleetCapacityAuto: boolean;
  chainsSelection: 'TOP_25' | 'TOP_50' | 'ALL' | 'AUTO';
  chainsSelectionAuto: boolean;
  profitTransferMode: 'AUTO' | 'MANUAL';
  accumulatedProfitsUsd: number;
  profitTransferMinThresholdUsd: number;
}

export interface AggregatedMetrics {
  totalProfitUsd: number;
  activeTradesCount: number;
  successfulTradesCount: number;
  failedTradesCount: number;
  collateralUsd: number;
  profitTrend: { date: string; profit: number }[];
  recentTrades: ArbitrageTrade[];
  avgGasCostUsd?: number;
  scanLatencyMs?: number;
  avgTradeLatencyMs?: number;
  p50LatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  throughputRps?: number;
  stageLatencyMs?: {
    detection: number;
    decision: number;
    simulation: number;
    signing: number;
    bundle: number;
    relay: number;
    inclusion: number;
  };
  mevAttackPct?: number;
  efficiencyScore?: number;
  velocityScore?: number;
  securityScore?: number;
  arbitrageDetectedPerHour?: number;
  arbitrageExecutedPerHour?: number;
  totalProfitPerHour?: number;
  internalLatencyMs?: number;
  externalLatencyMs?: number;
  regionsCovered?: number;
  chainsCovered?: number;
  pairsCovered?: number;
  dexesCovered?: number;
}

export interface CustomWalletItem {
  id: string;
  name: string;
  address: string;
  chain: string;
  balance: number;
  isActive: boolean;
  // Withdrawal wallets store ONLY: name, address, chain, created_date, status.
  // No private key / seed / mnemonic is ever held on the frontend.
  createdDate?: string;
}

// ============================================================================
// AllBright AgentOS — Governance Reflection Cards (spec §9, §10)
// Shape matches the JSON emitted by `crates/governance` (governance_daemon).
// ============================================================================

export type CardStatus =
  | 'Operational'
  | 'PendingVerification'
  | 'Degraded'
  | 'Critical';

export interface ReflectionMetric {
  name: string;
  value: number;
  unit: string;
  source: string;
}

export interface ReflectionCardData {
  id: string;
  name: string;
  status: CardStatus;
  last_update: number; // unix seconds
  metrics: ReflectionMetric[];
}

export interface GovernanceCardsPayload {
  available: boolean;
  approved: number;
  rejected: number;
  generated_at: string | null;
  cards: ReflectionCardData[];
}

