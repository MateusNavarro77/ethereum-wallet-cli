export interface Account {
  address: `0x${string}`
  index: number
  label: string
}

export interface WalletData {
  mnemonic: string
  accounts: Account[]
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

