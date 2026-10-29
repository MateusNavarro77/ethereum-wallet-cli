import { useState, useMemo } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../context.js"
import type { TokenConfig } from "../../core/types.js"
import type { TokenVerificationResult } from "../../core/interfaces.js"
import { TokenFormModal, type TokenFormData } from "./TokenFormModal.js"
import { HotkeyButton } from "./HotkeyButton.js"

export interface TokensModalProps {
  tokens: TokenConfig[]
  chainId: number
  onToggleHide: (address: `0x${string}`) => Promise<void>
  onAddToken: (token: TokenFormData) => Promise<void>
  onRemoveToken: (address: `0x${string}`) => Promise<void>
  onVerifyToken: (address: `0x${string}`) => Promise<TokenVerificationResult>
  onClose: () => void
}

const PAGE_SIZE = 8

export function TokensModal({
  tokens,
  chainId,
  onToggleHide,
  onAddToken,
  onRemoveToken,
  onVerifyToken,
  onClose,
}: TokensModalProps) {
  const { tokens: themeTokens } = useTheme()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [mode, setMode] = useState<"list" | "add" | "confirm-delete">("list")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const safeSelectedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, tokens.length - 1))
  const effectiveOffset = Math.max(
    0,
    Math.min(
      safeSelectedIndex < scrollOffset
        ? safeSelectedIndex
        : safeSelectedIndex >= scrollOffset + PAGE_SIZE
          ? safeSelectedIndex - PAGE_SIZE + 1
          : scrollOffset,
      Math.max(0, tokens.length - PAGE_SIZE),
    ),
  )

  const visibleTokens = useMemo(() => {
    return tokens.slice(effectiveOffset, effectiveOffset + PAGE_SIZE)
  }, [tokens, effectiveOffset])

  const selectedToken = tokens[safeSelectedIndex]

  const handleToggleHide = async () => {
    if (!selectedToken) return
    try {
      setErrorMessage(null)
      await onToggleHide(selectedToken.address)
      setStatusMessage(
        selectedToken.hidden
          ? `✔ Token ${selectedToken.symbol} unhidden!`
          : `✔ Token ${selectedToken.symbol} hidden from dashboard view.`,
      )
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to toggle visibility")
    }
  }

  const handleDelete = () => {
    if (!selectedToken) return
    if (selectedToken.isPreset) {
      setErrorMessage("Preset tokens cannot be removed. You can hide them instead.")
      return
    }
    setMode("confirm-delete")
  }

  const confirmDelete = async () => {
    if (!selectedToken) return
    try {
      setErrorMessage(null)
      await onRemoveToken(selectedToken.address)
      setStatusMessage(`✔ Token ${selectedToken.symbol} removed!`)
      setMode("list")
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete token")
      setMode("list")
    }
  }

  useKeyboard((key) => {
    if (mode === "confirm-delete") {
      if (key.name === "escape" || key.name === "n" || key.sequence?.toLowerCase() === "n") {
        setMode("list")
      } else if (key.name === "return" || key.name === "y" || key.sequence?.toLowerCase() === "y") {
        confirmDelete()
      }
      return
    }

    if (mode !== "list") return

    if (key.name === "escape") {
      onClose()
    } else if (key.name === "up") {
      setSelectedIndex((prev) => {
        const next = Math.max(0, prev - 1)
        if (next < scrollOffset) setScrollOffset(next)
        return next
      })
      setStatusMessage(null)
      setErrorMessage(null)
    } else if (key.name === "down") {
      setSelectedIndex((prev) => {
        const next = Math.min(tokens.length - 1, prev + 1)
        if (next >= scrollOffset + PAGE_SIZE) setScrollOffset(next - PAGE_SIZE + 1)
        return next
      })
      setStatusMessage(null)
      setErrorMessage(null)
    } else if (key.name === "h" || key.sequence?.toLowerCase() === "h") {
      handleToggleHide()
    } else if (key.name === "a" || key.sequence?.toLowerCase() === "a") {
      setMode("add")
      setStatusMessage(null)
      setErrorMessage(null)
    } else if (key.name === "d" || key.sequence?.toLowerCase() === "d") {
      handleDelete()
    }
  })

  if (mode === "add") {
    return (
      <TokenFormModal
        onVerify={onVerifyToken}
        onSubmit={async (data) => {
          await onAddToken(data)
          setStatusMessage(`✔ Token ${data.symbol} added successfully!`)
          setMode("list")
        }}
        onClose={() => setMode("list")}
      />
    )
  }

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor={themeTokens.borderActive}
      backgroundColor={themeTokens.card}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      width={78}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={themeTokens.primary}>
          <b>🪙 Tracked ERC-20 Tokens (Chain {chainId})</b>
        </text>
        <text fg={themeTokens.textMuted}>
          {tokens.length} {tokens.length === 1 ? "token" : "tokens"}
        </text>
      </box>

      {statusMessage && (
        <text fg={themeTokens.success} marginBottom={1}>
          {statusMessage}
        </text>
      )}
      {errorMessage && (
        <text fg={themeTokens.error} marginBottom={1}>
          ✖ {errorMessage}
        </text>
      )}

      {mode === "confirm-delete" && selectedToken && (
        <box borderStyle="single" borderColor={themeTokens.error} padding={1} flexDirection="column" marginBottom={1} backgroundColor={themeTokens.surface}>
          <text fg={themeTokens.error}>
            <b>Delete Token {selectedToken.symbol}?</b>
          </text>
          <text fg={themeTokens.text}>
            Are you sure you want to remove {selectedToken.name} ({selectedToken.address})?
          </text>
          <box marginTop={1} flexDirection="row" gap={2}>
            <HotkeyButton onPress={confirmDelete} color={themeTokens.error}><b>[Enter / Y] Confirm Delete</b></HotkeyButton>
            <HotkeyButton onPress={() => setMode("list")} color={themeTokens.textMuted}>[Esc / N] Cancel</HotkeyButton>
          </box>
        </box>
      )}

      <box flexDirection="column">
        {visibleTokens.length === 0 ? (
          <box style={{ flexDirection: "row", gap: 1 }}><text fg={themeTokens.textSubtle}>No tokens tracked on this chain yet.</text><HotkeyButton onPress={() => { setMode("add"); setStatusMessage(null); setErrorMessage(null) }} color={themeTokens.success}>[A] Add Token</HotkeyButton></box>
        ) : (
          visibleTokens.map((token, index) => {
            const actualIndex = effectiveOffset + index
            const isSelected = actualIndex === safeSelectedIndex

            return (
              <box
                key={`${token.chainId}-${token.address}`}
                onMouseOver={() => setSelectedIndex(actualIndex)}
                onMouseDown={() => setSelectedIndex(actualIndex)}
                flexDirection="row"
                justifyContent="space-between"
                backgroundColor={isSelected ? themeTokens.selectionBg : undefined}
                paddingLeft={1}
                paddingRight={1}
              >
                <box flexDirection="row" gap={1}>
                  <text fg={isSelected ? themeTokens.selectionFg : themeTokens.textSubtle}>
                    {isSelected ? ">" : " "}
                  </text>
                  <text fg={token.hidden ? themeTokens.textSubtle : isSelected ? themeTokens.selectionFg : themeTokens.text}>
                    <b>{token.symbol}</b>
                  </text>
                  <text fg={isSelected ? themeTokens.selectionFg : themeTokens.textMuted}>
                    ({token.name.length > 16 ? token.name.slice(0, 16) + "..." : token.name})
                  </text>
                  <text fg={isSelected ? themeTokens.selectionFg : token.isPreset ? themeTokens.accent : themeTokens.secondary}>
                    {token.isPreset ? "[Preset]" : "[Custom]"}
                  </text>
                </box>

                <box flexDirection="row" gap={1}>
                  <text fg={token.hidden ? themeTokens.error : themeTokens.success}>
                    {token.hidden ? "[Hidden]" : "[Active]"}
                  </text>
                  <text fg={isSelected ? themeTokens.selectionFg : themeTokens.textSubtle}>
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </text>
                </box>
              </box>
            )
          })
        )}
      </box>

      {tokens.length > PAGE_SIZE && (
        <box marginTop={1} justifyContent="center">
          <text fg={themeTokens.textSubtle}>
            ▲ ▼ Showing {effectiveOffset + 1}-{Math.min(effectiveOffset + PAGE_SIZE, tokens.length)} of {tokens.length}
          </text>
        </box>
      )}

      <box marginTop={1} paddingTop={1} borderStyle="single" borderColor={themeTokens.borderSubtle} flexDirection="row" gap={2}>
        <HotkeyButton onPress={() => { setMode("add"); setStatusMessage(null); setErrorMessage(null) }} color={themeTokens.success}>[A] Add Token</HotkeyButton>
        <HotkeyButton onPress={handleToggleHide} color={themeTokens.warning}>[H] Hide/Unhide</HotkeyButton>
        <HotkeyButton onPress={handleDelete} color={themeTokens.error}>[D] Delete</HotkeyButton>
        <HotkeyButton onPress={onClose} color={themeTokens.textMuted}>[Esc] Close</HotkeyButton>
      </box>
    </box>
  )
}
