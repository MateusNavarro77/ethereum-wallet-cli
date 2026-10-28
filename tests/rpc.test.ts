import { describe, expect, it } from "bun:test"
import { createPublicClient } from "viem"
import { RpcService } from "../src/services/rpc.service.js"
import { MAINNET_NETWORK, SEPOLIA_NETWORK } from "../src/core/types.js"

describe("RpcService", () => {
  it("formats Ether correctly", () => {
    const rpc = new RpcService()
    expect(rpc.formatEther(1_000_000_000_000_000_000n)).toBe("1")
    expect(rpc.formatEther(500_000_000_000_000_000n)).toBe("0.5")
    expect(rpc.formatEther(0n)).toBe("0")
  })

  it("returns configured Sepolia network metadata", () => {
    const rpc = new RpcService()
    const network = rpc.getNetwork()
    expect(network.chainId).toBe(SEPOLIA_NETWORK.chainId)
    expect(network.name).toBe("Ethereum Sepolia")
    expect(network.symbol).toBe("SEP")
  })

  it("resolves balance using mock client", async () => {
    const mockBalance = 2_500_000_000_000_000_000n // 2.5 SEP
    const mockClient = {
      getBalance: async () => mockBalance,
    } as unknown as Parameters<typeof createPublicClient>[0]

    const rpc = new RpcService(SEPOLIA_NETWORK, mockClient as any)
    const balance = await rpc.getBalance("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    expect(balance).toBe(mockBalance)
    expect(rpc.formatEther(balance)).toBe("2.5")
  })

  it("resolves block number using mock client", async () => {
    const mockBlock = 12345678n
    const mockClient = {
      getBlockNumber: async () => mockBlock,
    } as any

    const rpc = new RpcService(SEPOLIA_NETWORK, mockClient)
    const block = await rpc.getBlockNumber()
    expect(block).toBe(mockBlock)
  })

  it("switches network successfully", () => {
    const rpc = new RpcService(SEPOLIA_NETWORK)
    expect(rpc.getNetwork().chainId).toBe(SEPOLIA_NETWORK.chainId)

    rpc.switchNetwork(MAINNET_NETWORK)
    expect(rpc.getNetwork().chainId).toBe(MAINNET_NETWORK.chainId)
    expect(rpc.getNetwork().name).toBe("Ethereum Mainnet")
  })

  it("handles fallback URLs in transport config", () => {
    const multiRpcNet = {
      ...MAINNET_NETWORK,
      rpcUrls: ["https://rpc1.example.com", "https://rpc2.example.com"],
    }
    const rpc = new RpcService(multiRpcNet)
    expect(rpc.getNetwork().rpcUrls?.length).toBe(2)
  })

  it("formats units correctly with decimals", () => {
    const rpc = new RpcService()
    expect(rpc.formatUnits(1000000n, 6)).toBe("1")
    expect(rpc.formatUnits(1500000n, 6)).toBe("1.5")
    expect(rpc.formatUnits(1000000000000000000n, 18)).toBe("1")
  })

  it("checks bytecode presence using hasBytecode", async () => {
    const mockClient = {
      getBytecode: async ({ address }: { address: string }) => {
        if (address === "0x1111111111111111111111111111111111111111") return "0x60806040..."
        return "0x"
      },
    } as any

    const rpc = new RpcService(SEPOLIA_NETWORK, mockClient)
    expect(await rpc.hasBytecode("0x1111111111111111111111111111111111111111")).toBe(true)
    expect(await rpc.hasBytecode("0x2222222222222222222222222222222222222222")).toBe(false)
  })

  it("resolves token balance and metadata using readContract", async () => {
    const mockClient = {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "balanceOf") return 5000000n // 5 USDC
        if (functionName === "name") return "USD Coin"
        if (functionName === "symbol") return "USDC"
        if (functionName === "decimals") return 6
        throw new Error("unsupported function")
      },
    } as any

    const rpc = new RpcService(SEPOLIA_NETWORK, mockClient)
    const balance = await rpc.getTokenBalance(
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    )
    expect(balance).toBe(5000000n)
    expect(rpc.formatUnits(balance, 6)).toBe("5")

    const metadata = await rpc.getTokenMetadata("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238")
    expect(metadata.isErc20).toBe(true)
    expect(metadata.symbol).toBe("USDC")
    expect(metadata.name).toBe("USD Coin")
    expect(metadata.decimals).toBe(6)
  })
})
