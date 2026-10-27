import {
  generateMnemonic,
  mnemonicToAccount,
  privateKeyToAddress,
  english,
} from "viem/accounts"
import { getAddress, isAddress } from "viem"
import { validateMnemonic } from "@scure/bip39"
import type {
  IWalletService,
  DerivedKey,
  ICryptoService,
  IKeystoreService,
} from "../core/interfaces.js"
import type {
  WalletData,
  HdAccount,
  ImportedAccount,
  WatchOnlyAccount,
} from "../core/types.js"
import { SEPOLIA_NETWORK } from "../core/types.js"
import { CryptoService } from "./crypto.service.js"
import { KeystoreService } from "./keystore.service.js"

export class WalletService implements IWalletService {
  constructor(
    private cryptoService: ICryptoService = new CryptoService(),
    private keystoreService: IKeystoreService = new KeystoreService(),
  ) {}

  generateMnemonic(wordCount: 12 | 24 = 12): string {
    const strength = wordCount === 24 ? 256 : 128
    return generateMnemonic(english, strength)
  }

  validateMnemonic(mnemonic: string): boolean {
    const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, " ")
    return validateMnemonic(normalized, english)
  }

  deriveAccount(mnemonic: string, accountIndex = 0, label?: string): DerivedKey {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error("Invalid BIP-39 mnemonic phrase")
    }

    // BIP-44 path for Ethereum: m/44'/60'/0'/0/index
    const account = mnemonicToAccount(mnemonic.trim().toLowerCase().replace(/\s+/g, " "), {
      accountIndex: 0,
      addressIndex: accountIndex,
    })

    return {
      address: account.address,
      privateKey: (account as unknown as { getHdKey(): { privateKey?: Uint8Array } }).getHdKey
        ? (`0x${Buffer.from((account as unknown as { getHdKey(): { privateKey: Uint8Array } }).getHdKey().privateKey!).toString("hex")}` as `0x${string}`)
        : ("0x" as `0x${string}`),
      index: accountIndex,
      label: label || (accountIndex === 0 ? "Account 1" : `Account ${accountIndex + 1}`),
    }
  }

  createWallet(mnemonic: string, defaultLabel = "Account 1"): WalletData {
    const primary = this.deriveAccount(mnemonic, 0, defaultLabel)
    const now = new Date().toISOString()
    const primaryAccount: HdAccount = {
      address: primary.address,
      index: 0,
      label: defaultLabel,
      type: "hd",
      hidden: false,
      createdAt: now,
    }

    return {
      version: 2,
      mnemonic: mnemonic.trim().toLowerCase().replace(/\s+/g, " "),
      accounts: [primaryAccount],
      activeAddress: primary.address,
      defaultChainId: SEPOLIA_NETWORK.chainId,
    }
  }

  importWallet(mnemonic: string, defaultLabel = "Account 1"): WalletData {
    const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, " ")
    if (!this.validateMnemonic(normalized)) {
      throw new Error("Invalid BIP-39 mnemonic recovery phrase")
    }
    return this.createWallet(normalized, defaultLabel)
  }

  migrateWalletData(raw: any): WalletData {
    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid wallet data format")
    }

    const accounts = Array.isArray(raw.accounts) ? [...raw.accounts] : []
    const migratedAccounts = accounts.map((acc: any, i: number) => {
      const type = acc.type || "hd"
      const now = acc.createdAt || new Date().toISOString()
      return {
        ...acc,
        type,
        index: acc.index !== undefined ? acc.index : (type === "hd" ? i : undefined),
        hidden: Boolean(acc.hidden),
        createdAt: now,
      }
    })

    const activeAddress =
      raw.activeAddress ||
      (migratedAccounts.find((a: any) => !a.hidden)?.address ?? migratedAccounts[0]?.address)

    return {
      version: 2,
      mnemonic: raw.mnemonic,
      accounts: migratedAccounts,
      activeAddress,
      defaultChainId: raw.defaultChainId || SEPOLIA_NETWORK.chainId,
    }
  }

  getNextDerivationIndex(wallet: WalletData): number {
    const hdAccounts = wallet.accounts.filter(
      (a): a is HdAccount => a.type === "hd" && a.index !== undefined,
    )
    if (hdAccounts.length === 0) return 0
    const indices = new Set(hdAccounts.map((a) => a.index))
    let next = 0
    while (indices.has(next)) {
      next++
    }
    return next
  }

  addDerivedAccount(
    wallet: WalletData,
    label?: string,
  ): { wallet: WalletData; account: HdAccount } {
    if (!wallet.mnemonic) {
      throw new Error("Cannot derive account: wallet has no mnemonic seed phrase")
    }

    const nextIndex = this.getNextDerivationIndex(wallet)
    const derived = this.deriveAccount(wallet.mnemonic, nextIndex, label)
    const newAccount: HdAccount = {
      address: derived.address,
      label: derived.label,
      type: "hd",
      index: nextIndex,
      hidden: false,
      createdAt: new Date().toISOString(),
    }

    const updatedAccounts = [...wallet.accounts, newAccount]
    return {
      wallet: {
        ...wallet,
        accounts: updatedAccounts,
      },
      account: newAccount,
    }
  }

  async importPrivateKey(
    wallet: WalletData,
    privateKey: string,
    label: string,
    masterPassword?: string,
  ): Promise<{ wallet: WalletData; account: ImportedAccount }> {
    let cleanKey = privateKey.trim()
    if (!cleanKey.startsWith("0x")) {
      cleanKey = `0x${cleanKey}`
    }

    if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
      throw new Error("Invalid private key format. Must be a 32-byte hexadecimal string.")
    }

    const address = privateKeyToAddress(cleanKey as `0x${string}`)
    const existing = wallet.accounts.find(
      (a) => a.address.toLowerCase() === address.toLowerCase(),
    )
    if (existing) {
      throw new Error(`Account with address ${address} already exists in this wallet`)
    }

    let encryptedPrivateKey: string
    if (masterPassword) {
      const encryptedVault = await this.cryptoService.encrypt(cleanKey, masterPassword)
      encryptedPrivateKey = JSON.stringify(encryptedVault)
    } else {
      encryptedPrivateKey = cleanKey
    }

    const newAccount: ImportedAccount = {
      address,
      label: label.trim() || `Imported ${wallet.accounts.length + 1}`,
      type: "imported",
      encryptedPrivateKey,
      hidden: false,
      createdAt: new Date().toISOString(),
    }

    return {
      wallet: {
        ...wallet,
        accounts: [...wallet.accounts, newAccount],
      },
      account: newAccount,
    }
  }

  async importKeystore(
    wallet: WalletData,
    keystoreJson: string,
    keystorePassword: string,
    label: string,
    masterPassword?: string,
  ): Promise<{ wallet: WalletData; account: ImportedAccount }> {
    const keystore = this.keystoreService.parseKeystoreJson(keystoreJson)
    const decryptedKey = await this.keystoreService.decryptKeystore(keystore, keystorePassword)
    return this.importPrivateKey(wallet, decryptedKey, label, masterPassword)
  }

  addWatchOnlyAccount(
    wallet: WalletData,
    address: string,
    label: string,
  ): { wallet: WalletData; account: WatchOnlyAccount } {
    const cleanAddress = address.trim()
    if (!isAddress(cleanAddress)) {
      throw new Error("Invalid Ethereum address format")
    }

    const checksummed = getAddress(cleanAddress)
    const existing = wallet.accounts.find(
      (a) => a.address.toLowerCase() === checksummed.toLowerCase(),
    )
    if (existing) {
      throw new Error(`Account with address ${checksummed} already exists in this wallet`)
    }

    const newAccount: WatchOnlyAccount = {
      address: checksummed,
      label: label.trim() || `Watch ${wallet.accounts.length + 1}`,
      type: "watch-only",
      hidden: false,
      createdAt: new Date().toISOString(),
    }

    return {
      wallet: {
        ...wallet,
        accounts: [...wallet.accounts, newAccount],
      },
      account: newAccount,
    }
  }

  renameAccount(wallet: WalletData, address: `0x${string}`, newLabel: string): WalletData {
    const trimmed = newLabel.trim()
    if (!trimmed) {
      throw new Error("Account label cannot be empty")
    }

    const index = wallet.accounts.findIndex(
      (a) => a.address.toLowerCase() === address.toLowerCase(),
    )
    if (index === -1) {
      throw new Error(`Account not found: ${address}`)
    }

    const updated = [...wallet.accounts]
    updated[index] = { ...updated[index], label: trimmed }

    return {
      ...wallet,
      accounts: updated,
    }
  }

  toggleHideAccount(wallet: WalletData, address: `0x${string}`): WalletData {
    const index = wallet.accounts.findIndex(
      (a) => a.address.toLowerCase() === address.toLowerCase(),
    )
    if (index === -1) {
      throw new Error(`Account not found: ${address}`)
    }

    const target = wallet.accounts[index]
    if (index === 0 && (target.type === "hd" && target.index === 0)) {
      throw new Error("Primary HD account (index 0) cannot be hidden")
    }

    const willHide = !target.hidden
    if (willHide) {
      const visibleCount = wallet.accounts.filter((a) => !a.hidden).length
      if (visibleCount <= 1) {
        throw new Error("Cannot hide account: at least one account must remain visible")
      }
    }

    const updated = [...wallet.accounts]
    updated[index] = { ...target, hidden: willHide }

    let activeAddress = wallet.activeAddress
    if (willHide && activeAddress?.toLowerCase() === target.address.toLowerCase()) {
      const nextVisible = updated.find((a) => !a.hidden)
      if (nextVisible) {
        activeAddress = nextVisible.address
      }
    }

    return {
      ...wallet,
      accounts: updated,
      activeAddress,
    }
  }

  removeAccount(wallet: WalletData, address: `0x${string}`): WalletData {
    const index = wallet.accounts.findIndex(
      (a) => a.address.toLowerCase() === address.toLowerCase(),
    )
    if (index === -1) {
      throw new Error(`Account not found: ${address}`)
    }

    const target = wallet.accounts[index]
    if (target.type === "hd") {
      throw new Error("HD derived accounts cannot be permanently removed. Hide the account instead.")
    }

    if (index === 0 && wallet.accounts.length === 1) {
      throw new Error("Cannot remove the only account in the wallet")
    }

    const updated = wallet.accounts.filter((_, i) => i !== index)
    let activeAddress = wallet.activeAddress
    if (activeAddress?.toLowerCase() === target.address.toLowerCase()) {
      const nextVisible = updated.find((a) => !a.hidden) || updated[0]
      if (nextVisible) {
        activeAddress = nextVisible.address
      }
    }

    return {
      ...wallet,
      accounts: updated,
      activeAddress,
    }
  }

  async getExportPrivateKey(
    wallet: WalletData,
    address: `0x${string}`,
    masterPassword?: string,
  ): Promise<`0x${string}`> {
    const account = wallet.accounts.find(
      (a) => a.address.toLowerCase() === address.toLowerCase(),
    )
    if (!account) {
      throw new Error(`Account not found: ${address}`)
    }

    if (account.type === "watch-only") {
      throw new Error("Cannot export private key: this is a watch-only account")
    }

    if (account.type === "hd") {
      if (!wallet.mnemonic) {
        throw new Error("Cannot export HD account key: wallet has no mnemonic seed phrase")
      }
      const derived = this.deriveAccount(wallet.mnemonic, account.index)
      return derived.privateKey
    }

    if (account.type === "imported") {
      if (account.encryptedPrivateKey.startsWith("0x")) {
        return account.encryptedPrivateKey as `0x${string}`
      }
      if (!masterPassword) {
        throw new Error("Master password required to export imported private key")
      }
      const parsedVault = JSON.parse(account.encryptedPrivateKey)
      const decrypted = await this.cryptoService.decrypt(parsedVault, masterPassword)
      return decrypted as `0x${string}`
    }

    throw new Error("Unknown account type")
  }

  getExportMnemonic(wallet: WalletData): string {
    if (!wallet.mnemonic) {
      throw new Error("No mnemonic recovery phrase exists in this wallet")
    }
    return wallet.mnemonic
  }
}
