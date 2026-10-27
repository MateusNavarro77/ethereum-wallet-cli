import { describe, expect, it } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { registerQRCode } from "@opentui/qrcode/react"
import { ContainerProvider } from "../src/ui/context.js"
import { createDefaultContainer } from "../src/container/index.js"
import { MnemonicScreen } from "../src/ui/screens/MnemonicScreen.js"
import { ImportScreen } from "../src/ui/screens/ImportScreen.js"
import { DashboardScreen } from "../src/ui/screens/DashboardScreen.js"
import { AccountsModal } from "../src/ui/components/AccountsModal.js"
import { ExportModal } from "../src/ui/components/ExportModal.js"
import type { WalletData } from "../src/core/types.js"

registerQRCode()

describe("Iteration 5 UI Components", () => {
  const container = createDefaultContainer()

  const sampleWallet: WalletData = {
    version: 2,
    mnemonic: "test test test test test test test test test test test junk",
    accounts: [
      {
        address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        index: 0,
        label: "Primary Vault",
        type: "hd",
        hidden: false,
        createdAt: "2026-10-26T00:00:00Z",
      },
      {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        index: 1,
        label: "Savings HD",
        type: "hd",
        hidden: false,
        createdAt: "2026-10-26T00:00:00Z",
      },
      {
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        label: "Imported Private Key",
        type: "imported",
        encryptedPrivateKey: "0x123",
        hidden: false,
        createdAt: "2026-10-26T00:00:00Z",
      },
      {
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        label: "Vitalik Watcher",
        type: "watch-only",
        hidden: false,
        createdAt: "2026-10-26T00:00:00Z",
      },
    ],
    activeAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    defaultChainId: 11155111,
  }

  it("renders MnemonicScreen with 24 words and verification challenge notice (FR-ACC-01 & FR-ACC-02)", async () => {
    const mnemonic24 =
      "legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title"

    const setup = await testRender(
      <ContainerProvider container={container}>
        <MnemonicScreen mnemonic={mnemonic24} onComplete={() => {}} />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )
    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame).toContain("Backup Your Recovery Phrase")
    expect(frame).toContain("[24 Words]")
    expect(frame).toContain("24. title")
    expect(frame).toContain("Proceed to Backup Verification")

    setup.renderer.destroy()
  })

  it("renders ImportScreen with toggleable 12/24 word modes (FR-ACC-03)", async () => {
    const setup = await testRender(
      <ContainerProvider container={container}>
        <ImportScreen onComplete={() => {}} onCancel={() => {}} />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )
    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame).toContain("Enter Your 12-Word Recovery Phrase")
    expect(frame).toContain("[12 Words]")
    expect(frame).toContain("Toggle 12/24")

    setup.renderer.destroy()
  })

  it("renders AccountsModal with polymorphic badges ([HD-0], [Imported], [Watch-Only])", async () => {
    const setup = await testRender(
      <ContainerProvider container={container}>
        <AccountsModal
          wallet={sampleWallet}
          activeAccount={sampleWallet.accounts[0]}
          onSelectAccount={() => {}}
          onAddDerived={async () => sampleWallet.accounts[1] as any}
          onImportPrivateKey={async () => sampleWallet.accounts[2] as any}
          onImportKeystore={async () => sampleWallet.accounts[2] as any}
          onAddWatchOnly={async () => sampleWallet.accounts[3] as any}
          onRename={async () => {}}
          onToggleHide={async () => {}}
          onRemove={async () => {}}
          onExportPrivateKey={async () => "0x123"}
          onExportMnemonic={async () => "mnemonic"}
          onClose={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 30 },
    )
    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame).toContain("Account Manager & Portfolio")
    expect(frame).toContain("[HD-0]")
    expect(frame).toContain("Primary Vault")
    expect(frame).toContain("[Imported]")
    expect(frame).toContain("Imported Private Key")
    expect(frame).toContain("[Watch-Only]")
    expect(frame).toContain("Vitalik Watcher")
    expect(frame).toContain("[Active]")

    // Hotkey bar actions
    expect(frame).toContain("Add Next Derived")
    expect(frame).toContain("Rename")
    expect(frame).toContain("Import Account")
    expect(frame).toContain("Export Key")
    expect(frame).toContain("Export Seed")

    setup.renderer.destroy()
  })

  it("renders ExportModal authentication step and warning (FR-ACC-09)", async () => {
    const setup = await testRender(
      <ContainerProvider container={container}>
        <ExportModal
          title="Export Private Key for Account 1"
          sensitiveType="private-key"
          address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
          onExport={async () => "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e"}
          onClose={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 30 },
    )
    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame).toContain("Export Private Key for Account 1 (FR-ACC-09)")
    expect(frame).toContain("Master Password")
    expect(frame).toContain("Confirm Authentication")

    setup.renderer.destroy()
  })

  it("renders DashboardScreen with active account badge and manage accounts shortcut", async () => {
    const setup = await testRender(
      <ContainerProvider container={container}>
        <DashboardScreen
          account={sampleWallet.accounts[0]}
          onReset={() => {}}
          wallet={sampleWallet}
          onSelectAccount={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 30 },
    )
    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame).toContain("Account: Primary Vault [HD-0]")
    expect(frame).toContain("[Tab] Quick Switch")
    expect(frame).toContain("Manage Accounts")

    setup.renderer.destroy()
  })
})
