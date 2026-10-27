import { useState, useCallback, useMemo } from "react"

export interface UseMnemonicBackupOptions {
  mnemonic: string
  onComplete: () => void
}

export interface UseMnemonicBackupResult {
  backedUp: boolean
  toggleBackedUp: () => void
  errorMessage: string
  setErrorMessage: (msg: string) => void
  words: string[]
  handleContinue: () => void
}

/**
 * Custom hook to manage recovery phrase backup confirmation state and word parsing.
 */
export function useMnemonicBackup({
  mnemonic,
  onComplete,
}: UseMnemonicBackupOptions): UseMnemonicBackupResult {
  const [backedUp, setBackedUp] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const words = useMemo(() => {
    return mnemonic.trim().split(/\s+/).filter(Boolean)
  }, [mnemonic])

  const toggleBackedUp = useCallback(() => {
    setBackedUp((prev) => !prev)
    setErrorMessage("")
  }, [])

  const handleContinue = useCallback(() => {
    if (!backedUp) {
      setErrorMessage("Please confirm that you have safely backed up your recovery phrase.")
      return
    }
    onComplete()
  }, [backedUp, onComplete])

  return {
    backedUp,
    toggleBackedUp,
    errorMessage,
    setErrorMessage,
    words,
    handleContinue,
  }
}

