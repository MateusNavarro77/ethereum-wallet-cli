# TermiWallet

Terminal Ethereum wallet (TUI). Bun + native ESM + TypeScript + OpenTUI React (`@opentui/react`). Entry point: `src/index.ts` (`bun run start`).

## Commands

- `bun install` — install dependencies (lockfile: `bun.lock`; CI uses `bun install --frozen-lockfile`)
- `bun run start` — launch the TUI
- `bun test` — run the full test suite (`tests/`)
- `bun test tests/wallet.test.ts` — run one test file
- `bun test --test-name-pattern "imports a valid"` — run tests matching a name
- `bun run typecheck` — `bun x tsc --noEmit` (strict; `jsxImportSource: @opentui/react`; `types: ["bun-types"]`)
- No lint script exists in `package.json`; do not run or invent one.
- CI (`.github/workflows/ci.yml`) runs on `main` and `v2`: install → typecheck → test, in that order.

## Environment

- `SEPOLIA_RPC_URL` — Sepolia RPC endpoint (default: publicnode). Override in tests/local runs.
- `TERMIWALLET_HOME` — vault directory (default: `~/.termiwallet`). Tests must use a temporary path, never the real home dir.
- `.env` / `.env.test` are gitignored; do not commit them.

## Conventions (verified in code)

- Relative imports in `.ts`/`.tsx` must carry the `.js` suffix (bundler ESM resolution, e.g. `./container/index.js`).
- Services live behind `src/core/tokens.ts` tokens and are bound in `src/container/index.ts` (`createDefaultContainer`). Use constructor injection or `container.registerInstance`/`.clone()` for test replacement — no global state.
- UI code depends on service interfaces, not concrete implementations. Services must not import OpenTUI.
- Vault security: AES-256-GCM, PBKDF2-derived keys, file mode `0600`, explicit errors for corrupt data. Never log or expose decrypted wallet data or mnemonics.
- BIP-44 derivation path `m/44'/60'/0'/0/index`; Sepolia chain ID from `core/types.ts` (`SEPOLIA_NETWORK`), not duplicated literals.
- UI screens use OpenTUI: fullscreen flex, shared `Header`/`Footer`, `useKeyboard`, `useService` from `src/ui/context.tsx`. Register QR (`@opentui/qrcode`) before rendering `<qr-code>`.
- UI text and user-facing frontend copy must never include functional requirement identifiers or specification codes (e.g. `(FR-SND-01)`, `FR-...`). Titles, labels, placeholders, and error messages visible to the user must use clean, user-friendly language only.
- UI tests: `testRender` from `tests/test-utils.tsx` (wraps `@opentui/react/test-utils` in `act`), `ContainerProvider`, destroy the renderer after each assertion. Import `act` from `tests/test-utils.tsx` and wrap every interaction or callback that can trigger React state updates (including `mockInput` keyboard events) in `act(() => ...)` or `await act(async () => ...)`; await `renderOnce()` after the interaction before asserting. This prevents React's "update was not wrapped in act(...)" warnings, as demonstrated in `tests/ui/components/account-management.test.tsx`.
- Organize tests by the tested domain object, mirroring `src`: service tests in `tests/services/<service>.test.ts`, UI hook tests in `tests/ui/hooks`, screen tests in `tests/ui/screens`, and component tests in `tests/ui/components`. Put cross-object application flows in `tests/integration/<flow>.test.ts`; do not use iteration-number test filenames or suites.

## References

- Architecture deep dive: `.github/copilot-instructions.md` (services, UI flows, wallet/import/storage/RPC/clipboard details)
- OpenTUI guidance: `.agents/skills/opentui/SKILL.md` + `.agents/skills/opentui/docs/` — consult before adding packages or deep imports
- Acceptance criteria / milestones: `specs/system-requirements.md`, `specs/iterations/`
