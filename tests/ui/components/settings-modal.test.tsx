import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { testRender, act } from "../../test-utils.js"
import { ContainerProvider } from "../../../src/ui/context.js"
import { createDefaultContainer } from "../../../src/container/index.js"
import { SettingsModal } from "../../../src/ui/components/SettingsModal.js"
import { DashboardScreen } from "../../../src/ui/screens/DashboardScreen.js"
import type { Account } from "../../../src/core/types.js"

const sampleAccount: Account = {
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  label: "Primary Vault",
  type: "hd",
  index: 0,
  createdAt: new Date().toISOString(),
}

describe("SettingsModal component", () => {
  let tempDir: string
  let originalHome: string | undefined

  beforeEach(() => {
    originalHome = process.env.TERMIWALLET_HOME
    tempDir = mkdtempSync(join(tmpdir(), "termiwallet-settings-test-"))
    process.env.TERMIWALLET_HOME = tempDir
    mkdirSync(join(tempDir, "themes"), { recursive: true })
  })

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.TERMIWALLET_HOME = originalHome
    } else {
      delete process.env.TERMIWALLET_HOME
    }
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("renders SettingsModal with presets list, live palette swatches, and instructions", async () => {
    const container = createDefaultContainer()
    let closed = false

    const setup = await testRender(
      <ContainerProvider container={container}>
        <SettingsModal onClose={() => { closed = true }} />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    const output = setup.captureCharFrame()
    expect(output).toContain("Settings & Theme Selector")
    expect(output).toContain("Termi Dark (Default)")
    expect(output).toContain("Dracula")
    expect(output).toContain("Cyberpunk")
    expect(output).toContain("Matrix")
    expect(output).toContain("Nord")
    expect(output).toContain("[Active]")
    expect(output).toContain("Live Palette Swatches:")
    expect(output).toContain("Primary")
    expect(output).toContain("Accent")

    setup.renderer.destroy()
  })

  it("navigates themes with arrow keys and confirms on Enter", async () => {
    const container = createDefaultContainer()
    const themeService = container.resolve("themeService")
    let closed = false

    const setup = await testRender(
      <ContainerProvider container={container}>
        <SettingsModal onClose={() => { closed = true }} />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    // Initially active is termi-dark
    expect(themeService.getActiveThemeId()).toBe("termi-dark")

    // Press Down arrow to navigate to Dracula
    await act(async () => {
      setup.mockInput.pressArrow("down")
    })
    await setup.renderOnce()

    // Press Enter to apply
    await act(async () => {
      setup.mockInput.pressEnter()
    })
    await setup.renderOnce()

    expect(closed).toBe(true)
    expect(themeService.getActiveThemeId()).toBe("dracula")

    setup.renderer.destroy()
  })

  it("reverts theme preview and closes on Escape", async () => {
    const container = createDefaultContainer()
    const themeService = container.resolve("themeService")
    let closed = false

    const setup = await testRender(
      <ContainerProvider container={container}>
        <SettingsModal onClose={() => { closed = true }} />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    expect(themeService.getActiveThemeId()).toBe("termi-dark")

    // Navigate to next
    await act(async () => {
      setup.mockInput.pressArrow("down")
    })
    await setup.renderOnce()

    // Cancel with 'q'
    await act(async () => {
      setup.mockInput.pressKey("q")
    })
    await setup.renderOnce()

    expect(closed).toBe(true)
    // Active theme should not have changed
    expect(themeService.getActiveThemeId()).toBe("termi-dark")

    setup.renderer.destroy()
  })

  it("opens SettingsModal from DashboardScreen when pressing [S]", async () => {
    const container = createDefaultContainer()

    const setup = await testRender(
      <ContainerProvider container={container}>
        <DashboardScreen
          account={sampleAccount}
          onReset={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    // Verify [S] Settings appears in footer
    await setup.renderOnce()
    let output = setup.captureCharFrame()
    expect(output).toContain("[S]")
    expect(output).toContain("Settings")

    // Press 's' to trigger SettingsModal
    await act(async () => {
      setup.mockInput.pressKey("s")
    })
    await setup.renderOnce()

    output = setup.captureCharFrame()
    expect(output).toContain("Settings & Theme Selector")
    expect(output).toContain("Termi Dark (Default)")

    // Press 'q' to close
    await act(async () => {
      setup.mockInput.pressKey("q")
    })
    await setup.renderOnce()

    output = setup.captureCharFrame()
    expect(output).not.toContain("Settings & Theme Selector")

    setup.renderer.destroy()
  })
})
