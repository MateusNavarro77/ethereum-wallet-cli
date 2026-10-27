import { describe, expect, it } from "bun:test"
import { WalletService } from "../src/services/wallet.service.js"

describe("WalletService", () => {
  const walletService = new WalletService()

  it("generates a valid 12-word BIP-39 mnemonic", () => {
    const mnemonic = walletService.generateMnemonic()
    expect(mnemonic.split(" ").length).toBe(12)
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
    expect(wallet.defaultChainId).toBe(11155111)
  })

  it("imports a valid 12-word mnemonic wallet", () => {
    const knownMnemonic = "test test test test test test test test test test test junk"
    const imported = walletService.importWallet(knownMnemonic, "Imported Account")

    expect(imported.mnemonic).toBe(knownMnemonic)
    expect(imported.accounts[0].address.toLowerCase()).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")
    expect(imported.accounts[0].label).toBe("Imported Account")
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

