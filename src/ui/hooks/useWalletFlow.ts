import { useState, useEffect, useCallback } from "react"
import { useService } from "../context.js"
import type { Account, WalletData } from "../../core/types.js"

export type AppStep =
  | "initializing"
  | "welcome"
  | "create-password"
  | "create-mnemonic"
  | "import-words"
  | "import-password"
  | "unlock"
  | "dashboard"
  | "receive"

export interface UseWalletFlowResult {
  step: AppStep
  setStep: (step: AppStep) => void
  createdPassword: string
  mnemonicPhrase: string
  activeAccount: Account | null
  loadingOverlay: string | null
  errorMessage: string | null
  handleStartCreate: () => void
  handleCreatePasswordComplete: (password: string) => void
  handleCreateMnemonicComplete: () => Promise<void>
  handleStartImport: () => void
  handleImportWordsComplete: (mnemonic: string) => void
  handleImportPasswordComplete: (password: string) => Promise<void>
  handleUnlocked: (wallet: WalletData) => void
  handleResetVault: () => Promise<void>
}

/**
 * Custom hook to encapsulate the top-level wallet lifecycle and screen navigation flow.
 */
export function useWalletFlow(): UseWalletFlowResult {
  const storageService = useService("storageService")
  const walletService = useService("walletService")
  const cryptoService = useService("cryptoService")

  const [step, setStep] = useState<AppStep>("initializing")
  const [createdPassword, setCreatedPassword] = useState("")
  const [mnemonicPhrase, setMnemonicPhrase] = useState("")
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [loadingOverlay, setLoadingOverlay] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const checkVault = useCallback(async () => {
    try {
      const exists = await storageService.vaultExists()
      if (exists) {
        setStep("unlock")
      } else {
        setStep("welcome")
      }
    } catch {
      setStep("welcome")
    }
  }, [storageService])

  useEffect(() => {
    checkVault()
  }, [checkVault])

  // --- Create Flow ---
  const handleStartCreate = useCallback(() => {
    const mnemonic = walletService.generateMnemonic()
    setMnemonicPhrase(mnemonic)
    setErrorMessage(null)
    setStep("create-password")
  }, [walletService])

  const handleCreatePasswordComplete = useCallback((password: string) => {
    setCreatedPassword(password)
    setStep("create-mnemonic")
  }, [])

  const handleCreateMnemonicComplete = useCallback(async () => {
    try {
      setLoadingOverlay("Encrypting and saving vault...")
      const wallet = walletService.createWallet(mnemonicPhrase, "Account 1")
      const encryptedVault = await cryptoService.encrypt(
        JSON.stringify(wallet),
        createdPassword,
      )
      await storageService.saveVault(encryptedVault)

      setLoadingOverlay(null)
      setErrorMessage(null)
      setActiveAccount(wallet.accounts[0])
      setStep("dashboard")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setLoadingOverlay(null)
      setErrorMessage(`Failed to save wallet: ${msg}`)
    }
  }, [mnemonicPhrase, createdPassword, walletService, cryptoService, storageService])

  // --- Import Flow ---
  const handleStartImport = useCallback(() => {
    setErrorMessage(null)
    setStep("import-words")
  }, [])

  const handleImportWordsComplete = useCallback((mnemonic: string) => {
    setMnemonicPhrase(mnemonic)
    setStep("import-password")
  }, [])

  const handleImportPasswordComplete = useCallback(
    async (password: string) => {
      try {
        setLoadingOverlay("Encrypting imported wallet vault...")
        const wallet = walletService.importWallet(mnemonicPhrase, "Imported Account")
        const encryptedVault = await cryptoService.encrypt(
          JSON.stringify(wallet),
          password,
        )
        await storageService.saveVault(encryptedVault)

        setLoadingOverlay(null)
        setErrorMessage(null)
        setActiveAccount(wallet.accounts[0])
        setStep("dashboard")
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setLoadingOverlay(null)
        setErrorMessage(`Failed to import wallet: ${msg}`)
      }
    },
    [mnemonicPhrase, walletService, cryptoService, storageService],
  )

  // --- Unlock & Reset ---
  const handleUnlocked = useCallback((wallet: WalletData) => {
    setErrorMessage(null)
    setActiveAccount(wallet.accounts[0])
    setStep("dashboard")
  }, [])

  const handleResetVault = useCallback(async () => {
    try {
      setLoadingOverlay("Wiping wallet from disk...")
      await storageService.deleteVault()
      setActiveAccount(null)
      setCreatedPassword("")
      setMnemonicPhrase("")
      setLoadingOverlay(null)
      setErrorMessage(null)
      setStep("welcome")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setLoadingOverlay(null)
      setErrorMessage(`Failed to delete vault: ${msg}`)
    }
  }, [storageService])

  return {
    step,
    setStep,
    createdPassword,
    mnemonicPhrase,
    activeAccount,
    loadingOverlay,
    errorMessage,
    handleStartCreate,
    handleCreatePasswordComplete,
    handleCreateMnemonicComplete,
    handleStartImport,
    handleImportWordsComplete,
    handleImportPasswordComplete,
    handleUnlocked,
    handleResetVault,
  }
}

