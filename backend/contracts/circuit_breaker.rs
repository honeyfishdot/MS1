// ==============================================================================
// CircuitBreaker Contract ABI and Types
// ==============================================================================

use ethers_core::types::Address;

pub const CIRCUIT_BREAKER_ABI: &str = r#"
[
  {
    "inputs": [],
    "name": "checkHalt",
    "outputs": [{"internalType": "bool", "name": "halted", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "reason", "type": "string"}],
    "name": "triggerPanicButton",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "resumeOperations",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isHalted",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
]
"#;

#[derive(Debug, Clone)]
pub struct CircuitBreakerClient {
    pub address: Address,
    pub abi: &'static str,
}

impl CircuitBreakerClient {
    pub fn new(address: Address) -> Self {
        Self {
            address,
            abi: CIRCUIT_BREAKER_ABI,
        }
    }

    pub fn contract_name(&self) -> &'static str {
        "CircuitBreaker"
    }
}
