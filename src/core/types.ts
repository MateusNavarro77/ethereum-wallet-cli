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

export interface AppConfig {
  activeChainId?: number
  customNetworks?: NetworkConfig[]
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
