import { useState, useEffect, useCallback, useRef } from "react"
import { useService } from "../context.js"
import type { Account, TokenBalance, NetworkConfig } from "../../core/types.js"

export interface UsePortfolioResult {
  isAggregate: boolean
  toggleAggregate: () => void
  nativeBalance: string
  nativeFiat: string | null
  tokens: TokenBalance[]
  totalFiat: string | null
  isRefreshing: boolean
  lastUpdated: Date | null
  error: string | null
  refresh: () => Promise<void>
  network: NetworkConfig
}

export function usePortfolio(
  activeAccountAddress: `0x${string}`,
  allAccounts: Account[] = [],
  onUpdateSuccess?: () => void,
): UsePortfolioResult {
  const rpcService = useService("rpcService")
  const tokenService = useService("tokenService")
  const priceService = useService("priceService")
  const network = rpcService.getNetwork()

  const [isAggregate, setIsAggregate] = useState(false)
  const [nativeBalance, setNativeBalance] = useState("Loading...")
  const [nativeFiat, setNativeFiat] = useState<string | null>(null)
  const [tokens, setTokens] = useState<TokenBalance[]>([])
  const [totalFiat, setTotalFiat] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const toggleAggregate = useCallback(() => {
    setIsAggregate((prev) => !prev)
  }, [])

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return
    setIsRefreshing(true)
    setError(null)

    try {
      const chainId = network.chainId
      const configuredTokens = tokenService.getTokens(chainId).filter((t) => !t.hidden)
      const visibleAccounts = allAccounts.filter((a) => !a.hidden)

      let totalWei = 0n
      const tokenSums: Map<string, bigint> = new Map()

      for (const token of configuredTokens) {
        tokenSums.set(token.address.toLowerCase(), 0n)
      }

      if (!isAggregate) {
        // Single Active Account
        try {
          totalWei = await rpcService.getBalance(activeAccountAddress)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(`Native balance error: ${msg}`)
        }

        for (const token of configuredTokens) {
          try {
            const bal = await rpcService.getTokenBalance(token.address, activeAccountAddress)
            tokenSums.set(token.address.toLowerCase(), bal)
          } catch {
            // Token balance query failure defaults to 0n
            tokenSums.set(token.address.toLowerCase(), 0n)
          }
        }
      } else {
        // Aggregate Across All Visible Accounts
        const targetAccounts = visibleAccounts.length > 0 ? visibleAccounts : [{ address: activeAccountAddress }]

        for (const acc of targetAccounts) {
          try {
            const wei = await rpcService.getBalance(acc.address)
            totalWei += wei
          } catch {
            // Ignore individual failure in aggregate
          }

          for (const token of configuredTokens) {
            try {
              const bal = await rpcService.getTokenBalance(token.address, acc.address)
              const current = tokenSums.get(token.address.toLowerCase()) || 0n
              tokenSums.set(token.address.toLowerCase(), current + bal)
            } catch {
              // Ignore individual token query failure
            }
          }
        }
      }

      const formattedNative = rpcService.formatEther(totalWei)
      const nativeDisplay = `${formattedNative} ${network.symbol}`

      // Build TokenBalance objects
      const tokenBalances: TokenBalance[] = configuredTokens.map((t) => {
        const bal = tokenSums.get(t.address.toLowerCase()) || 0n
        const formatted = rpcService.formatUnits(bal, t.decimals)
        return {
          ...t,
          balance: bal,
          formattedBalance: formatted,
        }
      })

      // Fetch Fiat prices if enabled
      let calcNativeFiat: string | null = null
      let calcTotalFiatSum = 0
      let hasAnyFiat = false

      if (priceService.isFiatEnabled()) {
        try {
          const priceItems = [
            { symbol: network.symbol },
            ...tokenBalances.map((t) => ({ symbol: t.symbol, address: t.address })),
          ]
          const prices = await priceService.getPricesUsd(priceItems, chainId)

          const nativePrice = prices[network.symbol.toUpperCase()]
          if (nativePrice !== undefined) {
            const nativeUsdVal = parseFloat(formattedNative) * nativePrice
            calcNativeFiat = `$${nativeUsdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            calcTotalFiatSum += nativeUsdVal
            hasAnyFiat = true
          }

          for (const tb of tokenBalances) {
            const tokenPrice = prices[tb.symbol.toUpperCase()]
            if (tokenPrice !== undefined) {
              const val = parseFloat(tb.formattedBalance) * tokenPrice
              tb.fiatValue = `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              calcTotalFiatSum += val
              hasAnyFiat = true
            }
          }
        } catch {
          // Graceful degradation: continue without fiat values
        }
      }

      if (isMountedRef.current) {
        setNativeBalance(nativeDisplay)
        setNativeFiat(calcNativeFiat)
        setTokens(tokenBalances)
        setTotalFiat(
          hasAnyFiat
            ? `$${calcTotalFiatSum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : null,
        )
        setLastUpdated(new Date())
        setIsRefreshing(false)
        onUpdateSuccess?.()
      }
    } catch (err) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        setIsRefreshing(false)
      }
    }
  }, [
    activeAccountAddress,
    allAccounts,
    isAggregate,
    network.chainId,
    network.symbol,
    rpcService,
    tokenService,
    priceService,
    onUpdateSuccess,
  ])

  // Periodic Auto-Refresh: every 30 seconds (FR-BAL-04)
  useEffect(() => {
    refresh()

    const intervalId = setInterval(() => {
      refresh()
    }, 30_000)

    return () => clearInterval(intervalId)
  }, [refresh])

  return {
    isAggregate,
    toggleAggregate,
    nativeBalance,
    nativeFiat,
    tokens,
    totalFiat,
    isRefreshing,
    lastUpdated,
    error,
    refresh,
    network,
  }
}

