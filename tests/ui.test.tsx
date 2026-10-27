import { describe, expect, it } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { registerQRCode } from "@opentui/qrcode/react"
import { ContainerProvider } from "../src/ui/context.js"
import { createDefaultContainer } from "../src/container/index.js"
import { WelcomeScreen } from "../src/ui/screens/WelcomeScreen.js"
import { ImportScreen } from "../src/ui/screens/ImportScreen.js"
import { PasswordScreen } from "../src/ui/screens/PasswordScreen.js"
import { MnemonicScreen } from "../src/ui/screens/MnemonicScreen.js"
import { DashboardScreen } from "../src/ui/screens/DashboardScreen.js"
import { ReceiveScreen } from "../src/ui/screens/ReceiveScreen.js"
import { UnlockScreen } from "../src/ui/screens/UnlockScreen.js"
import { ResetModal } from "../src/ui/components/ResetModal.js"
import { LogoBanner } from "../src/ui/components/LogoBanner.js"
import type { Account } from "../src/core/types.js"

registerQRCode()

describe("UI Screens Rendering (Iteration 2)", () => {
  const container = createDefaultContainer()

  it("renders WelcomeScreen without crashing", async () => {
    const setup = await testRender(
      <ContainerProvider container={container}>
        <WelcomeScreen onCreateNew={() => {}} onImport={() => {}} />
      </ContainerProvider>,
      {},
    )
    expect(setup.renderer).toBeDefined()
    setup.renderer.destroy()
  })

  it("renders ImportScreen without crashing", async () => {
    const setup = await testRender(
      <ContainerProvider container={container}>
        <ImportScreen onComplete={() => {}} onCancel={() => {}} />
      </ContainerProvider>,
      {},
    )
    expect(setup.renderer).toBeDefined()
    setup.renderer.destroy()
  })

  it("renders PasswordScreen without crashing", async () => {
    const setup = await testRender(
      <ContainerProvider container={container}>
        <PasswordScreen onComplete={() => {}} />
      </ContainerProvider>,
      {},
    )
    expect(setup.renderer).toBeDefined()
    setup.renderer.destroy()
  })

  it("renders MnemonicScreen without crashing", async () => {
    const dummyMnemonic = "test test test test test test test test test test test junk"
    const setup = await testRender(
      <ContainerProvider container={container}>
        <MnemonicScreen mnemonic={dummyMnemonic} onComplete={() => {}} />
      </ContainerProvider>,
      {},
    )
    expect(setup.renderer).toBeDefined()
    setup.renderer.destroy()
  })

  it("renders DashboardScreen with rendered QR code blocks and onReset", async () => {
    const dummyAccount: Account = {
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      index: 0,
      label: "Account 1",
      type: "hd",
      createdAt: new Date().toISOString(),
    }
    const setup = await testRender(
      <ContainerProvider container={container}>
        <DashboardScreen account={dummyAccount} onReset={() => {}} />
      </ContainerProvider>,
      { width: 100, height: 30 },
    )
    expect(setup.renderer).toBeDefined()
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("Scan to Receive")
    expect(frame).toContain("█")
    expect(frame).toContain(dummyAccount.address)
    setup.renderer.destroy()
  })

  it("renders ReceiveScreen backwards compatibility alias", async () => {
    const dummyAccount: Account = {
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      index: 0,
      label: "Account 1",
      type: "hd",
      createdAt: new Date().toISOString(),
    }
    const setup = await testRender(
      <ContainerProvider container={container}>
        <ReceiveScreen account={dummyAccount} onReset={() => {}} />
      </ContainerProvider>,
      { width: 100, height: 30 },
    )
    expect(setup.renderer).toBeDefined()
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("Scan to Receive")
    expect(frame).toContain("█")
    setup.renderer.destroy()
  })

  it("renders UnlockScreen with onReset without crashing", async () => {
    const setup = await testRender(
      <ContainerProvider container={container}>
        <UnlockScreen onUnlocked={() => {}} onReset={() => {}} />
      </ContainerProvider>,
      {},
    )
    expect(setup.renderer).toBeDefined()
    setup.renderer.destroy()
  })

  it("renders ResetModal without crashing", async () => {
    const setup = await testRender(
      <ResetModal onConfirm={() => {}} onCancel={() => {}} />,
      {},
    )
    expect(setup.renderer).toBeDefined()
    setup.renderer.destroy()
  })

  describe("Branding & ASCII Art Banner (Iteration 4)", () => {
    it("renders LogoBanner with ASCII banner and subtitle", async () => {
      const setup = await testRender(
        <LogoBanner subtitle="Test Subtitle" description="Test Description" />,
        { width: 100, height: 30 },
      )
      expect(setup.renderer).toBeDefined()
      await setup.renderOnce()
      const frame = setup.captureCharFrame()
      expect(frame).toContain("Test Subtitle")
      expect(frame).toContain("Test Description")
      expect(frame).toContain("▀█▀ █▀▀")
      setup.renderer.destroy()
    })

    it("renders TermiWallet ASCII banner on WelcomeScreen", async () => {
      const setup = await testRender(
        <ContainerProvider container={container}>
          <WelcomeScreen onCreateNew={() => {}} onImport={() => {}} />
        </ContainerProvider>,
        { width: 100, height: 30 },
      )
      await setup.renderOnce()
      const frame = setup.captureCharFrame()
      expect(frame).toContain("▀█▀ █▀▀")
      expect(frame).toContain("Welcome to TermiWallet")
      expect(frame).toContain("[1] Create New Wallet")
      setup.renderer.destroy()
    })

    it("renders TermiWallet ASCII banner on PasswordScreen", async () => {
      const setup = await testRender(
        <ContainerProvider container={container}>
          <PasswordScreen onComplete={() => {}} />
        </ContainerProvider>,
        { width: 100, height: 30 },
      )
      await setup.renderOnce()
      const frame = setup.captureCharFrame()
      expect(frame).toContain("▀█▀ █▀▀")
      expect(frame).toContain("Set Master Password")
      setup.renderer.destroy()
    })

    it("renders TermiWallet ASCII banner on UnlockScreen", async () => {
      const setup = await testRender(
        <ContainerProvider container={container}>
          <UnlockScreen onUnlocked={() => {}} onReset={() => {}} />
        </ContainerProvider>,
        { width: 100, height: 30 },
      )
      await setup.renderOnce()
      const frame = setup.captureCharFrame()
      expect(frame).toContain("▀█▀ █▀▀")
      expect(frame).toContain("Unlock Your Account")
      setup.renderer.destroy()
    })
  })
})
