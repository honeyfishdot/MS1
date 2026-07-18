/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, AlertTriangle, Loader2, CircleDot } from 'lucide-react';
import { CardStatus, GovernanceCardsPayload } from '../types';

interface ComplianceViewProps {
  governanceCards: GovernanceCardsPayload | null;
  themeMode: 'dark' | 'bright' | 'dusty-blue';
}

const STATUS_STYLES: Record<CardStatus, { badge: string; dot: string; label: string }> = {
  Operational: { badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', dot: 'bg-emerald-400', label: 'Operational' },
  PendingVerification: { badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400', dot: 'bg-amber-400', label: 'Pending Verification' },
  Degraded: { badge: 'bg-orange-500/10 border-orange-500/30 text-orange-400', dot: 'bg-orange-400', label: 'Degraded' },
  Critical: { badge: 'bg-red-500/10 border-red-500/30 text-red-400', dot: 'bg-red-400', label: 'Critical' },
};

const CARD_ORDER = ['allbright', 'copilot', 'intelligence', 'commander', 'zerotrust'];

function formatTimestamp(unixSecs: number): string {
  try {
    return new Date(unixSecs * 1000).toLocaleString();
  } catch {
    return 'unknown';
  }
}

export default function ComplianceView({ governanceCards, themeMode }: ComplianceViewProps) {
  const getThemeClasses = () => {
    switch (themeMode) {
      case 'bright':
        return { card: 'bg-white border border-slate-300 rounded-2xl p-5 shadow-sm', textMuted: 'text-slate-500', textWhite: 'text-slate-900' };
      case 'dusty-blue':
        return { card: 'bg-[#1e293b] border border-[#475569] rounded-2xl p-5 shadow-md', textMuted: 'text-slate-300', textWhite: 'text-white' };
      case 'dark':
      default:
        return { card: 'bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl', textMuted: 'text-slate-400', textWhite: 'text-white' };
    }
  };

  const styles = getThemeClasses();

  const cards = governanceCards?.cards ?? [];
  const orderedCards = [...cards].sort(
    (a, b) => CARD_ORDER.indexOf(a.id) - CARD_ORDER.indexOf(b.id)
  );

  return (
    <div className="space-y-6 animate-fadeIn" id="compliance-view-parent">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-teal-500/10 border border-teal-500/20">
            <ShieldCheck className="h-6 w-6 text-teal-400" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${styles.textWhite}`}>Compliance & Audit Center</h1>
            <p className={`text-xs ${styles.textMuted}`}>
              AllBright AgentOS — 5 Reflection Cards (spec §10), gated by the Independent Gatekeeper (§11).
            </p>
          </div>
        </div>
        {governanceCards?.generated_at && (
          <span className={`text-[10px] font-mono ${styles.textMuted}`}>
            published {new Date(governanceCards.generated_at).toLocaleString()}
          </span>
        )}
      </div>

      {!governanceCards && (
        <div className={`${styles.card} flex items-center space-x-3`}>
          <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
          <span className={`text-sm ${styles.textMuted}`}>Loading governance state…</span>
        </div>
      )}

      {governanceCards && governanceCards.available === false && (
        <div className={`${styles.card} border-amber-500/30`}>
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
            <div>
              <p className={`text-sm font-semibold ${styles.textWhite}`}>Governance pipeline not running</p>
              <p className={`text-xs ${styles.textMuted} mt-1`}>
                No Reflection Cards have been published yet. Run the AllBright AgentOS governance daemon
                (<code className="font-mono">crates/governance</code>) to produce the 5 verified cards.
                Until then, compliance status is <span className="font-semibold text-amber-400">UNVERIFIED</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {governanceCards && governanceCards.available && (
        <>
          <div className={`flex items-center space-x-4 text-xs font-mono ${styles.textMuted}`}>
            <span className="inline-flex items-center space-x-1.5">
              <CircleDot className="h-3.5 w-3.5 text-emerald-400" />
              <span>Approved: {governanceCards.approved}</span>
            </span>
            <span className="inline-flex items-center space-x-1.5">
              <CircleDot className="h-3.5 w-3.5 text-red-400" />
              <span>Rejected: {governanceCards.rejected}</span>
            </span>
            <span>
              Cards: {orderedCards.length}/5
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orderedCards.map((card) => {
              const s = STATUS_STYLES[card.status] ?? STATUS_STYLES.PendingVerification;
              return (
                <div key={card.id} className={styles.card}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-bold ${styles.textWhite}`}>{card.name}</h3>
                    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${s.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      <span>{s.label}</span>
                    </span>
                  </div>

                  {card.metrics.length === 0 ? (
                    <p className={`text-xs ${styles.textMuted}`}>No verified signals published.</p>
                  ) : (
                    <dl className="space-y-1.5">
                      {card.metrics.map((m) => (
                        <div key={m.name} className="flex items-center justify-between text-xs">
                          <dt className={`${styles.textMuted} font-mono`}>{m.name}</dt>
                          <dd className={`${styles.textWhite} font-mono font-semibold`}>
                            {m.value}
                            {m.unit && m.unit !== 'raw' ? ` ${m.unit}` : ''}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  <p className={`mt-3 text-[10px] ${styles.textMuted}`}>
                    last update: {formatTimestamp(card.last_update)}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
