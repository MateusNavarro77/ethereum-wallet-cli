import { useState, useEffect, useCallback, useRef } from "react"
import { useService } from "../context.js"
import type { NetworkConfig } from "../../core/types.js"
import type { NetworkConnectionStatus } from "../../core/interfaces.js"

export interface UseNetworkResult {
  activeNetwork: NetworkConfig
  allNetworks: NetworkConfig[]
  presets: NetworkConfig[]
  customNetworks: NetworkConfig[]
  status: NetworkConnectionStatus
  switchNetwork: (chainId: number) => Promise<void>
  addNetwork: (input: Omit<NetworkConfig, "isTestnet" | "isLocal">) => Promise<NetworkConfig>
  editNetwork: (chainId: number, updates: Partial<NetworkConfig>) => Promise<NetworkConfig>
  removeNetwork: (chainId: number) => Promise<void>
  refreshStatus: () => Promise<void>
}

export function useNetwork(pollIntervalMs = 12000): UseNetworkResult {
  const networkService = useService("networkService")

  const [activeNetwork, setActiveNetworkState] = useState<NetworkConfig>(() =>
    networkService.getActiveNetwork(),
  )
  const [allNetworks, setAllNetworks] = useState<NetworkConfig[]>(() =>
    networkService.getAllNetworks(),
  )
  const [status, setStatus] = useState<NetworkConnectionStatus>({
    connected: false,
  })

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const refreshNetworks = useCallback(() => {
    if (!isMountedRef.current) return
    setActiveNetworkState(networkService.getActiveNetwork())
    setAllNetworks(networkService.getAllNetworks())
  }, [networkService])

  const refreshStatus = useCallback(async () => {
    try {
      const nextStatus = await networkService.getConnectionStatus()
      if (isMountedRef.current) {
        setStatus(nextStatus)
      }
    } catch (err) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : String(err)
        setStatus({ connected: false, error: message })
      }
    }
  }, [networkService])

  // Initial status check & periodic soft polling (FR-NET-07)
  useEffect(() => {
    refreshStatus()

    if (pollIntervalMs > 0) {
      const timer = setInterval(() => {
        refreshStatus()
      }, pollIntervalMs)
      return () => clearInterval(timer)
    }
  }, [refreshStatus, pollIntervalMs, activeNetwork.chainId])

  const switchNetwork = useCallback(
    async (chainId: number) => {
      await networkService.setActiveNetwork(chainId)
      refreshNetworks()
      await refreshStatus()
    },
    [networkService, refreshNetworks, refreshStatus],
  )

  const addNetwork = useCallback(
    async (input: Omit<NetworkConfig, "isTestnet" | "isLocal">) => {
      const added = await networkService.addCustomNetwork(input)
      refreshNetworks()
      return added
    },
    [networkService, refreshNetworks],
  )

  const editNetwork = useCallback(
    async (chainId: number, updates: Partial<NetworkConfig>) => {
      const updated = await networkService.editCustomNetwork(chainId, updates)
      refreshNetworks()
      await refreshStatus()
      return updated
    },
    [networkService, refreshNetworks, refreshStatus],
  )

  const removeNetwork = useCallback(
    async (chainId: number) => {
      await networkService.removeCustomNetwork(chainId)
      refreshNetworks()
      await refreshStatus()
    },
    [networkService, refreshNetworks, refreshStatus],
  )

  return {
    activeNetwork,
    allNetworks,
    presets: networkService.getPresets(),
    customNetworks: networkService.getCustomNetworks(),
    status,
    switchNetwork,
    addNetwork,
    editNetwork,
    removeNetwork,
    refreshStatus,
  }
}

