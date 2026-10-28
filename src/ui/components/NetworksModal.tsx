import { useState, useMemo } from "react"
import { useKeyboard } from "@opentui/react"
import type { NetworkConfig } from "../../core/types.js"
import type { NetworkConnectionStatus } from "../../core/interfaces.js"
import { NetworkFormModal, type NetworkFormData } from "./NetworkFormModal.js"

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
    if (net.isLocal) {
      return { text: "[LOCAL]", fg: "#22D3EE" }
    } else if (net.isTestnet || net.chainId !== 1) {
      return { text: "[TESTNET]", fg: "#FBBF24" }
    }
    return { text: "[MAINNET]", fg: "#34D399" }
  }

  const handleSwitch = async (net: NetworkConfig) => {
    try {
      setErrorMessage(null)
      setStatusMessage(`Switching to ${net.name}...`)
      await onSelectNetwork(net.chainId)
      setStatusMessage(`Switched to ${net.name} successfully!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
    }
  }

  const handleAddSave = async (data: NetworkFormData) => {
    await onAddNetwork(data)
    setMode("list")
    setStatusMessage(`Added custom network ${data.name}!`)
    setSelectedIndex(networks.length)
  }

  const handleEditSave = async (data: NetworkFormData) => {
    if (!selectedNetwork) return
    await onEditNetwork(selectedNetwork.chainId, data)
    setMode("list")
    setStatusMessage(`Updated network ${data.name}!`)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedNetwork) return
    try {
      setErrorMessage(null)
      await onRemoveNetwork(selectedNetwork.chainId)
      setMode("list")
      setStatusMessage(`Removed network ${selectedNetwork.name}`)
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
    }
  }

  useKeyboard((key) => {
    if (mode === "add" || mode === "edit") {
      // Sub-modals handle their own keyboard input
      return
    }

    if (mode === "list") {
      if (key.name === "escape") {
        onClose()
      } else if (key.name === "up") {
        setSelectedIndex((prev) => Math.max(0, prev - 1))
      } else if (key.name === "down") {
        setSelectedIndex((prev) => Math.min(networks.length - 1, prev + 1))
      } else if (key.name === "pageup") {
        setSelectedIndex((prev) => Math.max(0, prev - PAGE_SIZE))
      } else if (key.name === "pagedown") {
        setSelectedIndex((prev) => Math.min(networks.length - 1, prev + PAGE_SIZE))
      } else if (key.name === "home") {
        setSelectedIndex(0)
      } else if (key.name === "end") {
        setSelectedIndex(Math.max(0, networks.length - 1))
      } else if (key.name === "return") {
        if (selectedNetwork) {
          handleSwitch(selectedNetwork)
        }
      } else if (key.name === "a" || key.name === "A") {
        setErrorMessage(null)
        setMode("add")
      } else if (key.name === "e" || key.name === "E") {
        if (!selectedNetwork) return
        if (isPreset(selectedNetwork)) {
          setErrorMessage("Preset networks cannot be modified (FR-NET-03)")
          return
        }
        setErrorMessage(null)
        setMode("edit")
      } else if (key.name === "d" || key.name === "D") {
        if (!selectedNetwork) return
        if (isPreset(selectedNetwork)) {
          setErrorMessage("Preset networks cannot be removed (FR-NET-03)")
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
        backgroundColor: "#000000",
        zIndex: 100,
      }}
    >
      <box
        title=" Manage Networks & RPC (FR-NET-02 & FR-NET-03) "
        style={{
          border: true,
          borderColor: "#3B82F6",
          padding: 1,
          width: 78,
          flexDirection: "column",
        }}
      >
        {/* Header subtitle & counts */}
        <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
          <text fg="#60A5FA">
            <b>{networks.length} Networks Configured</b>
            {networks.length > PAGE_SIZE ? (
              <span fg="#9CA3AF">
                {" "}
                ({effectiveOffset + 1}-{Math.min(effectiveOffset + PAGE_SIZE, networks.length)} of{" "}
                {networks.length})
              </span>
            ) : null}
          </text>
          <text fg="#9CA3AF">
            Active: <span fg="#34D399"><b>{activeNetwork.name}</b></span> ({activeNetwork.chainId})
          </text>
        </box>

        {/* Status / Error notification */}
        {statusMessage ? (
          <box style={{ marginBottom: 1 }}>
            <text fg="#34D399">✔ {statusMessage}</text>
          </box>
        ) : null}

        {errorMessage ? (
          <box style={{ marginBottom: 1 }}>
            <text fg="#EF4444">⚠ {errorMessage}</text>
          </box>
        ) : null}

        {/* Delete confirmation dialog */}
        {mode === "confirm-delete" && selectedNetwork ? (
          <box
            title=" Confirm Network Removal "
            style={{
              border: true,
              borderColor: "#EF4444",
              padding: 1,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            <text fg="#EF4444">
              <b>Are you sure you want to remove {selectedNetwork.name} ({selectedNetwork.chainId})?</b>
            </text>
            <text fg="#9CA3AF">This action will delete the network configuration from your vault.</text>
            <box style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
              <text fg="#EF4444"><b>[Y / Enter] Confirm Delete</b></text>
              <text fg="#60A5FA">[N / Esc] Cancel</text>
            </box>
          </box>
        ) : null}

        {/* Windowed Network List */}
        <box
          title={` Networks [${safeSelectedIndex + 1}/${networks.length}] ${effectiveOffset > 0 ? "▲" : " "} ${effectiveOffset + PAGE_SIZE < networks.length ? "▼" : " "} `}
          style={{
            border: true,
            borderColor: "#4B5563",
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
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: isSelected ? "#1E3A8A" : undefined,
                }}
              >
                <box style={{ flexDirection: "row", gap: 1 }}>
                  <text fg={isSelected ? "#60A5FA" : "#9CA3AF"}>
                    {isSelected ? ">" : " "}
                  </text>
                  <text fg={badge.fg}>
                    <b>{badge.text}</b>
                  </text>
                  <text fg={isSelected ? "#FFFFFF" : "#E5E7EB"}>
                    <b>{net.name}</b>
                  </text>
                  <text fg="#9CA3AF">({net.chainId})</text>
                  <text fg="#6B7280">{originTag}</text>
                </box>

                <box style={{ flexDirection: "row", gap: 1 }}>
                  {net.rpcUrls && net.rpcUrls.length > 1 ? (
                    <text fg="#60A5FA">[{net.rpcUrls.length} RPCs]</text>
                  ) : null}
                  {isActive ? (
                    <text fg="#34D399">
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
              borderColor: "#374151",
              paddingX: 1,
              paddingY: 0,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg="#9CA3AF">Primary RPC:</text>
              <text fg="#E5E7EB">{selectedNetwork.rpcUrl}</text>
            </box>
            {selectedNetwork.rpcUrls && selectedNetwork.rpcUrls.length > 1 ? (
              <box style={{ flexDirection: "column" }}>
                <text fg="#9CA3AF">Fallbacks (FR-NET-05):</text>
                <text fg="#6B7280">{selectedNetwork.rpcUrls.slice(1).join(", ")}</text>
              </box>
            ) : null}
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg="#9CA3AF">Currency Symbol:</text>
              <text fg="#E5E7EB"><b>{selectedNetwork.symbol}</b></text>
            </box>
            {selectedNetwork.explorerUrl ? (
              <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <text fg="#9CA3AF">Explorer:</text>
                <text fg="#60A5FA">{selectedNetwork.explorerUrl}</text>
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
            <text fg="#9CA3AF">
              [<span fg="#34D399"><b>Enter</b></span>] Switch  |  [<span fg="#60A5FA"><b>A</b></span>] Add  |  [<span fg="#FBBF24"><b>E</b></span>] Edit  |  [<span fg="#EF4444"><b>D</b></span>] Delete
            </text>
          </box>
          <text fg="#60A5FA">[Esc] Close</text>
        </box>
      </box>
    </box>
  )
}
