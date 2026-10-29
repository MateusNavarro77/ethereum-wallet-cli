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
  isCustom?: boolean
  tokens: ThemeTokens
}

export interface ThemeSummary {
  id: string
  name: string
  description?: string
  isCustom: boolean
}

export interface CustomThemeFile {
  name: string
  description?: string
  tokens: Partial<ThemeTokens>
}

