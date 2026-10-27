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
  symbol: string
  explorerUrl?: string
}

export const SEPOLIA_NETWORK: NetworkConfig = {
  chainId: 11155111,
  name: "Ethereum Sepolia",
  rpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  symbol: "SEP",
  explorerUrl: "https://sepolia.etherscan.io",
}
