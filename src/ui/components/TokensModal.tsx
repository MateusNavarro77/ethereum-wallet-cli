import { useState, useMemo } from "react"
import { useKeyboard } from "@opentui/react"
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
          ? `✔ Token ${selectedToken.symbol} unhidden`
          : `✔ Token ${selectedToken.symbol} hidden`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
    }
  }

  const handleDelete = async () => {
    if (!selectedToken) return
    if (selectedToken.isPreset) {
      setErrorMessage("Preset tokens cannot be deleted. Press [H] to hide instead.")
      return
    }
    setMode("confirm-delete")
  }

  const confirmDelete = async () => {
    if (!selectedToken) return
    try {
      setErrorMessage(null)
      await onRemoveToken(selectedToken.address)
      setStatusMessage(`✔ Token ${selectedToken.symbol} deleted`)
      setMode("list")
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
      setMode("list")
    }
  }

  useKeyboard((key) => {
    if (mode === "add") return

    if (mode === "confirm-delete") {
      if (key.name === "return" || key.name === "y") {
        confirmDelete()
      } else if (key.name === "escape" || key.name === "n") {
        setMode("list")
      }
      return
    }

    if (key.name === "escape") {
      onClose()
      return
    }

    if (key.name === "up" || key.name === "k") {
      setSelectedIndex((prev) => {
        const next = Math.max(0, prev - 1)
        if (next < scrollOffset) setScrollOffset(next)
        return next
      })
      setStatusMessage(null)
      setErrorMessage(null)
    } else if (key.name === "down" || key.name === "j") {
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
      borderColor="#8B5CF6"
      backgroundColor="#090d16"
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      width={78}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg="#C084FC">
          <b>🪙 Tracked ERC-20 Tokens (Chain {chainId})</b>
        </text>
        <text fg="#9CA3AF">
          {tokens.length} {tokens.length === 1 ? "token" : "tokens"}
        </text>
      </box>

      {statusMessage && (
        <text fg="#34D399" marginBottom={1}>
          {statusMessage}
        </text>
      )}
      {errorMessage && (
        <text fg="#EF4444" marginBottom={1}>
          ✖ {errorMessage}
        </text>
      )}

      {mode === "confirm-delete" && selectedToken && (
        <box borderStyle="single" borderColor="#EF4444" padding={1} flexDirection="column" marginBottom={1}>
          <text fg="#EF4444">
            <b>Delete Token {selectedToken.symbol}?</b>
          </text>
          <text fg="#F3F4F6">
            Are you sure you want to remove {selectedToken.name} ({selectedToken.address})?
          </text>
          <box marginTop={1} flexDirection="row" gap={2}>
            <HotkeyButton onPress={confirmDelete} color="#EF4444"><b>[Enter / Y] Confirm Delete</b></HotkeyButton>
            <HotkeyButton onPress={() => setMode("list")} color="#9CA3AF">[Esc / N] Cancel</HotkeyButton>
          </box>
        </box>
      )}

      <box flexDirection="column">
        {visibleTokens.length === 0 ? (
          <box style={{ flexDirection: "row", gap: 1 }}><text fg="#6B7280">No tokens tracked on this chain yet.</text><HotkeyButton onPress={() => { setMode("add"); setStatusMessage(null); setErrorMessage(null) }} color="#34D399">[A] Add Token</HotkeyButton></box>
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
                backgroundColor={isSelected ? "#1E1B4B" : undefined}
                paddingLeft={1}
                paddingRight={1}
              >
                <box flexDirection="row" gap={1}>
                  <text fg={isSelected ? "#38BDF8" : "#6B7280"}>
                    {isSelected ? ">" : " "}
                  </text>
                  <text fg={token.hidden ? "#6B7280" : isSelected ? "#F3F4F6" : "#E5E7EB"}>
                    <b>{token.symbol}</b>
                  </text>
                  <text fg="#9CA3AF">
                    ({token.name.length > 16 ? token.name.slice(0, 16) + "..." : token.name})
                  </text>
                  <text fg={token.isPreset ? "#C084FC" : "#60A5FA"}>
                    {token.isPreset ? "[Preset]" : "[Custom]"}
                  </text>
                </box>

                <box flexDirection="row" gap={1}>
                  <text fg={token.hidden ? "#EF4444" : "#34D399"}>
                    {token.hidden ? "[Hidden]" : "[Active]"}
                  </text>
                  <text fg="#6B7280">
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
          <text fg="#6B7280">
            ▲ ▼ Showing {effectiveOffset + 1}-{Math.min(effectiveOffset + PAGE_SIZE, tokens.length)} of {tokens.length}
          </text>
        </box>
      )}

      <box marginTop={1} paddingTop={1} borderStyle="single" borderColor="#374151" flexDirection="row" gap={2}>
        <HotkeyButton onPress={() => { setMode("add"); setStatusMessage(null); setErrorMessage(null) }} color="#34D399">[A] Add Token</HotkeyButton>
        <HotkeyButton onPress={handleToggleHide} color="#FBBF24">[H] Hide/Unhide</HotkeyButton>
        <HotkeyButton onPress={handleDelete} color="#EF4444">[D] Delete</HotkeyButton>
        <HotkeyButton onPress={onClose} color="#9CA3AF">[Esc] Close</HotkeyButton>
      </box>
    </box>
  )
}

