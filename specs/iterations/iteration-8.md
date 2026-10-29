# Iteration 8: Balances, ERC-20 Tokens & Aggregate Portfolio

## Overview & Scope

Implements requirement **3.3 Balances and portfolio** (FR-BAL-01 through FR-BAL-08) from `specs/system-requirements.md`.

This iteration brings full multi-asset visibility to TermiWallet:
1. **Native ETH & ERC-20 Balances**: Display native asset balance alongside a configurable list of tracked ERC-20 tokens.
2. **Token Management**: Add ERC-20 tokens by contract address (auto-fetching `symbol`, `name`, and `decimals` from chain), with verification warnings for unverified contracts (FR-BAL-03, FR-BAL-08). Ability to hide/unhide tokens (FR-BAL-07).
3. **Preset Tokens**: Popular tokens pre-configured for Mainnet (USDC, USDT, DAI) and Sepolia (Sepolia USDC).
4. **Aggregate Portfolio View**: Toggle between active account balance and aggregate balance across all non-hidden accounts on the active network (FR-BAL-06).
5. **Periodic & Manual Refresh**: Auto-refresh balances every 30 seconds with loading indicator and "Last updated: HH:mm:ss" timestamp; immediate refresh with `[R]` (FR-BAL-04).
6. **Fiat Valuation (USD)**: Optional fiat valuation powered by CoinGecko API (with DeFiLlama/cached fallback and graceful degradation), configurable in `config.json` (FR-BAL-05).

---

## Architectural Decisions (from /grill-me Interview)

1. **Storage Model**:
   - Token metadata (`contractAddress`, `symbol`, `name`, `decimals`, `hidden`, `chainId`) is stored in `~/.termiwallet/config.json` within `AppConfig.tokens[chainId]`.
   - Public token definitions are network-wide and do not require re-encrypting the vault on token additions or visibility toggles.
2. **ERC-20 Contract Verification**:
   - Checks bytecode via `eth_getCode`.
   - Queries `name()`, `symbol()`, `decimals()`.
   - If contract call fails or contract is non-standard, surfaces a warning modal/dialog allowing the user to force add or cancel.
3. **Fiat Price Provider**:
   - CoinGecko public API as primary source; DeFiLlama / local cache as fallback.
   - Configurable in `config.json` (enabled by default, fallback to hiding fiat on failure/rate-limit).
4. **UI Integration**:
   - Dashboard displays native ETH + ERC-20 token list.
   - `[P]` toggles between **Single Account View** and **Aggregate Portfolio View** (sum of all visible accounts).
   - `[T]` opens the **Tokens Modal** (`TokensModal`) to inspect, hide/unhide, and add new tokens via `TokenFormModal`.
   - `[R]` triggers an on-demand refresh for all visible balances and fiat rates.
   - Auto-refresh timer runs every 30s.

---

## Requirements Traceability

| Requirement ID | Description | Priority | Implemented in Iteration 8 |
|---|---|---|---|
| **FR-BAL-01** | Display native ETH balance of selected account on active network | M | Yes |
| **FR-BAL-02** | Display ERC-20 balances for user-maintained token list | M | Yes |
| **FR-BAL-03** | Add token by contract address with on-chain metadata resolution | M | Yes |
| **FR-BAL-04** | Refresh periodically (30s) and on demand (`[R]`), with loading/last-updated state | M | Yes |
| **FR-BAL-05** | Optional fiat value (USD) using configurable price source | S | Yes |
| **FR-BAL-06** | Aggregate view across all accounts on active network (`[P]`) | S | Yes |
| **FR-BAL-07** | Hide and unhide tokens from list | S | Yes |
| **FR-BAL-08** | Warn when adding a token whose contract cannot be verified as ERC-20 | S | Yes |

---

## Technical Design

### Core Types & Interfaces (`src/core/types.ts` & `src/core/interfaces.ts`)

```typescript
export interface TokenConfig {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  chainId: number
  hidden?: boolean
  isPreset?: boolean
}

export interface TokenBalance extends TokenConfig {
  balance: bigint
  formattedBalance: string
  fiatValue?: string
}

export interface AggregatePortfolio {
  nativeBalance: bigint
  formattedNativeBalance: string
  tokens: TokenBalance[]
  totalFiatValue?: string
  lastUpdated: Date
}
```

### Services
1. **`TokenService`** (`ITokenService` in `src/services/token.service.ts`):
   - Handles token presets, adding tokens, verifying contracts, querying metadata (`name`, `symbol`, `decimals`), and toggling visibility.
2. **`PriceService`** (`IPriceService` in `src/services/price.service.ts`):
   - Fetches ETH and token fiat prices (USD) via CoinGecko/DeFiLlama with TTL caching and error degradation.
3. **`RpcService` extension**:
   - Add `getTokenBalance(tokenAddress: `0x${string}`, accountAddress: `0x${string}`): Promise<bigint>`
   - Add `getTokenMetadata(tokenAddress: `0x${string}`): Promise<{ name: string; symbol: string; decimals: number }>`

### UI Components & Hooks
- `usePortfolio` / `useTokens`: Hook managing polling (30s), manual refresh, aggregate calculation, and fiat price sync.
- `TokensModal`: OpenTUI modal listing tracked tokens with visibility toggles and `[A]` Add Token action.
- `TokenFormModal`: Input form for contract address with async on-chain validation and unverified contract warning.
- Updated `DashboardScreen`: Shows active/aggregate indicator, token balances list, and status/timestamps.

