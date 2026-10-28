import { describe, expect, it } from "bun:test"
import { testRender, act } from "../../test-utils.js"
import { registerQRCode } from "@opentui/qrcode/react"
import { ContainerProvider } from "../../../src/ui/context.js"
import { createDefaultContainer } from "../../../src/container/index.js"
import { MnemonicScreen } from "../../../src/ui/screens/MnemonicScreen.js"
import { ImportScreen } from "../../../src/ui/screens/ImportScreen.js"
import { DashboardScreen } from "../../../src/ui/screens/DashboardScreen.js"
import { AccountsModal } from "../../../src/ui/components/AccountsModal.js"
import { ExportModal } from "../../../src/ui/components/ExportModal.js"
import type { WalletData } from "../../../src/core/types.js"

registerQRCode()

describe("Account management UI", () => {
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

  it("handles account navigation, visibility, protected removal, and export entry", async () => {
    const selected: string[] = []
    const toggled: string[] = []
    const setup = await testRender(
      <ContainerProvider container={container}>
        <AccountsModal wallet={sampleWallet} activeAccount={sampleWallet.accounts[0]} onSelectAccount={(a) => selected.push(a)}
          onAddDerived={async () => sampleWallet.accounts[1] as any} onImportPrivateKey={async () => sampleWallet.accounts[2] as any}
          onImportKeystore={async () => sampleWallet.accounts[2] as any} onAddWatchOnly={async () => sampleWallet.accounts[3] as any}
          onRename={async () => {}} onToggleHide={async (a) => { toggled.push(a) }} onRemove={async () => {}}
          onExportPrivateKey={async () => "0xsecret"} onExportMnemonic={async () => "seed"} onClose={() => {}} />
      </ContainerProvider>, { width: 100, height: 35 },
    )
    await act(async () => {
      setup.mockInput.pressKey("h")
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await setup.renderOnce()
    expect(toggled).toEqual([sampleWallet.accounts[0].address])
    act(() => setup.mockInput.pressKey("d"))
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("HD derived accounts cannot be removed")
    act(() => setup.mockInput.pressArrow("down"))
    await setup.renderOnce()
    act(() => setup.mockInput.pressArrow("down"))
    await setup.renderOnce()
    act(() => setup.mockInput.pressKey("d"))
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("REMOVE ACCOUNT CONFIRMATION")
    await act(async () => {
      setup.mockInput.pressEnter()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Please type REMOVE")
    setup.renderer.destroy()
  })

  it("renders rename and each account import form from the keyboard menu", async () => {
    const renderModal = () => testRender(
      <ContainerProvider container={container}>
        <AccountsModal wallet={sampleWallet} activeAccount={sampleWallet.accounts[0]} onSelectAccount={() => {}}
          onAddDerived={async () => sampleWallet.accounts[1] as any} onImportPrivateKey={async () => sampleWallet.accounts[2] as any}
          onImportKeystore={async () => sampleWallet.accounts[2] as any} onAddWatchOnly={async () => sampleWallet.accounts[3] as any}
          onRename={async () => {}} onToggleHide={async () => {}} onRemove={async () => {}}
          onExportPrivateKey={async () => "0xkey"} onExportMnemonic={async () => "seed"} onClose={() => {}} />
      </ContainerProvider>, { width: 100, height: 35 },
    )
    const setup = await renderModal()
    act(() => setup.mockInput.pressKey("r"))
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Rename Account")
    await act(async () => {
      setup.mockInput.pressEnter()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await setup.renderOnce()
    act(() => setup.mockInput.pressKey("i"))
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Select Import Method")
    act(() => setup.mockInput.pressKey("1"))
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Import Raw Private Key")
    setup.renderer.destroy()

    const keystore = await renderModal()
    act(() => keystore.mockInput.pressKey("i"))
    await keystore.renderOnce()
    act(() => keystore.mockInput.pressKey("2"))
    await keystore.renderOnce()
    expect(keystore.captureCharFrame()).toContain("Import Web3 Keystore File")
    keystore.renderer.destroy()

    const watchOnly = await renderModal()
    act(() => watchOnly.mockInput.pressKey("i"))
    await watchOnly.renderOnce()
    act(() => watchOnly.mockInput.pressKey("3"))
    await watchOnly.renderOnce()
    expect(watchOnly.captureCharFrame()).toContain("Add Watch-Only Account")
    watchOnly.renderer.destroy()
  })

  it("renders ExportModal authentication step and warning (FR-ACC-09)", async () => {
    let exportedPassword = ""
    const exportContainer = createDefaultContainer()
    exportContainer.registerInstance("clipboardService", { copy: async () => true } as any)
    const setup = await testRender(
      <ContainerProvider container={exportContainer}>
        <ExportModal
          title="Export Private Key for Account 1"
          sensitiveType="private-key"
          address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
          onExport={async (password) => { exportedPassword = password; return "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e" }}
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

    act(() => setup.mockInput.pressEnter())
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Master password required")
    expect(exportedPassword).toBe("")

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
