import { useState, useCallback } from "react"
import { useService } from "../context.js"
import type { WalletData } from "../../core/types.js"

export interface UseUnlockOptions {
  onUnlocked: (wallet: WalletData, password?: string) => void
}

export interface UseUnlockResult {
  password: string
  setPassword: (password: string) => void
  errorMessage: string
  isLoading: boolean
  handleUnlock: () => Promise<void>
}

/**
 * Custom hook to encapsulate wallet unlocking, vault decryption, and wallet data migration.
 */
export function useUnlock({ onUnlocked }: UseUnlockOptions): UseUnlockResult {
  const cryptoService = useService("cryptoService")
  const storageService = useService("storageService")
  const walletService = useService("walletService")

  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleUnlock = useCallback(async () => {
    if (!password) {
      setErrorMessage("Please enter your wallet password")
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage("")
      const vault = await storageService.loadVault()
      const decrypted = await cryptoService.decrypt(vault, password)
      const rawWallet = JSON.parse(decrypted)
      const wallet = walletService.migrateWalletData(rawWallet)
      onUnlocked(wallet, password)
    } catch {
      setErrorMessage("Incorrect password. Please try again.")
      setIsLoading(false)
    }
  }, [password, cryptoService, storageService, walletService, onUnlocked])

  return {
    password,
    setPassword,
    errorMessage,
    isLoading,
    handleUnlock,
  }
}
