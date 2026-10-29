import { describe, expect, it } from "bun:test"
import { WalletService } from "../../src/services/wallet.service.js"
import type { HdAccount } from "../../src/core/types.js"

describe("WalletService", () => {
  const walletService = new WalletService()

  it("generates a valid 12-word BIP-39 mnemonic", () => {
    const mnemonic = walletService.generateMnemonic(12)
    expect(mnemonic.split(" ").length).toBe(12)
    expect(walletService.validateMnemonic(mnemonic)).toBe(true)
  })

  it("generates a valid 24-word BIP-39 mnemonic", () => {
    const mnemonic = walletService.generateMnemonic(24)
    expect(mnemonic.split(" ").length).toBe(24)
    expect(walletService.validateMnemonic(mnemonic)).toBe(true)
  })

  it("derives the expected Ethereum address for standard test mnemonic", () => {
    // Standard test vector: Anvil / Hardhat default mnemonic
    const testMnemonic = "test test test test test test test test test test test junk"
    const derived = walletService.deriveAccount(testMnemonic, 0)

    // Standard address for index 0 is 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    expect(derived.address.toLowerCase()).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")
    expect(derived.index).toBe(0)
    expect(derived.label).toBe("Account 1")
  })

  it("derives different addresses for consecutive account indices", () => {
    const testMnemonic = "test test test test test test test test test test test junk"
    const account0 = walletService.deriveAccount(testMnemonic, 0)
    const account1 = walletService.deriveAccount(testMnemonic, 1)

    // Standard address for index 1 is 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    expect(account1.address.toLowerCase()).toBe("0x70997970c51812dc3a010c7d01b50e0d17dc79c8")
    expect(account0.address).not.toBe(account1.address)
  })

  it("creates a wallet data structure initialized with Sepolia chainId", () => {
    const mnemonic = walletService.generateMnemonic()
    const wallet = walletService.createWallet(mnemonic, "My Main Account")

    expect(wallet.mnemonic).toBe(mnemonic)
    expect(wallet.accounts.length).toBe(1)
    expect(wallet.accounts[0].label).toBe("My Main Account")
    expect(wallet.accounts[0].type).toBe("hd")
    expect((wallet.accounts[0] as HdAccount).index).toBe(0)
    expect(wallet.defaultChainId).toBe(11155111)
  })

  it("imports a valid 12-word mnemonic wallet", () => {
    const knownMnemonic = "test test test test test test test test test test test junk"
    const imported = walletService.importWallet(knownMnemonic, "Imported Account")

    expect(imported.mnemonic).toBe(knownMnemonic)
    expect(imported.accounts[0].address.toLowerCase()).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")
    expect(imported.accounts[0].label).toBe("Imported Account")
  })

  it("derives subsequent accounts using sequential BIP-44 indices", () => {
    const testMnemonic = "test test test test test test test test test test test junk"
    let wallet = walletService.createWallet(testMnemonic)

    expect(wallet.accounts.length).toBe(1)
    expect(walletService.getNextDerivationIndex(wallet)).toBe(1)

    const result1 = walletService.addDerivedAccount(wallet, "Savings Account")
    wallet = result1.wallet
    expect(wallet.accounts.length).toBe(2)
    expect(result1.account.index).toBe(1)
    expect(result1.account.label).toBe("Savings Account")
    expect(result1.account.address.toLowerCase()).toBe("0x70997970c51812dc3a010c7d01b50e0d17dc79c8")

    const result2 = walletService.addDerivedAccount(wallet)
    wallet = result2.wallet
    expect(wallet.accounts.length).toBe(3)
    expect(result2.account.index).toBe(2)
    expect(result2.account.label).toBe("Account 3")
  })

  it("imports a raw private key and derives its address", async () => {
    const testMnemonic = "test test test test test test test test test test test junk"
    let wallet = walletService.createWallet(testMnemonic)

    const rawKey = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e"
    const { wallet: updatedWallet, account } = await walletService.importPrivateKey(
      wallet,
      rawKey,
      "External Dev Key",
      "password123",
    )

    expect(updatedWallet.accounts.length).toBe(2)
    expect(account.type).toBe("imported")
    expect(account.label).toBe("External Dev Key")
    expect(account.address.startsWith("0x")).toBe(true)
    expect(account.encryptedPrivateKey).not.toBe(rawKey) // Encrypted at rest
  })

  it("rejects duplicate private key or invalid key format", async () => {
    const testMnemonic = "test test test test test test test test test test test junk"
    const wallet = walletService.createWallet(testMnemonic)

    await expect(
      walletService.importPrivateKey(wallet, "invalid-key", "Bad Key"),
    ).rejects.toThrow("Invalid private key format")

    const rawKey = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e"
    const { wallet: updatedWallet } = await walletService.importPrivateKey(
      wallet,
      rawKey,
      "Key 1",
    )
    await expect(
      walletService.importPrivateKey(updatedWallet, rawKey, "Duplicate Key"),
    ).rejects.toThrow("already exists")
  })

  it("adds and validates a watch-only account", () => {
    const testMnemonic = "test test test test test test test test test test test junk"
    const wallet = walletService.createWallet(testMnemonic)

    const targetAddress = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" // vitalik.eth
    const { wallet: updatedWallet, account } = walletService.addWatchOnlyAccount(
      wallet,
      targetAddress,
      "Vitalik Watcher",
    )

    expect(updatedWallet.accounts.length).toBe(2)
    expect(account.type).toBe("watch-only")
    expect(account.label).toBe("Vitalik Watcher")
    expect(account.address).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045") // Checksummed EIP-55

    // Rejects invalid address
    expect(() => walletService.addWatchOnlyAccount(wallet, "0x123", "Bad")).toThrow(
      "Invalid Ethereum address format",
    )
  })

  it("renames an account with a local label", () => {
    const testMnemonic = "test test test test test test test test test test test junk"
    let wallet = walletService.createWallet(testMnemonic)
    const primaryAddress = wallet.accounts[0].address

    wallet = walletService.renameAccount(wallet, primaryAddress, "My Primary Vault")
    expect(wallet.accounts[0].label).toBe("My Primary Vault")

    expect(() => walletService.renameAccount(wallet, primaryAddress, "   ")).toThrow(
      "Account label cannot be empty",
    )
  })

  it("handles hiding/unhiding accounts with constraints", () => {
    const testMnemonic = "test test test test test test test test test test test junk"
    let wallet = walletService.createWallet(testMnemonic)
    const primaryAddress = wallet.accounts[0].address

    // Cannot hide primary HD account
    expect(() => walletService.toggleHideAccount(wallet, primaryAddress)).toThrow(
      "Primary HD account (index 0) cannot be hidden",
    )

    // Add second account
    wallet = walletService.addDerivedAccount(wallet, "Second").wallet
    const secondAddress = wallet.accounts[1].address

    // Can hide second account
    wallet = walletService.toggleHideAccount(wallet, secondAddress)
    expect(wallet.accounts[1].hidden).toBe(true)

    // Unhide second account
    wallet = walletService.toggleHideAccount(wallet, secondAddress)
    expect(wallet.accounts[1].hidden).toBe(false)
  })

  it("handles account removal for imported accounts while protecting HD and primary accounts", async () => {
    const testMnemonic = "test test test test test test test test test test test junk"
    let wallet = walletService.createWallet(testMnemonic)
    const primaryAddress = wallet.accounts[0].address

    // Cannot remove HD account
    expect(() => walletService.removeAccount(wallet, primaryAddress)).toThrow(
      "HD derived accounts cannot be permanently removed",
    )

    // Add imported account
    const rawKey = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e"
    const { wallet: withImported, account: importedAccount } = await walletService.importPrivateKey(
      wallet,
      rawKey,
      "Temp Key",
    )
    expect(withImported.accounts.length).toBe(2)

    // Can remove imported account
    const purged = walletService.removeAccount(withImported, importedAccount.address)
    expect(purged.accounts.length).toBe(1)
    expect(purged.accounts[0].address).toBe(primaryAddress)
  })

  it("exports mnemonic and private key with proper permissions and rejections", async () => {
    const testMnemonic = "test test test test test test test test test test test junk"
    let wallet = walletService.createWallet(testMnemonic)
    const primaryAddress = wallet.accounts[0].address

    // Export mnemonic
    expect(walletService.getExportMnemonic(wallet)).toBe(testMnemonic)

    // Export HD account private key
    const hdPrivKey = await walletService.getExportPrivateKey(wallet, primaryAddress)
    expect(hdPrivKey.startsWith("0x")).toBe(true)

    // Import external key with encryption
    const externalKey = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e" as `0x${string}`
    const { wallet: withImport, account: impAcc } = await walletService.importPrivateKey(
      wallet,
      externalKey,
      "Encrypted Imp",
      "masterpass123",
    )

    const exportedImpKey = await walletService.getExportPrivateKey(
      withImport,
      impAcc.address,
      "masterpass123",
    )
    expect(exportedImpKey.toLowerCase()).toBe(externalKey.toLowerCase())

    // Add watch-only and attempt export (must throw)
    const { wallet: withWatch, account: watchAcc } = walletService.addWatchOnlyAccount(
      withImport,
      "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      "Watcher",
    )
    await expect(
      walletService.getExportPrivateKey(withWatch, watchAcc.address),
    ).rejects.toThrow("Cannot export private key: this is a watch-only account")
  })

  it("migrates legacy v1 wallet structures smoothly", () => {
    const legacy = {
      mnemonic: "test test test test test test test test test test test junk",
      accounts: [
        {
          address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          index: 0,
          label: "Legacy Account",
        },
      ],
      defaultChainId: 11155111,
    }

    const migrated = walletService.migrateWalletData(legacy)
    expect(migrated.version).toBe(2)
    expect(migrated.accounts[0].type).toBe("hd")
    expect(migrated.activeAddress).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    expect(migrated.accounts[0].hidden).toBe(false)
  })

  it("throws when importing an invalid mnemonic", () => {
    expect(() => walletService.importWallet("invalid words that are not bip39 words")).toThrow(
      "Invalid BIP-39 mnemonic recovery phrase",
    )
  })

  it("throws when deriving with an invalid mnemonic", () => {
    expect(() => walletService.deriveAccount("invalid mnemonic words that do not exist")).toThrow(
      "Invalid BIP-39 mnemonic phrase",
    )
  })
})
