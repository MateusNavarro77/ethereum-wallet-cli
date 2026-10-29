import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../context.js"
import { HotkeyButton } from "./HotkeyButton.js"

interface ResetModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export function ResetModal({ onConfirm, onCancel }: ResetModalProps) {
  const [inputVal, setInputVal] = useState("")
  const [error, setError] = useState("")
  const { tokens } = useTheme()

  const handleSubmit = () => {
    if (inputVal.trim() === "RESET") {
      onConfirm()
    } else {
      setError('Confirmation failed. You must type exactly "RESET" to confirm.')
    }
  }

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel()
    } else if (key.name === "return") {
      handleSubmit()
    }
  })

  return (
    <box
      style={{
        position: "absolute",
        top: "20%",
        left: "15%",
        width: 70,
        border: true,
        borderColor: tokens.error,
        backgroundColor: tokens.background,
        padding: 1,
        flexDirection: "column",
      }}
    >
      <box style={{ marginBottom: 1 }}>
        <text fg={tokens.error}>
          <b>⚠ DANGER: Clear / Reset Wallet</b>
        </text>
      </box>

      <box style={{ marginBottom: 1, flexDirection: "column" }}>
        <text fg={tokens.error}>
          This action will permanently delete your encrypted vault file from disk.
        </text>
        <text fg={tokens.textMuted}>
          Make sure you have backed up your recovery phrase! This cannot be undone.
        </text>
      </box>

      <box style={{ marginBottom: 1 }}>
        <text fg={tokens.text}>
          Type <span fg={tokens.error}><b>RESET</b></span> and press Enter to permanently wipe:
        </text>
      </box>

      <box
        title=" Confirm Reset "
        style={{
          border: true,
          borderColor: tokens.error,
          height: 3,
          marginBottom: 1,
        }}
      >
        <input
          placeholder="Type RESET here..."
          onInput={(val) => {
            setInputVal(val)
            setError("")
          }}
          onSubmit={handleSubmit}
          focused={true}
        />
      </box>

      {error ? (
        <box style={{ marginBottom: 1 }}>
          <text fg={tokens.error}>⚠ {error}</text>
        </box>
      ) : null}

      <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <HotkeyButton onPress={handleSubmit} color={tokens.error}>
          [Enter] Confirm Wipe
        </HotkeyButton>
        <HotkeyButton onPress={onCancel} color={tokens.textMuted}>
          [Esc] Cancel & Keep Wallet
        </HotkeyButton>
      </box>
    </box>
  )
}
