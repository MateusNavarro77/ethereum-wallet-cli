import { describe, expect, it, beforeEach } from "bun:test"
import { TokenService } from "../src/services/token.service.js"
import type { IStorageService, IRpcService } from "../src/core/interfaces.js"
import type { AppConfig } from "../src/core/types.js"

describe("TokenService", () => {
  let mockConfig: AppConfig
  let mockStorage: IStorageService
  let mockRpc: IRpcService

  beforeEach(() => {
    mockConfig = {}
    mockStorage = {
      vaultExists: async () => true,
      saveVault: async () => {},
      loadVault: async () => ({} as any),
      deleteVault: async () => {},
      getVaultPath: () => "/tmp/vault",
      configExists: async () => true,
      saveConfig: async (cfg) => {
        mockConfig = { ...cfg }
      },
      loadConfig: async () => mockConfig,
      getConfigPath: () => "/tmp/config.json",
    }

    mockRpc = {
      getBalance: async () => 0n,
      getTokenBalance: async () => 1000000n,
      getTokenMetadata: async (addr) => {
        if (addr.toLowerCase() === "0x0000000000000000000000000000000000000bad") {
          return { name: "NonStandard", symbol: "NON", decimals: 18, isErc20: false }
        }
        return { name: "Custom Token", symbol: "CST", decimals: 18, isErc20: true }
      },
      hasBytecode: async (addr) => {
        if (addr.toLowerCase() === "0x0000000000000000000000000000000000000e0a") {
          return false
        }
        return true
      },
      getBlockNumber: async () => 1000n,
      verifyRpc: async () => ({ chainId: 1, healthy: true }),
      switchNetwork: () => {},
      formatEther: (w) => String(w),
      formatUnits: (v) => String(v),
      getNetwork: () => ({} as any),
    }
  })

  it("loads presets for Mainnet (USDC, USDT, DAI) and Sepolia (USDC)", () => {
    const tokenService = new TokenService(mockStorage, mockRpc)
    const mainnetTokens = tokenService.getTokens(1)
    expect(mainnetTokens.length).toBeGreaterThanOrEqual(3)
    expect(mainnetTokens.some((t) => t.symbol === "USDC")).toBe(true)
    expect(mainnetTokens.some((t) => t.symbol === "USDT")).toBe(true)
    expect(mainnetTokens.some((t) => t.symbol === "DAI")).toBe(true)

    const sepoliaTokens = tokenService.getTokens(11155111)
    expect(sepoliaTokens.some((t) => t.symbol === "USDC")).toBe(true)
  })

  it("adds custom token and persists to storage (FR-BAL-02, FR-BAL-03)", async () => {
    const tokenService = new TokenService(mockStorage, mockRpc)
    const customAddress = "0x2222222222222222222222222222222222222222" as `0x${string}`

    const added = await tokenService.addToken({
      address: customAddress,
      symbol: "TEST",
      name: "Test Token",
      decimals: 18,
      chainId: 11155111,
    })

    expect(added.symbol).toBe("TEST")
    expect(added.isPreset).toBe(false)
    expect(added.hidden).toBe(false)

    const tokens = tokenService.getTokens(11155111)
    expect(tokens.some((t) => t.address.toLowerCase() === customAddress.toLowerCase())).toBe(true)
    expect(mockConfig.tokens?.[11155111]?.length).toBeGreaterThan(1)
  })

  it("rejects duplicate token address on the same chain", async () => {
    const tokenService = new TokenService(mockStorage, mockRpc)
    const tokenAddr = "0x3333333333333333333333333333333333333333" as `0x${string}`

    await tokenService.addToken({
      address: tokenAddr,
      symbol: "ABC",
      name: "Abc",
      decimals: 18,
      chainId: 1,
    })

    expect(
      tokenService.addToken({
        address: tokenAddr,
        symbol: "ABC",
        name: "Abc",
        decimals: 18,
        chainId: 1,
      }),
    ).rejects.toThrow("already tracked")
  })

  it("toggles hide on tokens and persists (FR-BAL-07)", async () => {
    const tokenService = new TokenService(mockStorage, mockRpc)
    const sepoliaTokens = tokenService.getTokens(11155111)
    const usdc = sepoliaTokens.find((t) => t.symbol === "USDC")!
    expect(usdc.hidden).toBeFalsy()

    await tokenService.toggleHideToken(11155111, usdc.address)
    const updated = tokenService.getTokens(11155111).find((t) => t.symbol === "USDC")!
    expect(updated.hidden).toBe(true)

    // Unhide
    await tokenService.toggleHideToken(11155111, usdc.address)
    const unhidden = tokenService.getTokens(11155111).find((t) => t.symbol === "USDC")!
    expect(unhidden.hidden).toBe(false)
  })

  it("removes custom token but protects preset tokens from deletion", async () => {
    const tokenService = new TokenService(mockStorage, mockRpc)
    const sepoliaTokens = tokenService.getTokens(11155111)
    const preset = sepoliaTokens[0]

    expect(tokenService.removeCustomToken(11155111, preset.address)).rejects.toThrow(
      "Cannot delete a preset token",
    )

    const customAddr = "0x4444444444444444444444444444444444444444" as `0x${string}`
    await tokenService.addToken({
      address: customAddr,
      symbol: "DEL",
      name: "To Delete",
      decimals: 18,
      chainId: 11155111,
    })

    expect(tokenService.getTokens(11155111).some((t) => t.symbol === "DEL")).toBe(true)
    await tokenService.removeCustomToken(11155111, customAddr)
    expect(tokenService.getTokens(11155111).some((t) => t.symbol === "DEL")).toBe(false)
  })

  it("verifies token contracts and produces warnings for non-ERC20 or EOA (FR-BAL-08)", async () => {
    const tokenService = new TokenService(mockStorage, mockRpc)

    // 1. Invalid address
    const invalidRes = await tokenService.verifyTokenContract("0xinvalid" as any)
    expect(invalidRes.isValidErc20).toBe(false)
    expect(invalidRes.warning).toContain("Invalid Ethereum address")

    // 2. EOA (no bytecode)
    const eoaRes = await tokenService.verifyTokenContract(
      "0x0000000000000000000000000000000000000e0a" as `0x${string}`,
    )
    expect(eoaRes.isValidErc20).toBe(false)
    expect(eoaRes.warning).toContain("no contract bytecode")

    // 3. Non-standard ERC-20
    const nonStdRes = await tokenService.verifyTokenContract(
      "0x0000000000000000000000000000000000000bad" as `0x${string}`,
    )
    expect(nonStdRes.isValidErc20).toBe(false)
    expect(nonStdRes.warning).toContain("does not respond to standard ERC-20 methods")

    // 4. Valid ERC-20
    const validRes = await tokenService.verifyTokenContract(
      "0x1111111111111111111111111111111111111111" as `0x${string}`,
    )
    expect(validRes.isValidErc20).toBe(true)
    expect(validRes.metadata?.symbol).toBe("CST")
    expect(validRes.metadata?.decimals).toBe(18)
  })

  it("loads and restores tokens and hidden preferences from storage", async () => {
    mockConfig = {
      tokens: {
        11155111: [
          {
            address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
            symbol: "USDC",
            name: "Sepolia USDC",
            decimals: 6,
            chainId: 11155111,
            isPreset: true,
            hidden: true,
          },
          {
            address: "0x5555555555555555555555555555555555555555",
            symbol: "RESTORED",
            name: "Restored",
            decimals: 18,
            chainId: 11155111,
            isPreset: false,
          },
        ],
      },
    }

    const tokenService = new TokenService(mockStorage, mockRpc)
    await tokenService.loadTokens()

    const tokens = tokenService.getTokens(11155111)
    const usdc = tokens.find((t) => t.symbol === "USDC")
    expect(usdc?.hidden).toBe(true)

    const restored = tokens.find((t) => t.symbol === "RESTORED")
    expect(restored).toBeDefined()
    expect(restored?.isPreset).toBe(false)
  })
})
