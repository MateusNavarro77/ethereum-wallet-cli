import type {
  INetworkService,
  IRpcService,
  IStorageService,
  NetworkConnectionStatus,
} from "../core/interfaces.js"
import type { NetworkConfig, WalletData } from "../core/types.js"
import {
  PRESET_NETWORKS,
  SEPOLIA_NETWORK,
} from "../core/types.js"

export class NetworkService implements INetworkService {
  private readonly presets: NetworkConfig[]
  private customNetworks: NetworkConfig[] = []
  private activeNetwork: NetworkConfig
  private readonly rpcService: IRpcService
  private readonly storageService?: IStorageService

  constructor(
    rpcService: IRpcService,
    storageService?: IStorageService,
    initialPresets: NetworkConfig[] = PRESET_NETWORKS,
  ) {
    this.rpcService = rpcService
    this.storageService = storageService
    this.presets = initialPresets.map((p) => ({ ...p }))
    this.activeNetwork = this.presets.find((p) => p.chainId === SEPOLIA_NETWORK.chainId) || this.presets[0]

    // Pre-load persisted configuration if storageService is available
    if (this.storageService) {
      try {
        const config = this.storageService.loadConfig()
        if (config instanceof Promise) {
          config.then((c) => this.applyPersistedConfig(c)).catch(() => {})
        } else {
          this.applyPersistedConfig(config)
        }
      } catch {
        // Fallback to presets if config reading fails
      }
    }
  }

  private applyPersistedConfig(config: { activeChainId?: number; customNetworks?: NetworkConfig[] }): void {
    if (config.customNetworks && Array.isArray(config.customNetworks)) {
      this.customNetworks = [...config.customNetworks]
    }

    if (config.activeChainId) {
      const all = this.getAllNetworks()
      const found = all.find((n) => n.chainId === config.activeChainId)
      if (found) {
        this.activeNetwork = found
        this.rpcService.switchNetwork(found)
      }
    }
  }

  private async persist(): Promise<void> {
    if (!this.storageService) return
    try {
      await this.storageService.saveConfig({
        activeChainId: this.activeNetwork.chainId,
        customNetworks: this.customNetworks,
      })
    } catch {
      // Ignored or logged if filesystem write fails
    }
  }

  syncWallet(wallet?: WalletData): void {
    if (!wallet) return

    // Legacy migration: if wallet has customNetworks not yet in config, import them
    if (wallet.customNetworks && wallet.customNetworks.length > 0) {
      let changed = false
      for (const custom of wallet.customNetworks) {
        if (!this.customNetworks.some((c) => c.chainId === custom.chainId)) {
          this.customNetworks.push(custom)
          changed = true
        }
      }
      if (changed) {
        this.persist().catch(() => {})
      }
    }

    // If wallet has a preferred activeChainId and activeNetwork is default, align with wallet
    const preferredChainId = wallet.activeChainId || wallet.defaultChainId
    if (preferredChainId && preferredChainId !== this.activeNetwork.chainId) {
      const all = this.getAllNetworks()
      const target = all.find((n) => n.chainId === preferredChainId)
      if (target) {
        this.activeNetwork = target
        this.rpcService.switchNetwork(target)
        this.persist().catch(() => {})
      }
    }
  }

  getActiveNetwork(): NetworkConfig {
    return this.activeNetwork
  }

  async setActiveNetwork(chainId: number): Promise<void> {
    const all = this.getAllNetworks()
    const target = all.find((n) => n.chainId === chainId)
    if (!target) {
      throw new Error(`Network with chain ID ${chainId} not found`)
    }

    this.activeNetwork = target
    this.rpcService.switchNetwork(target)
    await this.persist()
  }

  getAllNetworks(): NetworkConfig[] {
    return [...this.presets, ...this.customNetworks]
  }

  getPresets(): NetworkConfig[] {
    return [...this.presets]
  }

  getCustomNetworks(): NetworkConfig[] {
    return [...this.customNetworks]
  }

  async addCustomNetwork(
    network: Omit<NetworkConfig, "isTestnet" | "isLocal">,
  ): Promise<NetworkConfig> {
    const primaryUrl = network.rpcUrl || (network.rpcUrls && network.rpcUrls[0])
    if (!primaryUrl || !primaryUrl.trim()) {
      throw new Error("RPC endpoint URL is required")
    }

    if (!network.name || !network.name.trim()) {
      throw new Error("Network name is required")
    }

    // Verify endpoint & resolve chain ID
    const verifyResult = await this.verifyRpcEndpoint(
      primaryUrl.trim(),
      network.chainId > 0 ? network.chainId : undefined,
    )

    const finalChainId = verifyResult.chainId

    // Prevent duplicate chain IDs
    const all = this.getAllNetworks()
    if (all.some((n) => n.chainId === finalChainId)) {
      throw new Error(`A network with chain ID ${finalChainId} already exists`)
    }

    const isLocal =
      primaryUrl.includes("localhost") ||
      primaryUrl.includes("127.0.0.1") ||
      finalChainId === 31337 ||
      finalChainId === 1337

    const isTestnet = isLocal || finalChainId !== 1

    const rpcUrls =
      network.rpcUrls && network.rpcUrls.length > 0
        ? network.rpcUrls.map((u) => u.trim()).filter(Boolean)
        : [primaryUrl.trim()]

    const newNetwork: NetworkConfig = {
      chainId: finalChainId,
      name: network.name.trim(),
      rpcUrl: primaryUrl.trim(),
      rpcUrls,
      symbol: (network.symbol || "ETH").trim().toUpperCase(),
      explorerUrl: network.explorerUrl?.trim() || undefined,
      isTestnet,
      isLocal,
    }

    this.customNetworks.push(newNetwork)
    await this.persist()

    return newNetwork
  }

  async editCustomNetwork(
    chainId: number,
    updates: Partial<NetworkConfig>,
  ): Promise<NetworkConfig> {
    if (this.presets.some((p) => p.chainId === chainId)) {
      throw new Error("Preset networks cannot be modified")
    }

    const index = this.customNetworks.findIndex((n) => n.chainId === chainId)
    if (index === -1) {
      throw new Error(`Custom network with chain ID ${chainId} not found`)
    }

    const existing = this.customNetworks[index]

    const nextRpcUrl = updates.rpcUrl ? updates.rpcUrl.trim() : existing.rpcUrl
    if (updates.rpcUrl && updates.rpcUrl.trim() !== existing.rpcUrl) {
      await this.verifyRpcEndpoint(nextRpcUrl, chainId)
    }

    const isLocal =
      nextRpcUrl.includes("localhost") ||
      nextRpcUrl.includes("127.0.0.1") ||
      chainId === 31337 ||
      chainId === 1337
    const isTestnet = isLocal || chainId !== 1

    const updatedNetwork: NetworkConfig = {
      ...existing,
      ...updates,
      chainId, // chainId cannot be mutated in place
      name: updates.name ? updates.name.trim() : existing.name,
      rpcUrl: nextRpcUrl,
      rpcUrls: updates.rpcUrls || existing.rpcUrls,
      symbol: updates.symbol ? updates.symbol.trim().toUpperCase() : existing.symbol,
      explorerUrl: updates.explorerUrl !== undefined ? updates.explorerUrl.trim() : existing.explorerUrl,
      isTestnet,
      isLocal,
    }

    this.customNetworks[index] = updatedNetwork

    if (this.activeNetwork.chainId === chainId) {
      this.activeNetwork = updatedNetwork
      this.rpcService.switchNetwork(updatedNetwork)
    }

    await this.persist()
    return updatedNetwork
  }

  async removeCustomNetwork(chainId: number): Promise<void> {
    if (this.presets.some((p) => p.chainId === chainId)) {
      throw new Error("Preset networks cannot be removed")
    }

    const index = this.customNetworks.findIndex((n) => n.chainId === chainId)
    if (index === -1) {
      throw new Error(`Custom network with chain ID ${chainId} not found`)
    }

    this.customNetworks.splice(index, 1)

    // If the active network was removed, fallback to Sepolia
    if (this.activeNetwork.chainId === chainId) {
      await this.setActiveNetwork(SEPOLIA_NETWORK.chainId)
    } else {
      await this.persist()
    }
  }

  async verifyRpcEndpoint(
    rpcUrl: string,
    expectedChainId?: number,
  ): Promise<{ chainId: number; healthy: boolean }> {
    return this.rpcService.verifyRpc(rpcUrl, expectedChainId)
  }

  async getConnectionStatus(): Promise<NetworkConnectionStatus> {
    const start = Date.now()
    try {
      const blockNumber = await this.rpcService.getBlockNumber()
      const latencyMs = Date.now() - start
      return {
        connected: true,
        blockNumber,
        latencyMs,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        connected: false,
        error: message,
      }
    }
  }
}
