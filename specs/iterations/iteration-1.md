# Iteration 1: Wallet Creation, Mnemonic Backup, and Sepolia Receive [DONE]

**Status:** Completed  
**Completed Date:** 2026-10-26

## 1. Goal
Implement the first milestone from `system-requirements.md` (Section 9, Acceptance Criteria 1):
> **1. A user can create a wallet, back up the mnemonic, and receive the address on Sepolia.**

---

## 2. Architecture & Design Decisions

| Component | Selected Strategy | Rationale |
| :--- | :--- | :--- |
| **Ethereum & Crypto** | `viem` | Modern, TypeScript-native, built-in BIP-39/BIP-44 HD key derivation, EIP-1559, and Sepolia chain client. |
| **Dependency Injection** | Typed Service Container + Constructor Injection | Zero reflection/decorator baggage, type-safe, fast startup on Bun, frictionless mocking in `bun:test`. |
| **Storage & Security** | AES-256-GCM Vault (`~/.termiwallet/vault.json`) | Password-derived key via PBKDF2/scrypt, auth tag verification, strict `0600` POSIX file permissions. |
| **Backup Verification** | Safe Confirmation Checkbox | Clear display of 12-word mnemonic with mandatory acknowledgment before proceeding. |
| **Sepolia Network** | Preconfigured public RPC + env override | Ships working out of the box with fallback to `SEPOLIA_RPC_URL`. |
| **Terminal UI Framework** | `@opentui/react` | Declarative terminal UI components on OpenTUI CLI renderer. |
| **Screen Flow** | 3-Step Wizard | `Password Setup` -> `Mnemonic Backup & Acknowledge` -> `Sepolia Dashboard / Receive`. |
| **Clipboard Support** | System tool (`pbcopy`/`xclip`) + OSC 52 fallback | Smooth copy-to-clipboard experience across local terminals and SSH sessions. |

---

## 3. Codebase Layout

```
ethereum-wallet-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── core/                      # Interfaces, domain contracts & DI tokens
│   │   ├── types.ts               # Account, Wallet, Vault schemas
│   │   ├── interfaces.ts          # ICryptoService, IWalletService, IStorageService, IRpcService, IClipboardService
│   │   └── tokens.ts              # Service identifiers
│   ├── container/                 # Lightweight DI container
│   │   └── index.ts               # ServiceContainer & factory binding
│   ├── services/                  # Pure domain implementations (no UI dependencies)
│   │   ├── crypto.service.ts      # AES-256-GCM encryption/decryption & password hashing
│   │   ├── wallet.service.ts      # BIP-39 generation, derivation (m/44'/60'/0'/0/0)
│   │   ├── storage.service.ts     # File I/O with 0600 permissions & directory management
│   │   ├── rpc.service.ts         # Viem Sepolia client & balance querying
│   │   └── clipboard.service.ts   # System clipboard & OSC 52 fallback
│   ├── ui/                        # OpenTUI React interface
│   │   ├── index.tsx              # Root renderer mounting OpenTUI
│   │   ├── App.tsx                # Navigation state machine (wizard step switcher)
│   │   ├── components/            # Reusable TUI components (QrCode, Header, Button, Input)
│   │   └── screens/
│   │       ├── PasswordScreen.tsx # Set & confirm wallet password
│   │       ├── MnemonicScreen.tsx # Display 12 words & backup confirmation
│   │       └── ReceiveScreen.tsx  # Sepolia address, QR code, balance & copy action
│   └── index.ts                   # CLI binary entrypoint
└── tests/                         # Unit test suites (bun:test)
    ├── crypto.test.ts             # Encryption, decryption & password failure tests
    ├── wallet.test.ts             # BIP-39 mnemonic & address derivation verification
    ├── storage.test.ts            # Vault file write/read & 0600 mode checks
    ├── rpc.test.ts                # Sepolia balance queries with mock client
    └── container.test.ts          # DI container resolution & mock override tests
```

---

## 4. Implementation Steps

1. **Project Initialization**
   - Configure `package.json` for Bun module resolution.
   - Install dependencies: `@opentui/core`, `@opentui/react`, `react`, `viem`, `qrcode`.
   - Setup `tsconfig.json` with strict type checking and React JSX transform.

2. **Core Domain & DI Container**
   - Define domain interfaces (`ICryptoService`, `IWalletService`, `IStorageService`, `IRpcService`, `IClipboardService`).
   - Implement `ServiceContainer` supporting singleton and transient service registrations with factory injection.

3. **Domain Services Implementation**
   - `CryptoService`: Password-based key derivation (PBKDF2/scrypt) + AES-256-GCM encryption/decryption with authentication tags.
   - `WalletService`: Generates 12-word BIP-39 mnemonics, derives primary account at `m/44'/60'/0'/0/0`, validates checksums.
   - `StorageService`: Saves/loads encrypted vault to `~/.termiwallet/vault.json` (or configurable path) with POSIX mode `0600`.
   - `RpcService`: Viem public client querying Sepolia (`eth_getBalance`, block number).
   - `ClipboardService`: Copies text using system tool (`pbcopy`/`xclip`/`wl-copy`) with ANSI OSC 52 sequence fallback.

4. **Unit Tests (`bun test`)**
   - Test `CryptoService`: Correct round-trip encryption/decryption, tampered data failure, wrong password rejection.
   - Test `WalletService`: Known BIP-39 mnemonic vector derivation matching official test vectors.
   - Test `StorageService`: File creation, secure permissions (`0600`), directory creation, missing file handling.
   - Test `RpcService`: Mocked transport balance formatting (Wei to ETH).
   - Test `ServiceContainer`: Dependency resolution, override mocking for tests.

5. **OpenTUI React UI Implementation**
   - `App.tsx`: Wizard controller managing steps: `password` -> `mnemonic` -> `receive`. Checks existing vault state.
   - `PasswordScreen.tsx`: Password prompt, confirmation, and strength guidance.
   - `MnemonicScreen.tsx`: Formatted 12-word grid presentation, backup warning, and toggle confirmation checkbox.
   - `ReceiveScreen.tsx`: Displays active network (Sepolia), derived address, terminal-rendered QR code, live balance, and shortcuts (`[C] Copy Address`, `[R] Refresh`, `[Q] Quit`).

6. **Verification & Acceptance**
   - Execute test suite: `bun test`.
   - Run CLI: `bun run src/index.ts`.
   - Verify Acceptance Criteria 1: wallet created, mnemonic backed up, address and QR presented on Sepolia.

