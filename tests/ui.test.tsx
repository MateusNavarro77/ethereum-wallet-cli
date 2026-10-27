import { describe, expect, it } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { registerQRCode } from "@opentui/qrcode/react"
import { ContainerProvider } from "../src/ui/context.js"
import { createDefaultContainer } from "../src/container/index.js"
import { WelcomeScreen } from "../src/ui/screens/WelcomeScreen.js"
import { ImportScreen } from "../src/ui/screens/ImportScreen.js"
import { PasswordScreen } from "../src/ui/screens/PasswordScreen.js"
import { MnemonicScreen } from "../src/ui/screens/MnemonicScreen.js"
import { ReceiveScreen } from "../src/ui/screens/ReceiveScreen.js"
import { UnlockScreen } from "../src/ui/screens/UnlockScreen.js"
import { ResetModal } from "../src/ui/components/ResetModal.js"
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

  it("renders ReceiveScreen with QR code and onReset without crashing", async () => {
    const dummyAccount: Account = {
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      index: 0,
      label: "Account 1",
    }
    const setup = await testRender(
      <ContainerProvider container={container}>
        <ReceiveScreen account={dummyAccount} onReset={() => {}} />
      </ContainerProvider>,
      {},
    )
    expect(setup.renderer).toBeDefined()
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
})
