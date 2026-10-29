import { useState, useEffect } from "react"
import { useKeyboard } from "@opentui/react"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { useTheme } from "../context.js"
import type {
  Account,
  HdAccount,
  ImportedAccount,
  WalletData,
  WatchOnlyAccount,
} from "../../core/types.js"
import { ExportModal } from "./ExportModal.js"
import { HotkeyButton } from "./HotkeyButton.js"

export interface AccountsModalProps {
  wallet: WalletData
  activeAccount: Account
  onSelectAccount: (address: `0x${string}`) => void
  onAddDerived: (label?: string) => Promise<HdAccount>
  onImportPrivateKey: (privateKey: string, label: string) => Promise<ImportedAccount>
  onImportKeystore: (
    json: string,
    keystorePass: string,
    label: string,
  ) => Promise<ImportedAccount>
  onAddWatchOnly: (address: string, label: string) => Promise<WatchOnlyAccount>
  onRename: (address: `0x${string}`, newLabel: string) => Promise<void>
  onToggleHide: (address: `0x${string}`) => Promise<void>
  onRemove: (address: `0x${string}`) => Promise<void>
  onExportPrivateKey: (address: `0x${string}`, passwordAttempt: string) => Promise<`0x${string}`>
  onExportMnemonic: (passwordAttempt: string) => Promise<string>
  onClose: () => void
}

type ModalMode =
  | "list"
  | "rename"
  | "import-menu"
  | "import-privkey"
  | "import-keystore"
  | "import-watchonly"
  | "confirm-remove"
  | "exporting"

export function AccountsModal({
  wallet,
  activeAccount,
  onSelectAccount,
  onAddDerived,
  onImportPrivateKey,
  onImportKeystore,
  onAddWatchOnly,
  onRename,
  onToggleHide,
  onRemove,
  onExportPrivateKey,
  onExportMnemonic,
  onClose,
}: AccountsModalProps) {
  const { tokens } = useTheme()
  const PAGE_SIZE = 8
  const [mode, setMode] = useState<ModalMode>("list")
  const accounts = wallet.accounts

  const initialActiveIndex = accounts.findIndex(
    (acc) => acc.address.toLowerCase() === activeAccount.address.toLowerCase(),
  )
  const [selectedIndex, setSelectedIndex] = useState(
    initialActiveIndex >= 0 ? initialActiveIndex : 0,
  )
  const [scrollOffset, setScrollOffset] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [statusMessage, setStatusMessage] = useState("")

  // Form states
  const [renameInput, setRenameInput] = useState("")
  const [inputField1, setInputField1] = useState("")
  const [inputField2, setInputField2] = useState("")
  const [inputField3, setInputField3] = useState("")
  const [focusedInput, setFocusedInput] = useState(0)
  const [removeConfirmation, setRemoveConfirmation] = useState("")

  // Export state
  const [exportTarget, setExportTarget] = useState<{
    type: "private-key" | "mnemonic"
    title: string
    address?: `0x${string}`
  } | null>(null)

  const safeSelectedIndex = Math.min(
    Math.max(0, selectedIndex),
    Math.max(0, accounts.length - 1),
  )
  const currentAccount = accounts[safeSelectedIndex] || accounts[0]

  const effectiveOffset = Math.max(
    0,
    Math.min(
      safeSelectedIndex < scrollOffset
        ? safeSelectedIndex
        : safeSelectedIndex >= scrollOffset + PAGE_SIZE
          ? safeSelectedIndex - PAGE_SIZE + 1
          : scrollOffset,
      Math.max(0, accounts.length - PAGE_SIZE),
    ),
  )

  useEffect(() => {
    if (effectiveOffset !== scrollOffset) {
      setScrollOffset(effectiveOffset)
    }
  }, [effectiveOffset, scrollOffset])

  const visibleAccounts = accounts.slice(
    effectiveOffset,
    effectiveOffset + PAGE_SIZE,
  )
  const hasMoreAbove = effectiveOffset > 0
  const hasMoreBelow = effectiveOffset + PAGE_SIZE < accounts.length

  const resolveBadge = (acc: Account) => {
    if (acc.type === "hd") {
      return `[HD-${acc.index}]`
    } else if (acc.type === "imported") {
      return `[Imported]`
    } else {
      return `[Watch-Only]`
    }
  }

  // --- Handlers ---
  const handleNextDerived = async () => {
    try {
      setErrorMessage("")
      setStatusMessage("Deriving next HD account...")
      const created = await onAddDerived()
      setStatusMessage(`Added ${created.label} (${created.address.slice(0, 8)}...)`)
      setSelectedIndex(accounts.length) // select new
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to derive account")
    }
  }

  const handleStartRename = () => {
    if (!currentAccount) return
    setRenameInput(currentAccount.label)
    setErrorMessage("")
    setMode("rename")
  }

  const handleSaveRename = async () => {
    if (!currentAccount || !renameInput.trim()) return
    try {
      setErrorMessage("")
      await onRename(currentAccount.address, renameInput.trim())
      setMode("list")
      setStatusMessage(`Renamed to "${renameInput.trim()}"`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to rename account")
    }
  }

  const handleToggleHide = async () => {
    if (!currentAccount) return
    try {
      setErrorMessage("")
      await onToggleHide(currentAccount.address)
      setStatusMessage(`Toggled visibility for ${currentAccount.label}`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to toggle visibility")
    }
  }

  const handleStartRemove = () => {
    if (!currentAccount) return
    if (currentAccount.type === "hd") {
      setErrorMessage("HD derived accounts cannot be removed. Use [H] to hide.")
      return
    }
    setRemoveConfirmation("")
    setErrorMessage("")
    setMode("confirm-remove")
  }

  const handleConfirmRemove = async () => {
    if (!currentAccount) return
    if (removeConfirmation !== "REMOVE") {
      setErrorMessage("Please type REMOVE to confirm account removal")
      return
    }
    try {
      setErrorMessage("")
      await onRemove(currentAccount.address)
      setSelectedIndex(Math.max(0, selectedIndex - 1))
      setMode("list")
      setStatusMessage("Account permanently removed from wallet")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to remove account")
    }
  }

  const handleSavePrivateKey = async () => {
    try {
      setErrorMessage("")
      setStatusMessage("Importing private key...")
      const res = await onImportPrivateKey(inputField1, inputField2)
      setMode("list")
      setStatusMessage(`Imported ${res.label} successfully!`)
      setSelectedIndex(accounts.length)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to import private key")
    }
  }

  const handleSaveKeystore = async () => {
    try {
      setErrorMessage("")
      setStatusMessage("Decrypting and importing keystore...")
      let content = inputField1.trim()
      if (!content.startsWith("{")) {
        // Read from file path
        const resolved = content.startsWith("~")
          ? path.join(os.homedir(), content.slice(1))
          : path.resolve(content)
        content = fs.readFileSync(resolved, "utf8")
      }
      const res = await onImportKeystore(content, inputField2, inputField3)
      setMode("list")
      setStatusMessage(`Imported keystore ${res.label} successfully!`)
      setSelectedIndex(accounts.length)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to import keystore")
    }
  }

  const handleSaveWatchOnly = async () => {
    try {
      setErrorMessage("")
      const res = await onAddWatchOnly(inputField1, inputField2)
      setMode("list")
      setStatusMessage(`Added watch-only account ${res.label}`)
      setSelectedIndex(accounts.length)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to add watch-only account")
    }
  }

  useKeyboard((key) => {
    if (mode === "exporting") return // Handled by ExportModal

    if (mode === "list") {
      if (key.name === "escape") {
        onClose()
      } else if (key.name === "up") {
        setSelectedIndex((prev) => Math.max(0, prev - 1))
      } else if (key.name === "down") {
        setSelectedIndex((prev) => Math.min(accounts.length - 1, prev + 1))
      } else if (key.name === "pageup") {
        setSelectedIndex((prev) => Math.max(0, prev - PAGE_SIZE))
      } else if (key.name === "pagedown") {
        setSelectedIndex((prev) => Math.min(accounts.length - 1, prev + PAGE_SIZE))
      } else if (key.name === "home") {
        setSelectedIndex(0)
      } else if (key.name === "end") {
        setSelectedIndex(Math.max(0, accounts.length - 1))
      } else if (key.name === "return") {
        if (currentAccount && !currentAccount.hidden) {
          onSelectAccount(currentAccount.address)
          onClose()
        }
      } else if (key.name === "n" || key.name === "N") {
        handleNextDerived()
      } else if (key.name === "r" || key.name === "R") {
        handleStartRename()
      } else if (key.name === "h" || key.name === "H") {
        handleToggleHide()
      } else if (key.name === "d" || key.name === "D") {
        handleStartRemove()
      } else if (key.name === "i" || key.name === "I") {
        setErrorMessage("")
        setMode("import-menu")
      } else if (key.name === "e" || key.name === "E") {
        if (!currentAccount) return
        if (currentAccount.type === "watch-only") {
          setErrorMessage("Cannot export private key: this is a watch-only account")
          return
        }
        setExportTarget({
          type: "private-key",
          title: `Export Private Key for ${currentAccount.label}`,
          address: currentAccount.address,
        })
        setMode("exporting")
      } else if (key.name === "m" || key.name === "M") {
        if (!wallet.mnemonic) {
          setErrorMessage("This wallet does not have a mnemonic seed phrase")
          return
        }
        setExportTarget({
          type: "mnemonic",
          title: "Export Master Recovery Phrase",
        })
        setMode("exporting")
      }
    } else if (mode === "rename") {
      if (key.name === "escape") {
        setMode("list")
      } else if (key.name === "return") {
        handleSaveRename()
      }
    } else if (mode === "import-menu") {
      if (key.name === "escape") {
        setMode("list")
      } else if (key.name === "1") {
        setInputField1("")
        setInputField2("")
        setFocusedInput(0)
        setMode("import-privkey")
      } else if (key.name === "2") {
        setInputField1("")
        setInputField2("")
        setInputField3("")
        setFocusedInput(0)
        setMode("import-keystore")
      } else if (key.name === "3") {
        setInputField1("")
        setInputField2("")
        setFocusedInput(0)
        setMode("import-watchonly")
      }
    } else if (mode === "import-privkey") {
      if (key.name === "escape") {
        setMode("import-menu")
      } else if (key.name === "tab") {
        setFocusedInput((prev) => (prev + 1) % 2)
      } else if (key.name === "return") {
        if (focusedInput === 1) handleSavePrivateKey()
        else setFocusedInput(1)
      }
    } else if (mode === "import-keystore") {
      if (key.name === "escape") {
        setMode("import-menu")
      } else if (key.name === "tab") {
        setFocusedInput((prev) => (prev + 1) % 3)
      } else if (key.name === "return") {
        if (focusedInput === 2) handleSaveKeystore()
        else setFocusedInput(focusedInput + 1)
      }
    } else if (mode === "import-watchonly") {
      if (key.name === "escape") {
        setMode("import-menu")
      } else if (key.name === "tab") {
        setFocusedInput((prev) => (prev + 1) % 2)
      } else if (key.name === "return") {
        if (focusedInput === 1) handleSaveWatchOnly()
        else setFocusedInput(1)
      }
    } else if (mode === "confirm-remove") {
      if (key.name === "escape") {
        setMode("list")
      } else if (key.name === "return") {
        handleConfirmRemove()
      }
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
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tokens.overlay,
        zIndex: 50,
      }}
    >
      {mode === "exporting" && exportTarget && (
        <ExportModal
          title={exportTarget.title}
          sensitiveType={exportTarget.type}
          address={exportTarget.address}
          onExport={(pass) =>
            exportTarget.type === "mnemonic"
              ? onExportMnemonic(pass)
              : onExportPrivateKey(exportTarget.address!, pass)
          }
          onClose={() => {
            setExportTarget(null)
            setMode("list")
          }}
        />
      )}

      <box
        style={{
          width: 78,
          border: true,
          borderColor: tokens.borderActive,
          backgroundColor: tokens.card,
          padding: 1,
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
          <text fg={tokens.primary}>
            <b>Account Manager & Portfolio</b>
          </text>
          <box style={{ flexDirection: "row", gap: 1 }}>
            <text fg={tokens.textMuted}>
              {accounts.length} Account{accounts.length > 1 ? "s" : ""}
              {accounts.length > PAGE_SIZE
                ? ` (${effectiveOffset + 1}-${Math.min(accounts.length, effectiveOffset + PAGE_SIZE)} of ${accounts.length})`
                : ""}
            </text>
            <HotkeyButton onPress={onClose} color={tokens.textMuted}>[Esc] Close</HotkeyButton>
          </box>
        </box>

        {/* List Mode */}
        {mode === "list" && (
          <>
            <box
              title={
                accounts.length > PAGE_SIZE
                  ? ` Accounts [${safeSelectedIndex + 1}/${accounts.length}] ${hasMoreAbove ? "▲" : " "} ${hasMoreBelow ? "▼" : " "} [↑/↓ Navigate] `
                  : " Accounts "
              }
              style={{
                border: true,
                borderColor: tokens.border,
                backgroundColor: tokens.surface,
                paddingX: 1,
                paddingY: 0,
                flexDirection: "column",
                marginBottom: 1,
                height: Math.max(3, Math.min(accounts.length, PAGE_SIZE) + 2),
              }}
            >
              {visibleAccounts.map((acc, i) => {
                const originalIndex = effectiveOffset + i
                const isSelected = originalIndex === safeSelectedIndex
                const isActive = acc.address.toLowerCase() === activeAccount.address.toLowerCase()
                const badge = resolveBadge(acc)

                return (
                  <box
                    key={acc.address}
                    onMouseOver={() => setSelectedIndex(originalIndex)}
                    onMouseDown={() => {
                      setSelectedIndex(originalIndex)
                      if (!acc.hidden) { onSelectAccount(acc.address); onClose() }
                    }}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      backgroundColor: isSelected ? tokens.selectionBg : "transparent",
                    }}
                  >
                    <box style={{ flexDirection: "row" }}>
                      <text fg={isSelected ? tokens.selectionFg : tokens.textMuted}>
                        {isSelected ? "▶ " : "  "}
                      </text>
                      <text fg={isSelected ? tokens.selectionFg : tokens.warning}>
                        <b>{badge} </b>
                      </text>
                      <text fg={acc.hidden ? tokens.textSubtle : isSelected ? tokens.selectionFg : tokens.text}>
                        <b>{acc.label} </b>
                      </text>
                      <text fg={isSelected ? tokens.selectionFg : tokens.textSubtle}>
                        ({acc.address.slice(0, 6)}...{acc.address.slice(-4)})
                      </text>
                    </box>

                    <box style={{ flexDirection: "row", gap: 1 }}>
                      {acc.hidden ? <text fg={tokens.error}>[Hidden]</text> : null}
                      {isActive ? <text fg={isSelected ? tokens.selectionFg : tokens.success}><b>[Active]</b></text> : null}
                    </box>
                  </box>
                )
              })}
            </box>

            {statusMessage ? (
              <box style={{ marginBottom: 1 }}>
                <text fg={tokens.success}>✔ {statusMessage}</text>
              </box>
            ) : null}

            {errorMessage ? (
              <box style={{ marginBottom: 1 }}>
                <text fg={tokens.error}>⚠ {errorMessage}</text>
              </box>
            ) : null}

            {/* Hotkeys Bar */}
            <box style={{ flexDirection: "column", border: true, borderColor: tokens.borderSubtle, padding: 1, backgroundColor: tokens.surface }}>
              <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
                <HotkeyButton onPress={() => { if (currentAccount && !currentAccount.hidden) { onSelectAccount(currentAccount.address); onClose() } }} color={tokens.success}>[Enter] Switch Active</HotkeyButton>
                <HotkeyButton onPress={handleNextDerived} color={tokens.secondary}>[N] Add Next Derived</HotkeyButton>
                <HotkeyButton onPress={handleStartRename} color={tokens.primary}>[R] Rename</HotkeyButton>
                <HotkeyButton onPress={() => { setErrorMessage(""); setMode("import-menu") }} color={tokens.accent}>[I] Import Account</HotkeyButton>
              </box>
              <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <HotkeyButton onPress={handleToggleHide} color={tokens.warning}>[H] Hide/Unhide</HotkeyButton>
                <HotkeyButton onPress={handleStartRemove} color={tokens.error}>[D] Remove Account</HotkeyButton>
                <HotkeyButton onPress={() => { if (!currentAccount) return; if (currentAccount.type === "watch-only") { setErrorMessage("Cannot export private key: this is a watch-only account"); return } setExportTarget({ type: "private-key", title: `Export Private Key for ${currentAccount.label}`, address: currentAccount.address }); setMode("exporting") }} color={tokens.warning}>[E] Export Key</HotkeyButton>
                <HotkeyButton onPress={() => { if (!wallet.mnemonic) { setErrorMessage("This wallet does not have a mnemonic seed phrase"); return } setExportTarget({ type: "mnemonic", title: "Export Master Recovery Phrase" }); setMode("exporting") }} color={tokens.warning}>[M] Export Seed</HotkeyButton>
              </box>
            </box>
          </>
        )}

        {/* Rename Mode */}
        {mode === "rename" && currentAccount && (
          <box style={{ flexDirection: "column", padding: 1 }}>
            <box style={{ marginBottom: 1 }}>
              <text fg={tokens.warning}>Rename Account: {currentAccount.address}</text>
            </box>
            <box title=" New Account Label " style={{ border: true, borderColor: tokens.borderActive, height: 3, marginBottom: 1 }}>
              <input
                value={renameInput}
                onInput={setRenameInput}
                onSubmit={handleSaveRename}
                focused={true}
              />
            </box>
            {errorMessage ? <text fg={tokens.error}>⚠ {errorMessage}</text> : null}
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
              <HotkeyButton onPress={handleSaveRename} color={tokens.success}>[Enter] Save Label</HotkeyButton>
              <HotkeyButton onPress={() => setMode("list")} color={tokens.textMuted}>[Esc] Cancel</HotkeyButton>
            </box>
          </box>
        )}

        {/* Import Menu */}
        {mode === "import-menu" && (
          <box style={{ flexDirection: "column", padding: 1 }}>
            <box style={{ marginBottom: 1 }}>
              <text fg={tokens.primary}><b>Select Import Method:</b></text>
            </box>
            <box style={{ border: true, borderColor: tokens.border, backgroundColor: tokens.surface, padding: 1, flexDirection: "column", marginBottom: 1 }}>
              <box style={{ marginBottom: 1 }}>
                <HotkeyButton onPress={() => { setInputField1(""); setInputField2(""); setMode("import-privkey") }} color={tokens.success}><b>[1] Import Raw Private Key</b></HotkeyButton>
                <text fg={tokens.textMuted}> - Enter 32-byte hex private key (FR-ACC-04)</text>
              </box>
              <box style={{ marginBottom: 1 }}>
                <HotkeyButton onPress={() => { setInputField1(""); setInputField2(""); setInputField3(""); setMode("import-keystore") }} color={tokens.secondary}><b>[2] Import Web3 JSON Keystore File</b></HotkeyButton>
                <text fg={tokens.textMuted}> - File path or JSON string with password (FR-ACC-05)</text>
              </box>
              <box>
                <HotkeyButton onPress={() => { setInputField1(""); setInputField2(""); setMode("import-watchonly") }} color={tokens.warning}><b>[3] Add Watch-Only Account</b></HotkeyButton>
                <text fg={tokens.textMuted}> - Address only, tracking without signing (FR-ACC-08)</text>
              </box>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={tokens.textMuted}>Press [1], [2], or [3]</text>
              <HotkeyButton onPress={() => setMode("list")} color={tokens.textMuted}>[Esc] Back to Accounts</HotkeyButton>
            </box>
          </box>
        )}

        {/* Import Raw Private Key */}
        {mode === "import-privkey" && (
          <box style={{ flexDirection: "column", padding: 1 }}>
            <box style={{ marginBottom: 1 }}>
              <text fg={tokens.success}><b>Import Raw Private Key (FR-ACC-04)</b></text>
            </box>
            <box onMouseDown={() => setFocusedInput(0)} title=" 32-Byte Hex Private Key (0x...) " style={{ border: true, borderColor: focusedInput === 0 ? tokens.borderActive : tokens.border, height: 3, marginBottom: 1 }}>
              <input
                placeholder="0x..."
                value={inputField1}
                onInput={setInputField1}
                focused={focusedInput === 0}
              />
            </box>
            <box onMouseDown={() => setFocusedInput(1)} title=" Account Label " style={{ border: true, borderColor: focusedInput === 1 ? tokens.borderActive : tokens.border, height: 3, marginBottom: 1 }}>
              <input
                placeholder="e.g. My Imported Dev Key"
                value={inputField2}
                onInput={setInputField2}
                focused={focusedInput === 1}
              />
            </box>
            {errorMessage ? <text fg={tokens.error}>⚠ {errorMessage}</text> : null}
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
              <box style={{ flexDirection: "row", gap: 1 }}><HotkeyButton onPress={() => setFocusedInput((prev) => (prev + 1) % 2)} color={tokens.secondary}>[Tab] Switch Field</HotkeyButton><HotkeyButton onPress={handleSavePrivateKey} color={tokens.success}>[Enter] Import Key</HotkeyButton><HotkeyButton onPress={() => setMode("import-menu")} color={tokens.textMuted}>[Esc] Back</HotkeyButton></box>
            </box>
          </box>
        )}

        {/* Import JSON Keystore */}
        {mode === "import-keystore" && (
          <box style={{ flexDirection: "column", padding: 1 }}>
            <box style={{ marginBottom: 1 }}>
              <text fg={tokens.primary}><b>Import Web3 Keystore File (FR-ACC-05)</b></text>
            </box>
            <box onMouseDown={() => setFocusedInput(0)} title=" File Path (e.g. ~/.ethereum/keystore/... or paste JSON) " style={{ border: true, borderColor: focusedInput === 0 ? tokens.borderActive : tokens.border, height: 3, marginBottom: 1 }}>
              <input
                placeholder="/path/to/keystore.json"
                value={inputField1}
                onInput={setInputField1}
                focused={focusedInput === 0}
              />
            </box>
            <box onMouseDown={() => setFocusedInput(1)} title=" Keystore Decryption Password " style={{ border: true, borderColor: focusedInput === 1 ? tokens.borderActive : tokens.border, height: 3, marginBottom: 1 }}>
              <input
                placeholder="Keystore password..."
                value={inputField2}
                onInput={setInputField2}
                focused={focusedInput === 1}
              />
            </box>
            <box onMouseDown={() => setFocusedInput(2)} title=" Account Label " style={{ border: true, borderColor: focusedInput === 2 ? tokens.borderActive : tokens.border, height: 3, marginBottom: 1 }}>
              <input
                placeholder="e.g. Geth Imported Account"
                value={inputField3}
                onInput={setInputField3}
                focused={focusedInput === 2}
              />
            </box>
            {errorMessage ? <text fg={tokens.error}>⚠ {errorMessage}</text> : null}
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
              <box style={{ flexDirection: "row", gap: 1 }}><HotkeyButton onPress={() => setFocusedInput((prev) => (prev + 1) % 3)} color={tokens.secondary}>[Tab] Switch Field</HotkeyButton><HotkeyButton onPress={handleSaveKeystore} color={tokens.success}>[Enter] Decrypt & Import</HotkeyButton><HotkeyButton onPress={() => setMode("import-menu")} color={tokens.textMuted}>[Esc] Back</HotkeyButton></box>
            </box>
          </box>
        )}

        {/* Add Watch-Only Account */}
        {mode === "import-watchonly" && (
          <box style={{ flexDirection: "column", padding: 1 }}>
            <box style={{ marginBottom: 1 }}>
              <text fg={tokens.warning}><b>Add Watch-Only Account (FR-ACC-08)</b></text>
            </box>
            <box onMouseDown={() => setFocusedInput(0)} title=" Ethereum Address (0x...) " style={{ border: true, borderColor: focusedInput === 0 ? tokens.borderActive : tokens.border, height: 3, marginBottom: 1 }}>
              <input
                placeholder="0x..."
                value={inputField1}
                onInput={setInputField1}
                focused={focusedInput === 0}
              />
            </box>
            <box onMouseDown={() => setFocusedInput(1)} title=" Account Label " style={{ border: true, borderColor: focusedInput === 1 ? tokens.borderActive : tokens.border, height: 3, marginBottom: 1 }}>
              <input
                placeholder="e.g. Treasury Watcher"
                value={inputField2}
                onInput={setInputField2}
                focused={focusedInput === 1}
              />
            </box>
            {errorMessage ? <text fg={tokens.error}>⚠ {errorMessage}</text> : null}
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
              <box style={{ flexDirection: "row", gap: 1 }}><HotkeyButton onPress={() => setFocusedInput((prev) => (prev + 1) % 2)} color={tokens.secondary}>[Tab] Switch Field</HotkeyButton><HotkeyButton onPress={handleSaveWatchOnly} color={tokens.success}>[Enter] Add Watch-Only</HotkeyButton><HotkeyButton onPress={() => setMode("import-menu")} color={tokens.textMuted}>[Esc] Back</HotkeyButton></box>
            </box>
          </box>
        )}

        {/* Confirm Remove */}
        {mode === "confirm-remove" && currentAccount && (
          <box style={{ flexDirection: "column", padding: 1 }}>
            <box style={{ border: true, borderColor: tokens.error, backgroundColor: tokens.surface, padding: 1, marginBottom: 1, flexDirection: "column" }}>
              <text fg={tokens.error}><b>REMOVE ACCOUNT CONFIRMATION</b></text>
              <text fg={tokens.text}>
                You are about to remove "{currentAccount.label}" ({currentAccount.address}).
              </text>
              <text fg={tokens.textMuted}>
                If this is an imported key and you do not have a backup, the funds will be permanently lost!
              </text>
            </box>
            <box title=" Type 'REMOVE' to confirm " style={{ border: true, borderColor: tokens.error, height: 3, marginBottom: 1 }}>
              <input
                value={removeConfirmation}
                onInput={setRemoveConfirmation}
                onSubmit={handleConfirmRemove}
                focused={true}
              />
            </box>
            {errorMessage ? <text fg={tokens.error}>⚠ {errorMessage}</text> : null}
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
              <HotkeyButton onPress={handleConfirmRemove} color={tokens.error}>[Enter] Permanently Remove</HotkeyButton>
              <HotkeyButton onPress={() => setMode("list")} color={tokens.textMuted}>[Esc] Cancel</HotkeyButton>
            </box>
          </box>
        )}
      </box>
    </box>
  )
}
