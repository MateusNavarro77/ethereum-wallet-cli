import { createPublicClient, http, formatEther as viemFormatEther } from "viem"
import { sepolia } from "viem/chains"
import type { IRpcService } from "../core/interfaces.js"
import type { NetworkConfig } from "../core/types.js"
import { SEPOLIA_NETWORK } from "../core/types.js"

export class RpcService implements IRpcService {
  private readonly network: NetworkConfig
  private client: ReturnType<typeof createPublicClient>

  constructor(network: NetworkConfig = SEPOLIA_NETWORK, customClient?: ReturnType<typeof createPublicClient>) {
    this.network = network
    if (customClient) {
      this.client = customClient
    } else {
      this.client = createPublicClient({
        chain: sepolia,
        transport: http(network.rpcUrl),
      })
    }
  }

  getNetwork(): NetworkConfig {
    return this.network
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

  formatEther(wei: bigint): string {
    return viemFormatEther(wei)
  }
}

