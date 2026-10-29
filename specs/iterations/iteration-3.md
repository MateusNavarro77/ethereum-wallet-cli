# Iteration 3: Terminal QR Code Support & Dashboard Screen [DONE]

**Status:** Completed  
**Completed Date:** 2026-10-26

## 1. Goal
Implement terminal QR code rendering support and establish the main wallet dashboard:
1. **Terminal QR Code Display**: Enable scannable QR code generation for the Ethereum address using OpenTUI's QR code package (`@opentui/qrcode/react`). Ensure adequate dimensions and scaling (`fit="none"`, `width: 44`) so half-block character cells render crisply and never get zeroed out.
2. **Dashboard Transition**: Rename `ReceiveScreen` to `DashboardScreen` as the central screen of TermiWallet where account overview, Sepolia balances, network parameters, and receive capabilities reside.
3. **Backwards Compatibility**: Provide `ReceiveScreen` aliases and re-exports to ensure non-breaking changes across existing modules and tests.
4. **Automated Verification**: Add component-level unit tests verifying that QR half-block characters (`█`), account addresses, and controls render properly in the terminal frame.

---

## 2. Architecture & Design Decisions

| Component | Selected Strategy | Rationale |
| :--- | :--- | :--- |
| **QR Code Component** | `<qr-code>` via `@opentui/qrcode/react` | Leverages Unicode half-block characters (`▀`, `▄`, `█`) to render high-density, square, scannable QR codes natively in terminal emulators. |
| **Sizing & Fitting** | `width: 44`, `fit="none"`, `scale={1}`, `quietZone={4}` | 42-character Ethereum addresses require a 37-module Version 3 symbol. `fit="none"` guarantees the symbol is never compressed to 0x0 cells if the container's vertical bounds are snug. |
| **Main Screen Architecture** | `DashboardScreen` | Consolidates account identity, real-time RPC balance checking, network metadata, and scan-to-receive functionality into the primary post-unlock dashboard. |
| **Backward Compatibility** | Re-export alias in `ReceiveScreen.tsx` | Re-exports `DashboardScreen as ReceiveScreen` and `DashboardScreenProps as ReceiveScreenProps` to preserve existing references. |

---

## 3. Implementation Steps

1. **Dashboard Screen Implementation**
   - Created `src/ui/screens/DashboardScreen.tsx` with self-registering `registerQRCode()`.
   - Tuned layout geometry (`width: 44`, `flexShrink: 0`, `paddingX: 1`, `paddingY: 0`) and `<qr-code fit="none">` to guarantee QR blocks render reliably.
   - Preserved all dashboard capabilities: balance fetching, clipboard copying (`[C]`), balance refresh (`[R]`), vault reset (`[X]`), and exit (`[Q]`).

2. **ReceiveScreen Re-export**
   - Converted `src/ui/screens/ReceiveScreen.tsx` into a backwards-compatible proxy re-exporting `DashboardScreen`.

3. **App Integration**
   - Updated `src/ui/App.tsx` navigation state machine to transition into `dashboard` upon wallet creation, import, or unlocking.
   - Updated screen rendering to use `DashboardScreen`.

4. **Testing & Verification**
   - Added unit test in `tests/ui.test.tsx` verifying that `DashboardScreen` renders scannable half-blocks (`█`), header, balance, and Ethereum address.
   - Verified backwards-compatible `ReceiveScreen` rendering in `tests/ui.test.tsx`.
   - Verified full test suite passes with `bun test` (32 passing tests).
   - Verified TypeScript compilation with `tsc --noEmit`.

