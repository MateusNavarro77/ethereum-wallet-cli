import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import type { Theme, ThemeSummary, ThemeTokens } from "../../core/theme.types.js"
import { TERMI_DARK_THEME, BUILTIN_THEMES } from "./presets.js"
import type { IThemeService } from "../../core/interfaces.js"

export interface ThemeContextValue {
  theme: Theme
  tokens: ThemeTokens
  activeThemeId: string
  availableThemes: ThemeSummary[]
  previewTheme: (themeId: string) => void
  revertPreview: () => void
  setTheme: (themeId: string) => Promise<void>
  reloadThemes: () => Promise<void>
}

const defaultSummaries: ThemeSummary[] = Object.values(BUILTIN_THEMES).map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  isCustom: false,
}))

export const DEFAULT_THEME_CONTEXT: ThemeContextValue = {
  theme: TERMI_DARK_THEME,
  tokens: TERMI_DARK_THEME.tokens,
  activeThemeId: TERMI_DARK_THEME.id,
  availableThemes: defaultSummaries,
  previewTheme: () => {},
  revertPreview: () => {},
  setTheme: async () => {},
  reloadThemes: async () => {},
}

export const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME_CONTEXT)

export interface ThemeProviderProps {
  themeService?: IThemeService
  initialThemeId?: string
  children: ReactNode
}

export function ThemeProvider({ themeService, initialThemeId, children }: ThemeProviderProps) {
  const [activeTheme, setActiveTheme] = useState<Theme>(() => {
    if (initialThemeId && BUILTIN_THEMES[initialThemeId]) {
      return BUILTIN_THEMES[initialThemeId]
    }
    if (themeService) {
      return themeService.getActiveTheme()
    }
    return TERMI_DARK_THEME
  })

  const [previewThemeState, setPreviewThemeState] = useState<Theme | null>(null)
  const [availableThemes, setAvailableThemes] = useState<ThemeSummary[]>(() => {
    if (themeService) {
      return themeService.getAvailableThemes()
    }
    return defaultSummaries
  })

  useEffect(() => {
    if (!themeService) return
    let mounted = true

    const load = async () => {
      if ("init" in themeService && typeof (themeService as any).init === "function") {
        await (themeService as any).init()
      }
      if (mounted) {
        setActiveTheme(themeService.getActiveTheme())
        setAvailableThemes(themeService.getAvailableThemes())
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [themeService])

  const previewTheme = useCallback(
    (themeId: string) => {
      if (themeService) {
        setPreviewThemeState(themeService.getTheme(themeId))
      } else if (BUILTIN_THEMES[themeId]) {
        setPreviewThemeState(BUILTIN_THEMES[themeId])
      }
    },
    [themeService],
  )

  const revertPreview = useCallback(() => {
    setPreviewThemeState(null)
  }, [])

  const setTheme = useCallback(
    async (themeId: string) => {
      if (themeService) {
        const updated = await themeService.setTheme(themeId)
        setActiveTheme(updated)
        setPreviewThemeState(null)
      } else if (BUILTIN_THEMES[themeId]) {
        setActiveTheme(BUILTIN_THEMES[themeId])
        setPreviewThemeState(null)
      }
    },
    [themeService],
  )

  const reloadThemes = useCallback(async () => {
    if (themeService) {
      await themeService.reloadThemes()
      setAvailableThemes(themeService.getAvailableThemes())
      setActiveTheme(themeService.getActiveTheme())
    }
  }, [themeService])

  const currentTheme = previewThemeState || activeTheme

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: currentTheme,
      tokens: currentTheme.tokens,
      activeThemeId: activeTheme.id,
      availableThemes,
      previewTheme,
      revertPreview,
      setTheme,
      reloadThemes,
    }),
    [currentTheme, activeTheme.id, availableThemes, previewTheme, revertPreview, setTheme, reloadThemes],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

