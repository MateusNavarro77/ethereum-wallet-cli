import { describe, expect, it } from "bun:test"
import { createPublicClient } from "viem"
import { RpcService } from "../src/services/rpc.service.js"
import { SEPOLIA_NETWORK } from "../src/core/types.js"

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
})
