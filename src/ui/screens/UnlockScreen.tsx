import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { LogoBanner } from "../components/LogoBanner.js"
import { ResetModal } from "../components/ResetModal.js"
import { useUnlock } from "../hooks/index.js"
import type { WalletData } from "../../core/types.js"

interface UnlockScreenProps {
  onUnlocked: (wallet: WalletData, password?: string) => void
  onReset: () => void
}

export function UnlockScreen({ onUnlocked, onReset }: UnlockScreenProps) {
  const renderer = useRenderer()
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
            borderColor: "#3B82F6",
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
              borderColor: "#60A5FA",
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
              <text fg="#F59E0B">Decrypting wallet vault...</text>
            </box>
          ) : null}

          {errorMessage ? (
            <box style={{ marginBottom: 1 }}>
              <text fg="#EF4444">⚠ {errorMessage}</text>
            </box>
          ) : null}

          <box style={{ marginTop: 1, flexDirection: "row", justifyContent: "space-between" }}>
            <text fg="#9CA3AF">[Enter] Unlock Account</text>
            <text fg="#EF4444">[X] Reset / Delete Vault</text>
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
        <text fg="#9CA3AF">
          [<span fg="#10B981"><b>Enter</b></span>] Unlock  |  [<span fg="#EF4444"><b>X</b></span>] Reset Vault  |  [<span fg="#9CA3AF"><b>Esc / Q</b></span>] Quit
        </text>
      </Footer>
    </box>
  )
}
