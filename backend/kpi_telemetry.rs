// KPI Telemetry Collection & Baseline Estimation
// AllBright AgentOS — 72-KPI framework (spec §12.2: 6 domains x 12 KPIs).
// Integrates with existing TelemetryService for baseline tracking

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use dashmap::DashMap;

/// Represents a single KPI measurement at a point in time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasuredKpi {
    pub kpi_id: u8,           // KPI-01 through KPI-72
    pub pillar: SubSystem,
    pub measured_value: f64,
    pub baseline_value: f64,
    pub unit: String,
    pub timestamp_ms: u64,
    pub source_module: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum SubSystem {
    Profit = 1,        // KPIs 1-12, weight 30%
    Velocity = 2,     // KPIs 13-24, weight 25%
    Shield = 3,       // KPIs 25-36, weight 15%
    Efficiency = 4,   // KPIs 37-48, weight 15%
    Continuity = 5,   // KPIs 49-60, weight 10%
    Growth = 6,       // KPIs 61-72, weight 5%
}

impl SubSystem {
    pub fn weight(&self) -> f64 {
        match self {
            SubSystem::Profit => 0.30,
            SubSystem::Velocity => 0.25,
            SubSystem::Shield => 0.15,
            SubSystem::Efficiency => 0.15,
            SubSystem::Continuity => 0.10,
            SubSystem::Growth => 0.05,
        }
    }

    pub fn kpi_range(&self) -> (u8, u8) {
        match self {
            SubSystem::Profit => (1, 12),
            SubSystem::Velocity => (13, 24),
            SubSystem::Shield => (25, 36),
            SubSystem::Efficiency => (37, 48),
            SubSystem::Continuity => (49, 60),
            SubSystem::Growth => (61, 72),
        }
    }

    pub fn from_kpi_id(kpi_id: u8) -> Self {
        match kpi_id {
            1..=12 => SubSystem::Profit,
            13..=24 => SubSystem::Velocity,
            25..=36 => SubSystem::Shield,
            37..=48 => SubSystem::Efficiency,
            49..=60 => SubSystem::Continuity,
            61..=72 => SubSystem::Growth,
            _ => SubSystem::Profit,
        }
    }
}

/// AllBright AgentOS KPI domains (spec §12.2).
///
/// The spec defines six strategic domains of 12 KPIs each (72 total):
/// Profit, Velocity, Security, Quality, Efficiency, Growth.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum KpiDomain {
    /// Financial performance (spec §12.2)
    Profit,
    /// Speed of delivery (spec §12.2)
    Velocity,
    /// Security posture (spec §12.2)
    Security,
    /// Quality metrics (spec §12.2)
    Quality,
    /// Resource utilization (spec §12.2)
    Efficiency,
    /// Platform growth (spec §12.2)
    Growth,
}

impl KpiDomain {
    /// The six spec domains in canonical order (§12.2).
    pub fn all() -> [KpiDomain; 6] {
        [
            KpiDomain::Profit,
            KpiDomain::Velocity,
            KpiDomain::Security,
            KpiDomain::Quality,
            KpiDomain::Efficiency,
            KpiDomain::Growth,
        ]
    }

    /// KPIs per domain per the spec (6 domains x 12 = 72).
    pub fn kpi_count(&self) -> u8 {
        12
    }
}

impl SubSystem {
    /// Map an internal telemetry `SubSystem` to its governing spec [`KpiDomain`].
    ///
    /// | SubSystem    | Spec Domain | Rationale                                         |
    /// |---------------|-------------|---------------------------------------------------|
    /// | Profit        | Profit      | Financial performance projection                |
    /// | Velocity      | Velocity    | Speed of delivery / latency                      |
    /// | Shield        | Security    | Security posture                                  |
    /// | Efficiency    | Efficiency  | Resource utilization                            |
    /// | Continuity    | Quality     | Reliability / quality-of-service                 |
    /// | Growth        | Growth      | Platform / market growth & coverage              |
    ///
    /// NOTE: the spec specifies exactly 12 KPIs per domain (72 total).
    pub fn domain(&self) -> Option<KpiDomain> {
        match self {
            SubSystem::Profit => Some(KpiDomain::Profit),
            SubSystem::Velocity => Some(KpiDomain::Velocity),
            SubSystem::Shield => Some(KpiDomain::Security),
            SubSystem::Efficiency => Some(KpiDomain::Efficiency),
            SubSystem::Continuity => Some(KpiDomain::Quality),
            SubSystem::Growth => Some(KpiDomain::Growth),
        }
    }
}

/// Baseline estimator traits for algorithmic KPI estimation
pub trait BaselineEstimator {
    fn estimate(&self, context: &EstimationContext) -> f64;
    fn name(&self) -> &'static str;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstimationContext {
    pub fleet_size: u32,
    pub active_runners: u32,
    pub network_congestion: f64,
    pub gas_price_gwei: f64,
    pub pool_liquidity_usd: f64,
    pub regime: MarketRegime,
    pub flash_loan_utilization: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum MarketRegime {
    Bull,       // High volatility, high yield
    Bear,       // Low volatility, low yield
    Sideways,   // Neutral
    Volatile,   // Extreme volatility
}

/// SubSystem-specific baseline estimators
pub struct ProfitBaselineEstimator;
pub struct VelocityBaselineEstimator;
pub struct ShieldBaselineEstimator;
pub struct EfficiencyBaselineEstimator;
pub struct ContinuityBaselineEstimator;
pub struct GrowthBaselineEstimator;

impl BaselineEstimator for ProfitBaselineEstimator {
    fn estimate(&self, ctx: &EstimationContext) -> f64 {
        // Profit subsystem baseline: profit performance projection
        // Formula: base_profit * regime_factor * liquidity_factor
        let base_profit = 0.150; // ETH per trade baseline
        let regime_factor = match ctx.regime {
            MarketRegime::Bull => 1.15,
            MarketRegime::Bear => 0.85,
            MarketRegime::Sideways => 1.0,
            MarketRegime::Volatile => 1.25,
        };
        let liquidity_factor = (ctx.pool_liquidity_usd / 1_000_000.0).min(2.0).max(0.5);
        base_profit * regime_factor * liquidity_factor
    }

    fn name(&self) -> &'static str { "Profit" }
}

impl BaselineEstimator for VelocityBaselineEstimator {
    fn estimate(&self, ctx: &EstimationContext) -> f64 {
        // Velocity pillar baseline: latency projection
        // Formula: base_latency * (1 + congestion_penalty) * runner_scaling
        let base_latency_us = 19.8; // microseconds
        let congestion_penalty = ctx.network_congestion * 0.15;
        let runner_scaling = 1.0 + (ctx.fleet_size as f64 * 0.0001);
        base_latency_us * (1.0 + congestion_penalty) * runner_scaling
    }

    fn name(&self) -> &'static str { "Velocity" }
}

impl BaselineEstimator for ShieldBaselineEstimator {
    fn estimate(&self, ctx: &EstimationContext) -> f64 {
        // Shield pillar baseline: security score (0-100)
        // Formula: base_score * (1 - violation_rate) * compliance_factor
        let base_score = 100.0;
        let violation_rate = 0.0; // Target: zero violations
        let compliance_factor = if ctx.regime == MarketRegime::Volatile { 0.95 } else { 1.0 };
        base_score * (1.0 - violation_rate) * compliance_factor
    }

    fn name(&self) -> &'static str { "Shield" }
}

impl BaselineEstimator for EfficiencyBaselineEstimator {
    fn estimate(&self, ctx: &EstimationContext) -> f64 {
        let base_efficiency = ctx.flash_loan_utilization.max(0.0).min(1.0);
        let gas_optimization = 1.0 - (ctx.gas_price_gwei / 100.0).min(0.3);
        let network_factor = 1.0 - (ctx.network_congestion * 0.1);
        base_efficiency * gas_optimization * network_factor
    }

    fn name(&self) -> &'static str { "Efficiency" }
}

impl BaselineEstimator for ContinuityBaselineEstimator {
    fn estimate(&self, ctx: &EstimationContext) -> f64 {
        // Continuity pillar baseline: fleet uptime and sync
        // Formula: base_uptime * health_factor * sync_factor
        let base_uptime = 0.9995; // 99.95% baseline
        let health_factor = (ctx.active_runners as f64 / ctx.fleet_size as f64).max(0.9);
        let sync_factor = 0.999; // state sync overhead
        base_uptime * health_factor * sync_factor
    }

    fn name(&self) -> &'static str { "Continuity" }
}

impl BaselineEstimator for GrowthBaselineEstimator {
    fn estimate(&self, ctx: &EstimationContext) -> f64 {
        // Market share baseline: external observation metrics
        // Formula: base_observation * accuracy_factor * coverage_factor
        let base_observation = 0.88; // 88% baseline coverage
        let accuracy_factor = match ctx.regime {
            MarketRegime::Volatile => 0.85,
            _ => 0.95,
        };
        let coverage_factor = 0.90;
        base_observation * accuracy_factor * coverage_factor
    }

    fn name(&self) -> &'static str { "Growth" }
}

/// Central KPI telemetry collector
pub struct KpiTelemetryCollector {
    measurements: DashMap<u8, MeasuredKpi>,
    baselines: DashMap<SubSystem, Box<dyn BaselineEstimator + Send + Sync>>,
    estimation_context: AtomicU64, // Serialized EstimationContext (placeholder)
}

impl KpiTelemetryCollector {
    pub fn new() -> Self {
        let collector = Self {
            measurements: DashMap::new(),
            baselines: DashMap::new(),
            estimation_context: AtomicU64::new(0),
        };

        // Register baseline estimators for each pillar (6 pillars, 72 KPIs total)
        collector.register_estimator(SubSystem::Profit, Box::new(ProfitBaselineEstimator));
        collector.register_estimator(SubSystem::Velocity, Box::new(VelocityBaselineEstimator));
        collector.register_estimator(SubSystem::Shield, Box::new(ShieldBaselineEstimator));
        collector.register_estimator(SubSystem::Efficiency, Box::new(EfficiencyBaselineEstimator));
        collector.register_estimator(SubSystem::Continuity, Box::new(ContinuityBaselineEstimator));
        collector.register_estimator(SubSystem::Growth, Box::new(GrowthBaselineEstimator));

        collector
    }

    fn register_estimator(&self, pillar: SubSystem, estimator: Box<dyn BaselineEstimator + Send + Sync>) {
        self.baselines.insert(pillar, estimator);
    }

    pub fn record_kpi(&self, kpi: MeasuredKpi) {
        self.measurements.insert(kpi.kpi_id, kpi);
    }

    pub fn get_kpi(&self, kpi_id: u8) -> Option<MeasuredKpi> {
        self.measurements.get(&kpi_id).map(|r| r.clone())
    }

    pub fn get_pillar_kpis(&self, pillar: SubSystem) -> Vec<MeasuredKpi> {
        let (start, end) = pillar.kpi_range();
        self.measurements
            .iter()
            .filter(|entry| entry.kpi_id >= start && entry.kpi_id <= end)
            .map(|entry| entry.clone())
            .collect()
    }

    pub fn estimate_baseline(&self, kpi_id: u8, ctx: &EstimationContext) -> Option<f64> {
        let pillar = SubSystem::from_kpi_id(kpi_id);
        self.baselines.get(&pillar).map(|est| est.estimate(ctx))
    }

    pub fn compute_pillar_subtotal(&self, pillar: SubSystem, ctx: &EstimationContext) -> f64 {
        let kpis = self.get_pillar_kpis(pillar);
        if kpis.is_empty() {
            return 0.0;
        }

        let mut sum = 0.0;
        for kpi in &kpis {
            if let Some(baseline) = self.estimate_baseline(kpi.kpi_id, ctx) {
                let normalized = if baseline > 0.0 {
                    kpi.measured_value / baseline
                } else {
                    1.0
                };
                sum += normalized;
            }
        }
        sum / kpis.len() as f64
    }

    pub fn compute_apex(&self, ctx: &EstimationContext) -> f64 {
        let mut apex = 0.0;
        for pillar in [SubSystem::Profit, SubSystem::Velocity, SubSystem::Shield, SubSystem::Efficiency, SubSystem::Continuity, SubSystem::Growth] {
            let subtotal = self.compute_pillar_subtotal(pillar, ctx);
            apex += subtotal * pillar.weight();
        }
        apex
    }

    pub fn update_estimation_context(&self, ctx: EstimationContext) {
        // Placeholder: In production, serialize context to shared state
        // For now, we use thread-local or global state
        let _ = ctx;
    }
}

impl Default for KpiTelemetryCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pillar_weight_sum() {
        let total = SubSystem::Profit.weight()
            + SubSystem::Velocity.weight()
            + SubSystem::Shield.weight()
            + SubSystem::Efficiency.weight()
            + SubSystem::Continuity.weight()
            + SubSystem::Growth.weight();
        assert!((total - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_pillar_kpi_ranges() {
        assert_eq!(SubSystem::Profit.kpi_range(), (1, 12));
        assert_eq!(SubSystem::Velocity.kpi_range(), (13, 24));
        assert_eq!(SubSystem::Shield.kpi_range(), (25, 36));
        assert_eq!(SubSystem::Efficiency.kpi_range(), (37, 48));
        assert_eq!(SubSystem::Continuity.kpi_range(), (49, 60));
        assert_eq!(SubSystem::Growth.kpi_range(), (61, 72));
    }

    #[test]
    fn test_kpi_id_to_pillar() {
        assert_eq!(SubSystem::from_kpi_id(5), SubSystem::Profit);
        assert_eq!(SubSystem::from_kpi_id(15), SubSystem::Velocity);
        assert_eq!(SubSystem::from_kpi_id(30), SubSystem::Shield);
        assert_eq!(SubSystem::from_kpi_id(42), SubSystem::Efficiency);
        assert_eq!(SubSystem::from_kpi_id(55), SubSystem::Continuity);
        assert_eq!(SubSystem::from_kpi_id(68), SubSystem::Growth);
    }

    #[test]
    fn test_pillar_domain_mapping() {
        // Every core pillar maps to exactly one spec domain.
        assert_eq!(SubSystem::Profit.domain(), Some(KpiDomain::Profit));
        assert_eq!(SubSystem::Velocity.domain(), Some(KpiDomain::Velocity));
        assert_eq!(SubSystem::Shield.domain(), Some(KpiDomain::Security));
        assert_eq!(SubSystem::Efficiency.domain(), Some(KpiDomain::Efficiency));
        assert_eq!(SubSystem::Continuity.domain(), Some(KpiDomain::Quality));
        assert_eq!(SubSystem::Growth.domain(), Some(KpiDomain::Growth));
    }

    #[test]
    fn test_spec_domains_are_six() {
        assert_eq!(KpiDomain::all().len(), 6);
        let total: u32 = KpiDomain::all().iter().map(|d| d.kpi_count() as u32).sum();
        assert_eq!(total, 72);
    }
}