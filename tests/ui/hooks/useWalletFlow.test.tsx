import { describe, expect, it } from "bun:test"
import { testRender, act } from "../../test-utils.js"
import { createDefaultContainer } from "../../../src/container/index.js"
import { ContainerProvider } from "../../../src/ui/context.js"
import { useWalletFlow } from "../../../src/ui/hooks/useWalletFlow.js"

const account = { address: "0x0000000000000000000000000000000000000001" as const, index: 0, label: "Primary", type: "hd" as const, createdAt: "now" }
const other = { address: "0x0000000000000000000000000000000000000002" as const, index: 1, label: "Second", type: "hd" as const, createdAt: "now" }
const wallet = { version: 1, mnemonic: "test words", accounts: [account, other], activeAddress: account.address, defaultChainId: 11155111 }

describe("useWalletFlow", () => {
  it("handles vault discovery, create and import flows, and errors", async () => {
    const container = createDefaultContainer()
    let exists = false
    let failSave = false
    const storage = { vaultExists: async () => exists, saveVault: async () => { if (failSave) throw new Error("disk full") }, deleteVault: async () => {}, loadVault: async () => "vault" }
    const crypto = { encrypt: async () => "encrypted", decrypt: async () => "decrypted" }
    const imported = { ...other, type: "imported" as const, encryptedPrivateKey: "cipher" }
    const watch = { ...other, type: "watch-only" as const }
    const walletSvc = {
      generateMnemonic: (n: number) => `mnemonic-${n}`, createWallet: () => wallet, importWallet: () => wallet, migrateWalletData: (w: any) => w,
      addDerivedAccount: (w: any) => ({ wallet: { ...w, accounts: [...w.accounts, { ...other, address: "0x0000000000000000000000000000000000000003" }] }, account: other }),
      importPrivateKey: async (w: any) => ({ wallet: w, account: imported }), importKeystore: async (w: any) => ({ wallet: w, account: imported }),
      addWatchOnlyAccount: (w: any) => ({ wallet: w, account: watch }), renameAccount: (w: any, _a: any, label: string) => ({ ...w, accounts: w.accounts.map((a: any) => a.address === account.address ? { ...a, label } : a) }),
      toggleHideAccount: (w: any) => ({ ...w, accounts: w.accounts.map((a: any) => a.address === account.address ? { ...a, hidden: true } : a) }), removeAccount: (w: any) => ({ ...w, accounts: [other], activeAddress: other.address }), getExportPrivateKey: () => "0xkey", getExportMnemonic: () => "secret phrase",
    }
    let synced = 0
    container.registerInstance("storageService", storage as any)
    container.registerInstance("cryptoService", crypto as any)
    container.registerInstance("walletService", walletSvc as any)
    container.registerInstance("networkService", { syncWallet: () => { synced++ } } as any)
    let hook: any
    function Harness() { hook = useWalletFlow(); return <text>{hook.step}</text> }
    const setup = await testRender(<ContainerProvider container={container}><Harness /></ContainerProvider>)
    await act(async () => { await Promise.resolve() })
    await setup.renderOnce()
    expect(hook.step).toBe("welcome")
    act(() => hook.handleStartCreate(24))
    await setup.renderOnce()
    expect(hook.mnemonicPhrase).toBe("mnemonic-24")
    act(() => hook.handleCreatePasswordComplete("secret"))
    await act(async () => { await hook.handleCreateMnemonicComplete() })
    await setup.renderOnce()
    expect(hook.step).toBe("dashboard")
    expect(hook.activeAccount).toEqual(account)
    expect(synced).toBe(1)

    await act(async () => { await hook.handleAddDerivedAccount("Third") })
    expect(hook.wallet.accounts).toHaveLength(3)
    await act(async () => { await hook.handleImportPrivateKey("0xkey", "Imported") })
    await act(async () => { await hook.handleImportKeystore("{}", "keystore-pass", "Keystore") })
    await act(async () => { await hook.handleAddWatchOnly("0xabc", "Watch") })
    await act(async () => { await hook.handleRenameAccount(account.address, "Renamed") })
    await act(async () => { await hook.handleToggleHideAccount(account.address) })
    await act(async () => { await hook.handleSelectActiveAccount(other.address) })
    await act(async () => { expect(await hook.handleExportPrivateKey(account.address, "secret")).toBe("0xkey") })
    await act(async () => { expect(await hook.handleExportMnemonic("secret")).toBe("secret phrase") })
    await act(async () => { await hook.handleRemoveAccount(account.address) })

    act(() => hook.handleStartImport())
    act(() => hook.handleImportWordsComplete("import words"))
    failSave = true
    await act(async () => { await hook.handleImportPasswordComplete("secret") })
    await setup.renderOnce()
    expect(hook.errorMessage).toContain("disk full")
    failSave = false
    await act(async () => { await hook.handleResetVault() })
    expect(hook.step).toBe("welcome")
    exists = true
    // A second mounted hook observes an existing vault.
    setup.renderer.destroy()
  })

  it("supports unlock selection and rejects account actions before initialization", async () => {
    const container = createDefaultContainer()
    container.registerInstance("storageService", { vaultExists: async () => true, loadVault: async () => "vault" } as any)
    container.registerInstance("cryptoService", { decrypt: async () => "{}" } as any)
    container.registerInstance("walletService", { migrateWalletData: (w: any) => w } as any)
    let hook: any
    function Harness() { hook = useWalletFlow(); return <text>{hook.step}</text> }
    const setup = await testRender(<ContainerProvider container={container}><Harness /></ContainerProvider>)
    await act(async () => { await Promise.resolve() })
    expect(hook.step).toBe("unlock")
    act(() => hook.handleUnlocked({ ...wallet, accounts: [{ ...account, hidden: true }, other], activeAddress: account.address }, "pw"))
    await setup.renderOnce()
    expect(hook.activeAccount).toEqual(other)
    act(() => hook.handleSelectActiveAccount("0x0000000000000000000000000000000000000009" as any))
    setup.renderer.destroy()
  })
})
