import type { IPriceService, IStorageService } from "../core/interfaces.js"

interface PriceCacheEntry {
  price: number
  timestamp: number
}

// Map common symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  ETH: "ethereum",
  SEP: "ethereum",
  WETH: "weth",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  WBTC: "wrapped-bitcoin",
  LINK: "chainlink",
  UNI: "uniswap",
}

export class PriceService implements IPriceService {
  private cache: Map<string, PriceCacheEntry> = new Map()
  private cacheTtlMs = 60_000 // 1 minute cache
  private fiatEnabled = true
  private customFetch?: typeof fetch

  constructor(
    private storageService?: IStorageService,
    customFetch?: typeof fetch,
  ) {
    this.customFetch = customFetch
    this.loadSettings()
  }

  private async loadSettings(): Promise<void> {
    if (!this.storageService) return
    try {
      const config = await this.storageService.loadConfig()
      if (typeof config.fiatEnabled === "boolean") {
        this.fiatEnabled = config.fiatEnabled
      }
    } catch {
      // Use defaults if config cannot be read
    }
  }

  isFiatEnabled(): boolean {
    return this.fiatEnabled
  }

  async setFiatEnabled(enabled: boolean): Promise<void> {
    this.fiatEnabled = enabled
    if (!this.storageService) return
    try {
      const config = await this.storageService.loadConfig()
      await this.storageService.saveConfig({
        ...config,
        fiatEnabled: enabled,
      })
    } catch {
      // Ignore storage persistence failure
    }
  }

  async getPriceUsd(symbolOrAddress: string, chainId = 1): Promise<number | undefined> {
    if (!this.fiatEnabled) return undefined
    const key = `${symbolOrAddress.toUpperCase()}_${chainId}`
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.price
    }

    const prices = await this.getPricesUsd([{ symbol: symbolOrAddress }], chainId)
    return prices[symbolOrAddress.toUpperCase()]
  }

  async getPricesUsd(
    items: { symbol: string; address?: string }[],
    chainId = 1,
  ): Promise<Record<string, number>> {
    if (!this.fiatEnabled || items.length === 0) return {}

    const results: Record<string, number> = {}
    const toFetchSymbols: string[] = []
    const now = Date.now()

    for (const item of items) {
      const upper = item.symbol.toUpperCase()
      const key = `${upper}_${chainId}`
      const cached = this.cache.get(key)
      if (cached && now - cached.timestamp < this.cacheTtlMs) {
        results[upper] = cached.price
      } else {
        toFetchSymbols.push(upper)
      }
    }

    if (toFetchSymbols.length === 0) {
      return results
    }

    try {
      const coingeckoIds = toFetchSymbols
        .map((s) => SYMBOL_TO_COINGECKO_ID[s])
        .filter(Boolean) as string[]

      if (coingeckoIds.length > 0) {
        const fetchFn = this.customFetch || fetch
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
          coingeckoIds.join(","),
        )}&vs_currencies=usd`

        const response = await fetchFn(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(4000),
        })

        if (response.ok) {
          const data = (await response.json()) as Record<string, { usd?: number }>
          for (const symbol of toFetchSymbols) {
            const geckoId = SYMBOL_TO_COINGECKO_ID[symbol]
            if (geckoId && data[geckoId]?.usd !== undefined) {
              const price = data[geckoId].usd!
              results[symbol] = price
              this.cache.set(`${symbol}_${chainId}`, { price, timestamp: now })
            }
          }
        }
      }
    } catch {
      // In case of CoinGecko rate-limit or network failure, try DeFiLlama fallback or return stale cache
      try {
        const fetchFn = this.customFetch || fetch
        // DeFiLlama coins endpoint
        const llamaCoins = toFetchSymbols
          .map((s) => (s === "ETH" || s === "SEP" ? "coingecko:ethereum" : undefined))
          .filter(Boolean)

        if (llamaCoins.length > 0) {
          const res = await fetchFn(
            `https://coins.llama.fi/prices/current/${llamaCoins.join(",")}`,
            { signal: AbortSignal.timeout(3000) },
          )
          if (res.ok) {
            const data = (await res.json()) as { coins: Record<string, { price: number }> }
            if (data.coins["coingecko:ethereum"]) {
              const ethPrice = data.coins["coingecko:ethereum"].price
              results["ETH"] = ethPrice
              results["SEP"] = ethPrice
              this.cache.set(`ETH_${chainId}`, { price: ethPrice, timestamp: now })
              this.cache.set(`SEP_${chainId}`, { price: ethPrice, timestamp: now })
            }
          }
        }
      } catch {
        // Degrade gracefully; return whatever cached values exist
      }
    }

    // Return any stale cached price if fresh fetch failed
    for (const sym of toFetchSymbols) {
      if (results[sym] === undefined) {
        const stale = this.cache.get(`${sym}_${chainId}`)
        if (stale) {
          results[sym] = stale.price
        }
      }
    }

    return results
  }
}

