import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { HotkeyButton } from "../components/HotkeyButton.js"
import { LogoBanner } from "../components/LogoBanner.js"
import { ResetModal } from "../components/ResetModal.js"
import { useTheme } from "../context.js"
import { useUnlock } from "../hooks/index.js"
import type { WalletData } from "../../core/types.js"

interface UnlockScreenProps {
  onUnlocked: (wallet: WalletData, password?: string) => void
  onReset: () => void
}

export function UnlockScreen({ onUnlocked, onReset }: UnlockScreenProps) {
  const renderer = useRenderer()
  const { tokens } = useTheme()
  const [showResetModal, setShowResetModal] = useState(false)

  const {
    password,
    setPassword,
    errorMessage,
    isLoading,
    handleUnlock,
  } = useUnlock({ onUnlocked })

  useKeyboard((key) => {
    if (showResetModal) return

    if (key.name === "return") {
      handleUnlock()
    } else if (key.name === "x" || key.name === "X") {
      setShowResetModal(true)
    } else if (key.name === "escape" || key.name === "q" || key.name === "Q") {
      renderer.destroy()
      process.exit(0)
    }
  })

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: tokens.background,
      }}
    >
      <Header subtitle="Unlock Wallet" />

      <box
        style={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <box
          style={{
            flexDirection: "column",
            border: true,
            borderColor: tokens.borderActive,
            backgroundColor: tokens.background,
            padding: 1,
            width: 68,
          }}
        >
          <LogoBanner
            subtitle="Unlock Your Account"
            description="Enter your master password to unlock and manage your wallet."
          />

          <box
            title=" Enter Password "
            style={{
              border: true,
              borderColor: tokens.borderActive,
              height: 3,
              marginBottom: 1,
            }}
          >
            <input
              placeholder="Password..."
              value={password}
              onInput={setPassword}
              onSubmit={handleUnlock}
              focused={!showResetModal}
            />
          </box>

          {isLoading ? (
            <box style={{ marginBottom: 1 }}>
              <text fg={tokens.warning}>Decrypting wallet vault...</text>
            </box>
          ) : null}

          {errorMessage ? (
            <box style={{ marginBottom: 1 }}>
              <text fg={tokens.error}>⚠ {errorMessage}</text>
            </box>
          ) : null}

          <box style={{ marginTop: 1, flexDirection: "row", justifyContent: "space-between" }}>
            <HotkeyButton onPress={handleUnlock} color={tokens.success}>[Enter] Unlock Account</HotkeyButton>
            <HotkeyButton onPress={() => setShowResetModal(true)} color={tokens.error}>[X] Reset / Delete Vault</HotkeyButton>
          </box>
        </box>
      </box>

      {/* Reset Confirmation Modal */}
      {showResetModal ? (
        <ResetModal
          onConfirm={() => {
            setShowResetModal(false)
            onReset()
          }}
          onCancel={() => setShowResetModal(false)}
        />
      ) : null}

      <Footer>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <HotkeyButton onPress={handleUnlock} color={tokens.success}>[Enter] Unlock</HotkeyButton>
          <HotkeyButton onPress={() => setShowResetModal(true)} color={tokens.error}>[X] Reset Vault</HotkeyButton>
          <HotkeyButton onPress={() => { renderer.destroy(); process.exit(0) }} color={tokens.textMuted}>[Esc / Q] Quit</HotkeyButton>
        </box>
      </Footer>
    </box>
  )
}
