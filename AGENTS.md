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
- UI tests: `testRender` from `tests/test-utils.tsx` (wraps `@opentui/react/test-utils` in `act`), `ContainerProvider`, destroy the renderer after each assertion.

## References

- Architecture deep dive: `.github/copilot-instructions.md` (services, UI flows, wallet/import/storage/RPC/clipboard details)
- OpenTUI guidance: `.agents/skills/opentui/SKILL.md` + `.agents/skills/opentui/docs/` — consult before adding packages or deep imports
- Acceptance criteria / milestones: `specs/system-requirements.md`, `specs/iterations/`
