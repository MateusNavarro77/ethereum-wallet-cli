import { describe, expect, it } from "bun:test"
import { testRender } from "../../test-utils.js"
import { registerQRCode } from "@opentui/qrcode/react"
import { ContainerProvider } from "../../../src/ui/context.js"
import { createDefaultContainer } from "../../../src/container/index.js"
import { AccountsModal } from "../../../src/ui/components/AccountsModal.js"
import type { Account, WalletData } from "../../../src/core/types.js"

registerQRCode()

describe("Accounts modal", () => {
  const container = createDefaultContainer()

  // Generate 24 accounts to reproduce the exact scenario reported by the user
  const generatedAccounts: Account[] = Array.from({ length: 24 }).map((_, i) => {
    const address = `0x${(i + 1).toString(16).padStart(40, "0")}` as `0x${string}`
    const label = `Account ${i + 1}`
    const createdAt = "2026-10-27T00:00:00Z"
    if (i === 22) {
      return {
        address,
        label,
        type: "imported" as const,
        encryptedPrivateKey: "0xencrypted",
        hidden: false,
        createdAt,
      }
    }
    if (i === 23) {
      return {
        address,
        label,
        type: "watch-only" as const,
        hidden: false,
        createdAt,
      }
    }
    return {
      address,
      index: i,
      label,
      type: "hd" as const,
      hidden: false,
      createdAt,
    }
  })

  const walletWith24Accounts: WalletData = {
    version: 2,
    mnemonic: "test test test test test test test test test test test junk",
    accounts: generatedAccounts,
    activeAddress: generatedAccounts[0].address,
    defaultChainId: 11155111,
  }

  it("windows accounts list to PAGE_SIZE (8 items) preventing modal overflow (24 accounts scenario)", async () => {
    const setup = await testRender(
      <ContainerProvider container={container}>
        <AccountsModal
          wallet={walletWith24Accounts}
          activeAccount={walletWith24Accounts.accounts[0]}
          onSelectAccount={() => {}}
          onAddDerived={async () => walletWith24Accounts.accounts[1] as any}
          onImportPrivateKey={async () => walletWith24Accounts.accounts[2] as any}
          onImportKeystore={async () => walletWith24Accounts.accounts[2] as any}
          onAddWatchOnly={async () => walletWith24Accounts.accounts[3] as any}
          onRename={async () => {}}
          onToggleHide={async () => {}}
          onRemove={async () => {}}
          onExportPrivateKey={async () => "0x123"}
          onExportMnemonic={async () => "mnemonic"}
          onClose={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    // 1. Header shows total count and windowing range
    expect(frame).toContain("Account Manager & Portfolio")
    expect(frame).toContain("24 Accounts (1-8 of 24)")
    expect(frame).toContain("[Esc] Close")

    // 2. Box title indicates navigation and down arrow scrollability
    expect(frame).toContain("Accounts [1/24]")
    expect(frame).toContain("▼")

    // 3. First 8 accounts are rendered
    expect(frame).toContain("Account 1")
    expect(frame).toContain("Account 8")
    expect(frame).toContain("[Active]")

    // 4. Accounts beyond the first page (9 to 24) are virtualized out, preventing overflow
    expect(frame).not.toContain("Account 9")
    expect(frame).not.toContain("Account 10")
    expect(frame).not.toContain("Account 20")
    expect(frame).not.toContain("Account 24")

    // 5. Hotkeys bar is fully intact and visible below the windowed accounts
    expect(frame).toContain("Switch Active")
    expect(frame).toContain("Add Next Derived")
    expect(frame).toContain("Rename")
    expect(frame).toContain("Import Account")
    expect(frame).toContain("Hide/Unhide")
    expect(frame).toContain("Remove Account")
    expect(frame).toContain("Export Key")
    expect(frame).toContain("Export Seed")

    setup.renderer.destroy()
  })

  it("focuses active account and scrolls window when active account is beyond first page", async () => {
    // Set active account to Account 12 (index 11)
    const activeAcc = walletWith24Accounts.accounts[11]

    const setup = await testRender(
      <ContainerProvider container={container}>
        <AccountsModal
          wallet={walletWith24Accounts}
          activeAccount={activeAcc}
          onSelectAccount={() => {}}
          onAddDerived={async () => walletWith24Accounts.accounts[1] as any}
          onImportPrivateKey={async () => walletWith24Accounts.accounts[2] as any}
          onImportKeystore={async () => walletWith24Accounts.accounts[2] as any}
          onAddWatchOnly={async () => walletWith24Accounts.accounts[3] as any}
          onRename={async () => {}}
          onToggleHide={async () => {}}
          onRemove={async () => {}}
          onExportPrivateKey={async () => "0x123"}
          onExportMnemonic={async () => "mnemonic"}
          onClose={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    // Since Account 12 (index 11) is active:
    // effectiveOffset = 11 - 8 + 1 = 4 (displaying accounts index 4..11, i.e., Account 5 to Account 12)
    expect(frame).toContain("Account 12")
    expect(frame).toContain("[Active]")
    expect(frame).toContain("Accounts [12/24]")
    // Both up and down arrows visible since accounts exist above and below
    expect(frame).toContain("▲")
    expect(frame).toContain("▼")

    // Account 1 (index 0) is scrolled out
    expect(frame).not.toContain("Account 1 ")

    setup.renderer.destroy()
  })
})

