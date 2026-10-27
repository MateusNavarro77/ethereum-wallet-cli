# Iteration 2: QoL, Fullscreen TUI, Import Wallet, Reset Vault & Transition Fix [DONE]

**Status:** Completed  
**Completed Date:** 2026-10-26

## 1. Goal
Address Quality of Life improvements, bug fixes, and wallet import capabilities:
1. **Fullscreen Layout**: All screens adapt to terminal dimensions using a full-width header, flexible 2-column content area, and full-width status footer.
2. **Vault Reset / Wipe**: Safe deletion of `vault.json` accessible from both the Receive Screen and Unlock Screen with a confirmation dialog requiring the user to type `RESET`.
3. **Transition Bug Fix**: Resolve the issue in `App.tsx` where an uncleared `statusMessage` stranded the user on the encryption loading screen.
4. **Mnemonic Import**: Allow importing an existing wallet by entering a 12-word BIP-39 recovery phrase across 12 numbered input fields (with auto-paste support).

---

## 2. Architecture & Design Decisions

| Component | Selected Strategy | Rationale |
| :--- | :--- | :--- |
| **Entry Point** | Welcome Selection Screen | When no vault is present, let user choose `[1] Create New Wallet` or `[2] Import from Mnemonic`. |
| **Import UX** | 12 Numbered Inputs + Auto-Paste | 12 separate inputs navigated with Tab/Enter. Typing or pasting a 12-word phrase automatically distributes words across the fields. Checks BIP-39 validity. |
| **Vault Wipe** | `deleteVault()` in `StorageService` | Deletes `~/.termiwallet/vault.json` and resets app state machine to `welcome`. Protected by typing `RESET`. |
| **Layout Design** | Fullscreen 100% Width & Height | Top header bar (network & status), flexible 2-column main body (Left: account/balance, Right: QR code), bottom hotkey bar. |
| **State Bug Fix** | Explicit Loading State | Replace blocking `statusMessage` guard with clean step progression and transient status indicators. |

---

## 3. Implementation Steps

1. **Storage Service Enhancement**
   - Add `deleteVault(): Promise<void>` to `IStorageService` and `StorageService`.
   - Add unit test verifying vault file removal and `vaultExists()` returning false after deletion.

2. **Fix Screen Transition in `App.tsx`**
   - Clear loading status once encryption and vault persistence complete.
   - Transition smoothly into `receive` screen.

3. **Welcome & Import Screens**
   - Create `WelcomeScreen.tsx`: Select between Create New or Import Existing.
   - Create `ImportScreen.tsx`: 12 numbered input fields with auto-split on paste, BIP-39 validation, and password setup.
   - Wire import into `WalletService` to derive primary account and save encrypted vault.

4. **Vault Reset Flow**
   - Create `ResetModal.tsx`: Dialog prompting `Type "RESET" to permanently delete local wallet`.
   - Connect hotkey `[X]` on both `ReceiveScreen.tsx` and `UnlockScreen.tsx` to trigger the reset modal.

5. **Fullscreen Layout Refactor**
   - Create reusable `Header.tsx` and `Footer.tsx` spanning 100% terminal width.
   - Refactor `ReceiveScreen.tsx` into a responsive 2-column dashboard (Left: account details, balance, network; Right: QR code).
   - Expand `PasswordScreen.tsx`, `MnemonicScreen.tsx`, `ImportScreen.tsx`, and `UnlockScreen.tsx` to fill available screen space cleanly.

6. **Automated Testing & Verification**
   - Unit tests for `deleteVault()` in `tests/storage.test.ts`.
   - Unit tests for 12-word import logic and checksum validation in `tests/wallet.test.ts`.
   - Component rendering tests in `tests/ui.test.tsx` for new screens.
   - Verify all tests pass (`bun test`) and TypeScript compiles without errors.

