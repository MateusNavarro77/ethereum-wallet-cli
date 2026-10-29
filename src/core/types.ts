export type AccountType = "hd" | "imported" | "watch-only"

export interface BaseAccount {
  address: `0x${string}`
  label: string
  type: AccountType
  index?: number
  hidden?: boolean
  createdAt: string
}

export interface HdAccount extends BaseAccount {
  type: "hd"
  index: number // m/44'/60'/0'/0/index
}

export interface ImportedAccount extends BaseAccount {
  type: "imported"
  // Private key encrypted at rest inside vault data using master password
  encryptedPrivateKey: string
}

export interface WatchOnlyAccount extends BaseAccount {
  type: "watch-only"
}

export type Account = HdAccount | ImportedAccount | WatchOnlyAccount

export interface WalletData {
  version?: number
  mnemonic?: string
  accounts: Account[]
  activeAddress?: `0x${string}`
  defaultChainId: number
  activeChainId?: number
  customNetworks?: NetworkConfig[]
}

export interface TokenConfig {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  chainId: number
  hidden?: boolean
  isPreset?: boolean
}

export interface TokenBalance extends TokenConfig {
  balance: bigint
  formattedBalance: string
  fiatValue?: string
}

export interface PortfolioBalance {
  nativeBalance: bigint
  formattedNativeBalance: string
  nativeFiatValue?: string
  tokens: TokenBalance[]
  totalFiatValue?: string
  lastUpdated: Date
}

export interface AppConfig {
  activeChainId?: number
  customNetworks?: NetworkConfig[]
  tokens?: Record<number, TokenConfig[]>
  fiatCurrency?: string
  fiatEnabled?: boolean
  autoRefreshIntervalSeconds?: number
  theme?: string
}

export interface EncryptedVault {
  version: 1
  cipher: "aes-256-gcm"
  kdf: "pbkdf2"
  iterations: number
  salt: string
  iv: string
  authTag: string
  ciphertext: string
  createdAt: string
  updatedAt: string
}

export interface Web3KeystoreV3 {
  version: 3
  id: string
  address: string
  crypto: {
    ciphertext: string
    cipherparams: {
      iv: string
    }
    cipher: string
    kdf: "scrypt" | "pbkdf2"
    kdfparams: {
      dklen: number
      salt: string
      n?: number
      r?: number
      p?: number
      c?: number
      prf?: string
    }
    mac: string
  }
}

export interface NetworkConfig {
  chainId: number
  name: string
  rpcUrl: string
  rpcUrls?: string[]
  symbol: string
  explorerUrl?: string
  isTestnet?: boolean
  isLocal?: boolean
}

export const MAINNET_NETWORK: NetworkConfig = {
  chainId: 1,
  name: "Ethereum Mainnet",
  rpcUrl: "https://ethereum-rpc.publicnode.com",
  rpcUrls: [
    "https://ethereum-rpc.publicnode.com",
    "https://rpc.ankr.com/eth",
    "https://cloudflare-eth.com",
  ],
  symbol: "ETH",
  explorerUrl: "https://etherscan.io",
  isTestnet: false,
  isLocal: false,
}

export const SEPOLIA_NETWORK: NetworkConfig = {
  chainId: 11155111,
  name: "Ethereum Sepolia",
  rpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  rpcUrls: [
    process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    "https://rpc.sepolia.org",
  ],
  symbol: "SEP",
  explorerUrl: "https://sepolia.etherscan.io",
  isTestnet: true,
  isLocal: false,
}

export const ANVIL_NETWORK: NetworkConfig = {
  chainId: 31337,
  name: "Anvil Localhost",
  rpcUrl: "http://127.0.0.1:8545",
  rpcUrls: ["http://127.0.0.1:8545"],
  symbol: "ETH",
  isTestnet: true,
  isLocal: true,
}

export const PRESET_NETWORKS: NetworkConfig[] = [
  MAINNET_NETWORK,
  SEPOLIA_NETWORK,
  ANVIL_NETWORK,
]

export const PRESET_TOKENS: Record<number, TokenConfig[]> = {
  1: [
    {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      chainId: 1,
      isPreset: true,
    },
    {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      chainId: 1,
      isPreset: true,
    },
    {
      address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
      chainId: 1,
      isPreset: true,
    },
  ],
  11155111: [
    {
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      symbol: "USDC",
      name: "Sepolia USDC",
      decimals: 6,
      chainId: 11155111,
      isPreset: true,
    },
  ],
}

export type FeePresetLevel = "low" | "medium" | "high"

export interface FeePreset {
  level: FeePresetLevel
  label: string
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gasPrice?: bigint
  estimatedWaitSeconds: number
}

export interface GasFeePresets {
  isEip1559: boolean
  presets: Record<FeePresetLevel, FeePreset>
  baseFeePerGas?: bigint
}

export interface PrepareTransactionParams {
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  tokenAddress?: `0x${string}`
  tokenDecimals?: number
}

export interface GasEstimateResult {
  gasLimit: bigint
  estimatedFeeWei: bigint
  formattedFeeEth: string
  presets: GasFeePresets
}

export interface SendTransactionParams {
  account: Account
  to: `0x${string}`
  value: bigint
  token?: TokenConfig
  mnemonic?: string
  masterPassword?: string
  gasLimit?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  gasPrice?: bigint
  nonce?: number
}

export type TransactionStatus = "idle" | "broadcasting" | "pending" | "confirmed" | "failed"

export interface TransactionReceiptSummary {
  hash: `0x${string}`
  status: "success" | "reverted"
  blockNumber: bigint
  gasUsed: bigint
}
