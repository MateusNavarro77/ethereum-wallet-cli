import { useState, useMemo } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../context.js"
import type { NetworkConfig } from "../../core/types.js"
import type { NetworkConnectionStatus } from "../../core/interfaces.js"
import { NetworkFormModal, type NetworkFormData } from "./NetworkFormModal.js"
import { HotkeyButton } from "./HotkeyButton.js"

export interface NetworksModalProps {
  networks: NetworkConfig[]
  activeNetwork: NetworkConfig
  status?: NetworkConnectionStatus
  onSelectNetwork: (chainId: number) => Promise<void>
  onAddNetwork: (input: Omit<NetworkConfig, "isTestnet" | "isLocal">) => Promise<NetworkConfig>
  onEditNetwork: (chainId: number, updates: Partial<NetworkConfig>) => Promise<NetworkConfig>
  onRemoveNetwork: (chainId: number) => Promise<void>
  onClose: () => void
}

const PAGE_SIZE = 8

export function NetworksModal({
  networks,
  activeNetwork,
  status,
  onSelectNetwork,
  onAddNetwork,
  onEditNetwork,
  onRemoveNetwork,
  onClose,
}: NetworksModalProps) {
  const { tokens } = useTheme()
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = networks.findIndex((n) => n.chainId === activeNetwork.chainId)
    return idx >= 0 ? idx : 0
  })

  const [scrollOffset, setScrollOffset] = useState(() => {
    const idx = networks.findIndex((n) => n.chainId === activeNetwork.chainId)
    return idx >= PAGE_SIZE ? idx - PAGE_SIZE + 1 : 0
  })

  const [mode, setMode] = useState<"list" | "add" | "edit" | "confirm-delete">("list")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Clamp selection and compute windowed slice
  const safeSelectedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, networks.length - 1))
  const effectiveOffset = Math.max(
    0,
    Math.min(
      safeSelectedIndex < scrollOffset
        ? safeSelectedIndex
        : safeSelectedIndex >= scrollOffset + PAGE_SIZE
          ? safeSelectedIndex - PAGE_SIZE + 1
          : scrollOffset,
      Math.max(0, networks.length - PAGE_SIZE),
    ),
  )

  const visibleNetworks = useMemo(() => {
    return networks.slice(effectiveOffset, effectiveOffset + PAGE_SIZE)
  }, [networks, effectiveOffset])

  const selectedNetwork = networks[safeSelectedIndex]

  const isPreset = (net: NetworkConfig) => {
    return net.chainId === 1 || net.chainId === 11155111 || net.chainId === 31337
  }

  const resolveBadge = (net: NetworkConfig) => {
    if (net.isLocal || net.chainId === 31337) return { text: "[LOCAL]", fg: tokens.accent }
    if (net.isTestnet || net.chainId !== 1) return { text: "[TESTNET]", fg: tokens.warning }
    return { text: "[MAINNET]", fg: tokens.success }
  }

  const handleSwitch = async (net: NetworkConfig) => {
    try {
      setErrorMessage(null)
      await onSelectNetwork(net.chainId)
      setStatusMessage(`Switched active network to ${net.name} (${net.chainId})`)
      setTimeout(() => setStatusMessage(null), 2500)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to switch network")
    }
  }

  const handleAddSave = async (data: NetworkFormData) => {
    try {
      const added = await onAddNetwork({
        name: data.name,
        rpcUrl: data.rpcUrl,
        rpcUrls: data.rpcUrls,
        chainId: data.chainId,
        symbol: data.symbol,
        explorerUrl: data.explorerUrl,
      })
      setMode("list")
      setStatusMessage(`Added custom network ${added.name} (${added.chainId})`)
      setTimeout(() => setStatusMessage(null), 2500)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add network")
    }
  }

  const handleEditSave = async (data: NetworkFormData) => {
    if (!selectedNetwork) return
    try {
      const updated = await onEditNetwork(selectedNetwork.chainId, {
        name: data.name,
        rpcUrl: data.rpcUrl,
        rpcUrls: data.rpcUrls,
        symbol: data.symbol,
        explorerUrl: data.explorerUrl,
      })
      setMode("list")
      setStatusMessage(`Updated network ${updated.name} (${updated.chainId})`)
      setTimeout(() => setStatusMessage(null), 2500)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update network")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedNetwork) return
    try {
      await onRemoveNetwork(selectedNetwork.chainId)
      setMode("list")
      setSelectedIndex((prev) => Math.max(0, prev - 1))
      setStatusMessage(`Removed custom network ${selectedNetwork.name}`)
      setTimeout(() => setStatusMessage(null), 2500)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove network")
      setMode("list")
    }
  }

  useKeyboard((key) => {
    if (mode === "list") {
      if (key.name === "escape" || key.name === "q" || key.name === "Q") {
        onClose()
      } else if (key.name === "up" || key.name === "k") {
        setSelectedIndex((prev) => Math.max(0, prev - 1))
      } else if (key.name === "down" || key.name === "j") {
        setSelectedIndex((prev) => Math.min(networks.length - 1, prev + 1))
      } else if (key.name === "return") {
        if (selectedNetwork) {
          void handleSwitch(selectedNetwork)
        }
      } else if (key.name === "a" || key.name === "A") {
        setErrorMessage(null)
        setMode("add")
      } else if (key.name === "e" || key.name === "E") {
        if (!selectedNetwork) return
        if (isPreset(selectedNetwork)) {
          setErrorMessage("Preset networks cannot be modified")
          return
        }
        setErrorMessage(null)
        setMode("edit")
      } else if (key.name === "d" || key.name === "D") {
        if (!selectedNetwork) return
        if (isPreset(selectedNetwork)) {
          setErrorMessage("Preset networks cannot be removed")
          return
        }
        setErrorMessage(null)
        setMode("confirm-delete")
      }
    } else if (mode === "confirm-delete") {
      if (key.name === "escape" || key.name === "n" || key.name === "N") {
        setMode("list")
      } else if (key.name === "return" || key.name === "y" || key.name === "Y") {
        handleDeleteConfirm()
      }
    }
  })

  if (mode === "add") {
    return (
      <NetworkFormModal
        onSave={handleAddSave}
        onCancel={() => setMode("list")}
      />
    )
  }

  if (mode === "edit" && selectedNetwork) {
    return (
      <NetworkFormModal
        networkToEdit={selectedNetwork}
        onSave={handleEditSave}
        onCancel={() => setMode("list")}
      />
    )
  }

  const containerHeight = Math.max(3, Math.min(networks.length, PAGE_SIZE) + 2)

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
        zIndex: 100,
      }}
    >
      <box
        title="Manage Networks & RPC"
        style={{
          border: true,
          borderColor: tokens.borderActive,
          
          padding: 1,
          width: 78,
          flexDirection: "column",
        }}
      >
        {/* Header subtitle & counts */}
        <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
          <text fg={tokens.primary}>
            <b>{networks.length} Networks Configured</b>
            {networks.length > PAGE_SIZE ? (
              <span fg={tokens.textMuted}>
                {" "}
                ({effectiveOffset + 1}-{Math.min(effectiveOffset + PAGE_SIZE, networks.length)} of{" "}
                {networks.length})
              </span>
            ) : null}
          </text>
          <text fg={tokens.textMuted}>
            Active: <span fg={tokens.success}><b>{activeNetwork.name}</b></span> ({activeNetwork.chainId})
          </text>
        </box>

        {/* Status / Error notification */}
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

        {/* Delete confirmation dialog */}
        {mode === "confirm-delete" && selectedNetwork ? (
          <box
            title=" Confirm Network Removal "
            style={{
              border: true,
              borderColor: tokens.error,
              backgroundColor: tokens.surface,
              padding: 1,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            <text fg={tokens.error}>
              <b>Are you sure you want to remove {selectedNetwork.name} ({selectedNetwork.chainId})?</b>
            </text>
            <text fg={tokens.textMuted}>This action will delete the network configuration from your vault.</text>
            <box style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
              <HotkeyButton onPress={handleDeleteConfirm} color={tokens.error}><b>[Y / Enter] Confirm Delete</b></HotkeyButton>
              <HotkeyButton onPress={() => setMode("list")} color={tokens.secondary}>[N / Esc] Cancel</HotkeyButton>
            </box>
          </box>
        ) : null}

        {/* Windowed Network List */}
        <box
          title={` Networks [${safeSelectedIndex + 1}/${networks.length}] ${effectiveOffset > 0 ? "▲" : " "} ${effectiveOffset + PAGE_SIZE < networks.length ? "▼" : " "} `}
          style={{
            border: true,
            borderColor: tokens.border,
            backgroundColor: tokens.surface,
            paddingX: 1,
            paddingY: 0,
            flexDirection: "column",
            height: containerHeight,
            marginBottom: 1,
          }}
        >
          {visibleNetworks.map((net, idx) => {
            const actualIndex = effectiveOffset + idx
            const isSelected = actualIndex === safeSelectedIndex
            const isActive = net.chainId === activeNetwork.chainId
            const badge = resolveBadge(net)
            const originTag = isPreset(net) ? "[Preset]" : "[Custom]"

            return (
              <box
                key={net.chainId}
                onMouseOver={() => setSelectedIndex(actualIndex)}
                onMouseDown={() => { setSelectedIndex(actualIndex); void handleSwitch(net) }}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: isSelected ? tokens.selectionBg : "transparent",
                }}
              >
                <box style={{ flexDirection: "row", gap: 1 }}>
                  <text fg={isSelected ? tokens.selectionFg : tokens.textMuted}>
                    {isSelected ? ">" : " "}
                  </text>
                  <text fg={badge.fg}>
                    <b>{badge.text}</b>
                  </text>
                  <text fg={isSelected ? tokens.selectionFg : tokens.text}>
                    <b>{net.name}</b>
                  </text>
                  <text fg={isSelected ? tokens.selectionFg : tokens.textMuted}>({net.chainId})</text>
                  <text fg={isSelected ? tokens.selectionFg : tokens.textSubtle}>{originTag}</text>
                </box>

                <box style={{ flexDirection: "row", gap: 1 }}>
                  {net.rpcUrls && net.rpcUrls.length > 1 ? (
                    <text fg={isSelected ? tokens.selectionFg : tokens.secondary}>[{net.rpcUrls.length} RPCs]</text>
                  ) : null}
                  {isActive ? (
                    <text fg={isSelected ? tokens.selectionFg : tokens.success}>
                      <b>* [ACTIVE]</b>
                    </text>
                  ) : null}
                </box>
              </box>
            )
          })}
        </box>

        {/* Selected Network Detail Preview Card */}
        {selectedNetwork ? (
          <box
            title={` Selected: ${selectedNetwork.name} `}
            style={{
              border: true,
              borderColor: tokens.borderSubtle,
              backgroundColor: tokens.surface,
              paddingX: 1,
              paddingY: 0,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={tokens.textMuted}>Primary RPC:</text>
              <text fg={tokens.text}>{selectedNetwork.rpcUrl}</text>
            </box>
            {selectedNetwork.rpcUrls && selectedNetwork.rpcUrls.length > 1 ? (
              <box style={{ flexDirection: "column" }}>
                <text fg={tokens.textMuted}>Fallbacks:</text>
                <text fg={tokens.textSubtle}>{selectedNetwork.rpcUrls.slice(1).join(", ")}</text>
              </box>
            ) : null}
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={tokens.textMuted}>Currency Symbol:</text>
              <text fg={tokens.text}><b>{selectedNetwork.symbol}</b></text>
            </box>
            {selectedNetwork.explorerUrl ? (
              <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <text fg={tokens.textMuted}>Explorer:</text>
                <text fg={tokens.primary}>{selectedNetwork.explorerUrl}</text>
              </box>
            ) : null}
          </box>
        ) : null}

        {/* Hotkeys Bar */}
        <box
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingTop: 1,
          }}
        >
          <box style={{ flexDirection: "row", gap: 1 }}>
            <HotkeyButton onPress={() => selectedNetwork && void handleSwitch(selectedNetwork)} color={tokens.success}>[Enter] Switch</HotkeyButton>
            <HotkeyButton onPress={() => { setErrorMessage(null); setMode("add") }} color={tokens.secondary}>[A] Add</HotkeyButton>
            <HotkeyButton onPress={() => { if (!selectedNetwork) return; if (isPreset(selectedNetwork)) { setErrorMessage("Preset networks cannot be modified"); return } setErrorMessage(null); setMode("edit") }} color={tokens.warning}>[E] Edit</HotkeyButton>
            <HotkeyButton onPress={() => { if (!selectedNetwork) return; if (isPreset(selectedNetwork)) { setErrorMessage("Preset networks cannot be removed"); return } setErrorMessage(null); setMode("confirm-delete") }} color={tokens.error}>[D] Delete</HotkeyButton>
          </box>
          <HotkeyButton onPress={onClose} color={tokens.textMuted}>[Esc] Close</HotkeyButton>
        </box>
      </box>
    </box>
  )
}
