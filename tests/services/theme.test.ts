import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { StorageService } from "../../src/services/storage.service.js"
import { ThemeService } from "../../src/services/theme.service.js"
import {
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  TERMI_DARK_THEME,
  DRACULA_THEME,
} from "../../src/ui/theme/presets.js"

describe("ThemeService", () => {
  let tempDir: string
  let storageService: StorageService
  let themesDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "termiwallet-theme-test-"))
    themesDir = join(tempDir, "themes")
    mkdirSync(themesDir, { recursive: true })
    storageService = new StorageService(
      join(tempDir, "vault.json"),
      join(tempDir, "config.json"),
    )
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test("initializes with built-in presets by default", () => {
    const service = new ThemeService(storageService, themesDir)
    const available = service.getAvailableThemes()

    expect(available.length).toBe(Object.keys(BUILTIN_THEMES).length)
    expect(available.map((t) => t.id)).toContain("termi-dark")
    expect(available.map((t) => t.id)).toContain("dracula")
    expect(available.map((t) => t.id)).toContain("cyberpunk")
    expect(available.map((t) => t.id)).toContain("matrix")
    expect(available.map((t) => t.id)).toContain("nord")

    expect(service.getActiveThemeId()).toBe(DEFAULT_THEME_ID)
    expect(service.getActiveTheme().id).toBe(DEFAULT_THEME_ID)
  })

  test("switches theme and persists to config.json", async () => {
    const service = new ThemeService(storageService, themesDir)
    await service.init()

    const newTheme = await service.setTheme("dracula")
    expect(newTheme.id).toBe("dracula")
    expect(service.getActiveThemeId()).toBe("dracula")
    expect(service.getActiveTheme().tokens.primary).toBe(DRACULA_THEME.tokens.primary)

    // Verify persisted to storage
    const config = await storageService.loadConfig()
    expect(config.theme).toBe("dracula")

    // Verify a new service instance loads the persisted theme
    const newService = new ThemeService(storageService, themesDir)
    await newService.init()
    expect(newService.getActiveThemeId()).toBe("dracula")
  })

  test("loads custom JSON themes from the themes directory", async () => {
    const customThemeContent = {
      name: "Solarized Twilight",
      description: "Warm amber and solarized glow",
      tokens: {
        primary: "#B58900",
        background: "#002B36",
        surface: "#073642",
      },
    }

    writeFileSync(
      join(themesDir, "solarized-twilight.json"),
      JSON.stringify(customThemeContent),
      "utf8",
    )

    const service = new ThemeService(storageService, themesDir)
    await service.init()

    const themes = service.getAvailableThemes()
    const custom = themes.find((t) => t.id === "solarized-twilight")
    expect(custom).toBeDefined()
    expect(custom?.name).toBe("Solarized Twilight")
    expect(custom?.isCustom).toBe(true)

    // Select custom theme
    const selected = await service.setTheme("solarized-twilight")
    expect(selected.id).toBe("solarized-twilight")
    expect(selected.tokens.primary).toBe("#B58900")
    expect(selected.tokens.background).toBe("#002B36")
    // Non-overridden tokens must fall back to termi-dark default
    expect(selected.tokens.success).toBe(TERMI_DARK_THEME.tokens.success)
  })

  test("ignores invalid or non-json files in themes directory gracefully", async () => {
    writeFileSync(join(themesDir, "corrupted.json"), "{ invalid json", "utf8")
    writeFileSync(join(themesDir, "notes.txt"), "hello world", "utf8")

    const service = new ThemeService(storageService, themesDir)
    await service.init()

    const themes = service.getAvailableThemes()
    expect(themes.find((t) => t.id === "corrupted")).toBeUndefined()
    expect(themes.find((t) => t.id === "notes")).toBeUndefined()
  })

  test("falls back to default theme if configured theme is missing", async () => {
    await storageService.saveConfig({ theme: "non-existent-theme" })

    const service = new ThemeService(storageService, themesDir)
    await service.init()

    expect(service.getActiveThemeId()).toBe(DEFAULT_THEME_ID)
    expect(service.getActiveTheme().id).toBe(DEFAULT_THEME_ID)
  })

  test("throws when attempting to switch to an unknown theme id", async () => {
    const service = new ThemeService(storageService, themesDir)
    await service.init()

    expect(service.setTheme("non-existent")).rejects.toThrow("Theme 'non-existent' not found")
  })
})

