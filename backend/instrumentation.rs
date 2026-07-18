// ==============================================================================
// Execution Instrumentation — real measurement source for KPIs.
//
// The KPI validation report (2026-07-13) flagged that 0/72 KPIs were
// instrumented (confidence 32/100). This module provides the missing
// measurement source: atomic counters for trades/gas/success/MEV plus a bounded
// latency ring buffer for P50/P95/P99, exported in Prometheus text format so
// the existing Prometheus + Alertmanager stack can scrape and alert on it.
//
// Zero external dependencies (std atomics only) to avoid rebuild risk.
// ==============================================================================

use std::sync::atomic::{AtomicU64, AtomicI64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

const LATENCY_WINDOW: usize = 1024;

struct Inner {
    /// Recent execution latencies in microseconds (ring buffer).
    latencies_us: [u64; LATENCY_WINDOW],
    idx: usize,
    filled: bool,
}

pub struct Instrumentation {
    /// Total trade attempts.
    pub trades_total: AtomicU64,
    /// Successful trades.
    pub trades_success: AtomicU64,
    /// Failed trades.
    pub trades_failed: AtomicU64,
    /// Cumulative gas cost in USD (fixed 1e6 scale to keep f64 precision in u64).
    pub gas_cost_usd_scaled: AtomicU64,
    /// Cumulative net profit in USD (fixed 1e6 scale; may be negative).
    pub net_profit_usd_scaled: AtomicI64,
    /// Consecutive losses (for circuit-breaker logic).
    pub consecutive_losses: AtomicU64,
    /// MEV-attack observations.
    pub mev_attacks: AtomicU64,
    /// Daily loss in USD (fixed 1e6 scale, reset daily).
    pub daily_loss_usd_scaled: AtomicI64,
    inner: Mutex<Inner>,
}

// Scale: store dollars * 1_000_000 as integer to avoid f64 atomics.
const SCALE: f64 = 1_000_000.0;

impl Instrumentation {
    pub fn new() -> Self {
        Self {
            trades_total: AtomicU64::new(0),
            trades_success: AtomicU64::new(0),
            trades_failed: AtomicU64::new(0),
            gas_cost_usd_scaled: AtomicU64::new(0),
            net_profit_usd_scaled: AtomicI64::new(0),
            consecutive_losses: AtomicU64::new(0),
            mev_attacks: AtomicU64::new(0),
            daily_loss_usd_scaled: AtomicI64::new(0),
            inner: Mutex::new(Inner {
                latencies_us: [0u64; LATENCY_WINDOW],
                idx: 0,
                filled: false,
            }),
        }
    }

    /// Record a single executed trade. `latency` is wall-clock execution time.
    pub fn record_trade(
        &self,
        latency: Duration,
        gas_cost_usd: f64,
        net_profit_usd: f64,
        success: bool,
        mev_attack: bool,
    ) {
        self.trades_total.fetch_add(1, Ordering::SeqCst);
        if success {
            self.trades_success.fetch_add(1, Ordering::SeqCst);
            self.consecutive_losses.store(0, Ordering::SeqCst);
        } else {
            self.trades_failed.fetch_add(1, Ordering::SeqCst);
            self.consecutive_losses.fetch_add(1, Ordering::SeqCst);
        }

        let gas_scaled = (gas_cost_usd * SCALE) as u64;
        self.gas_cost_usd_scaled.fetch_add(gas_scaled, Ordering::SeqCst);

        let profit_scaled = (net_profit_usd * SCALE) as i64;
        self.net_profit_usd_scaled.fetch_add(profit_scaled, Ordering::SeqCst);
        if net_profit_usd < 0.0 {
            let loss_scaled = (net_profit_usd.abs() * SCALE) as i64;
            self.daily_loss_usd_scaled.fetch_sub(loss_scaled, Ordering::SeqCst);
        }

        if mev_attack {
            self.mev_attacks.fetch_add(1, Ordering::SeqCst);
        }

        let micros = latency.as_micros() as u64;
        let mut g = self.inner.lock().unwrap();
        let idx = g.idx;
        g.latencies_us[idx] = micros;
        let next = (idx + 1) % LATENCY_WINDOW;
        g.idx = next;
        if next == 0 {
            g.filled = true;
        }
    }

    fn sorted_latencies(&self) -> Vec<u64> {
        let g = self.inner.lock().unwrap();
        let snapshot: Vec<u64> = if g.filled {
            g.latencies_us.to_vec()
        } else {
            g.latencies_us[..g.idx].to_vec()
        };
        let mut v = snapshot;
        v.sort_unstable();
        v
    }

    pub fn latency_percentile(&self, p: f64) -> f64 {
        let v = self.sorted_latencies();
        if v.is_empty() {
            return 0.0;
        }
        let rank = ((p / 100.0) * (v.len() as f64)).ceil() as usize;
        let idx = rank.saturating_sub(1).min(v.len() - 1);
        v[idx] as f64
    }

    pub fn p50_us(&self) -> f64 { self.latency_percentile(50.0) }
    pub fn p95_us(&self) -> f64 { self.latency_percentile(95.0) }
    pub fn p99_us(&self) -> f64 { self.latency_percentile(99.0) }

    pub fn success_rate(&self) -> f64 {
        let total = self.trades_total.load(Ordering::SeqCst);
        if total == 0 {
            0.0
        } else {
            self.trades_success.load(Ordering::SeqCst) as f64 / total as f64 * 100.0
        }
    }

    pub fn gas_cost_usd(&self) -> f64 {
        self.gas_cost_usd_scaled.load(Ordering::SeqCst) as f64 / SCALE
    }

    pub fn net_profit_usd(&self) -> f64 {
        self.net_profit_usd_scaled.load(Ordering::SeqCst) as f64 / SCALE
    }

    pub fn daily_loss_usd(&self) -> f64 {
        self.daily_loss_usd_scaled.load(Ordering::SeqCst) as f64 / SCALE
    }

    pub fn mev_attack_rate(&self) -> f64 {
        let total = self.trades_total.load(Ordering::SeqCst);
        if total == 0 {
            0.0
        } else {
            self.mev_attacks.load(Ordering::SeqCst) as f64 / total as f64 * 100.0
        }
    }

    /// Reset the daily loss accumulator (call at UTC midnight).
    pub fn reset_daily(&self) {
        self.daily_loss_usd_scaled.store(0, Ordering::SeqCst);
    }

    /// Export in Prometheus text exposition format.
    pub fn prometheus_export(&self) -> String {
        let p50 = self.p50_us();
        let p95 = self.p95_us();
        let p99 = self.p99_us();
        let success = self.success_rate();
        let gas = self.gas_cost_usd();
        let profit = self.net_profit_usd();
        let daily_loss = self.daily_loss_usd();
        let mev = self.mev_attack_rate();
        let consec = self.consecutive_losses.load(Ordering::SeqCst);

        format!(
            "# HELP allbright_trades_total Total trade attempts\n# TYPE allbright_trades_total counter\nallbright_trades_total {}\n\
# HELP allbright_trades_success Successful trades\n# TYPE allbright_trades_success counter\nallbright_trades_success {}\n\
# HELP allbright_trades_failed Failed trades\n# TYPE allbright_trades_failed counter\nallbright_trades_failed {}\n\
# HELP allbright_trade_latency_us_p50 P50 execution latency (microseconds)\n# TYPE allbright_trade_latency_us_p50 gauge\nallbright_trade_latency_us_p50 {:.0}\n\
# HELP allbright_trade_latency_us_p95 P95 execution latency (microseconds)\n# TYPE allbright_trade_latency_us_p95 gauge\nallbright_trade_latency_us_p95 {:.0}\n\
# HELP allbright_trade_latency_us_p99 P99 execution latency (microseconds)\n# TYPE allbright_trade_latency_us_p99 gauge\nallbright_trade_latency_us_p99 {:.0}\n\
# HELP allbright_success_rate_percent Trade success rate (%)\n# TYPE allbright_success_rate_percent gauge\nallbright_success_rate_percent {:.2}\n\
# HELP allbright_gas_cost_usd_total Cumulative gas cost (USD)\n# TYPE allbright_gas_cost_usd_total counter\nallbright_gas_cost_usd_total {:.2}\n\
# HELP allbright_net_profit_usd Cumulative net profit (USD)\n# TYPE allbright_net_profit_usd gauge\nallbright_net_profit_usd {:.2}\n\
# HELP allbright_daily_loss_usd Daily realized loss (USD, negative)\n# TYPE allbright_daily_loss_usd gauge\nallbright_daily_loss_usd {:.2}\n\
# HELP allbright_mev_attack_rate_percent MEV attack observation rate (%)\n# TYPE allbright_mev_attack_rate_percent gauge\nallbright_mev_attack_rate_percent {:.4}\n\
# HELP allbright_consecutive_losses Consecutive losing trades\n# TYPE allbright_consecutive_losses gauge\nallbright_consecutive_losses {}\n",
            self.trades_total.load(Ordering::SeqCst),
            self.trades_success.load(Ordering::SeqCst),
            self.trades_failed.load(Ordering::SeqCst),
            p50, p95, p99, success, gas, profit, daily_loss, mev, consec,
        )
    }
}

// Shared global instance.
pub static INSTRUMENTATION: once_cell::sync::Lazy<Instrumentation> =
    once_cell::sync::Lazy::new(Instrumentation::new);

/// Convenience: time a closure and record the trade result.
pub fn time_and_record<F, T>(
    f: F,
    gas_cost_usd: f64,
    net_profit_usd: f64,
    success: bool,
    mev_attack: bool,
) -> T
where
    F: FnOnce() -> T,
{
    let start = Instant::now();
    let result = f();
    INSTRUMENTATION.record_trade(start.elapsed(), gas_cost_usd, net_profit_usd, success, mev_attack);
    result
}
