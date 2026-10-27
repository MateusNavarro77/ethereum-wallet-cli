import { useState, useEffect, useCallback } from "react"
import { useService } from "./context.js"
import { WelcomeScreen } from "./screens/WelcomeScreen.js"
import { PasswordScreen } from "./screens/PasswordScreen.js"
import { MnemonicScreen } from "./screens/MnemonicScreen.js"
import { ImportScreen } from "./screens/ImportScreen.js"
import { DashboardScreen } from "./screens/DashboardScreen.js"
import { UnlockScreen } from "./screens/UnlockScreen.js"
import type { Account, WalletData } from "../core/types.js"

type AppStep =
  | "initializing"
  | "welcome"
  | "create-password"
  | "create-mnemonic"
  | "import-words"
  | "import-password"
  | "unlock"
  | "dashboard"
  | "receive"

export function App() {
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
  const handleStartCreate = () => {
    const mnemonic = walletService.generateMnemonic()
    setMnemonicPhrase(mnemonic)
    setErrorMessage(null)
    setStep("create-password")
  }

  const handleCreatePasswordComplete = (password: string) => {
    setCreatedPassword(password)
    setStep("create-mnemonic")
  }

  const handleCreateMnemonicComplete = async () => {
    try {
      setLoadingOverlay("Encrypting and saving vault...")
      const wallet = walletService.createWallet(mnemonicPhrase, "Account 1")
      const encryptedVault = await cryptoService.encrypt(
        JSON.stringify(wallet),
        createdPassword,
      )
      await storageService.saveVault(encryptedVault)

      // Ensure loading state is cleared and transition immediately to dashboard
      setLoadingOverlay(null)
      setErrorMessage(null)
      setActiveAccount(wallet.accounts[0])
      setStep("dashboard")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setLoadingOverlay(null)
      setErrorMessage(`Failed to save wallet: ${msg}`)
    }
  }

  // --- Import Flow ---
  const handleStartImport = () => {
    setErrorMessage(null)
    setStep("import-words")
  }

  const handleImportWordsComplete = (mnemonic: string) => {
    setMnemonicPhrase(mnemonic)
    setStep("import-password")
  }

  const handleImportPasswordComplete = async (password: string) => {
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
  }

  // --- Unlock & Reset ---
  const handleUnlocked = (wallet: WalletData) => {
    setErrorMessage(null)
    setActiveAccount(wallet.accounts[0])
    setStep("dashboard")
  }

  const handleResetVault = async () => {
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
  }

  if (step === "initializing" || loadingOverlay) {
    return (
      <box
        style={{
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <box
          style={{
            border: true,
            borderColor: "#3B82F6",
            padding: 1,
            alignItems: "center",
          }}
        >
          <text fg="#60A5FA">
            <b>{loadingOverlay || "Initializing TermiWallet..."}</b>
          </text>
        </box>
      </box>
    )
  }

  if (errorMessage) {
    return (
      <box
        style={{
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <box
          style={{
            border: true,
            borderColor: "#EF4444",
            padding: 1,
            flexDirection: "column",
            width: 60,
          }}
        >
          <text fg="#EF4444">
            <b>Error Encountered</b>
          </text>
          <text fg="#FFFFFF">{errorMessage}</text>
        </box>
      </box>
    )
  }

  if (step === "welcome") {
    return (
      <WelcomeScreen
        onCreateNew={handleStartCreate}
        onImport={handleStartImport}
      />
    )
  }

  if (step === "unlock") {
    return (
      <UnlockScreen
        onUnlocked={handleUnlocked}
        onReset={handleResetVault}
      />
    )
  }

  if (step === "create-password") {
    return (
      <PasswordScreen
        title="Set Master Password"
        onComplete={handleCreatePasswordComplete}
        onCancel={() => setStep("welcome")}
      />
    )
  }

  if (step === "create-mnemonic") {
    return (
      <MnemonicScreen
        mnemonic={mnemonicPhrase}
        onComplete={handleCreateMnemonicComplete}
        onCancel={() => setStep("create-password")}
      />
    )
  }

  if (step === "import-words") {
    return (
      <ImportScreen
        onComplete={handleImportWordsComplete}
        onCancel={() => setStep("welcome")}
      />
    )
  }

  if (step === "import-password") {
    return (
      <PasswordScreen
        title="Set Password for Imported Wallet"
        onComplete={handleImportPasswordComplete}
        onCancel={() => setStep("import-words")}
      />
    )
  }

  if ((step === "dashboard" || step === "receive") && activeAccount) {
    return (
      <DashboardScreen
        account={activeAccount}
        onReset={handleResetVault}
      />
    )
  }

  return null
}
