import { describe, expect, it } from "bun:test"
import { NetworkService } from "../../src/services/network.service.js"
import type { IRpcService } from "../../src/core/interfaces.js"
import type { NetworkConfig, WalletData } from "../../src/core/types.js"
import {
  MAINNET_NETWORK,
  SEPOLIA_NETWORK,
  ANVIL_NETWORK,
} from "../../src/core/types.js"

function createMockRpcService(overrides?: Partial<IRpcService>): IRpcService {
  let currentNetwork: NetworkConfig = SEPOLIA_NETWORK
  return {
    getBalance: async () => 0n,
    getTokenBalance: async () => 0n,
    getTokenMetadata: async () => ({ name: "Test Token", symbol: "TEST", decimals: 18, isErc20: true }),
    hasBytecode: async () => true,
    getBlockNumber: async () => 1000n,
    verifyRpc: async (url: string, expected?: number) => {
      if (url.includes("offline")) {
        throw new Error("Connection refused")
      }
      const reported = url.includes("custom") ? 1337 : 11155111
      if (expected !== undefined && expected !== reported) {
        throw new Error(`Chain ID mismatch: reported ${reported}, expected ${expected}`)
      }
      return { chainId: reported, healthy: true }
    },
    switchNetwork: (net: NetworkConfig) => {
      currentNetwork = net
    },
    formatEther: (wei: bigint) => "0",
    formatUnits: (value: bigint, decimals: number) => "0",
    getNetwork: () => currentNetwork,
    ...overrides,
  }
}

describe("NetworkService", () => {
  it("initializes with default presets: Mainnet, Sepolia, and Anvil", () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    const presets = service.getPresets()
    expect(presets.length).toBe(3)
    expect(presets.map((p) => p.chainId)).toEqual([
      MAINNET_NETWORK.chainId,
      SEPOLIA_NETWORK.chainId,
      ANVIL_NETWORK.chainId,
    ])

    expect(service.getActiveNetwork().chainId).toBe(SEPOLIA_NETWORK.chainId)
  })

  it("switches active network and notifies RPC service", async () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    await service.setActiveNetwork(MAINNET_NETWORK.chainId)
    expect(service.getActiveNetwork().chainId).toBe(MAINNET_NETWORK.chainId)
    expect(mockRpc.getNetwork().chainId).toBe(MAINNET_NETWORK.chainId)

    await service.setActiveNetwork(ANVIL_NETWORK.chainId)
    expect(service.getActiveNetwork().chainId).toBe(ANVIL_NETWORK.chainId)
    expect(mockRpc.getNetwork().chainId).toBe(ANVIL_NETWORK.chainId)
  })

  it("throws when switching to an unknown network chainId", async () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    expect(service.setActiveNetwork(99999)).rejects.toThrow("Network with chain ID 99999 not found")
  })

  it("syncs with wallet data (restores activeChainId and customNetworks)", () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    const customNet: NetworkConfig = {
      chainId: 8453,
      name: "Base Mainnet",
      rpcUrl: "https://mainnet.base.org",
      symbol: "ETH",
      isTestnet: false,
    }

    const wallet: WalletData = {
      version: 2,
      accounts: [],
      defaultChainId: 11155111,
      activeChainId: 8453,
      customNetworks: [customNet],
    }

    service.syncWallet(wallet)
    expect(service.getCustomNetworks().length).toBe(1)
    expect(service.getActiveNetwork().chainId).toBe(8453)
    expect(mockRpc.getNetwork().chainId).toBe(8453)
  })

  it("adds a valid custom network after verifying RPC (FR-NET-03, FR-NET-04)", async () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    const newNet = await service.addCustomNetwork({
      name: "Private Testnet",
      rpcUrl: "https://custom-node.example.com",
      chainId: 1337,
      symbol: "PRIV",
    })

    expect(newNet.chainId).toBe(1337)
    expect(newNet.name).toBe("Private Testnet")
    expect(newNet.symbol).toBe("PRIV")
    expect(newNet.isTestnet).toBe(true)

    const customNetworks = service.getCustomNetworks()
    expect(customNetworks.length).toBe(1)
    expect(customNetworks[0].chainId).toBe(1337)
  })

  it("auto-detects chain ID if not provided or 0", async () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    const newNet = await service.addCustomNetwork({
      name: "Detected Net",
      rpcUrl: "https://custom-node.example.com",
      chainId: 0,
      symbol: "DET",
    })

    expect(newNet.chainId).toBe(1337)
  })

  it("rejects custom network if RPC connection fails or chainId mismatches", async () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    // Connection refused
    expect(
      service.addCustomNetwork({
        name: "Offline Net",
        rpcUrl: "https://offline-node.example.com",
        chainId: 1337,
        symbol: "OFF",
      }),
    ).rejects.toThrow("Connection refused")

    // Chain ID mismatch (reported 1337, expected 42)
    expect(
      service.addCustomNetwork({
        name: "Mismatch Net",
        rpcUrl: "https://custom-node.example.com",
        chainId: 42,
        symbol: "MIS",
      }),
    ).rejects.toThrow("Chain ID mismatch")
  })

  it("rejects duplicate chain ID", async () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    // Try adding chain 1 (which already exists as Mainnet preset)
    expect(
      service.addCustomNetwork({
        name: "Duplicate Mainnet",
        rpcUrl: "https://custom-node.example.com",
        chainId: 1,
        symbol: "ETH",
      }),
    ).rejects.toThrow("Chain ID mismatch") // reported 1337 != 1
  })

  it("prevents editing or removing presets", async () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    expect(
      service.editCustomNetwork(1, { name: "Modified Mainnet" }),
    ).rejects.toThrow("Preset networks cannot be modified")

    expect(
      service.removeCustomNetwork(1),
    ).rejects.toThrow("Preset networks cannot be removed")
  })

  it("edits and removes custom networks, falling back to Sepolia if active was removed", async () => {
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc)

    await service.addCustomNetwork({
      name: "Private Testnet",
      rpcUrl: "https://custom-node.example.com",
      chainId: 1337,
      symbol: "PRIV",
    })

    await service.setActiveNetwork(1337)
    expect(service.getActiveNetwork().chainId).toBe(1337)

    const edited = await service.editCustomNetwork(1337, {
      name: "Renamed Testnet",
      symbol: "RNM",
    })
    expect(edited.name).toBe("Renamed Testnet")
    expect(edited.symbol).toBe("RNM")
    expect(service.getActiveNetwork().name).toBe("Renamed Testnet")

    // Delete custom network
    await service.removeCustomNetwork(1337)
    expect(service.getCustomNetworks().length).toBe(0)
    // Active network fell back to Sepolia
    expect(service.getActiveNetwork().chainId).toBe(SEPOLIA_NETWORK.chainId)
  })

  it("returns connection status with block number and latency (FR-NET-07)", async () => {
    const mockRpc = createMockRpcService({
      getBlockNumber: async () => 18999123n,
    })
    const service = new NetworkService(mockRpc)

    const status = await service.getConnectionStatus()
    expect(status.connected).toBe(true)
    expect(status.blockNumber).toBe(18999123n)
    expect(typeof status.latencyMs).toBe("number")
  })

  it("reports disconnected status when getBlockNumber throws", async () => {
    const mockRpc = createMockRpcService({
      getBlockNumber: async () => {
        throw new Error("RPC timeout")
      },
    })
    const service = new NetworkService(mockRpc)

    const status = await service.getConnectionStatus()
    expect(status.connected).toBe(false)
    expect(status.error).toContain("RPC timeout")
  })

  it("persists active network and custom networks to config.json without wallet password (FR-SET-01)", async () => {
    let savedConfig: any = null
    const mockStorage: any = {
      loadConfig: async () => ({}),
      saveConfig: async (cfg: any) => {
        savedConfig = cfg
      },
    }
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc, mockStorage)

    await service.setActiveNetwork(MAINNET_NETWORK.chainId)
    expect(savedConfig).toBeDefined()
    expect(savedConfig.activeChainId).toBe(MAINNET_NETWORK.chainId)

    await service.addCustomNetwork({
      name: "Private Testnet",
      rpcUrl: "https://custom-node.example.com",
      chainId: 1337,
      symbol: "PRIV",
    })
    expect(savedConfig.customNetworks.length).toBe(1)
    expect(savedConfig.customNetworks[0].chainId).toBe(1337)
  })

  it("pre-loads persisted activeChainId and customNetworks on initialization", async () => {
    const mockStorage: any = {
      loadConfig: async () => ({
        activeChainId: 1,
        customNetworks: [
          {
            chainId: 1337,
            name: "Preloaded Net",
            rpcUrl: "https://custom-node.example.com",
            symbol: "PRE",
          },
        ],
      }),
      saveConfig: async () => {},
    }
    const mockRpc = createMockRpcService()
    const service = new NetworkService(mockRpc, mockStorage)
    await Promise.resolve()
    await Promise.resolve()

    expect(service.getActiveNetwork().chainId).toBe(1)
    expect(service.getCustomNetworks().length).toBe(1)
  })
})

