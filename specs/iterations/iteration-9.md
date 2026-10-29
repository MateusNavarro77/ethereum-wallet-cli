# Iteration 9: Custom Themes, Token Scheme & Settings Modal (Completed)

## Overview & Scope

Introduces a centralized theme system to TermiWallet that completely eliminates hardcoded colors across the application:
1. **Semantic Theme Token Contract**: Strict TypeScript interface defining design tokens for backgrounds, surfaces, borders, typography, status badges, brand accents, and selection highlights.
2. **Built-in Presets**: Five distinct out-of-the-box themes:
   - **Termi Dark** (default): Deep slate/blue terminal aesthetic.
   - **Dracula**: Classic gothic purple/pink dark mode.
   - **Cyberpunk / Neon**: High-contrast neon pink, cyan, and gold on obsidian.
   - **Matrix**: Monochromatic retro green phosphor terminal.
   - **Nord**: Cool arctic north-bluish palette.
3. **Custom Themes via JSON**: Automatically discover and load custom theme JSON files placed in `~/.termiwallet/themes/<theme-id>.json` (or `$TERMIWALLET_HOME/themes/`). Missing tokens automatically fall back to the default preset.
4. **Theme Service & Config Persistence**: Active theme selection is persisted in `~/.termiwallet/config.json` via `IStorageService` and `IThemeService`.
5. **Centralized `useTheme()` Hook**: Serves theme tokens and theme control methods to all UI components.
6. **Settings Modal (`[S]`)**: Dedicated Settings Modal accessible via hotkey `[S]` on Dashboard, supporting instant live-preview on arrow keys (`↑`/`↓`), `Enter` to confirm/save, and `Esc` to cancel/revert.
7. **Full Application De-hardcoding**: Eliminate hardcoded hex strings across every screen, modal, and shared component.

---

## Architectural Decisions (from /grill-me Interview)

1. **Storage & Discovery**:
   - Built-in preset objects defined statically in TypeScript.
   - Custom themes discovered dynamically on disk at `~/.termiwallet/themes/*.json`.
   - Selected theme ID stored in `AppConfig.theme` within `config.json`.
2. **Granular Semantic Tokens**:
   - Semantic tokens (`background`, `surface`, `card`, `border`, `borderActive`, `text`, `textMuted`, `primary`, `accent`, `success`, `warning`, `error`, `selectionBg`, `selectionFg`, etc.) rather than hardcoded or component-scoped silos.
3. **Settings Modal & Navigation**:
   - Triggered by hotkey `[S]` on Dashboard (and displayed in the Footer hotkey bar).
   - Dedicated Settings Modal with a "Theme Selection" section and color palette swatches.
   - **Live Preview**: Navigating items with `↑`/`↓` immediately applies the theme to the live UI so the user can visually evaluate it. Pressing `Enter` commits and persists to `config.json`. Pressing `Esc` reverts back to the original theme without changes.
4. **Complete Application Styling Migration**:
   - All screens (Welcome, Password, Unlock, Import, Dashboard, Receive, Mnemonic) and all modals (Accounts, Networks, Tokens, Reset, Export, NetworkForm, TokenForm, Settings) will consume colors dynamically via `useTheme()`.

---

## Technical Design

### 1. Core Types & Interfaces (`src/core/theme.types.ts`)

```typescript
export interface ThemeTokens {
  // Backgrounds & Surfaces
  background: string
  surface: string
  card: string
  overlay: string

  // Borders
  border: string
  borderActive: string
  borderSubtle: string

  // Typography
  text: string
  textMuted: string
  textSubtle: string
  textInverse: string

  // Accents & Actions
  primary: string
  secondary: string
  accent: string

  // Status & Feedback
  success: string
  warning: string
  error: string
  info: string

  // Selection & Interactivity
  selectionBg: string
  selectionFg: string
  buttonBg: string
  buttonFg: string
  buttonActiveBg: string
  buttonActiveFg: string
}

export interface Theme {
  id: string
  name: string
  description?: string
  tokens: ThemeTokens
}

export interface ThemeSummary {
  id: string
  name: string
  isCustom: boolean
}
```

### 2. Service Interface (`src/core/interfaces.ts`)

```typescript
export interface IThemeService {
  getAvailableThemes(): ThemeSummary[]
  getTheme(id?: string): Theme
  getActiveTheme(): Theme
  getActiveThemeId(): string
  setTheme(id: string): Promise<Theme>
  reloadThemes(): Promise<void>
}
```

Registered with token `themeService` in `src/core/tokens.ts` and bound in `src/container/index.ts`.

### 3. Built-in Theme Presets (`src/ui/theme/presets.ts`)

Exports presets: `TERMI_DARK_THEME`, `DRACULA_THEME`, `CYBERPUNK_THEME`, `MATRIX_THEME`, `NORD_THEME`, and `DEFAULT_THEME` (`termi-dark`).

### 4. UI Context & Hook (`src/ui/theme/context.tsx` or `src/ui/context.tsx`)

`ThemeProvider` wraps the app and provides:
```typescript
export interface ThemeContextValue {
  theme: Theme
  tokens: ThemeTokens
  activeThemeId: string
  availableThemes: ThemeSummary[]
  previewTheme: (themeId: string) => void
  revertPreview: () => void
  setTheme: (themeId: string) => Promise<void>
}

export function useTheme(): ThemeContextValue
```

### 5. Settings Modal Component (`src/ui/components/SettingsModal.tsx`)

Modal component rendered when `showSettingsModal` is true in `DashboardScreen`.
- Supports arrow key scrolling through available themes.
- Triggers `previewTheme(theme.id)` as focus moves.
- Shows palette preview indicators (colors of primary, accent, surface, text, success, warning, error).
- `Enter` calls `setTheme(...)` and closes.
- `Esc` calls `revertPreview()` and closes.

---

## Test & Verification Plan

1. **Service Tests**: `tests/services/theme.test.ts`
   - Returns all built-in presets.
   - Loads custom JSON themes from disk.
   - Gracefully handles missing tokens in custom themes by falling back to defaults.
   - Persists chosen theme ID into `StorageService` (`config.json`).
2. **UI Component Tests**: `tests/ui/components/settings-modal.test.tsx`
   - Renders available themes list.
   - Cycles with arrow keys and invokes `previewTheme`.
   - Reverts on Escape.
   - Saves and closes on Enter.
3. **Typecheck & Full Test Suite**:
   - `bun run typecheck`
   - `bun test`
