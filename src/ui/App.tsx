import { useWalletFlow } from "./hooks/index.js"
import { useTheme } from "./context.js"
import { WelcomeScreen } from "./screens/WelcomeScreen.js"
import { PasswordScreen } from "./screens/PasswordScreen.js"
import { MnemonicScreen } from "./screens/MnemonicScreen.js"
import { ImportScreen } from "./screens/ImportScreen.js"
import { DashboardScreen } from "./screens/DashboardScreen.js"
import { UnlockScreen } from "./screens/UnlockScreen.js"

export function App() {
  const { tokens } = useTheme()
  const {
    step,
    setStep,
    wallet,
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
  } = useWalletFlow()

  if (step === "initializing" || loadingOverlay) {
    return (
      <box
        style={{
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          backgroundColor: tokens.background,
        }}
      >
        <box
          style={{
            border: true,
            borderColor: tokens.borderActive,
            backgroundColor: tokens.card,
            padding: 1,
            alignItems: "center",
          }}
        >
          <text fg={tokens.primary}>
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
          backgroundColor: tokens.background,
        }}
      >
        <box
          style={{
            border: true,
            borderColor: tokens.error,
            backgroundColor: tokens.card,
            padding: 1,
            flexDirection: "column",
            width: 60,
          }}
        >
          <text fg={tokens.error}>
            <b>Error Encountered</b>
          </text>
          <text fg={tokens.text}>{errorMessage}</text>
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
        wallet={wallet || undefined}
        onSelectAccount={handleSelectActiveAccount}
        onAddDerived={handleAddDerivedAccount}
        onImportPrivateKey={handleImportPrivateKey}
        onImportKeystore={handleImportKeystore}
        onAddWatchOnly={handleAddWatchOnly}
        onRename={handleRenameAccount}
        onToggleHide={handleToggleHideAccount}
        onRemove={handleRemoveAccount}
        onExportPrivateKey={handleExportPrivateKey}
        onExportMnemonic={handleExportMnemonic}
      />
    )
  }

  return null
}
