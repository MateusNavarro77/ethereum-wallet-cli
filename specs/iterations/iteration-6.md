# Iteration 6: Accounts Modal Viewport Windowing & Overflow Fix [DONE]

**Status:** Completed  
**Completed Date:** 2026-10-27  
**Target:** Terminal UI Layout & Account Management Usability (`AccountsModal`)

---

## 1. Goal

Address and resolve the visual overflow bug in `AccountsModal`:
1. **Prevent Container Overflow**: When a wallet contains many accounts (e.g., 24 accounts), the account items must never spill past the inner accounts container border, collide with the hotkey bar, or overflow beyond the bottom border of the terminal modal.
2. **Implement Viewport Windowing**: Maintain a clean, fixed-size sliding window (`PAGE_SIZE = 8`) of visible accounts that smoothly scrolls when the user navigates with keyboard shortcuts.
3. **Scroll & Position Feedback**: Display intuitive scroll indicators and position status in the box title (`Accounts [curr/total] ▲ ▼ [↑/↓ Navigate]`) and modal header (`24 Accounts (1-8 of 24)`).
4. **Enhanced Keyboard Navigation**: Support `Up`, `Down`, `PageUp`, `PageDown`, `Home`, and `End` keys for fast navigation through large account portfolios.
5. **Active Account Context**: Automatically initialize selection and scroll the viewport to the currently active account when opening the modal.
6. **Automated Verification**: Add comprehensive UI unit tests simulating 24 accounts to verify windowing, navigation, and absence of visual overflow.

---

## 2. Root Cause Analysis

Prior to this iteration:
- `AccountsModal` rendered all accounts in `wallet.accounts` directly via `accounts.map(...)` inside a `<box>` element with `maxHeight: 12`.
- Each account item had `marginBottom: 1`, doubling the vertical footprint.
- In OpenTUI / Yoga layout, a standard `<box>` with `maxHeight` caps its own layout dimensions, but child renderables are not clipped or paginated by default.
- As a result, accounts beyond the 8th/9th entry overflowed past the bottom border of the accounts container, drew directly over the hotkey bar, and extended past the bottom border of the outer modal dialog.

---

## 3. Architecture & Design Decisions

| Component | Selected Strategy | Rationale |
| :--- | :--- | :--- |
| **Viewport Windowing** | Fixed Page Window (`PAGE_SIZE = 8`) | Keeps the modal height strictly bounded and compact, fitting comfortably inside standard 80x24 terminal windows without clipping. |
| **Row Density** | 1 Row per Account (removed `marginBottom: 1`) | Complies with OpenTUI's terminal design principles ("prefer compact, information-dense layouts over website-style card spacing"). |
| **Box Height Calculation** | `height: Math.max(3, Math.min(accounts.length, PAGE_SIZE) + 2)` | Adapts dynamically when fewer than 8 accounts exist while maintaining a stable, non-jumping height of 10 rows for 8+ accounts. |
| **Scroll Position Feedback** | Top Border Title Indicators (`Accounts [X/Y] ▲ ▼`) | Uses native OpenTUI box title styling to provide immediate position and scrollability cues without consuming interior vertical rows. |
| **Navigation Controls** | `Up`, `Down`, `PageUp`, `PageDown`, `Home`, `End` | Standard terminal keyboard patterns for list navigation, enabling instant jumps to top, bottom, or next page. |
| **Active Account Auto-Focus** | Initialize `selectedIndex` to active account | When managing accounts from the dashboard, the user's cursor immediately focuses on their currently active account. |

---

## 4. Implementation Details

### 4.1 UI Component (`src/ui/components/AccountsModal.tsx`)

- Added `PAGE_SIZE = 8` and `scrollOffset` state.
- Implemented `effectiveOffset` calculation:
  ```typescript
  const safeSelectedIndex = Math.min(
    Math.max(0, selectedIndex),
    Math.max(0, accounts.length - 1),
  )
  const effectiveOffset = Math.max(
    0,
    Math.min(
      safeSelectedIndex < scrollOffset
        ? safeSelectedIndex
        : safeSelectedIndex >= scrollOffset + PAGE_SIZE
          ? safeSelectedIndex - PAGE_SIZE + 1
          : scrollOffset,
      Math.max(0, accounts.length - PAGE_SIZE),
    ),
  )
  ```
- Sliced accounts to `visibleAccounts = accounts.slice(effectiveOffset, effectiveOffset + PAGE_SIZE)`.
- Removed row `marginBottom: 1` and applied `paddingX: 1, paddingY: 0` to `<box>`.
- Added title scroll indicator and range header.
- Added keyboard shortcuts for `pageup`, `pagedown`, `home`, and `end`.

### 4.2 Automated Testing (`tests/iteration-6.ui.test.tsx`)

- Created dedicated tests reproducing the 24-account scenario.
- Verified that only the first 8 accounts are rendered in the initial viewport, confirming that accounts 9 through 24 are windowed out and cannot overflow.
- Verified that the hotkeys bar remains fully visible and intact below the list.
- Verified that setting the active account to account #12 automatically scrolls the viewport to accounts 5–12 and displays `▲` and `▼` indicators.

---

## 5. Verification & Test Results

- **TypeScript Typecheck**:
  `npx tsc --noEmit` -> Passed with 0 errors.
- **Test Suite**:
  `bun test` -> 70 tests passed across 11 test suites with 0 failures:
  - `tests/iteration-6.ui.test.tsx`: 2 passed
  - `tests/iteration-5.ui.test.tsx`: 5 passed
  - `tests/ui.test.tsx`: 16 passed
  - `tests/wallet.test.ts`: 17 passed
  - `tests/crypto.test.ts`: 5 passed
  - `tests/keystore.test.ts`: 8 passed
  - `tests/hooks.test.tsx`: 6 passed
  - `tests/integration.test.ts`: 5 passed
  - `tests/rpc.test.ts`: 3 passed
  - `tests/storage.test.ts`: 2 passed
  - `tests/container.test.ts`: 3 passed

