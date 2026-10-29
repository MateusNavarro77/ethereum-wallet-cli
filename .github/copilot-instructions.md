# Copilot instructions for TermiWallet

## Build, test, and run

This repository uses Bun and native ESM. Install dependencies with `bun install`.

```sh
bun run start                 # Launch the terminal UI
bun test                      # Run the complete test suite
bun test tests/wallet.test.ts # Run one test file
bun test --test-name-pattern "imports a valid" # Run matching tests
bun run typecheck             # Strict TypeScript check
```

There is no lint script configured in `package.json`; do not invent a lint command. The UI can use `SEPOLIA_RPC_URL` to override the default public Sepolia RPC, and `TERMIWALLET_HOME` to override the directory containing the local vault.

## Architecture

- `src/index.ts` is the Bun executable entry point. It creates the default container and starts the UI through `runUi`.
- `src/core/` contains domain data shapes, service interfaces, and typed service tokens. Keep UI code dependent on interfaces rather than concrete services.
- `src/container/index.ts` implements the project’s dependency-injection pattern: services are registered by typed token, normally as lazy singletons. Tests replace implementations with `registerInstance`, commonly to inject a temporary storage path or a mock.
- `src/services/` contains UI-independent implementations:
  - `WalletService` generates/validates BIP-39 phrases and derives Ethereum accounts at the BIP-44 path `m/44'/60'/0'/0/index`.
  - `CryptoService` encrypts the serialized `WalletData` with PBKDF2-derived AES-256-GCM keys.
  - `StorageService` owns the JSON vault file, creates its parent directory, enforces file mode `0600`, and supports deletion.
  - `RpcService` wraps a viem Sepolia public client and exposes balance formatting/network metadata.
  - `ClipboardService` tries platform clipboard commands and then OSC 52.
- `src/ui/` is an OpenTUI React application. `App.tsx` is the navigation/state machine for welcome, create, import, unlock, and receive flows. Screens handle keyboard-driven interaction; reusable layout is in `components/`; services are accessed through `useService` from `context.tsx`.
- `src/ui/index.tsx` registers the QR component, creates the OpenTUI renderer/root, and owns signal cleanup. JSX uses `@opentui/react` through `tsconfig.json`’s `jsxImportSource`.
- The encrypted vault stores serialized `WalletData`, including the mnemonic and account metadata. Do not expose or log decrypted wallet data or recovery phrases.

## Conventions and invariants

- Preserve the `.js` suffix on relative imports in TypeScript/TSX; the project uses bundler resolution with native ESM.
- Add new cross-layer behavior behind a `core/interfaces.ts` contract and `core/tokens.ts` service-map entry, then bind it in `createDefaultContainer`. Prefer constructor injection or container replacement over global state.
- Keep service implementations independent of OpenTUI. UI components should resolve services from the container and receive flow callbacks through props.
- Use `WalletService.importWallet` for imported phrases so whitespace/case normalization and BIP-39 validation stay centralized. New wallet data must use the Sepolia chain ID from `SEPOLIA_NETWORK`, not a duplicated literal.
- Treat vault persistence as a security boundary: retain AES-GCM authentication, password-derived keys, strict `0600` vault permissions, and explicit errors for invalid/corrupt data. Use temporary paths in tests instead of the real home directory.
- OpenTUI screens are fullscreen flex layouts with shared `Header`/`Footer` components and keyboard shortcuts handled with `useKeyboard`. Register QR support before rendering screens that contain `<qr-code>`.
- For UI tests, use `testRender` from `@opentui/react/test-utils`, wrap service-using screens in `ContainerProvider`, register the QR component when relevant, and destroy each renderer after the assertion.
- Keep test doubles at service boundaries. Existing tests cover crypto, wallet derivation/import, storage permissions/deletion, RPC formatting/mock clients, container resolution, an end-to-end vault flow, and screen rendering.
- For OpenTUI API questions, consult the repository-local skill at `.agents/skills/opentui/SKILL.md` and its linked docs before adding packages or using undocumented/deep imports.

## Specifications

The current product milestones and acceptance criteria are documented in `specs/system-requirements.md` and `specs/iterations/`. Keep implementation changes aligned with those documents, especially the completed wallet creation/import, mnemonic backup, Sepolia receive, fullscreen layout, and reset-vault flows.
