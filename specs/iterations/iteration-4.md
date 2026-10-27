# Iteration 4: TermiWallet ASCII Art Branding & FIGlet Integration [DONE]

**Status:** Completed  
**Completed Date:** 2026-10-27

## 1. Goal
Establish distinctive visual branding across TermiWallet's initial entry and authentication screens:
1. **ASCII Art Banner Generation**: Generate a clean, compact ASCII logo for `"TermiWallet"` using the FIGlet library (`figlet` + `@types/figlet` installed as `devDependencies`).
2. **Build Tooling**: Provide a developer script (`generate:logo`) via `scripts/generate-logo.ts` so the ASCII banner can be regenerated or modified anytime without adding runtime dependencies.
3. **Reusable Branding Component**: Implement `LogoBanner` (`src/ui/components/LogoBanner.tsx`) using OpenTUI primitives to render the brand banner in `#60A5FA` with optional subtitles and descriptions.
4. **Onboarding & Auth Screen Integration**:
   - `WelcomeScreen`: Display the TermiWallet ASCII banner above the account creation / import options.
   - `PasswordScreen`: Display the TermiWallet ASCII banner above the master password setup and confirmation inputs.
   - `UnlockScreen`: Display the TermiWallet ASCII banner above the returning user password unlock input.
5. **Automated Verification**: Extend component unit tests to assert that `LogoBanner` and all three screens render the ASCII art and their corresponding controls and descriptions properly.

---

## 2. Architecture & Design Decisions

| Component | Selected Strategy | Rationale |
| :--- | :--- | :--- |
| **FIGlet Dependency** | `figlet` in `devDependencies` | Keeps the production bundle lightweight with zero runtime overhead by pre-generating the ASCII art. |
| **Font Selection** | FIGlet `"Small"` font | Fits within 48 character cells wide and 4 lines tall, ensuring zero line-wrapping on standard 80x24 terminal windows while remaining bold and legible. |
| **Component Architecture** | `<LogoBanner>` component | Centralizes logo styling, centering, color (`#60A5FA`), and typography, ensuring visual consistency across onboarding and authentication screens. |
| **Regeneration Script** | `bun run generate:logo` | Automates regeneration into `src/ui/components/LogoBanner.tsx` with proper character escaping and typed component props. |
| **Screen Layout Tuning** | Container width 72 for `WelcomeScreen` and 68 for `PasswordScreen`/`UnlockScreen` | Accommodates the ASCII banner and inner choice rows with generous padding and no awkward wrapping. |

---

## 3. Implementation Steps

1. **Dependency Installation**
   - Added `figlet` and `@types/figlet` to `devDependencies` in `package.json`.

2. **Generation Script & Script Command**
   - Created `scripts/generate-logo.ts` using `figlet.textSync("TermiWallet", { font: "Small" })`.
   - Safely formatted output into `src/ui/components/LogoBanner.tsx` with `JSON.stringify` character escaping.
   - Added `"generate:logo": "bun run scripts/generate-logo.ts"` to `package.json` scripts.

3. **LogoBanner Component**
   - Created `src/ui/components/LogoBanner.tsx` exporting `TERMIWALLET_ASCII_BANNER` and `<LogoBanner color={...} subtitle={...} description={...} />`.

4. **Screen Integrations**
   - **`WelcomeScreen.tsx`**: Integrated `<LogoBanner subtitle="Welcome to TermiWallet" description="A keyboard-driven Ethereum terminal wallet for Sepolia testnet." />`.
   - **`PasswordScreen.tsx`**: Integrated `<LogoBanner subtitle={title} description="Choose a secure password to encrypt your wallet vault locally." />`.
   - **`UnlockScreen.tsx`**: Integrated `<LogoBanner subtitle="Unlock Your Sepolia Account" description="Enter your master password to unlock and manage your wallet." />`.

5. **Testing & Verification**
   - Extended `tests/ui.test.tsx` with four new tests:
     - `LogoBanner` renders the ASCII banner, subtitle, and description.
     - `WelcomeScreen` renders the ASCII banner and action options.
     - `PasswordScreen` renders the ASCII banner and password form.
     - `UnlockScreen` renders the ASCII banner and unlock prompt.
   - Tested vault path isolation in `tests/hooks.test.tsx`.
   - Verified the entire test suite passes (`bun test`: 47 passing tests across 8 suites).

