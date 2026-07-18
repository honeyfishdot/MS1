// ==============================================================================
// DUAL-RPC STATE CONSENSUS & BLOCK-STALENESS GUARD
// ==============================================================================
// Prevents stale/malicious RPC responses from executing invalid trades.
// Requires two independent RPC providers to agree on state before execution.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use reqwest::Client;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateProof {
    pub block_number: u64,
    pub block_hash: String,
    pub state_root: String,
    pub timestamp: i64,
    pub chain_id: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConsensusStatus {
    Agreed,
    Stale,
    Diverged,
    RpcFailure,
}

#[derive(Debug, Clone)]
pub struct ConsensusResult {
    pub status: ConsensusStatus,
    pub primary_proof: Option<StateProof>,
    pub secondary_proof: Option<StateProof>,
    pub block_delta: u64,
    pub latency_primary_ms: u64,
    pub latency_secondary_ms: u64,
}

#[derive(Debug, Clone)]
pub struct RpcConsensus {
    primary_rpc: String,
    secondary_rpc: String,
    client: Client,
    max_staleness_blocks: u64,
    max_latency_ms: u64,
    last_consensus: Arc<RwLock<Option<ConsensusResult>>>,
}

impl RpcConsensus {
    pub fn new(primary_rpc: impl Into<String>, secondary_rpc: impl Into<String>) -> Self {
        Self {
            primary_rpc: primary_rpc.into(),
            secondary_rpc: secondary_rpc.into(),
            client: Client::builder()
                .timeout(Duration::from_secs(5))
                .build()
                .unwrap_or_default(),
            max_staleness_blocks: 1,
            max_latency_ms: 2000,
            last_consensus: Arc::new(RwLock::new(None)),
        }
    }

    pub fn with_limits(mut self, max_staleness: u64, max_latency_ms: u64) -> Self {
        self.max_staleness_blocks = max_staleness;
        self.max_latency_ms = max_latency_ms;
        self
    }

    pub async fn verify_consensus(&self, chain_id: u64) -> Result<ConsensusResult, String> {
        let (primary_proof, primary_latency) = self.fetch_state_proof(&self.primary_rpc, chain_id).await?;
        let (secondary_proof, secondary_latency) = self.fetch_state_proof(&self.secondary_rpc, chain_id).await?;

        let status = match (&primary_proof, &secondary_proof) {
            (Some(p1), Some(p2)) => {
                if p1.block_hash == p2.block_hash && p1.state_root == p2.state_root {
                    let delta = p1.block_number.abs_diff(p2.block_number);
                    if delta <= self.max_staleness_blocks {
                        ConsensusStatus::Agreed
                    } else {
                        ConsensusStatus::Stale
                    }
                } else {
                    ConsensusStatus::Diverged
                }
            }
            (None, _) | (_, None) => ConsensusStatus::RpcFailure,
        };

        let block_delta = match (&primary_proof, &secondary_proof) {
            (Some(p1), Some(p2)) => p1.block_number.abs_diff(p2.block_number),
            _ => 0,
        };

        let result = ConsensusResult {
            status,
            primary_proof,
            secondary_proof,
            block_delta,
            latency_primary_ms: primary_latency,
            latency_secondary_ms: secondary_latency,
        };

        let mut guard = self.last_consensus.write().await;
        *guard = Some(result.clone());

        if status != ConsensusStatus::Agreed {
            return Err(format!(
                "RPC consensus failed: status={:?}, block_delta={}, primary_latency={}ms, secondary_latency={}ms",
                status, block_delta, primary_latency, secondary_latency
            ));
        }

        Ok(result)
    }

    pub async fn get_last_consensus(&self) -> Option<ConsensusResult> {
        let guard = self.last_consensus.read().await;
        guard.clone()
    }

    pub fn primary_rpc_url(&self) -> &str {
        &self.primary_rpc
    }

    async fn fetch_state_proof(&self, rpc_url: &str, chain_id: u64) -> Result<(Option<StateProof>, u64), String> {
        let start = Instant::now();
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "eth_getBlockByNumber",
            "params": ["latest", true],
            "id": 1
        });

        let resp = self.client.post(rpc_url).json(&body).send().await;
        let latency = start.elapsed().as_millis() as u64;

        let resp = match resp {
            Ok(r) => r,
            Err(_) => return Ok((None, latency)),
        };

        let json: serde_json::Value = match resp.json().await {
            Ok(j) => j,
            Err(_) => return Ok((None, latency)),
        };

        let result = json.get("result");
        if result.is_none() {
            return Ok((None, latency));
        }

        let block = result.unwrap();
        let block_number = match block.get("number") {
            Some(n) => u64::from_str_radix(n.as_str().unwrap_or("0x0").trim_start_matches("0x"), 16).unwrap_or(0),
            None => return Ok((None, latency)),
        };
        let block_hash = block.get("hash").and_then(|h| h.as_str()).unwrap_or("").to_string();
        let state_root = block.get("stateRoot").and_then(|s| s.as_str()).unwrap_or("").to_string();

        let proof = StateProof {
            block_number,
            block_hash,
            state_root,
            timestamp: chrono::Utc::now().timestamp(),
            chain_id,
        };

        Ok((Some(proof), latency))
    }

    pub async fn check_block_staleness(&self, expected_block: u64) -> Result<(), String> {
        let consensus = self.verify_consensus(1).await?;
        let latest = consensus.primary_proof
            .as_ref()
            .map(|p| p.block_number)
            .ok_or("No primary block data")?;

        let delta = latest.abs_diff(expected_block);
        if delta > self.max_staleness_blocks {
            return Err(format!(
                "Block stale: expected={}, latest={}, delta={}, max_staleness={}",
                expected_block, latest, delta, self.max_staleness_blocks
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_consensus_status_agreement() {
        let c = RpcConsensus::new("http://a", "http://b");
        assert_eq!(c.max_staleness_blocks, 1);
    }
}
