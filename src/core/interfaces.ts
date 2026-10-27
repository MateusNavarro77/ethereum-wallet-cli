import type { Account, EncryptedVault, NetworkConfig, WalletData } from "./types.js"

export interface PasswordAssessment {
  score: number // 0-4
  feedback: string[]
  isAcceptable: boolean
}

export interface ICryptoService {
  encrypt(plaintext: string, password: string): Promise<EncryptedVault>
  decrypt(vault: EncryptedVault, password: string): Promise<string>
  assessPasswordStrength(password: string): PasswordAssessment
}

export interface DerivedKey {
  address: `0x${string}`
  privateKey: `0x${string}`
  index: number
  label: string
}

export interface IWalletService {
  generateMnemonic(): string
  validateMnemonic(mnemonic: string): boolean
  deriveAccount(mnemonic: string, accountIndex?: number): DerivedKey
  createWallet(mnemonic: string, defaultLabel?: string): WalletData
  importWallet(mnemonic: string, defaultLabel?: string): WalletData
}

export interface IStorageService {
  vaultExists(): Promise<boolean>
  saveVault(vault: EncryptedVault): Promise<void>
  loadVault(): Promise<EncryptedVault>
  deleteVault(): Promise<void>
  getVaultPath(): string
}

export interface IRpcService {
  getBalance(address: `0x${string}`, chainId?: number): Promise<bigint>
  formatEther(wei: bigint): string
  getNetwork(chainId?: number): NetworkConfig
}

export interface IClipboardService {
  copy(text: string): Promise<boolean>
}

