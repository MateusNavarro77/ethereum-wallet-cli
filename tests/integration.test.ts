import { describe, expect, it, afterEach } from "bun:test"
import { existsSync, unlinkSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createDefaultContainer, ServiceContainer } from "../src/container/index.js"
import { StorageService } from "../src/services/storage.service.js"
import type { WalletData } from "../src/core/types.js"

describe("End-to-End Service Flow: Wallet Creation & Vault Recovery", () => {
  const tempDir = join(tmpdir(), `termiwallet-e2e-${Date.now()}`)
  const tempVaultPath = join(tempDir, "vault.json")

  afterEach(() => {
    if (existsSync(tempVaultPath)) unlinkSync(tempVaultPath)
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true })
  })

  it("creates a wallet, encrypts, saves to disk, loads, decrypts and derives Sepolia address", async () => {
    const container = createDefaultContainer()
    // Inject test storage path
    container.registerInstance("storageService", new StorageService(tempVaultPath))

    const walletService = container.resolve("walletService")
    const cryptoService = container.resolve("cryptoService")
    const storageService = container.resolve("storageService")

    // 1. Generate mnemonic & create wallet data
    const mnemonic = walletService.generateMnemonic()
    const wallet = walletService.createWallet(mnemonic, "Account 1")
    expect(wallet.accounts[0].address.startsWith("0x")).toBe(true)

    // 2. Encrypt wallet with password
    const password = "SuperSecretPassword123!"
    const vault = await cryptoService.encrypt(JSON.stringify(wallet), password)

    // 3. Persist encrypted vault to disk
    await storageService.saveVault(vault)
    expect(await storageService.vaultExists()).toBe(true)

    // 4. Reload from disk & decrypt
    const loadedVault = await storageService.loadVault()
    const decryptedJson = await cryptoService.decrypt(loadedVault, password)
    const recoveredWallet = JSON.parse(decryptedJson) as WalletData

    expect(recoveredWallet.mnemonic).toBe(mnemonic)
    expect(recoveredWallet.accounts[0].address).toBe(wallet.accounts[0].address)

    // 5. Verify the derived account from mnemonic matches recovered wallet
    const derived = walletService.deriveAccount(recoveredWallet.mnemonic!, 0)
    expect(derived.address).toBe(wallet.accounts[0].address)
  })

  it("imports a wallet from 12 words, saves vault, and deletes vault on reset", async () => {
    const container = createDefaultContainer()
    container.registerInstance("storageService", new StorageService(tempVaultPath))

    const walletService = container.resolve("walletService")
    const cryptoService = container.resolve("cryptoService")
    const storageService = container.resolve("storageService")

    const knownMnemonic = "test test test test test test test test test test test junk"
    const importedWallet = walletService.importWallet(knownMnemonic, "Imported Account")
    expect(importedWallet.accounts[0].address.toLowerCase()).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")

    const vault = await cryptoService.encrypt(JSON.stringify(importedWallet), "ImportPassword123!")
    await storageService.saveVault(vault)
    expect(await storageService.vaultExists()).toBe(true)

    // Reset / Delete Vault
    await storageService.deleteVault()
    expect(await storageService.vaultExists()).toBe(false)
  })
})

