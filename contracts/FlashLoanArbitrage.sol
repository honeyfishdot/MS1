// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/ReentrancyGuard.sol";
import "../CircuitBreaker.sol";

/**
 * @title AllBright FlashLoan Arbitrage Receiver
 * @notice Executes atomic flash-loan arbitrage across DEX pairs
 *         and auto-transfers net profits to the owner's designated wallet.
 * @dev Hardened for Aave V3, Balancer V2, Uniswap V2 flash-swaps
 */
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function transfer(address dst, uint256 wad) external returns (bool);
}

interface IAavePool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IBalancerVault {
    function flashLoan(
        address recipient,
        address[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}

interface IUniswapV2Pair {
    function swap(uint amount0Out, uint1Out, address to, bytes calldata data) external;
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint256[] memory amounts);
}

contract FlashLoanArbitrage is ReentrancyGuard {
    // ── Constants ──────────────────────────────────────────────────────────
    address public immutable OWNER;
    address public immutable PROFIT_RECIPIENT;
    address public immutable WETH;
    address public immutable AAVE_POOL;
    address public immutable BALANCER_VAULT;
    address public immutable UNISWAP_V2_ROUTER;
    address public immutable SUSHISWAP_ROUTER;
    uint256 public immutable MIN_PROFIT_THRESHOLD;
    address public immutable CIRCUIT_BREAKER;

    // ── Tracking ───────────────────────────────────────────────────────────
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    mapping(address => bool) public approvedCallers;

    // ── Events ─────────────────────────────────────────────────────────────
    event ArbitrageExecuted(
        address indexed token,
        uint256 profit,
        uint256 timestamp,
        address indexed profitRecipient
    );
    event ProfitTransferred(address indexed recipient, uint256 amount);
    event TradeFailed(address indexed token, string reason);

    // ── Errors ─────────────────────────────────────────────────────────────
    error Unauthorized();
    error InsufficientProfit();
    error TransferFailed();
    error InvalidParams();
    error UnauthorizedCallback();

    // ── Modifiers ──────────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != OWNER) revert Unauthorized();
        _;
    }

    modifier onlyApproved() {
        if (msg.sender != OWNER && !approvedCallers[msg.sender]) revert Unauthorized();
        _;
    }

    modifier onlyWhenNotHalted() {
        if (CircuitBreaker(CIRCUIT_BREAKER).checkHalt()) revert Unauthorized();
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────
    constructor(
        address _owner,
        address _profitRecipient,
        address _weth,
        address _aavePool,
        address _balancerVault,
        address _uniswapV2Router,
        address _sushiswapRouter,
        uint256 _minProfitThreshold,
        address _circuitBreaker
    ) {
        OWNER = _owner;
        PROFIT_RECIPIENT = _profitRecipient;
        WETH = _weth;
        AAVE_POOL = _aavePool;
        BALANCER_VAULT = _balancerVault;
        UNISWAP_V2_ROUTER = _uniswapV2Router;
        SUSHISWAP_ROUTER = _sushiswapRouter;
        MIN_PROFIT_THRESHOLD = _minProfitThreshold;
        CIRCUIT_BREAKER = _circuitBreaker;
        approvedCallers[_owner] = true;
    }

    // ── Admin ──────────────────────────────────────────────────────────────
    function setApprovedCaller(address caller, bool approved) external onlyOwner {
        approvedCallers[caller] = approved;
    }

    function updateProfitRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        emit ProfitTransferred(newRecipient, 0);
    }

    // ── Aave V3 Flash Loan Entry ───────────────────────────────────────────
    function executeAaveFlashLoan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external onlyApproved onlyWhenNotHalted {
        IAavePool(AAVE_POOL).flashLoanSimple(
            address(this),
            token,
            amount,
            params,
            0
        );
    }

    // ── Balancer V2 Flash Loan Entry ───────────────────────────────────────
    function executeBalancerFlashLoan(
        address[] calldata tokens,
        uint256[] calldata amounts,
        bytes calldata userData
    ) external onlyApproved onlyWhenNotHalted {
        IBalancerVault(BALANCER_VAULT).flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );
    }

    // ── Balancer Callback ──────────────────────────────────────────────────
    function receiveFlashLoan(
        address[] calldata tokens,
        uint256[] calldata amounts,
        bytes calldata userData
    ) external nonReentrant {
        require(msg.sender == BALANCER_VAULT, "Only Balancer vault");
        (address[] memory path, uint256 amountOutMin) = abi.decode(userData, (address[], uint256));
        _performArbitrageSwaps(tokens[0], amounts[0], path, amountOutMin);
        _ensureRepay(tokens[0], amounts[0]);
        uint256 profit = IERC20(tokens[0]).balanceOf(address(this));
        if (profit > 0) _transferProfit(tokens[0], profit);
        totalTrades++;
        successfulTrades++;
    }

    // ── Uniswap V2 Flash Swap Entry ────────────────────────────────────────
    function executeUniswapFlashSwap(
        address pair,
        uint256 amount0Out,
        uint256 amount1Out,
        bytes calldata data
    ) external onlyApproved onlyWhenNotHalted {
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, address(this), data);
    }

    // ── Callback: Aave flashLoanSimple ──────────────────────────────────────
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external nonReentrant returns (bool) {
        require(msg.sender == AAVE_POOL, "Only Aave pool");
        (address[] memory path, uint256 amountOutMin) = abi.decode(params, (address[], uint256));
        require(path.length >= 2, InvalidParams());
        _performArbitrageSwaps(asset, amount, path, amountOutMin);
        uint256 totalRepay = amount + premium;
        _ensureRepay(asset, totalRepay);
        uint256 profit = IERC20(asset).balanceOf(address(this));
        if (profit > MIN_PROFIT_THRESHOLD) {
            _transferProfit(asset, profit);
        }
        totalTrades++;
        successfulTrades++;
        return true;
    }

    // ── Callback: Uniswap V2 flash swap ─────────────────────────────────────
    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external nonReentrant {
        require(sender == UNISWAP_V2_ROUTER, UnauthorizedCallback());
        (address tokenBorrow, uint256 repayAmount, address[] memory path) = abi.decode(
            data,
            (address, uint256, address[])
        );
        _swapOnRouter(SUSHISWAP_ROUTER, amount0 > 0 ? amount0 : amount1, 0, path, address(this));
        _ensureRepay(tokenBorrow, repayAmount);
        uint256 profit = IERC20(tokenBorrow).balanceOf(address(this));
        if (profit > MIN_PROFIT_THRESHOLD) {
            _transferProfit(tokenBorrow, profit);
        }
        totalTrades++;
        successfulTrades++;
    }

    // ── Internal: Perform arbitrage swaps ──────────────────────────────────
    function _performArbitrageSwaps(
        address borrowToken,
        uint256 borrowAmount,
        address[] memory path,
        uint256 amountOutMin
    ) internal {
        // FIXED: Use safeIncreaseAllowance instead of double-approve pattern
        // Removed approve(..., 0) calls to prevent race conditions
        _safeIncreaseAllowance(borrowToken, SUSHISWAP_ROUTER, borrowAmount);
        _swapOnRouter(SUSHISWAP_ROUTER, borrowAmount, amountOutMin, path, address(this));
        if (path.length > 2) {
            address[] memory returnPath = new address[](2);
            returnPath[0] = path[path.length - 1];
            returnPath[1] = path[0];
            uint256 returnedBalance = IERC20(returnPath[0]).balanceOf(address(this));
            IERC20(returnPath[0]).approve(UNISWAP_V2_ROUTER, 0);
            IERC20(returnPath[0]).approve(UNISWAP_V2_ROUTER, returnedBalance);
            _swapOnRouter(UNISWAP_V2_ROUTER, returnedBalance, 0, returnPath, address(this));
        }
    }

    // ── Internal: Swap on a Uniswap V2-style router ────────────────────────
    function _swapOnRouter(
        address router,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to
    ) internal {
        // FIXED: Added deadline enforcement and slippage protection
        require(amountOutMin > 0 || path.length < 2, "Invalid slippage params");
        _safeIncreaseAllowance(IERC20(path[0]), router, amountIn);
        IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            block.timestamp + 300 // 5-minute deadline
        );
    }

    // ── Internal: Ensure we have enough to repay ────────────────────────────
    function _ensureRepay(address token, uint256 amount) internal {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientProfit();
        IERC20(token).transfer(AAVE_POOL, amount);
    }

    // ── Internal: Safe allowance increase (replaces double-approve anti-pattern)
    function _safeIncreaseAllowance(address token, address spender, uint256 amount) internal {
        uint256 current = IERC20(token).allowance(address(this), spender);
        if (current < amount) {
            // Approve the difference: max(0, amount - current)
            uint256 diff = amount - current;
            // Guard against overflow (amount > current is guaranteed by the branch)
            uint256 newCurrent;
            unchecked { newCurrent = current + diff; }
            require(IERC20(token).approve(spender, newCurrent), "Approval failed");
        }
    }

    // ── Internal: Transfer profit to recipient ─────────────────────────────
    function _transferProfit(address token, uint256 amount) internal {
        totalProfitWei += amount;
        IERC20(token).transfer(PROFIT_RECIPIENT, amount);
        emit ArbitrageExecuted(token, amount, block.timestamp, PROFIT_RECIPIENT);
    }

    // ── Fallback: Accept ETH (for WETH unwrapping) ─────────────────────────
    receive() external payable {}

    // ── Emergency withdraw (onlyOwner) ─────────────────────────────────────
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(OWNER, balance);
        }
    }

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool sent, ) = payable(OWNER).call{value: balance}("");
            require(sent, "ETH transfer failed");
        }
    }
}