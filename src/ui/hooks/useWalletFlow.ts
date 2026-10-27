import { useState, useEffect, useCallback } from "react"
import { useService } from "../context.js"
import type {
  Account,
  HdAccount,
  ImportedAccount,
  WalletData,
  WatchOnlyAccount,
} from "../../core/types.js"

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
  wallet: WalletData | null
  masterPassword: string
  createdPassword: string
  mnemonicPhrase: string
  activeAccount: Account | null
  loadingOverlay: string | null
  errorMessage: string | null
  handleStartCreate: (wordCount?: 12 | 24) => void
  handleCreatePasswordComplete: (password: string) => void
  handleCreateMnemonicComplete: () => Promise<void>
  handleStartImport: () => void
  handleImportWordsComplete: (mnemonic: string) => void
  handleImportPasswordComplete: (password: string) => Promise<void>
  handleUnlocked: (wallet: WalletData, password?: string) => void
  handleResetVault: () => Promise<void>
  handleSelectActiveAccount: (address: `0x${string}`) => void
  handleAddDerivedAccount: (label?: string) => Promise<HdAccount>
  handleImportPrivateKey: (privateKey: string, label: string) => Promise<ImportedAccount>
  handleImportKeystore: (
    json: string,
    keystorePass: string,
    label: string,
  ) => Promise<ImportedAccount>
  handleAddWatchOnly: (address: string, label: string) => Promise<WatchOnlyAccount>
  handleRenameAccount: (address: `0x${string}`, newLabel: string) => Promise<void>
  handleToggleHideAccount: (address: `0x${string}`) => Promise<void>
  handleRemoveAccount: (address: `0x${string}`) => Promise<void>
  handleExportPrivateKey: (address: `0x${string}`, passwordAttempt: string) => Promise<`0x${string}`>
  handleExportMnemonic: (passwordAttempt: string) => Promise<string>
}

/**
 * Custom hook to encapsulate the top-level wallet lifecycle, multi-account management,
 * and screen navigation flow.
 */
export function useWalletFlow(): UseWalletFlowResult {
  const storageService = useService("storageService")
  const walletService = useService("walletService")
  const cryptoService = useService("cryptoService")

  const [step, setStep] = useState<AppStep>("initializing")
  const [createdPassword, setCreatedPassword] = useState("")
  const [masterPassword, setMasterPassword] = useState("")
  const [mnemonicPhrase, setMnemonicPhrase] = useState("")
  const [wallet, setWallet] = useState<WalletData | null>(null)
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

  const persistWallet = useCallback(
    async (updatedWallet: WalletData, passwordToUse?: string) => {
      const pass = passwordToUse || masterPassword
      if (!pass) {
        throw new Error("Cannot persist wallet without master password")
      }
      const encryptedVault = await cryptoService.encrypt(
        JSON.stringify(updatedWallet),
        pass,
      )
      await storageService.saveVault(encryptedVault)
      setWallet(updatedWallet)
    },
    [masterPassword, cryptoService, storageService],
  )

  // --- Create Flow ---
  const handleStartCreate = useCallback(
    (wordCount: 12 | 24 = 12) => {
      const mnemonic = walletService.generateMnemonic(wordCount)
      setMnemonicPhrase(mnemonic)
      setErrorMessage(null)
      setStep("create-password")
    },
    [walletService],
  )

  const handleCreatePasswordComplete = useCallback((password: string) => {
    setCreatedPassword(password)
    setMasterPassword(password)
    setStep("create-mnemonic")
  }, [])

  const handleCreateMnemonicComplete = useCallback(async () => {
    try {
      setLoadingOverlay("Encrypting and saving vault...")
      const createdWallet = walletService.createWallet(mnemonicPhrase, "Account 1")
      const encryptedVault = await cryptoService.encrypt(
        JSON.stringify(createdWallet),
        createdPassword,
      )
      await storageService.saveVault(encryptedVault)

      setWallet(createdWallet)
      setMasterPassword(createdPassword)
      setLoadingOverlay(null)
      setErrorMessage(null)
      setActiveAccount(createdWallet.accounts[0])
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
        const importedWallet = walletService.importWallet(mnemonicPhrase, "Imported Account")
        const encryptedVault = await cryptoService.encrypt(
          JSON.stringify(importedWallet),
          password,
        )
        await storageService.saveVault(encryptedVault)

        setWallet(importedWallet)
        setMasterPassword(password)
        setLoadingOverlay(null)
        setErrorMessage(null)
        setActiveAccount(importedWallet.accounts[0])
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
  const handleUnlocked = useCallback((unlockedWallet: WalletData, password?: string) => {
    setErrorMessage(null)
    const migrated = walletService.migrateWalletData(unlockedWallet)
    setWallet(migrated)
    if (password) {
      setMasterPassword(password)
    }
    const currentActive =
      migrated.accounts.find(
        (a) => a.address.toLowerCase() === migrated.activeAddress?.toLowerCase() && !a.hidden,
      ) ||
      migrated.accounts.find((a) => !a.hidden) ||
      migrated.accounts[0]

    setActiveAccount(currentActive)
    setStep("dashboard")
  }, [walletService])

  const handleResetVault = useCallback(async () => {
    try {
      setLoadingOverlay("Wiping wallet from disk...")
      await storageService.deleteVault()
      setWallet(null)
      setActiveAccount(null)
      setCreatedPassword("")
      setMasterPassword("")
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

  // --- Multi-Account Management ---
  const handleSelectActiveAccount = useCallback(
    (address: `0x${string}`) => {
      if (!wallet) return
      const target = wallet.accounts.find(
        (a) => a.address.toLowerCase() === address.toLowerCase(),
      )
      if (target) {
        setActiveAccount(target)
        const updated: WalletData = { ...wallet, activeAddress: target.address }
        setWallet(updated)
        persistWallet(updated).catch(() => {})
      }
    },
    [wallet, persistWallet],
  )

  const handleAddDerivedAccount = useCallback(
    async (label?: string): Promise<HdAccount> => {
      if (!wallet) throw new Error("Wallet not initialized")
      const result = walletService.addDerivedAccount(wallet, label)
      await persistWallet(result.wallet)
      return result.account
    },
    [wallet, walletService, persistWallet],
  )

  const handleImportPrivateKey = useCallback(
    async (privateKey: string, label: string): Promise<ImportedAccount> => {
      if (!wallet) throw new Error("Wallet not initialized")
      const result = await walletService.importPrivateKey(
        wallet,
        privateKey,
        label,
        masterPassword,
      )
      await persistWallet(result.wallet)
      return result.account
    },
    [wallet, masterPassword, walletService, persistWallet],
  )

  const handleImportKeystore = useCallback(
    async (
      json: string,
      keystorePass: string,
      label: string,
    ): Promise<ImportedAccount> => {
      if (!wallet) throw new Error("Wallet not initialized")
      const result = await walletService.importKeystore(
        wallet,
        json,
        keystorePass,
        label,
        masterPassword,
      )
      await persistWallet(result.wallet)
      return result.account
    },
    [wallet, masterPassword, walletService, persistWallet],
  )

  const handleAddWatchOnly = useCallback(
    async (address: string, label: string): Promise<WatchOnlyAccount> => {
      if (!wallet) throw new Error("Wallet not initialized")
      const result = walletService.addWatchOnlyAccount(wallet, address, label)
      await persistWallet(result.wallet)
      return result.account
    },
    [wallet, walletService, persistWallet],
  )

  const handleRenameAccount = useCallback(
    async (address: `0x${string}`, newLabel: string): Promise<void> => {
      if (!wallet) throw new Error("Wallet not initialized")
      const updated = walletService.renameAccount(wallet, address, newLabel)
      await persistWallet(updated)
      if (activeAccount?.address.toLowerCase() === address.toLowerCase()) {
        const nextActive = updated.accounts.find((a) => a.address === address)
        if (nextActive) setActiveAccount(nextActive)
      }
    },
    [wallet, activeAccount, walletService, persistWallet],
  )

  const handleToggleHideAccount = useCallback(
    async (address: `0x${string}`): Promise<void> => {
      if (!wallet) throw new Error("Wallet not initialized")
      const updated = walletService.toggleHideAccount(wallet, address)
      await persistWallet(updated)
      const nextActive =
        updated.accounts.find(
          (a) => a.address.toLowerCase() === updated.activeAddress?.toLowerCase() && !a.hidden,
        ) ||
        updated.accounts.find((a) => !a.hidden) ||
        updated.accounts[0]
      setActiveAccount(nextActive)
    },
    [wallet, walletService, persistWallet],
  )

  const handleRemoveAccount = useCallback(
    async (address: `0x${string}`): Promise<void> => {
      if (!wallet) throw new Error("Wallet not initialized")
      const updated = walletService.removeAccount(wallet, address)
      await persistWallet(updated)
      const nextActive =
        updated.accounts.find(
          (a) => a.address.toLowerCase() === updated.activeAddress?.toLowerCase() && !a.hidden,
        ) ||
        updated.accounts.find((a) => !a.hidden) ||
        updated.accounts[0]
      setActiveAccount(nextActive)
    },
    [wallet, walletService, persistWallet],
  )

  const handleExportPrivateKey = useCallback(
    async (address: `0x${string}`, passwordAttempt: string): Promise<`0x${string}`> => {
      if (!wallet) throw new Error("Wallet not initialized")
      // Re-authenticate password against vault
      const vault = await storageService.loadVault()
      await cryptoService.decrypt(vault, passwordAttempt)

      return walletService.getExportPrivateKey(wallet, address, passwordAttempt)
    },
    [wallet, storageService, cryptoService, walletService],
  )

  const handleExportMnemonic = useCallback(
    async (passwordAttempt: string): Promise<string> => {
      if (!wallet) throw new Error("Wallet not initialized")
      // Re-authenticate password against vault
      const vault = await storageService.loadVault()
      await cryptoService.decrypt(vault, passwordAttempt)

      return walletService.getExportMnemonic(wallet)
    },
    [wallet, storageService, cryptoService, walletService],
  )

  return {
    step,
    setStep,
    wallet,
    masterPassword,
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
    handleSelectActiveAccount,
    handleAddDerivedAccount,
    handleImportPrivateKey,
    handleImportKeystore,
    handleAddWatchOnly,
    handleRenameAccount,
    handleToggleHideAccount,
    handleRemoveAccount,
    handleExportPrivateKey,
    handleExportMnemonic,
  }
}
