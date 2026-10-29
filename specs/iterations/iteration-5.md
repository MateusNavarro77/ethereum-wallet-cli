# Iteration 5: Multi-Account Management, Keystore & Key Import/Export, and Backup Verification [DONE]

**Status:** Completed  
**Completed Date:** 2026-10-27  
**Target:** Section 3.1 Wallet and Account Management (M & S Requirements)  

---

## 1. Goal

Implement all **Must (M)** and **Should (S)** functional requirements defined in Section 3.1 (*Wallet and account management*) of `specs/system-requirements.md`:

| Requirement ID | Priority | Description | Target Implementation |
| :--- | :---: | :--- | :--- |
| **FR-ACC-01** | **M** | Create a new HD wallet with a BIP-39 mnemonic (12 or 24 words). | Prompt user to select between 12 words (standard) or 24 words (high security) before generating. |
| **FR-ACC-02** | **M** | Require user to confirm mnemonic backup before finishing creation. | Random 3-word challenge: prompt user to enter 3 randomly selected words by position (e.g., words #3, #7, #11). |
| **FR-ACC-03** | **M** | Import a wallet from a BIP-39 mnemonic. | Support both 12 and 24 words with grid input and automatic word-count detection on paste. |
| **FR-ACC-04** | **M** | Import a single account from a raw private key. | Validate 32-byte hex key, derive address, label it, and store encrypted in the vault. |
| **FR-ACC-05** | **S** | Import an account from an encrypted JSON keystore file (Web3 Secret Storage v3). | Local file path input + password decryption (with raw JSON string fallback); supports scrypt/pbkdf2 and aes-128-ctr/cbc. |
| **FR-ACC-06** | **M** | Derive multiple accounts from one mnemonic using path `m/44'/60'/0'/0/n`. | Sequential derivation maintaining address index counters and storing derived account metadata in the vault. |
| **FR-ACC-07** | **M** | Add the next derived account and rename any account with a local label. | `[N]` Add next account and `[R]` Rename account in the Account Manager modal. |
| **FR-ACC-08** | **S** | Support watch-only accounts (address only, no signing). | Add address-only accounts tagged as `[Watch-Only]` that fetch balances but disable private key export and signing. |
| **FR-ACC-09** | **M** | Export mnemonic or private key only after re-authentication and clear warning. | Master password prompt -> high-visibility security warning screen -> masked cleartext (`••••••••`) with `[Space]` reveal and `[C]` copy. |
| **FR-ACC-10** | **S** | Hide or remove an account from the list without deleting the underlying wallet. | `[H]` Hide/unhide HD or imported accounts; `[D]` permanently remove imported accounts (with confirmation). The primary account is protected. |

*(Note: FR-ACC-11 "custom derivation path" is priority **C** and excluded from this iteration).*

---

## 2. Architecture & Design Decisions

| Component | Selected Strategy | Rationale |
| :--- | :--- | :--- |
| **Vault Model** | **Hybrid Vault** (`vault.json`) | Single vault holds optional master HD mnemonic, plus an array of accounts supporting derived HD keys, imported raw private keys, imported JSON keystores, and watch-only addresses. |
| **Account Classification** | Polymorphic Account Discriminator | Each account in `WalletData.accounts` has `type: "hd" \| "imported" \| "watch-only"`, along with `hidden?: boolean`, `label: string`, and `address: \`0x${string}\``. |
| **Imported Key Storage** | Individually Encrypted Key Payloads | Raw imported private keys are stored encrypted within the vault payload alongside the master mnemonic, keeping all secrets at rest encrypted by the master password. |
| **Mnemonic Length** | 12 or 24 Words (128-bit vs 256-bit entropy) | `generateMnemonic(english, 128)` for 12 words, `generateMnemonic(english, 256)` for 24 words. Import screen adapts grid layout dynamically based on selection or pasted input. |
| **Backup Verification** | Random 3-Word Position Challenge | After showing the phrase, randomly pick 3 distinct positions (e.g., #2, #6, #10). Wallet creation proceeds only when all 3 match the generated mnemonic. |
| **Keystore v3 Engine** | Built-in Node/Bun Crypto Keystore Decryptor | Zero extra runtime dependencies: uses `node:crypto` (`scryptSync`, `pbkdf2Sync`, `createDecipheriv`) and `viem` (`keccak256`) to decode standard Web3 v3 JSON keystores. |
| **UI Account Switcher** | Quick Switch `[Tab]` + Manager Modal `[A]` | `[Tab]` or `[←/→]` cycles active visible accounts directly on the Dashboard. `[A]` opens the Account Manager modal for derivation, renaming, importing, and hiding/removing. |
| **Export Security** | Re-Auth -> Security Warning -> Masked Reveal | Requires master password re-entry. Shows red danger banner, masks content by default (`••••••••`), and requires deliberate `[Space]` toggle to reveal. Watch-only accounts disallow private key export. |
| **Account Lifecycle** | Safe Hide vs Removal | HD derived accounts can be hidden/unhidden (preserves derivation hierarchy). Standalone imported accounts can be removed with a confirmation prompt. Primary account (index 0) cannot be deleted or hidden. |

---

## 3. Data Models & Domain Interfaces

### 3.1 Domain Types (`src/core/types.ts`)

```typescript
export type AccountType = "hd" | "imported" | "watch-only"

export interface BaseAccount {
  address: `0x${string}`
  label: string
  type: AccountType
  hidden?: boolean
  createdAt: string
}

export interface HdAccount extends BaseAccount {
  type: "hd"
  index: number // m/44'/60'/0'/0/index
}

export interface ImportedAccount extends BaseAccount {
  type: "imported"
  // Private key encrypted at rest inside vault data
  encryptedPrivateKey: string
}

export interface WatchOnlyAccount extends BaseAccount {
  type: "watch-only"
}

export type Account = HdAccount | ImportedAccount | WatchOnlyAccount

export interface WalletData {
  version: 2
  mnemonic?: string // Optional if initialized strictly with imported account
  accounts: Account[]
  activeAddress: `0x${string}`
  defaultChainId: number
}
```

### 3.2 Keystore Schema (`src/core/keystore.ts`)

```typescript
export interface Web3KeystoreV3 {
  version: 3
  id: string
  address: string
  crypto: {
    ciphertext: string
    cipherparams: {
      iv: string
    }
    cipher: string
    kdf: "scrypt" | "pbkdf2"
    kdfparams: {
      dklen: number
      salt: string
      n?: number
      r?: number
      p?: number
      c?: number
      prf?: string
    }
    mac: string
  }
}
```

### 3.3 Service Contracts (`src/core/interfaces.ts`)

```typescript
export interface IKeystoreService {
  parseKeystoreJson(content: string): Web3KeystoreV3
  decryptKeystore(keystore: Web3KeystoreV3, password: string): Promise<`0x${string}`>
}

export interface IWalletService {
  generateMnemonic(wordCount?: 12 | 24): string
  validateMnemonic(mnemonic: string): boolean
  deriveAccount(mnemonic: string, accountIndex?: number, label?: string): HdAccount
  createWallet(mnemonic: string, defaultLabel?: string): WalletData
  importWallet(mnemonic: string, defaultLabel?: string): WalletData
  
  // Multi-Account Operations
  getNextDerivationIndex(wallet: WalletData): number
  addDerivedAccount(wallet: WalletData, label?: string): { wallet: WalletData; account: HdAccount }
  importPrivateKey(wallet: WalletData, privateKey: string, label: string, masterPassword: string): Promise<{ wallet: WalletData; account: ImportedAccount }>
  importKeystore(wallet: WalletData, keystoreJson: string, keystorePassword: string, label: string, masterPassword: string): Promise<{ wallet: WalletData; account: ImportedAccount }>
  addWatchOnlyAccount(wallet: WalletData, address: string, label: string): { wallet: WalletData; account: WatchOnlyAccount }
  
  // Management & Lifecycle
  renameAccount(wallet: WalletData, address: `0x${string}`, newLabel: string): WalletData
  toggleHideAccount(wallet: WalletData, address: `0x${string}`): WalletData
  removeAccount(wallet: WalletData, address: `0x${string}`): WalletData
  
  // Export Credentials
  getExportPrivateKey(wallet: WalletData, address: `0x${string}`, masterPassword: string): Promise<`0x${string}`>
  getExportMnemonic(wallet: WalletData): string
}
```

---

## 4. Implementation Steps

### Phase 1: Core Domain & Vault Migration
1. **Extend `src/core/types.ts`**:
   - Define `AccountType`, `HdAccount`, `ImportedAccount`, `WatchOnlyAccount`, `Account`, and updated `WalletData` (v2).
   - Implement backwards-compatible migration for existing v1 vaults (converts legacy `accounts` into `HdAccount[]` and sets `activeAddress`).
2. **Web3 Keystore Decryptor (`src/services/keystore.service.ts`)**:
   - Implement `IKeystoreService` supporting standard Web3 Secret Storage v3.
   - Support `scrypt` and `pbkdf2` KDF routines with MAC validation via `viem.keccak256`.
   - Support `aes-128-ctr` and `aes-128-cbc` decryption.
   - Comprehensive test suite in `tests/keystore.test.ts`.

### Phase 2: Wallet Service Enhancements
1. **12 & 24-Word Generation & Validation**:
   - Update `WalletService.generateMnemonic(wordCount: 12 | 24)` using 128-bit / 256-bit entropy.
   - Update `validateMnemonic` to support both lengths.
2. **Account Management Logic**:
   - Implement `addDerivedAccount`, finding the lowest unused BIP-44 index.
   - Implement `importPrivateKey` with private key format sanitization and checksum verification.
   - Implement `importKeystore` using `KeystoreService`.
   - Implement `addWatchOnlyAccount` validating EIP-55 checksums.
   - Implement `renameAccount`, `toggleHideAccount`, and `removeAccount` (protecting index 0).
3. **Key Export Helpers**:
   - Implement `getExportPrivateKey` (deriving from mnemonic for HD accounts, or decrypting payload for imported accounts; rejects watch-only).
   - Implement `getExportMnemonic` (ensures mnemonic exists).
4. **Unit Tests**:
   - Add test coverage in `tests/wallet.test.ts` for 12/24 words, multiple derived indices, private key imports, keystore imports, watch-only rules, and export security.

### Phase 3: Onboarding & Backup UX Enhancements
1. **Mnemonic Creation Flow (`MnemonicScreen.tsx`)**:
   - Step 1: Word Count Selection (12 vs 24 words).
   - Step 2: Formatted recovery phrase display.
   - Step 3: Random 3-Word Challenge (prompts user to enter words at 3 random indices). Creation only completes when verified.
2. **Smart Import Screen (`ImportScreen.tsx`)**:
   - Toggle between 12-word and 24-word grid inputs.
   - Auto-detect pasted text: 12 words fill 12 fields; 24 words switch to 24 fields and distribute automatically.

### Phase 4: Account Switcher & Account Manager TUI
1. **Account Manager Modal / Screen (`AccountsModal.tsx`)**:
   - List all accounts with index badges (`[HD-0]`, `[Imported]`, `[Watch-Only]`), address, balance, and `(Hidden)` tags.
   - Hotkeys:
     - `[Enter]` Select active account
     - `[N]` Add next derived HD account
     - `[R]` Rename account label
     - `[I]` Import account submenu (`[1] Private Key`, `[2] JSON Keystore`, `[3] Watch-Only`)
     - `[H]` Toggle Hide / Unhide
     - `[D]` Remove imported account (with confirmation)
     - `[E]` Export Account Private Key
     - `[M]` Export Wallet Mnemonic
     - `[Esc]` Close modal
2. **Dashboard Integration (`DashboardScreen.tsx`)**:
   - Header shows currently active account label and badge.
   - `[Tab]` or `[←/→]` to cycle between active visible accounts.
   - `[A]` opens the Account Manager Modal.

### Phase 5: Re-Authentication & Key Export Flow
1. **Export Security Modal (`ExportModal.tsx`)**:
   - Step 1: Re-authenticate with master password.
   - Step 2: Prominent red security warning dialog.
   - Step 3: Sensitive credential display, masked with `••••••••••••••••` by default.
   - Controls: `[Space]` Reveal/Mask toggle, `[C]` Copy to clipboard, `[Esc]` Exit and clear from memory.

### Phase 6: Automated Testing & Verification
1. **Unit & Integration Tests**:
   - `tests/keystore.test.ts`: Decryption of valid standard v3 keystores, invalid password rejections, malformed keystores.
   - `tests/wallet.test.ts`: 12/24 word generation, 3-word challenge logic, multi-account derivation, private key & watch-only imports, hide/remove constraints.
   - `tests/ui.test.tsx`: Render tests for word selection, backup challenge, AccountsModal, and ExportModal.
2. **Acceptance Verification**:
   - Verify all 10 FRs (FR-ACC-01 through FR-ACC-10) with full end-to-end scenarios.
   - Ensure clean compilation (`tsc --noEmit`) and passing test suite (`bun test`).

---

## 5. Verification & Acceptance Criteria

- [x] **FR-ACC-01**: User can choose to generate either a 12-word or 24-word mnemonic.
- [x] **FR-ACC-02**: User must correctly answer the 3-word position challenge before the wallet is created.
- [x] **FR-ACC-03**: User can import both 12-word and 24-word recovery phrases with paste auto-detection.
- [x] **FR-ACC-04**: User can import a standalone private key; address is derived and account functions for balance viewing.
- [x] **FR-ACC-05**: User can import a Web3 Secret Storage v3 JSON keystore file by path or JSON paste with password.
- [x] **FR-ACC-06**: User can derive consecutive HD accounts along `m/44'/60'/0'/0/n`.
- [x] **FR-ACC-07**: User can derive the next account (`[N]`) and assign custom labels (`[R]`).
- [x] **FR-ACC-08**: User can add watch-only accounts; system prevents signing or exporting private keys for them.
- [x] **FR-ACC-09**: Exporting mnemonic or private key requires master password re-auth, shows a security warning, and masks secrets by default.
- [x] **FR-ACC-10**: User can hide/unhide accounts, or remove imported accounts without affecting the primary wallet.

