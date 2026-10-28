import type {
  Account,
  AppConfig,
  EncryptedVault,
  HdAccount,
  ImportedAccount,
  NetworkConfig,
  TokenConfig,
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
  configExists(): Promise<boolean>
  saveConfig(config: AppConfig): Promise<void>
  loadConfig(): Promise<AppConfig>
  getConfigPath(): string
}

export interface IRpcService {
  getBalance(address: `0x${string}`, chainId?: number): Promise<bigint>
  getTokenBalance(tokenAddress: `0x${string}`, accountAddress: `0x${string}`, chainId?: number): Promise<bigint>
  getTokenMetadata(tokenAddress: `0x${string}`, chainId?: number): Promise<{ name: string; symbol: string; decimals: number; isErc20: boolean }>
  hasBytecode(address: `0x${string}`, chainId?: number): Promise<boolean>
  getBlockNumber(): Promise<bigint>
  verifyRpc(rpcUrl: string, expectedChainId?: number): Promise<{ chainId: number; healthy: boolean }>
  switchNetwork(network: NetworkConfig): void
  formatEther(wei: bigint): string
  formatUnits(value: bigint, decimals: number): string
  getNetwork(chainId?: number): NetworkConfig
}

export interface TokenVerificationResult {
  isValidErc20: boolean
  warning?: string
  metadata?: {
    name: string
    symbol: string
    decimals: number
  }
}

export interface ITokenService {
  getTokens(chainId: number): TokenConfig[]
  addToken(token: Omit<TokenConfig, "isPreset">): Promise<TokenConfig>
  toggleHideToken(chainId: number, address: `0x${string}`): Promise<void>
  removeCustomToken(chainId: number, address: `0x${string}`): Promise<void>
  verifyTokenContract(address: `0x${string}`, chainId?: number): Promise<TokenVerificationResult>
  loadTokens(): Promise<void>
}

export interface IPriceService {
  getPriceUsd(symbolOrAddress: string, chainId?: number): Promise<number | undefined>
  getPricesUsd(items: { symbol: string; address?: string }[], chainId?: number): Promise<Record<string, number>>
  isFiatEnabled(): boolean
  setFiatEnabled(enabled: boolean): Promise<void>
}

export interface NetworkConnectionStatus {
  connected: boolean
  blockNumber?: bigint
  latencyMs?: number
  error?: string
}

export interface INetworkService {
  getActiveNetwork(): NetworkConfig
  setActiveNetwork(chainId: number): Promise<void>
  getAllNetworks(): NetworkConfig[]
  getPresets(): NetworkConfig[]
  getCustomNetworks(): NetworkConfig[]
  addCustomNetwork(network: Omit<NetworkConfig, "isTestnet" | "isLocal">): Promise<NetworkConfig>
  editCustomNetwork(chainId: number, updates: Partial<NetworkConfig>): Promise<NetworkConfig>
  removeCustomNetwork(chainId: number): Promise<void>
  verifyRpcEndpoint(rpcUrl: string, expectedChainId?: number): Promise<{ chainId: number; healthy: boolean }>
  getConnectionStatus(): Promise<NetworkConnectionStatus>
  syncWallet(wallet?: WalletData): void
}

export interface IClipboardService {
  copy(text: string): Promise<boolean>
}
