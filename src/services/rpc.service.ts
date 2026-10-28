import {
  createPublicClient,
  http,
  fallback,
  formatEther as viemFormatEther,
  defineChain,
} from "viem"
import { mainnet, sepolia } from "viem/chains"
import type { IRpcService } from "../core/interfaces.js"
import type { NetworkConfig } from "../core/types.js"
import { SEPOLIA_NETWORK } from "../core/types.js"

export class RpcService implements IRpcService {
  private network: NetworkConfig
  private client: ReturnType<typeof createPublicClient>
  private isCustomClient: boolean

  constructor(
    network: NetworkConfig = SEPOLIA_NETWORK,
    customClient?: ReturnType<typeof createPublicClient>,
  ) {
    this.network = network
    this.isCustomClient = Boolean(customClient)
    if (customClient) {
      this.client = customClient
    } else {
      this.client = this.buildClient(network)
    }
  }

  private buildClient(network: NetworkConfig): ReturnType<typeof createPublicClient> {
    const chain = this.resolveChain(network)
    const urls = network.rpcUrls && network.rpcUrls.length > 0
      ? network.rpcUrls
      : [network.rpcUrl]

    const transport = urls.length > 1
      ? fallback(urls.map((url) => http(url, { timeout: 6000, retryCount: 2 })))
      : http(urls[0], { timeout: 6000, retryCount: 2 })

    return createPublicClient({
      chain,
      transport,
    })
  }

  private resolveChain(network: NetworkConfig) {
    if (network.chainId === 1) return mainnet
    if (network.chainId === 11155111) return sepolia

    return defineChain({
      id: network.chainId,
      name: network.name,
      nativeCurrency: {
        name: network.symbol,
        symbol: network.symbol,
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: network.rpcUrls && network.rpcUrls.length > 0 ? network.rpcUrls : [network.rpcUrl],
        },
      },
      blockExplorers: network.explorerUrl
        ? {
            default: { name: "Explorer", url: network.explorerUrl },
          }
        : undefined,
    })
  }

  getNetwork(): NetworkConfig {
    return this.network
  }

  switchNetwork(network: NetworkConfig): void {
    this.network = network
    // If not using a fixed mock customClient from constructor, recreate publicClient
    if (!this.isCustomClient) {
      this.client = this.buildClient(network)
    }
  }

  async getBalance(address: `0x${string}`): Promise<bigint> {
    try {
      const balance = await this.client.getBalance({ address })
      return balance
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to fetch balance from RPC (${this.network.rpcUrl}): ${message}`)
    }
  }

  async getBlockNumber(): Promise<bigint> {
    try {
      const blockNumber = await this.client.getBlockNumber()
      return blockNumber
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to fetch block number from RPC (${this.network.rpcUrl}): ${message}`)
    }
  }

  async verifyRpc(
    rpcUrl: string,
    expectedChainId?: number,
  ): Promise<{ chainId: number; healthy: boolean }> {
    try {
      const tempClient = createPublicClient({
        transport: http(rpcUrl, { timeout: 5000, retryCount: 1 }),
      })
      const chainIdHex = await tempClient.getChainId()
      const detectedChainId = Number(chainIdHex)

      if (expectedChainId !== undefined && expectedChainId !== detectedChainId) {
        throw new Error(
          `Chain ID mismatch: RPC reported ${detectedChainId}, but expected ${expectedChainId}`,
        )
      }

      return { chainId: detectedChainId, healthy: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`RPC verification failed for ${rpcUrl}: ${message}`)
    }
  }

  formatEther(wei: bigint): string {
    return viemFormatEther(wei)
  }
}
