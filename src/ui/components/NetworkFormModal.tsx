import { useState, useCallback } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../context.js"
import { HotkeyButton } from "./HotkeyButton.js"
import type { NetworkConfig } from "../../core/types.js"

export interface NetworkFormData {
  name: string
  rpcUrl: string
  rpcUrls: string[]
  chainId: number
  symbol: string
  explorerUrl?: string
}

export interface NetworkFormModalProps {
  networkToEdit?: NetworkConfig
  onSave: (data: NetworkFormData) => Promise<void>
  onCancel: () => void
}

export function NetworkFormModal({
  networkToEdit,
  onSave,
  onCancel,
}: NetworkFormModalProps) {
  const { tokens } = useTheme()
  const isEditing = Boolean(networkToEdit)

  const [name, setName] = useState(networkToEdit?.name || "")
  const [rpcInput, setRpcInput] = useState(
    networkToEdit?.rpcUrls && networkToEdit.rpcUrls.length > 0
      ? networkToEdit.rpcUrls.join(", ")
      : networkToEdit?.rpcUrl || "",
  )
  const [chainIdInput, setChainIdInput] = useState(
    networkToEdit ? String(networkToEdit.chainId) : "",
  )
  const [symbol, setSymbol] = useState(networkToEdit?.symbol || "ETH")
  const [explorerUrl, setExplorerUrl] = useState(networkToEdit?.explorerUrl || "")

  const [focusedInput, setFocusedInput] = useState(0)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setErrorMessage("Network name is required")
      return
    }

    const rawUrls = rpcInput
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)

    if (rawUrls.length === 0) {
      setErrorMessage("At least one RPC Endpoint URL is required")
      return
    }

    const parsedChainId = chainIdInput.trim() ? parseInt(chainIdInput.trim(), 10) : 0
    if (chainIdInput.trim() && (isNaN(parsedChainId) || parsedChainId <= 0)) {
      setErrorMessage("Chain ID must be a positive integer if provided")
      return
    }

    try {
      setIsVerifying(true)
      setErrorMessage(null)
      await onSave({
        name: name.trim(),
        rpcUrl: rawUrls[0],
        rpcUrls: rawUrls,
        chainId: parsedChainId,
        symbol: symbol.trim() || "ETH",
        explorerUrl: explorerUrl.trim() || undefined,
      })
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save custom network")
    } finally {
      setIsVerifying(false)
    }
  }, [name, rpcInput, chainIdInput, symbol, explorerUrl, onSave])

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel()
    } else if (key.name === "return") {
      handleSave()
    } else if (key.name === "tab" || key.name === "down") {
      setFocusedInput((prev) => (prev + 1) % 5)
    } else if (key.name === "up") {
      setFocusedInput((prev) => (prev - 1 + 5) % 5)
    }
  })

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: tokens.overlay,
        zIndex: 50,
      }}
    >
      <box
        title={isEditing ? ` Edit Custom Network (${networkToEdit?.chainId}) ` : " Add Custom Network "}
        style={{
          border: true,
          borderColor: tokens.borderActive,
          
          padding: 1,
          width: 72,
          flexDirection: "column",
        }}
      >
        <box style={{ marginBottom: 1 }}>
          <text fg={tokens.primary}>
            <b>{isEditing ? "Modify EVM Network Configuration" : "Configure New Custom EVM Network"}</b>
          </text>
        </box>

        {/* 1. Network Name */}
        <box
          onMouseDown={() => setFocusedInput(0)}
          title=" Network Name "
          style={{
            border: true,
            borderColor: focusedInput === 0 ? tokens.borderActive : tokens.border,
            height: 3,
            marginBottom: 1,
          }}
        >
          <input
            placeholder="e.g. Arbitrum One, Polygon, Private Devnet"
            value={name}
            onInput={setName}
            focused={focusedInput === 0}
          />
        </box>

        {/* 2. RPC Endpoint(s) */}
        <box
          onMouseDown={() => setFocusedInput(1)}
          title=" RPC URL(s) (Comma-separated for fallback) "
          style={{
            border: true,
            borderColor: focusedInput === 1 ? tokens.borderActive : tokens.border,
            height: 3,
            marginBottom: 1,
          }}
        >
          <input
            placeholder="https://rpc1.example.com, https://rpc2.example.com"
            value={rpcInput}
            onInput={setRpcInput}
            focused={focusedInput === 1}
          />
        </box>

        {/* 3. Chain ID */}
        <box
          onMouseDown={() => setFocusedInput(2)}
          title=" Chain ID (Optional: leave blank to auto-detect) "
          style={{
            border: true,
            borderColor: focusedInput === 2 ? tokens.borderActive : tokens.border,
            height: 3,
            marginBottom: 1,
          }}
        >
          <input
            placeholder="e.g. 42161 (or leave blank to auto-detect)"
            value={chainIdInput}
            onInput={setChainIdInput}
            focused={focusedInput === 2}
          />
        </box>

        {/* 4. Currency Symbol */}
        <box
          onMouseDown={() => setFocusedInput(3)}
          title=" Currency Symbol (Default: ETH) "
          style={{
            border: true,
            borderColor: focusedInput === 3 ? tokens.borderActive : tokens.border,
            height: 3,
            marginBottom: 1,
          }}
        >
          <input
            placeholder="ETH"
            value={symbol}
            onInput={setSymbol}
            focused={focusedInput === 3}
          />
        </box>

        {/* 5. Explorer URL */}
        <box
          onMouseDown={() => setFocusedInput(4)}
          title=" Block Explorer URL (Optional) "
          style={{
            border: true,
            borderColor: focusedInput === 4 ? tokens.borderActive : tokens.border,
            height: 3,
            marginBottom: 1,
          }}
        >
          <input
            placeholder="https://etherscan.io or https://arbiscan.io"
            value={explorerUrl}
            onInput={setExplorerUrl}
            focused={focusedInput === 4}
          />
        </box>

        {/* Status / Error display */}
        {isVerifying ? (
          <box style={{ marginBottom: 1 }}>
            <text fg={tokens.warning}>⏳ Testing RPC connection and verifying Chain ID...</text>
          </box>
        ) : null}

        {errorMessage ? (
          <box style={{ marginBottom: 1 }}>
            <text fg={tokens.error}>⚠ {errorMessage}</text>
          </box>
        ) : null}

        {/* Action hints */}
        <box style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
          <box style={{ flexDirection: "row", gap: 1 }}>
            <HotkeyButton onPress={() => setFocusedInput((prev) => (prev + 1) % 5)} color={tokens.secondary}>[Tab / ↓] Next</HotkeyButton>
            <HotkeyButton onPress={handleSave} color={tokens.success}>[Enter] Test & Save</HotkeyButton>
            <HotkeyButton onPress={onCancel} color={tokens.error}>[Esc] Cancel</HotkeyButton>
          </box>
        </box>
      </box>
    </box>
  )
}
