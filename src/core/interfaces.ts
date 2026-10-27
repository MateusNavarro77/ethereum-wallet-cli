import type {
  Account,
  EncryptedVault,
  HdAccount,
  ImportedAccount,
  NetworkConfig,
  WalletData,
  WatchOnlyAccount,
  Web3KeystoreV3,
} from "./types.js"

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

export interface IKeystoreService {
  parseKeystoreJson(content: string): Web3KeystoreV3
  decryptKeystore(keystore: Web3KeystoreV3, password: string): Promise<`0x${string}`>
}

export interface IWalletService {
  generateMnemonic(wordCount?: 12 | 24): string
  validateMnemonic(mnemonic: string): boolean
  deriveAccount(mnemonic: string, accountIndex?: number, label?: string): DerivedKey
  createWallet(mnemonic: string, defaultLabel?: string): WalletData
  importWallet(mnemonic: string, defaultLabel?: string): WalletData
  migrateWalletData(raw: any): WalletData

  // Multi-Account Operations
  getNextDerivationIndex(wallet: WalletData): number
  addDerivedAccount(wallet: WalletData, label?: string): { wallet: WalletData; account: HdAccount }
  importPrivateKey(
    wallet: WalletData,
    privateKey: string,
    label: string,
    masterPassword?: string
  ): Promise<{ wallet: WalletData; account: ImportedAccount }>
  importKeystore(
    wallet: WalletData,
    keystoreJson: string,
    keystorePassword: string,
    label: string,
    masterPassword?: string
  ): Promise<{ wallet: WalletData; account: ImportedAccount }>
  addWatchOnlyAccount(
    wallet: WalletData,
    address: string,
    label: string
  ): { wallet: WalletData; account: WatchOnlyAccount }

  // Management & Lifecycle
  renameAccount(wallet: WalletData, address: `0x${string}`, newLabel: string): WalletData
  toggleHideAccount(wallet: WalletData, address: `0x${string}`): WalletData
  removeAccount(wallet: WalletData, address: `0x${string}`): WalletData

  // Credential Export
  getExportPrivateKey(
    wallet: WalletData,
    address: `0x${string}`,
    masterPassword?: string
  ): Promise<`0x${string}`>
  getExportMnemonic(wallet: WalletData): string
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
