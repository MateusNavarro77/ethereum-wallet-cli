import { describe, expect, it, beforeEach } from "bun:test"
import { PriceService } from "../../src/services/price.service.js"
import type { IStorageService } from "../../src/core/interfaces.js"
import type { AppConfig } from "../../src/core/types.js"

describe("PriceService", () => {
  let mockConfig: AppConfig
  let mockStorage: IStorageService

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
  })

  it("fetches prices from mock CoinGecko and caches them (FR-BAL-05)", async () => {
    let fetchCount = 0
    const mockFetch = async (url: string | URL | Request) => {
      fetchCount++
      const urlStr = String(url)
      if (urlStr.includes("coingecko.com")) {
        return new Response(
          JSON.stringify({
            ethereum: { usd: 3200.5 },
            "usd-coin": { usd: 1.0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }
      return new Response("{}", { status: 404 })
    }

    const priceService = new PriceService(mockStorage, mockFetch as any)
    const prices = await priceService.getPricesUsd([{ symbol: "ETH" }, { symbol: "USDC" }], 1)

    expect(prices["ETH"]).toBe(3200.5)
    expect(prices["USDC"]).toBe(1.0)
    expect(fetchCount).toBe(1)

    // Second call should use in-memory cache
    const cachedPrices = await priceService.getPricesUsd([{ symbol: "ETH" }], 1)
    expect(cachedPrices["ETH"]).toBe(3200.5)
    expect(fetchCount).toBe(1)
  })

  it("gracefully falls back when CoinGecko fails", async () => {
    const mockFetch = async (url: string | URL | Request) => {
      const urlStr = String(url)
      if (urlStr.includes("coingecko.com")) {
        throw new Error("Rate limit exceeded")
      }
      if (urlStr.includes("llama.fi")) {
        return new Response(
          JSON.stringify({
            coins: {
              "coingecko:ethereum": { price: 3150.0 },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }
      return new Response("{}", { status: 404 })
    }

    const priceService = new PriceService(mockStorage, mockFetch as any)
    const ethPrice = await priceService.getPriceUsd("ETH", 1)
    expect(ethPrice).toBe(3150.0)
  })

  it("returns undefined/empty when fiat is disabled", async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ ethereum: { usd: 3000 } }), { status: 200 })

    const priceService = new PriceService(mockStorage, mockFetch as any)
    expect(priceService.isFiatEnabled()).toBe(true)

    await priceService.setFiatEnabled(false)
    expect(priceService.isFiatEnabled()).toBe(false)
    expect(mockConfig.fiatEnabled).toBe(false)

    const ethPrice = await priceService.getPriceUsd("ETH", 1)
    expect(ethPrice).toBeUndefined()

    const prices = await priceService.getPricesUsd([{ symbol: "ETH" }], 1)
    expect(Object.keys(prices).length).toBe(0)
  })

  it("handles offline network errors gracefully without throwing", async () => {
    const brokenFetch = async () => {
      throw new Error("DNS resolution failure / offline")
    }

    const priceService = new PriceService(mockStorage, brokenFetch as any)
    const price = await priceService.getPriceUsd("ETH", 1)
    expect(price).toBeUndefined()
  })
})

