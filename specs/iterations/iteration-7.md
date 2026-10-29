# Iteration 7: Networks and RPC Management [DONE]

**Status:** Completed  
**Completed Date:** 2026-10-27  
**Target:** Section 3.9 Networks and RPC (FR-NET-01 through FR-NET-08)

---

## 1. Goal

Implement all functional requirements defined in Section 3.9 (*Networks and RPC*) of `specs/system-requirements.md`:

| Requirement ID | Priority | Description | Target Implementation |
| :--- | :---: | :--- | :--- |
| **FR-NET-01** | **M** | Ship with presets for Ethereum mainnet and at least one test network (e.g., Sepolia). | Built-in presets: Ethereum Mainnet (`1`), Sepolia Testnet (`11155111`), and Anvil/Localhost (`31337`). |
| **FR-NET-02** | **M** | Let the user switch the active network at any time, with active network and chain ID always visible. | Switch network via `[N]` Networks Modal; active network name, chain ID, and status badge displayed in Header and Dashboard. |
| **FR-NET-03** | **M** | Let the user add, edit, and remove custom EVM networks (name, RPC URL, chain ID, currency symbol, block explorer URL). | Add (`a`), edit (`e`), and delete (`d`) custom networks inside `NetworksModal`. Presets are protected from deletion. |
| **FR-NET-04** | **M** | Verify that a custom RPC's reported chain ID matches the configured one and reject it otherwise. | Mandatory RPC connection verification: queries `eth_chainId`. Validates match or auto-detects chain ID if omitted; rejects invalid/unreachable endpoints. |
| **FR-NET-05** | **S** | Support multiple RPC endpoints per network with fallback on failure. | `NetworkConfig.rpcUrls: string[]` configured via comma-separated URLs; uses viem `fallback([http(...), ...])` transport. |
| **FR-NET-06** | **M** | Support local development nodes (e.g., Anvil at `http://127.0.0.1:8545`). | Pre-configured Anvil preset (`chainId: 31337`, `rpcUrl: "http://127.0.0.1:8545"`). |
| **FR-NET-07** | **M** | Show connection status and latest block number for the active network. | Polling connection status and `eth_blockNumber` (10-15s interval + immediate on switch or manual `[R]` refresh) shown as `🟢 #21458923` or `🔴 Disconnected`. |
| **FR-NET-08** | **M** | Clearly distinguish test networks from mainnet in the UI (e.g., persistent colored badge). | Visual badges: `[MAINNET]` in bright green (`#10B981`), `[TESTNET: Sepolia]` in yellow/amber (`#F59E0B`), and `[LOCAL: Anvil]` in cyan (`#06B6D4`). |

---

## 2. Architecture & Design Decisions

| Component | Selected Strategy | Rationale |
| :--- | :--- | :--- |
| **Configuration Storage** | Plain JSON (`~/.termiwallet/config.json`) | Decouples non-secret preferences (`activeChainId` and `customNetworks`) from the encrypted vault (`vault.json`), eliminating master password re-encryption requirements on network switch while aligning with FR-SET-01. |
| **Network Presets** | Built-in Constants: Mainnet, Sepolia, Anvil | Immutable system presets stored in code. Protected against deletion or accidental overwrite. |
| **Service Layer** | Dedicated `INetworkService` (`networkService`) | Adheres to SRP: `NetworkService` manages network list, active network state, custom network CRUD, chain validation, and status polling, delegating raw RPC transports to `IRpcService`. |
| **RPC Client & Fallback** | Viem `createPublicClient` with `fallback(...)` transport | Supports comma-separated list of RPC URLs per network (`rpcUrls: string[]`). Automatically fails over when an endpoint is slow or unreachable. |
| **Chain Verification** | Pre-flight `eth_chainId` check | Before saving any custom network, calls `eth_chainId` on the target RPC. Auto-detects chain ID if blank or rejects on mismatch/timeout. |
| **UI Pattern** | `NetworksModal` (`[N]` hotkey on Dashboard) | Consistent with `AccountsModal` (`[A]`); lists networks with status badges, allows quick switching (`Enter`), adding (`a`), editing (`e`), deleting (`d`), and closing (`Esc`). |
| **Header & Dashboard Indicators** | Persistent Badges & Live Block Indicator | Persistent header tag (`[MAINNET]`, `[TESTNET]`, `[LOCAL]`) + live block number / connection indicator (`🟢 #...` or `🔴 Offline`). |
| **Polling Strategy** | Soft Polling (12s) + Event Refresh | Non-blocking periodic check while Dashboard is mounted, plus immediate refresh on network switch or `r` hotkey. |

---

## 3. Data Models & Domain Interfaces

### 3.1 Domain Types (`src/core/types.ts`)

```typescript
export interface NetworkConfig {
  chainId: number
  name: string
  rpcUrl: string // primary RPC endpoint
  rpcUrls?: string[] // optional list of endpoints for fallback
  symbol: string
  explorerUrl?: string
  isTestnet?: boolean
  isLocal?: boolean
}

export const MAINNET_NETWORK: NetworkConfig = {
  chainId: 1,
  name: "Ethereum Mainnet",
  rpcUrl: "https://ethereum-rpc.publicnode.com",
  symbol: "ETH",
  explorerUrl: "https://etherscan.io",
  isTestnet: false,
}

export const SEPOLIA_NETWORK: NetworkConfig = {
  chainId: 11155111,
  name: "Ethereum Sepolia",
  rpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  symbol: "SEP",
  explorerUrl: "https://sepolia.etherscan.io",
  isTestnet: true,
}

export const ANVIL_NETWORK: NetworkConfig = {
  chainId: 31337,
  name: "Anvil Localhost",
  rpcUrl: "http://127.0.0.1:8545",
  symbol: "ETH",
  isTestnet: true,
  isLocal: true,
}

export const PRESET_NETWORKS: NetworkConfig[] = [
  MAINNET_NETWORK,
  SEPOLIA_NETWORK,
  ANVIL_NETWORK,
]
```

### 3.2 Service Interfaces (`src/core/interfaces.ts`)

```typescript
export interface IRpcService {
  getBalance(address: `0x${string}`, chainId?: number): Promise<bigint>
  getBlockNumber(): Promise<bigint>
  verifyRpc(rpcUrl: string, expectedChainId?: number): Promise<{ chainId: number; healthy: boolean }>
  switchNetwork(network: NetworkConfig): void
  formatEther(wei: bigint): string
  getNetwork(chainId?: number): NetworkConfig
}

export interface NetworkConnectionStatus {
  connected: boolean
  blockNumber?: bigint
  latencyMs?: number
  error?: string
}

export interface INetworkService {
  getActiveNetwork(): NetworkConfig
  setActiveNetwork(chainId: number): Promise<void>
  getAllNetworks(): NetworkConfig[]
  getPresets(): NetworkConfig[]
  getCustomNetworks(): NetworkConfig[]
  addCustomNetwork(network: Omit<NetworkConfig, "isTestnet" | "isLocal">): Promise<NetworkConfig>
  editCustomNetwork(chainId: number, updates: Partial<NetworkConfig>): Promise<NetworkConfig>
  removeCustomNetwork(chainId: number): Promise<void>
  verifyRpcEndpoint(rpcUrl: string, expectedChainId?: number): Promise<{ chainId: number; healthy: boolean }>
  getConnectionStatus(): Promise<NetworkConnectionStatus>
}
```

---

## 4. Implementation Steps

1. **Core Types & Interfaces**:
   - Update `NetworkConfig` with `rpcUrls`, `isTestnet`, `isLocal`.
   - Define `MAINNET_NETWORK`, `SEPOLIA_NETWORK`, `ANVIL_NETWORK`, and `PRESET_NETWORKS`.
   - Update `WalletData` with `customNetworks?: NetworkConfig[]` and `activeChainId?: number`.
   - Add `INetworkService` and expand `IRpcService` in `interfaces.ts`.
   - Register `networkService` in `src/core/tokens.ts`.

2. **RPC Service Updates (`src/services/rpc.service.ts`)**:
   - Support `fallback([http(...)])` transport when multiple RPC URLs are provided.
   - Implement `getBlockNumber()` and `verifyRpc(rpcUrl, expectedChainId)`.
   - Implement `switchNetwork(network: NetworkConfig)` to reconfigure the public client dynamically.

3. **Network Service Implementation (`src/services/network.service.ts`)**:
   - Merge presets and custom networks from wallet vault.
   - Implement active network switching, ensuring vault persistence.
   - Implement custom network validation and CRUD with protection for preset networks.
   - Implement connection status checks with error handling.

4. **Container & Hooks Integration**:
   - Register `networkService` singleton in `src/container/index.ts`.
   - Create `useNetwork` hook for status polling, active network state, and block numbers.
   - Update `useBalance` to refresh whenever active network changes.

5. **UI Components & Modals**:
   - Create `NetworksModal.tsx` (`[N]` hotkey): list networks, switch with `Enter`, add with `a`, edit with `e`, delete with `d`.
   - Create `NetworkFormModal.tsx`: navigable inputs for Name, RPC URL(s), Chain ID, Symbol, Explorer.
   - Update Header & Dashboard to display network badge (`[MAINNET]`, `[TESTNET]`, `[LOCAL]`) and live block connection status.

6. **Automated Testing**:
   - Unit tests for `NetworkService`: presets, custom network addition, chain verification, removal protection.
   - Unit tests for `RpcService`: block number, fallback transport, dynamic network switching.
   - UI tests for `NetworksModal`, network switching, and live badge rendering.
