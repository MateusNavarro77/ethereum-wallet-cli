import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { useService } from "../context.js"
import { HotkeyButton } from "./HotkeyButton.js"

export interface ExportModalProps {
  title: string
  sensitiveType: "private-key" | "mnemonic"
  address?: `0x${string}`
  onExport: (password: string) => Promise<string>
  onClose: () => void
}

export function ExportModal({
  title,
  sensitiveType,
  address,
  onExport,
  onClose,
}: ExportModalProps) {
  const clipboardService = useService("clipboardService")

  const [step, setStep] = useState<"auth" | "warning" | "reveal">("auth")
  const [password, setPassword] = useState("")
  const [secret, setSecret] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleAuthenticate = async () => {
    if (!password) {
      setErrorMessage("Master password required")
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage("")
      const extractedSecret = await onExport(password)
      setSecret(extractedSecret)
      setIsLoading(false)
      setStep("warning")
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err instanceof Error ? err.message : "Incorrect password")
    }
  }

  const handleCopy = async () => {
    if (!secret) return
    const success = await clipboardService.copy(secret)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setSecret("")
    setPassword("")
    onClose()
  }

  useKeyboard((key) => {
    if (key.name === "escape") {
      handleClose()
    } else if (step === "auth") {
      if (key.name === "return") {
        handleAuthenticate()
      }
    } else if (step === "warning") {
      if (key.name === "return" || key.name === "space") {
        setStep("reveal")
      }
    } else if (step === "reveal") {
      if (key.name === "space") {
        setRevealed((prev) => !prev)
      } else if (key.name === "c" || key.name === "C") {
        handleCopy()
      }
    }
  })

  const maskedText = secret ? "•".repeat(Math.min(secret.length, 36)) : ""

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        zIndex: 100,
      }}
    >
      <box
        style={{
          width: 72,
          border: true,
          borderColor: step === "warning" ? "#EF4444" : "#F59E0B",
          padding: 1,
          flexDirection: "column",
        }}
      >
        <box style={{ marginBottom: 1, flexDirection: "row", justifyContent: "space-between" }}>
          <text fg="#FBBF24">
            <b>{title} (FR-ACC-09)</b>
          </text>
          <HotkeyButton onPress={handleClose} color="#EF4444">[Esc] Cancel</HotkeyButton>
        </box>

        {step === "auth" && (
          <>
            <box style={{ marginBottom: 1 }}>
              <text fg="#D1D5DB">
                Re-enter your master wallet password to confirm authentication:
              </text>
            </box>

            <box
              title=" Master Password "
              style={{
                border: true,
                borderColor: "#60A5FA",
                height: 3,
                marginBottom: 1,
              }}
            >
              <input
                placeholder="Enter password..."
                value={password}
                onInput={setPassword}
                onSubmit={handleAuthenticate}
                focused={true}
              />
            </box>

            {isLoading ? (
              <box style={{ marginBottom: 1 }}>
                <text fg="#F59E0B">Verifying credentials and decrypting...</text>
              </box>
            ) : null}

            {errorMessage ? (
              <box style={{ marginBottom: 1 }}>
                <text fg="#EF4444">⚠ {errorMessage}</text>
              </box>
            ) : null}

            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <HotkeyButton onPress={handleAuthenticate} color="#9CA3AF">[Enter] Confirm Authentication</HotkeyButton>
              <HotkeyButton onPress={handleClose}>[Esc] Close</HotkeyButton>
            </box>
          </>
        )}

        {step === "warning" && (
          <>
            <box
              style={{
                border: true,
                borderColor: "#EF4444",
                backgroundColor: "#1F1D1D",
                padding: 1,
                marginBottom: 1,
                flexDirection: "column",
              }}
            >
              <text fg="#F87171">
                <b>CRITICAL SECURITY WARNING:</b>
              </text>
              <text fg="#FFFFFF">
                You are about to view your raw {sensitiveType === "mnemonic" ? "BIP-39 mnemonic recovery phrase" : "private key"}.
              </text>
              <text fg="#D1D5DB">
                Anyone who views or obtains this secret has FULL and UNREVOCABLE access to all your funds! Never share it with anyone or paste it into untrusted websites.
              </text>
            </box>

            {address ? (
              <box style={{ marginBottom: 1 }}>
                <text fg="#9CA3AF">Account Address: </text>
                <text fg="#60A5FA">{address}</text>
              </box>
            ) : null}

            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <HotkeyButton onPress={() => setStep("reveal")} color="#10B981"><b>[Enter / Space] I Understand, Reveal Secret</b></HotkeyButton>
              <HotkeyButton onPress={handleClose} color="#EF4444">[Esc] Cancel</HotkeyButton>
            </box>
          </>
        )}

        {step === "reveal" && (
          <>
            <box style={{ marginBottom: 1 }}>
              <text fg="#9CA3AF">
                {sensitiveType === "mnemonic" ? "Recovery Phrase:" : "Raw Private Key:"}
              </text>
            </box>

            <box
              style={{
                border: true,
                borderColor: revealed ? "#10B981" : "#4B5563",
                padding: 1,
                marginBottom: 1,
                flexDirection: "column",
              }}
            >
              <text fg={revealed ? "#FFFFFF" : "#9CA3AF"}>
                <b>{revealed ? secret : maskedText}</b>
              </text>
            </box>

            {copied ? (
              <box style={{ marginBottom: 1 }}>
                <text fg="#10B981">✔ Copied to system clipboard!</text>
              </box>
            ) : null}

            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <box style={{ flexDirection: "row", gap: 1 }}>
                <HotkeyButton onPress={() => setRevealed((prev) => !prev)}>[Space] {revealed ? "Hide" : "Reveal"}</HotkeyButton>
                <HotkeyButton onPress={handleCopy}>[C] Copy</HotkeyButton>
              </box>
              <HotkeyButton onPress={handleClose} color="#EF4444">[Esc] Exit & Clear</HotkeyButton>
            </box>
          </>
        )}
      </box>
    </box>
  )
}
