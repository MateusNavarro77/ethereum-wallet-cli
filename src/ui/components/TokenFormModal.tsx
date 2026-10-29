import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../context.js"
import { HotkeyButton } from "./HotkeyButton.js"
import type { TokenVerificationResult } from "../../core/interfaces.js"

export interface TokenFormData {
  address: `0x${string}`
  name: string
  symbol: string
  decimals: number
}

export interface TokenFormModalProps {
  initialAddress?: string
  onVerify: (address: `0x${string}`) => Promise<TokenVerificationResult>
  onSubmit: (data: TokenFormData) => Promise<void>
  onClose: () => void
}

export function TokenFormModal({ initialAddress = "", onVerify, onSubmit, onClose }: TokenFormModalProps) {
  const { tokens } = useTheme()
  const [address, setAddress] = useState(initialAddress)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [step, setStep] = useState<"input" | "confirm" | "warning">("input")
  const [resolvedData, setResolvedData] = useState<TokenFormData | null>(null)

  const handleVerify = async () => {
    const trimmed = address.trim()
    if (!trimmed) {
      setError("Contract address cannot be empty")
      return
    }

    const formatted = (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`
    if (!/^0x[a-fA-F0-9]{40}$/.test(formatted)) {
      setError("Invalid Ethereum address format (must be 42 characters hex starting with 0x)")
      return
    }

    setIsVerifying(true)
    setError(null)
    setWarning(null)

    try {
      const result = await onVerify(formatted)
      setIsVerifying(false)

      const formData: TokenFormData = {
        address: formatted,
        name: result.metadata?.name || "Custom Token",
        symbol: result.metadata?.symbol || "CUSTOM",
        decimals: result.metadata?.decimals ?? 18,
      }
      setResolvedData(formData)

      if (result.isValidErc20) {
        setStep("confirm")
      } else {
        setWarning(result.warning || "Contract could not be verified as a standard ERC-20 token.")
        setStep("warning")
      }
    } catch (err: any) {
      setIsVerifying(false)
      setError(err.message || "Failed to query contract")
    }
  }

  const handleConfirmAdd = async () => {
    if (!resolvedData) return
    try {
      setError(null)
      await onSubmit(resolvedData)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to add token")
    }
  }

  useKeyboard((key) => {
    if (key.name === "escape") {
      onClose()
    } else if (step === "input") {
      if (key.name === "return") {
        handleVerify()
      }
    } else if (step === "confirm") {
      if (key.name === "return") {
        handleConfirmAdd()
      }
    } else if (step === "warning") {
      if (key.name === "f" || key.sequence?.toLowerCase() === "f") {
        handleConfirmAdd()
      }
    }
  })

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor={tokens.borderActive}
      backgroundColor={tokens.card}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      width={72}
    >
      <text fg={tokens.primary}>
        <b>➕ Add ERC-20 Token (FR-BAL-03, FR-BAL-08)</b>
      </text>

      {step === "input" && (
        <box flexDirection="column" marginTop={1}>
          <text fg={tokens.textMuted}>Enter the ERC-20 contract address on the active network:</text>
          <box
            title=" Contract Address "
            style={{
              border: true,
              borderColor: error ? tokens.error : tokens.borderActive,
              height: 3,
              marginTop: 1,
              marginBottom: 1,
            }}
          >
            <input
              placeholder="0x..."
              value={address}
              onInput={(val) => {
                setAddress(val)
                setError(null)
              }}
              onSubmit={handleVerify}
              focused={step === "input"}
            />
          </box>

          {isVerifying && <text fg={tokens.warning}>⟳ Querying contract bytecode and ERC-20 metadata...</text>}
          {error && <text fg={tokens.error}>✖ {error}</text>}

          <box marginTop={1} flexDirection="row" gap={2}>
            <HotkeyButton onPress={handleVerify} color={tokens.success}>[Enter] Verify & Add</HotkeyButton>
            <HotkeyButton onPress={onClose} color={tokens.textMuted}>[Esc] Cancel</HotkeyButton>
          </box>
        </box>
      )}

      {step === "confirm" && resolvedData && (
        <box flexDirection="column" marginTop={1}>
          <text fg={tokens.success}>
            <b>✔ Valid ERC-20 Contract Verified!</b>
          </text>
          <box flexDirection="column" marginTop={1} paddingLeft={1}>
            <text fg={tokens.text}>
              Name: <span fg={tokens.primary}><b>{resolvedData.name}</b></span>
            </text>
            <text fg={tokens.text}>
              Symbol: <span fg={tokens.warning}><b>{resolvedData.symbol}</b></span>
            </text>
            <text fg={tokens.text}>
              Decimals: <span fg={tokens.textMuted}>{resolvedData.decimals}</span>
            </text>
            <text fg={tokens.textMuted}>Address: {resolvedData.address}</text>
          </box>

          {error && <text fg={tokens.error} marginTop={1}>✖ {error}</text>}

          <box marginTop={1} flexDirection="row" gap={2}>
            <HotkeyButton onPress={handleConfirmAdd} color={tokens.success}><b>[Enter] Confirm & Track Token</b></HotkeyButton>
            <HotkeyButton onPress={onClose} color={tokens.textMuted}>[Esc] Cancel</HotkeyButton>
          </box>
        </box>
      )}

      {step === "warning" && resolvedData && (
        <box flexDirection="column" marginTop={1}>
          <box borderStyle="single" borderColor={tokens.warning} padding={1} flexDirection="column" backgroundColor={tokens.surface}>
            <text fg={tokens.warning}>
              <b>⚠ Warning: Contract Not Verified as Standard ERC-20</b>
            </text>
            <text fg={tokens.textMuted} marginTop={1}>
              {warning}
            </text>
            <text fg={tokens.textMuted} marginTop={1}>
              Interacting with unverified contracts may display incorrect balances or pose security risks.
            </text>
          </box>

          <box marginTop={1} paddingLeft={1} flexDirection="column">
            <text fg={tokens.text}>
              Target Address: <span fg={tokens.textMuted}>{resolvedData.address}</span>
            </text>
            <text fg={tokens.text}>
              Assumed Symbol: <span fg={tokens.warning}>{resolvedData.symbol}</span> (Decimals: {resolvedData.decimals})
            </text>
          </box>

          {error && <text fg={tokens.error} marginTop={1}>✖ {error}</text>}

          <box marginTop={1} flexDirection="row" gap={2}>
            <HotkeyButton onPress={handleConfirmAdd} color={tokens.warning}><b>[F] Force Add Anyway</b></HotkeyButton>
            <HotkeyButton onPress={onClose} color={tokens.textMuted}>[Esc] Cancel</HotkeyButton>
          </box>
        </box>
      )}
    </box>
  )
}
