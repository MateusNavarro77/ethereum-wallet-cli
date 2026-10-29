import { existsSync, readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, parse } from "node:path"
import type { IStorageService, IThemeService } from "../core/interfaces.js"
import type { CustomThemeFile, Theme, ThemeSummary } from "../core/theme.types.js"
import {
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  TERMI_DARK_THEME,
} from "../ui/theme/presets.js"

export class ThemeService implements IThemeService {
  private readonly storageService: IStorageService
  private readonly themesDir: string
  private themes: Map<string, Theme> = new Map()
  private activeThemeId: string = DEFAULT_THEME_ID

  constructor(storageService: IStorageService, customThemesDir?: string) {
    this.storageService = storageService
    if (customThemesDir) {
      this.themesDir = customThemesDir
    } else {
      const baseDir = process.env.TERMIWALLET_HOME || join(homedir(), ".termiwallet")
      this.themesDir = join(baseDir, "themes")
    }

    // Initialize with built-in presets
    for (const [id, theme] of Object.entries(BUILTIN_THEMES)) {
      this.themes.set(id, { ...theme })
    }
  }

  async init(): Promise<void> {
    await this.reloadThemes()
    await this.loadActiveThemeFromConfig()
  }

  async reloadThemes(): Promise<void> {
    // Reset to builtins first
    this.themes.clear()
    for (const [id, theme] of Object.entries(BUILTIN_THEMES)) {
      this.themes.set(id, { ...theme })
    }

    if (!existsSync(this.themesDir)) {
      return
    }

    try {
      const files = readdirSync(this.themesDir)
      for (const file of files) {
        if (!file.endsWith(".json")) continue

        const filePath = join(this.themesDir, file)
        try {
          const raw = readFileSync(filePath, "utf8")
          const parsed = JSON.parse(raw) as Partial<CustomThemeFile>
          const id = parse(file).name

          if (parsed && typeof parsed === "object") {
            const mergedTheme: Theme = {
              id,
              name: typeof parsed.name === "string" ? parsed.name : id,
              description: typeof parsed.description === "string" ? parsed.description : undefined,
              isCustom: true,
              tokens: {
                ...TERMI_DARK_THEME.tokens,
                ...(parsed.tokens || {}),
              },
            }
            this.themes.set(id, mergedTheme)
          }
        } catch {
          // Ignore invalid theme file without failing
        }
      }
    } catch {
      // Ignore directory read error
    }
  }

  private async loadActiveThemeFromConfig(): Promise<void> {
    try {
      const config = await this.storageService.loadConfig()
      if (config.theme && this.themes.has(config.theme)) {
        this.activeThemeId = config.theme
      } else {
        this.activeThemeId = DEFAULT_THEME_ID
      }
    } catch {
      this.activeThemeId = DEFAULT_THEME_ID
    }
  }

  getAvailableThemes(): ThemeSummary[] {
    return Array.from(this.themes.values()).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      isCustom: !!t.isCustom,
    }))
  }

  getTheme(id?: string): Theme {
    if (!id) return this.getActiveTheme()
    return this.themes.get(id) || this.getActiveTheme()
  }

  getActiveTheme(): Theme {
    return this.themes.get(this.activeThemeId) || TERMI_DARK_THEME
  }

  getActiveThemeId(): string {
    return this.activeThemeId
  }

  async setTheme(id: string): Promise<Theme> {
    if (!this.themes.has(id)) {
      throw new Error(`Theme '${id}' not found`)
    }

    this.activeThemeId = id

    try {
      const config = await this.storageService.loadConfig()
      config.theme = id
      await this.storageService.saveConfig(config)
    } catch {
      // Continue even if config saving fails
    }

    return this.getActiveTheme()
  }
}

