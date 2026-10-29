# Software Requirements Specification: TermiWallet

| Field | Value |
|---|---|
| Document version | 0.1 (draft) |
| Date | 2026-10-26 |
| Status | Draft, scope limited to initial release |
| Product name | TermiWallet (Ethereum wallet for the terminal) |

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of TermiWallet, a non-custodial Ethereum wallet that runs entirely in the terminal as a text user interface (TUI). It is the reference for design, implementation, and testing.

### 1.2 Scope
TermiWallet lets a user create or import accounts, view balances, send and receive ETH and ERC-20 tokens, review transaction history, and sign messages, all from a keyboard-driven terminal interface. It is non-custodial: private keys are generated, stored, and used only on the user's machine.

**In scope (v1):** key management, multi-account, multi-network, ETH and ERC-20 transfers, gas management, history, address book, message signing, settings, security controls.

**Out of scope (v1):** token swaps, NFT management, staking, dApp connectivity (WalletConnect), fiat on/off-ramps, mobile or GUI frontends, hardware wallets (planned for a later release, see 7.2).

### 1.3 Definitions

| Term | Meaning |
|---|---|
| TUI | Text user interface rendered in a terminal emulator |
| EOA | Externally owned account |
| Mnemonic | BIP-39 recovery phrase |
| HD wallet | Hierarchical deterministic wallet (BIP-32/BIP-44) |
| ERC-20 | Fungible token standard |
| EIP-1559 | Ethereum fee market with base fee and priority fee |
| RPC | JSON-RPC endpoint used to talk to an Ethereum node |
| ENS | Ethereum Name Service |
| Keystore | Encrypted file holding key material |

### 1.4 Assumptions and constraints
- The application runs on macOS, Linux, and Windows terminals (Windows via WSL or a modern terminal such as Windows Terminal).
- The implementation is TypeScript on the Bun runtime (1.3.14 or later, the minimum OpenTUI supports) using OpenTUI. Bun is OpenTUI's primary runtime, so no additional runtime flags are required. Bun 1.4.0 or later is required on native Windows arm64.
- The UI binding shall be React (`@opentui/react`) or Solid (`@opentui/solid`); the standalone Core API is also permitted. The binding choice is tracked in section 10.
- npm packages are used through Bun's npm-compatible package manager. Dependencies shall be verified to work under Bun (including any native addons) and tested with `bun test`.
- Node.js is not a target runtime for v1. The Node.js path requires Node.js 26.4.0 or later with `--experimental-ffi` and is not used.
- OpenTUI is still in development. This risk is accepted for v1 and tracked in section 10.
- The user supplies or selects RPC endpoints; the application does not operate its own backend.
- The user has network access for any online operation. Offline use is limited to viewing cached data and, optionally, offline signing.

---

## 2. Overall Description

### 2.1 Product perspective
A standalone, single-user, local application. The only external systems are Ethereum JSON-RPC nodes, optional price and token-metadata sources, and optionally an ENS resolver (reached through the RPC node).

### 2.2 User classes
- **Everyday user:** sends, receives, and checks balances.
- **Power user / developer:** runs multiple accounts, custom networks and RPCs, local nodes (Anvil/Hardhat), custom gas settings, and raw transaction data.

### 2.3 Operating environment
- Terminal of at least 80 columns by 24 rows, with a graceful layout for larger sizes.
- Truecolor and 256-color terminals, with a monochrome fallback.
- Keyboard is the primary input device; mouse support is optional.

### 2.4 Architectural constraints
- Business and cryptographic logic must be separated from the UI layer so it can be tested without a terminal.
- Private keys must be accessible only through a dedicated signing module.

---

## 3. System Features (Functional Requirements)

Priority: **M** = must (v1), **S** = should (v1 if time allows), **C** = could (later).

### 3.1 Wallet and account management

| ID | Requirement | Pri |
|---|---|---|
| FR-ACC-01 | The system shall create a new HD wallet with a BIP-39 mnemonic (12 or 24 words). | M |
| FR-ACC-02 | The system shall require the user to confirm they have backed up the mnemonic (e.g., re-enter selected words) before finishing wallet creation. | M |
| FR-ACC-03 | The system shall import a wallet from a BIP-39 mnemonic. | M |
| FR-ACC-04 | The system shall import a single account from a raw private key. | M |
| FR-ACC-05 | The system shall import an account from an encrypted JSON keystore file (Web3 Secret Storage v3). | S |
| FR-ACC-06 | The system shall derive multiple accounts from one mnemonic using the BIP-44 path `m/44'/60'/0'/0/n`. | M |
| FR-ACC-07 | The system shall let the user add the next derived account and rename any account with a local label. | M |
| FR-ACC-08 | The system shall support watch-only accounts (address only, no signing). | S |
| FR-ACC-09 | The system shall export the mnemonic or a private key only after re-authentication and a clear warning. | M |
| FR-ACC-10 | The system shall let the user hide or remove an account from the list without deleting the underlying wallet. | S |
| FR-ACC-11 | The system shall support a custom derivation path. | C |

### 3.2 Authentication and security

| ID | Requirement | Pri |
|---|---|---|
| FR-SEC-01 | The system shall encrypt all key material at rest using a user-chosen password. | M |
| FR-SEC-02 | The system shall require the password to unlock the wallet at startup and after auto-lock. | M |
| FR-SEC-03 | The system shall enforce a minimum password strength and show a strength indicator when the password is set. | M |
| FR-SEC-04 | The system shall auto-lock after a configurable period of inactivity and on explicit user command. | M |
| FR-SEC-05 | Locking shall clear decrypted key material from memory as far as the runtime allows. | M |
| FR-SEC-06 | The system shall apply an increasing delay after repeated failed unlock attempts. | S |
| FR-SEC-07 | The system shall allow changing the wallet password. | M |
| FR-SEC-08 | The system shall allow the user to optionally use the OS keychain for secret storage. | C |
| FR-SEC-09 | Sensitive screens (mnemonic, private key) shall hide content by default and reveal it on explicit action. | M |

### 3.3 Balances and portfolio

| ID | Requirement | Pri |
|---|---|---|
| FR-BAL-01 | The system shall display the native ETH balance of the selected account on the active network. | M |
| FR-BAL-02 | The system shall display ERC-20 balances for a user-maintained token list. | M |
| FR-BAL-03 | The system shall let the user add a token by contract address, fetching symbol, name, and decimals from the chain. | M |
| FR-BAL-04 | The system shall refresh balances periodically and on demand, and show last-updated time and loading/error state. | M |
| FR-BAL-05 | The system shall show an optional fiat value for balances using a configurable price source. | S |
| FR-BAL-06 | The system shall show an aggregate view across all accounts on the active network. | S |
| FR-BAL-07 | The system shall let the user hide tokens from the list. | S |
| FR-BAL-08 | The system shall warn when adding a token whose contract cannot be verified as an ERC-20. | S |

### 3.4 Receiving funds

| ID | Requirement | Pri |
|---|---|---|
| FR-RCV-01 | The system shall display the full checksummed (EIP-55) address of the selected account. | M |
| FR-RCV-02 | The system shall copy the address to the system clipboard on command, where available. | M |
| FR-RCV-03 | The system shall render the address as a QR code in the terminal. | S |
| FR-RCV-04 | The system shall warn the user that the address is only valid for EVM-compatible networks. | S |

### 3.5 Sending transactions

| ID | Requirement | Pri |
|---|---|---|
| FR-SND-01 | The system shall send native ETH to a recipient address. | M |
| FR-SND-02 | The system shall send ERC-20 tokens to a recipient address. | M |
| FR-SND-03 | The system shall validate the recipient address format and EIP-55 checksum, and reject invalid input. | M |
| FR-SND-04 | The system shall resolve ENS names to addresses and show the resolved address for confirmation. | S |
| FR-SND-05 | The system shall validate the amount against the available balance (including gas for native transfers) and decimals of the asset. | M |
| FR-SND-06 | The system shall offer a "send max" option that accounts for gas on native transfers. | M |
| FR-SND-07 | The system shall present a review screen showing network, sender, recipient, amount, estimated fee, and total before signing. | M |
| FR-SND-08 | The system shall require explicit confirmation (and password re-entry if configured) to sign and broadcast. | M |
| FR-SND-09 | The system shall show the transaction hash and live status (pending, confirmed, failed) after broadcast. | M |
| FR-SND-10 | The system shall warn when sending to an address the user has never interacted with, to a contract address, or to the sender's own address. | S |
| FR-SND-11 | The system shall allow selecting a recipient from the address book. | S |
| FR-SND-12 | The system shall support a dry run (simulation via `eth_call` or `eth_estimateGas`) and surface revert reasons before broadcast. | S |
| FR-SND-13 | The system shall allow advanced users to set the nonce and to attach custom calldata for native transfers. | C |

### 3.6 Gas and fees

| ID | Requirement | Pri |
|---|---|---|
| FR-GAS-01 | The system shall estimate gas limit and fee for each transaction before signing. | M |
| FR-GAS-02 | The system shall use EIP-1559 fees (max fee and max priority fee) where supported and legacy gas price otherwise. | M |
| FR-GAS-03 | The system shall offer fee presets (e.g., low, medium, high) derived from network conditions. | M |
| FR-GAS-04 | The system shall allow manual override of gas limit, max fee, and priority fee. | S |
| FR-GAS-05 | The system shall display the fee in ETH and, when available, in fiat. | S |
| FR-GAS-06 | The system shall warn when the fee is unusually high relative to the amount sent. | S |

### 3.7 Pending transactions

| ID | Requirement | Pri |
|---|---|---|
| FR-PEN-01 | The system shall track pending transactions it broadcast, until they are mined or dropped. | M |
| FR-PEN-02 | The system shall allow speeding up a pending transaction by re-broadcasting with the same nonce and higher fees. | S |
| FR-PEN-03 | The system shall allow cancelling a pending transaction by replacing it with a zero-value self-transfer at the same nonce. | S |
| FR-PEN-04 | The system shall notify the user in the UI when a tracked transaction is confirmed or fails. | M |

### 3.8 Transaction history

| ID | Requirement | Pri |
|---|---|---|
| FR-HIS-01 | The system shall list transactions of the selected account on the active network (hash, time, direction, counterparty, amount, status). | M |
| FR-HIS-02 | The system shall show a detail view for each transaction including block, nonce, gas used, and fee paid. | M |
| FR-HIS-03 | The system shall cache history locally and update it incrementally. | S |
| FR-HIS-04 | The system shall let the user filter by asset, direction, and status, and search by hash or address. | S |
| FR-HIS-05 | The system shall provide a link or command to open the transaction in a configured block explorer. | S |
| FR-HIS-06 | The system shall export history to CSV or JSON. | C |

History data requires a source such as an indexer API or an explorer API; the chosen provider is a design decision (see 7.1).

### 3.9 Networks and RPC

| ID | Requirement | Pri |
|---|---|---|
| FR-NET-01 | The system shall ship with presets for Ethereum mainnet and at least one test network (e.g., Sepolia). | M |
| FR-NET-02 | The system shall let the user switch the active network at any time, with the active network and chain ID always visible. | M |
| FR-NET-03 | The system shall let the user add, edit, and remove custom EVM networks (name, RPC URL, chain ID, currency symbol, block explorer URL). | M |
| FR-NET-04 | The system shall verify that a custom RPC's reported chain ID matches the configured one and reject it otherwise. | M |
| FR-NET-05 | The system shall support multiple RPC endpoints per network with fallback on failure. | S |
| FR-NET-06 | The system shall support local development nodes (e.g., Anvil at `http://127.0.0.1:8545`). | M |
| FR-NET-07 | The system shall show connection status and latest block number for the active network. | M |
| FR-NET-08 | The system shall clearly distinguish test networks from mainnet in the UI (e.g., persistent colored badge). | M |

### 3.10 Message and data signing

| ID | Requirement | Pri |
|---|---|---|
| FR-SIG-01 | The system shall sign arbitrary text messages (EIP-191 `personal_sign`). | S |
| FR-SIG-02 | The system shall sign typed data (EIP-712) supplied as JSON and display its decoded content before signing. | C |
| FR-SIG-03 | The system shall verify a signature given a message, signature, and address. | C |
| FR-SIG-04 | The system shall display what is being signed in human-readable form and require explicit approval. | S |

### 3.11 Address book

| ID | Requirement | Pri |
|---|---|---|
| FR-ADR-01 | The system shall store contacts (label, address, optional notes, optional network). | S |
| FR-ADR-02 | The system shall add, edit, delete, and search contacts. | S |
| FR-ADR-03 | The system shall display the contact label wherever its address appears (history, review screen). | S |
| FR-ADR-04 | The system shall import and export the address book as JSON. | C |

### 3.12 Settings and preferences

| ID | Requirement | Pri |
|---|---|---|
| FR-SET-01 | The system shall persist settings in a local configuration file. | M |
| FR-SET-02 | The system shall allow configuring auto-lock timeout, default network, default fee preset, and refresh interval. | M |
| FR-SET-03 | The system shall allow choosing a color theme (at least dark and light) and a monochrome mode. | S |
| FR-SET-04 | The system shall allow choosing the fiat currency and enabling or disabling price lookups. | S |
| FR-SET-05 | The system shall let the user customize key bindings. | C |
| FR-SET-06 | The system shall let the user configure a block explorer URL template per network. | S |

### 3.13 Backup and recovery

| ID | Requirement | Pri |
|---|---|---|
| FR-BKP-01 | The system shall let the user back up the encrypted wallet file to a path of their choice. | S |
| FR-BKP-02 | The system shall restore a wallet from a previously exported encrypted backup. | S |
| FR-BKP-03 | The system shall remind users who never confirmed their mnemonic backup. | S |

---

## 4. User Interface Requirements (TUI)

| ID | Requirement | Pri |
|---|---|---|
| UI-01 | The application shall be fully operable with the keyboard alone. | M |
| UI-02 | The application shall show a persistent status bar with: active account (label and shortened address), active network, connection status, and lock state. | M |
| UI-03 | The application shall show a footer of context-sensitive key hints for the current screen. | M |
| UI-04 | The application shall provide a help overlay listing all key bindings, opened with a single documented key (e.g., `?`). | M |
| UI-05 | The application shall provide these screens: Unlock, Onboarding (create/import), Dashboard (accounts and balances), Send, Receive, History, Transaction detail, Tokens, Networks, Address book, Settings. | M |
| UI-06 | Navigation shall use a screen stack with a consistent "back" key (e.g., `Esc`), and consistent keys for confirm, cancel, and quit. | M |
| UI-07 | The layout shall adapt to terminal resize without crashing or corrupting the display, and show a clear message when the terminal is too small. | M |
| UI-08 | Long values (addresses, hashes) shall be shown shortened by default (e.g., `0x1234…abcd`) and expandable to the full value. | M |
| UI-09 | Destructive and irreversible actions (send, remove account, export secrets) shall require a distinct confirmation step. | M |
| UI-10 | Asynchronous operations shall show a loading indicator, and failures shall show an actionable error message. | M |
| UI-11 | Colors shall not be the only means of conveying status; text or symbols shall accompany them. | S |
| UI-12 | Text input fields shall support standard editing keys and paste from the clipboard. | M |
| UI-13 | Optional: a command palette for fuzzy-searching actions. | C |
| UI-14 | Optional: Vim-style navigation bindings as an alternative to arrow keys. | C |
| UI-15 | The application shall restore the terminal state (cursor, alternate screen, raw mode) on exit and after a crash. | M |

---

## 5. Non-Functional Requirements

### 5.1 Security

| ID | Requirement |
|---|---|
| NFR-SEC-01 | Private keys and mnemonics shall never be transmitted over the network. |
| NFR-SEC-02 | Private keys and mnemonics shall never be written to logs, crash reports, or debug output. |
| NFR-SEC-03 | Key encryption shall use an established scheme (e.g., scrypt or Argon2id for key derivation with AES-GCM or AES-CTR per Web3 Secret Storage), with a per-wallet random salt. |
| NFR-SEC-04 | Key material shall live only in the signing module and shall not be placed in UI state, stores, or props. |
| NFR-SEC-05 | The wallet file shall be created with restrictive file permissions (user read/write only, e.g. `0600`). |
| NFR-SEC-06 | Remote responses (RPC, price, token metadata) shall be treated as untrusted and validated. |
| NFR-SEC-07 | The application shall verify the chain ID reported by the RPC before signing a transaction, to avoid cross-chain replay and wrong-network sends. |
| NFR-SEC-08 | Dependencies shall be minimal, pinned, and audited; a lockfile is mandatory. This includes the native OpenTUI packages, which run as native code in the same process as the signing module. |
| NFR-SEC-09 | Secrets shall not be accepted through command-line arguments or environment variables in a way that exposes them in process listings or shell history. |
| NFR-SEC-10 | Debug logging, if present, shall be opt-in and shall redact addresses on request. |

### 5.2 Privacy
- No analytics or telemetry shall be collected by default.
- Any call to a third-party service (price feeds, indexers) shall be documented and individually disableable.
- The user shall be able to run entirely against their own RPC endpoint.

### 5.3 Performance
- Startup to unlock prompt within 1 second on a typical developer machine.
- UI input latency below 100 ms; network calls shall not block rendering.
- Balance refresh for one account with up to 20 tokens shall complete in under 5 seconds on a healthy RPC.
- Memory use under 200 MB in normal operation.

### 5.4 Reliability
- Failed RPC calls shall be retried with backoff and fallback endpoints, and shall not crash the application.
- Transaction broadcast shall be idempotent from the user's view: a lost response shall not result in a silent duplicate send (track by nonce/hash).
- Local data (config, address book, history cache) shall be written atomically to avoid corruption.

### 5.5 Usability
- A new user shall be able to create a wallet and view their address within 2 minutes without external documentation.
- All errors shall state what happened and what the user can do next.

### 5.6 Portability and compatibility
- Runs on Bun 1.3.14 or later (Bun 1.4.0 or later on native Windows arm64).
- Supported on macOS (x64, arm64), Linux (x64, arm64, glibc and musl), and Windows (x64, arm64, native terminals or WSL), subject to the native OpenTUI packages available for each target. Targets shall be tested by this project before release, since an available native package does not prove runtime parity.
- On Linux with musl (e.g., Alpine), the `OPENTUI_LIBC=musl` environment variable shall be set before the first OpenTUI import, and the C++ runtime libraries (`libstdc++`, `libgcc`) may need to be installed.
- Native OpenTUI packages are optional dependencies and shall not be omitted at install time.
- The application may be distributed as a standalone executable built with `bun build --compile`, in addition to installation from the package registry.
- Works over SSH sessions and inside terminal multiplexers (tmux, screen).
- Behaves correctly with common terminals (iTerm2, Alacritty, kitty, GNOME Terminal, Windows Terminal).

### 5.7 Maintainability
- Domain and service layers shall have no dependency on UI code.
- The UI binding (React or Solid) shall be replaceable without rewriting the core.
- Automated tests shall cover key derivation, keystore encryption/decryption, transaction building, fee logic, and amount parsing.
- Strict TypeScript settings shall be enabled.

### 5.8 Testability
- Core logic shall be testable against a local node (e.g., Anvil) in CI.
- Test vectors from BIP-39, BIP-32, and EIP-55 shall be part of the test suite.

---

## 6. Data Requirements

### 6.1 Stored data

| Data | Location | Sensitivity | Protection |
|---|---|---|---|
| Encrypted wallet (mnemonic, keys) | Local file in the app data directory | Critical | Encrypted with password-derived key, mode `0600` |
| Settings | Local config file | Low | Plain JSON |
| Networks and RPC URLs | Local config file | Medium (RPC URLs may include API keys) | File permissions; warn about keys in URLs |
| Token list | Local config file | Low | Plain JSON |
| Address book | Local file | Medium | File permissions; optional encryption |
| Transaction history cache | Local file or embedded DB | Medium | File permissions |

### 6.2 Data lifecycle
- The user shall be able to wipe all local application data from within the application, with confirmation.
- Uninstalling the application shall leave data in the documented data directory, and documentation shall state its location.

---

## 7. External Interfaces

### 7.1 Software interfaces
- **Ethereum JSON-RPC** (required): `eth_getBalance`, `eth_call`, `eth_estimateGas`, `eth_feeHistory`, `eth_gasPrice`, `eth_getTransactionCount`, `eth_sendRawTransaction`, `eth_getTransactionReceipt`, `eth_getBlockByNumber`, `eth_chainId`.
- **Transaction history provider** (required for FR-HIS): an indexer or explorer API, or log scanning over RPC. The choice is open and shall be isolated behind an interface.
- **Price provider** (optional): REST API for fiat prices.
- **Token metadata**: read directly from the contract (`symbol`, `name`, `decimals`, `balanceOf`).
- **ENS** (optional): resolved through the active RPC.

### 7.2 Hardware interfaces (future)
- Hardware wallet support (Ledger, Trezor) is out of scope for v1. The signing module shall be designed behind a `Signer` interface so a hardware signer can be added later.

### 7.3 System interfaces
- System clipboard (best effort, with a fallback message if unavailable).
- Filesystem for the data directory.
- Terminal (stdin, stdout, resize events).

---

## 8. Key Use Cases (summary)

| ID | Use case | Primary flow |
|---|---|---|
| UC-01 | Create wallet | Choose password, view mnemonic, confirm backup, land on Dashboard |
| UC-02 | Import wallet | Choose mnemonic or private key, enter secret, set password, land on Dashboard |
| UC-03 | Unlock | Enter password, Dashboard |
| UC-04 | Check balance | Dashboard, select account/network, view ETH and tokens |
| UC-05 | Receive | Open Receive, copy address or show QR |
| UC-06 | Send ETH | Send, enter recipient and amount, pick fee, review, confirm, track status |
| UC-07 | Send token | Same as UC-06 with token selection |
| UC-08 | Add token | Tokens, enter contract address, confirm fetched metadata |
| UC-09 | Switch network | Networks, select; status bar updates |
| UC-10 | Add custom network | Networks, enter details, chain ID verified, saved |
| UC-11 | View history | History, filter, open detail |
| UC-12 | Speed up / cancel | Pending list, select tx, choose action, confirm |
| UC-13 | Sign message | Sign, enter message, review, approve |
| UC-14 | Back up wallet | Settings, Backup, choose path, confirm |

---

## 9. Acceptance Criteria (v1 release)

1. A user can create a wallet, back up the mnemonic, and receive the address on Sepolia.
2. A user can send ETH and an ERC-20 token on Sepolia and on a local Anvil node, and see the transaction confirmed.
3. A wallet created or imported with a known test mnemonic produces the expected addresses for the BIP-44 path.
4. Key material is never present in logs, and the wallet file is encrypted and mode `0600`.
5. Auto-lock engages after the configured timeout and requires the password to resume.
6. The application survives RPC outages, terminal resizes, and abrupt exits without corrupting stored data or leaving the terminal in a broken state.
7. All **M** requirements in section 3 and section 4 are implemented and covered by automated or documented manual tests.

---

## 10. Open Questions

- Which history source will be used (indexer API, explorer API, or local log scanning)?
- Which network list and default RPCs ship in the box?
- How will the application be distributed (package registry install, standalone executable via `bun build --compile`, or both)?
- Is OpenTUI's pre-production status acceptable for a wallet at v1, and is keeping the UI layer replaceable (see 5.7) enough mitigation?
- React, Solid, or the standalone Core API for the UI binding?
- Do all chosen npm dependencies (including any native addons such as OS keychain bindings) work under Bun?
- Which library for the chain layer (viem is the current assumption) and for key derivation?
- Should the wallet file support multiple wallets or exactly one?
- Is an OS keychain integration desired in v1?
- Clipboard strategy over SSH (OSC 52)?
- Should a read-only "view" mode be available without the password?

---

## 11. Future Considerations (not in v1)

Hardware wallet support, WalletConnect, token swaps, NFT viewing, ENS reverse lookup and registration, EIP-4337 smart accounts, multisig (Safe) support, Layer-2 specific features, transaction batching, and a scriptable non-interactive CLI mode.