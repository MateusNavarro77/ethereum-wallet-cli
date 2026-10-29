# Iteration 10: Native ETH & ERC-20 Transaction Flow (Completed)

## Overview & Scope

Implements the transaction sending system for TermiWallet according to SRS Item 3.5 ("Sending transactions") and Item 3.6 ("Gas and fees"):
1. **Core Transaction Service (`ITransactionService`)**:
   - Gas estimation for native ETH and ERC-20 transfers.
   - Fee presets (`low`, `medium`, `high`) with EIP-1559 (`maxFeePerGas`, `maxPriorityFeePerGas`) and legacy fallback.
   - Signing and broadcasting transactions for HD accounts (derived via mnemonic) and imported accounts (decrypted private key).
   - Watch-only account protection (signing blocked with clear error).
   - Transaction receipt polling and live status tracking (`pending`, `confirmed`, `failed`).
2. **Dedicated State Machine Hook (`useSendTransaction`)**:
   - Manages all stages, validations, and transitions of the transfer flow.
   - Validates recipient address format and EIP-55 checksum.
   - Validates amount against available balance and asset decimals.
   - Calculates "Send Max" automatically (deducting gas for native ETH transfers).
3. **Send Modal with Visual Stepper (`SendModal` & `SendStepper`)**:
   - Modal interface opened via hotkey `[E]` (or clickable action button) from Dashboard.
   - 4-step stepper component:
     - **Step 1: Recipient & Asset** — Choose native ETH or configured ERC-20 token; input and validate recipient address (EIP-55).
     - **Step 2: Amount** — Enter transfer amount, view available balance, or trigger `[M] Send Max`.
     - **Step 3: Gas Fee** — Choose fee preset (Low / Medium / High) with live estimated cost.
     - **Step 4: Review & Confirm** — Comprehensive summary screen (Network, Sender, Recipient, Amount, Gas, Total) with explicit confirmation to sign and broadcast.
     - **Post-Broadcast Live Status** — Displays transaction hash and real-time status updates (Pending → Confirmed / Failed).

---

## Requirements Coverage (SRS Section 3.5 & 3.6)

### Concluded in this Iteration (Must Have - M)

| Requirement ID | Description | Priority | Status in Iteration 10 |
|---|---|---|---|
| **FR-SND-01** | The system shall send native ETH to a recipient address. | **M** | **CONCLUIR** |
| **FR-SND-02** | The system shall send ERC-20 tokens to a recipient address. | **M** | **CONCLUIR** |
| **FR-SND-03** | The system shall validate recipient address format and EIP-55 checksum, and reject invalid input. | **M** | **CONCLUIR** |
| **FR-SND-05** | The system shall validate the amount against the available balance (including gas for native transfers) and decimals of the asset. | **M** | **CONCLUIR** |
| **FR-SND-06** | The system shall offer a "send max" option that accounts for gas on native transfers. | **M** | **CONCLUIR** |
| **FR-SND-07** | The system shall present a review screen showing network, sender, recipient, amount, estimated fee, and total before signing. | **M** | **CONCLUIR** |
| **FR-SND-08** | The system shall require explicit confirmation to sign and broadcast (with watch-only protection). | **M** | **CONCLUIR** |
| **FR-SND-09** | The system shall show the transaction hash and live status (pending, confirmed, failed) after broadcast. | **M** | **CONCLUIR** |
| **FR-GAS-01** | The system shall estimate gas limit and fee for each transaction before signing. | **M** | **CONCLUIR** |
| **FR-GAS-02** | The system shall use EIP-1559 fees (max fee and max priority fee) where supported and legacy gas price otherwise. | **M** | **CONCLUIR** |
| **FR-GAS-03** | The system shall offer fee presets (e.g., low, medium, high) derived from network conditions. | **M** | **CONCLUIR** |

### Pending Requirements (Deferred to Future Iterations)

| Requirement ID | Description | Priority | Status |
|---|---|---|---|
| **FR-SND-04** | The system shall resolve ENS names to addresses and show the resolved address for confirmation. | **S** | **PENDENTE** (Iteração futura) |
| **FR-SND-10** | The system shall warn when sending to an address the user has never interacted with, to a contract address, or to the sender's own address. | **S** | **PENDENTE** (Iteração futura) |
| **FR-SND-11** | The system shall allow selecting a recipient from the address book. | **S** | **PENDENTE** (Iteração futura) |
| **FR-SND-12** | The system shall support a dry run (simulation via eth_call or eth_estimateGas) and surface revert reasons before broadcast. | **S** | **PENDENTE** (Iteração futura) |
| **FR-SND-13** | The system shall allow advanced users to set the nonce and to attach custom calldata for native transfers. | **C** | **PENDENTE** (Iteração futura) |

---

## Architectural & Technical Design

### 1. Domain Types & Interfaces (`src/core/interfaces.ts` & `src/core/types.ts`)

```typescript
export type FeePresetLevel = "low" | "medium" | "high"

export interface FeePreset {
  level: FeePresetLevel
  label: string
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gasPrice?: bigint
  estimatedWaitSeconds: number
}

export interface GasFeePresets {
  isEip1559: boolean
  presets: Record<FeePresetLevel, FeePreset>
  baseFeePerGas?: bigint
}

export interface PrepareTransactionParams {
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  tokenAddress?: `0x${string}`
  tokenDecimals?: number
}

export interface GasEstimateResult {
  gasLimit: bigint
  estimatedFeeWei: bigint
  formattedFeeEth: string
  presets: GasFeePresets
}

export interface SendTransactionParams {
  account: Account
  to: `0x${string}`
  value: bigint
  mnemonic?: string
  masterPassword?: string
  token?: TokenConfig
  gasLimit?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  gasPrice?: bigint
}

export type TransactionStatus = "idle" | "broadcasting" | "pending" | "confirmed" | "failed"

export interface TransactionReceiptSummary {
  hash: `0x${string}`
  status: "success" | "reverted"
  blockNumber: bigint
  gasUsed: bigint
}

export interface ITransactionService {
  estimateGas(params: PrepareTransactionParams): Promise<GasEstimateResult>
  getFeePresets(): Promise<GasFeePresets>
  sendTransaction(params: SendTransactionParams): Promise<`0x${string}`>
  waitForReceipt(hash: `0x${string}`): Promise<TransactionReceiptSummary>
}
```

Registered with token `transactionService` in `src/core/tokens.ts` and bound in `src/container/index.ts`.

### 2. State Machine Hook (`src/ui/hooks/useSendTransaction.ts`)

Encapsulates:
- **Steps**:
  - `recipient-asset`: select asset (ETH or ERC-20), input recipient address with EIP-55 validation.
  - `amount`: enter amount, show available balance, [M] Send Max calculation.
  - `gas`: choose Low, Medium, or High preset.
  - `review`: review summary (sender, recipient, amount, fee, total).
  - `status`: broadcast status, pending spinner, confirmed txHash or error.
- **Validations**:
  - Validates valid address format (`isAddress` & checksum).
  - Rejects if account is `watch-only`.
  - Rejects if amount <= 0 or exceeds available balance (including gas fee for ETH).
- **Core services consumed**: `transactionService`, `rpcService`, `walletService`, `tokenService`, `networkService`.

### 3. UI Components (`src/ui/components/SendStepper.tsx` & `SendModal.tsx`)

- **Stepper**: Visual indication of current step (`[1] Recipient & Asset` → `[2] Amount` → `[3] Gas Fee` → `[4] Review`).
- **SendModal**:
  - Step 1: Input recipient address with validation indicator; select token or ETH.
  - Step 2: Amount input with `[M] Max` hotkey and formatted balance display.
  - Step 3: Gas fee preset selector (Low / Medium / High).
  - Step 4: Review summary table and explicit `[Enter]` to sign & broadcast.
  - Status display: Shows `Pending (confirming on chain...)` and `✔ Confirmed` with txHash.

### 4. Dashboard Integration (`src/ui/screens/DashboardScreen.tsx`)

- Hotkey `[E]` triggers opening `SendModal`.
- Clickable `[E] Send` button in the action bar.
- On confirmed transaction, automatically triggers `refreshPortfolio()`.

---

## Verification & Test Plan

1. **Transaction Service Unit Tests** (`tests/services/transaction.test.ts`):
   - Gas estimation for ETH transfers and ERC-20 transfers.
   - Fee presets generation (EIP-1559 and legacy gas price fallback).
   - Sending ETH from HD account and imported account.
   - Sending ERC-20 tokens via contract calldata.
   - Preventing sends from Watch-Only accounts.
   - Receipt polling and status reporting.
2. **Hook Unit Tests** (`tests/ui/hooks/useSendTransaction.test.tsx`):
   - Form state management and step transitions.
   - Address validation and error feedback.
   - Amount validation against balance and asset decimals.
   - "Send Max" calculation for ETH (balance - gas) and ERC-20 (full balance).
   - Broadcast state transitions (`idle` → `broadcasting` → `pending` → `confirmed`).
3. **UI Component Tests** (`tests/ui/components/send-modal.test.tsx`):
   - Modal rendering with Stepper component.
   - Navigation between steps with keyboard and buttons.
   - Review screen summary display.
   - Confirmation trigger and live status presentation.
4. **Integration & Regression Tests**:
   - `bun run typecheck`
   - `bun test`

