import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { HotkeyButton } from "./HotkeyButton.js"

interface ResetModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export function ResetModal({ onConfirm, onCancel }: ResetModalProps) {
  const [inputVal, setInputVal] = useState("")
  const [error, setError] = useState("")

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
        borderColor: "#EF4444",
        backgroundColor: "#18181B",
        padding: 1,
        flexDirection: "column",
      }}
    >
      <box style={{ marginBottom: 1 }}>
        <text fg="#EF4444">
          <b>⚠ DANGER: Clear / Reset Wallet</b>
        </text>
      </box>

      <box style={{ marginBottom: 1, flexDirection: "column" }}>
        <text fg="#FCA5A5">
          This action will permanently delete your encrypted vault file from disk.
        </text>
        <text fg="#D1D5DB">
          Make sure you have backed up your recovery phrase! This cannot be undone.
        </text>
      </box>

      <box style={{ marginBottom: 1 }}>
        <text fg="#E5E7EB">
          Type <span fg="#EF4444"><b>RESET</b></span> and press Enter to permanently wipe:
        </text>
      </box>

      <box
        title=" Confirm Reset "
        style={{
          border: true,
          borderColor: "#EF4444",
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
          <text fg="#EF4444">⚠ {error}</text>
        </box>
      ) : null}

      <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <HotkeyButton onPress={handleSubmit} color="#9CA3AF">[Enter] Confirm Wipe</HotkeyButton>
        <HotkeyButton onPress={onCancel}>[Esc] Cancel & Keep Wallet</HotkeyButton>
      </box>
    </box>
  )
}

