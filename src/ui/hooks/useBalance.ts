import { useState, useEffect, useCallback, useRef } from "react"
import { useService } from "../context.js"

export interface UseBalanceResult {
  balance: string
  balanceError: string | null
  network: { name: string; symbol: string; chainId: number; rpcUrl: string }
  refreshBalance: () => Promise<void>
}

/**
 * Custom hook to manage fetching and refreshing Ethereum balance for an address.
 */
export function useBalance(
  address: `0x${string}` | string,
  onUpdateSuccess?: () => void,
): UseBalanceResult {
  const rpcService = useService("rpcService")
  const network = rpcService.getNetwork()

  const [balance, setBalance] = useState<string>("Loading...")
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const refreshBalance = useCallback(async () => {
    try {
      setBalance("Fetching...")
      setBalanceError(null)

      const formattedAddress = (
        address.startsWith("0x") ? address : `0x${address}`
      ) as `0x${string}`

      const wei = await rpcService.getBalance(formattedAddress)
      const formatted = rpcService.formatEther(wei)

      if (isMountedRef.current) {
        setBalance(`${formatted} ${network.symbol}`)
        onUpdateSuccess?.()
      }
    } catch (err) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : String(err)
        setBalanceError(message)
        setBalance("Unavailable (RPC error)")
      }
    }
  }, [address, network.symbol, rpcService, onUpdateSuccess])

  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  return {
    balance,
    balanceError,
    network,
    refreshBalance,
  }
}
