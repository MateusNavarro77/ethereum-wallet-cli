import { useState, useCallback } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { registerQRCode } from "@opentui/qrcode/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { ResetModal } from "../components/ResetModal.js"
import { AccountsModal } from "../components/AccountsModal.js"
import { NetworksModal } from "../components/NetworksModal.js"
import { useBalance, useNetwork, useClipboardNotification } from "../hooks/index.js"
import type {
  Account,
  HdAccount,
  ImportedAccount,
  WalletData,
  WatchOnlyAccount,
} from "../../core/types.js"

// Ensure QR code renderable is registered in OpenTUI
registerQRCode()

export interface DashboardScreenProps {
  account: Account
  onReset: () => void
  wallet?: WalletData
  onSelectAccount?: (address: `0x${string}`) => void
  onAddDerived?: (label?: string) => Promise<HdAccount>
  onImportPrivateKey?: (privateKey: string, label: string) => Promise<ImportedAccount>
  onImportKeystore?: (
    json: string,
    keystorePass: string,
    label: string,
  ) => Promise<ImportedAccount>
  onAddWatchOnly?: (address: string, label: string) => Promise<WatchOnlyAccount>
  onRename?: (address: `0x${string}`, newLabel: string) => Promise<void>
  onToggleHide?: (address: `0x${string}`) => Promise<void>
  onRemove?: (address: `0x${string}`) => Promise<void>
  onExportPrivateKey?: (address: `0x${string}`, passwordAttempt: string) => Promise<`0x${string}`>
  onExportMnemonic?: (passwordAttempt: string) => Promise<string>
}

export function DashboardScreen({
  account,
  onReset,
  wallet,
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
}: DashboardScreenProps) {
  const renderer = useRenderer()
  const [showResetModal, setShowResetModal] = useState(false)
  const [showAccountsModal, setShowAccountsModal] = useState(false)
  const [showNetworksModal, setShowNetworksModal] = useState(false)

  const { notification, copyText, setNotification } = useClipboardNotification(3000)

  const handleBalanceUpdateSuccess = useCallback(() => {
    setNotification("✔ Balance updated", 2500)
  }, [setNotification])

  const {
    activeNetwork,
    allNetworks,
    status,
    switchNetwork,
    addNetwork,
    editNetwork,
    removeNetwork,
    refreshStatus,
  } = useNetwork()

  const { balance, balanceError, network, refreshBalance } = useBalance(
    account.address,
    handleBalanceUpdateSuccess,
  )

  const handleCopy = useCallback(async () => {
    await copyText(account.address, "✔ Address copied to clipboard!")
  }, [copyText, account.address])

  const cycleAccount = useCallback(
    (direction: 1 | -1) => {
      if (!wallet || !onSelectAccount) return
      const visibleAccounts = wallet.accounts.filter((a) => !a.hidden)
      if (visibleAccounts.length <= 1) return

      const currentIndex = visibleAccounts.findIndex(
        (a) => a.address.toLowerCase() === account.address.toLowerCase(),
      )
      if (currentIndex === -1) return

      const nextIndex =
        (currentIndex + direction + visibleAccounts.length) % visibleAccounts.length
      onSelectAccount(visibleAccounts[nextIndex].address)
    },
    [wallet, account.address, onSelectAccount],
  )

  useKeyboard((key) => {
    if (showResetModal || showAccountsModal || showNetworksModal) return

    if (key.name === "c" || key.name === "C") {
      handleCopy()
    } else if (key.name === "r" || key.name === "R") {
      refreshBalance()
      refreshStatus()
    } else if (key.name === "a" || key.name === "A") {
      if (wallet) {
        setShowAccountsModal(true)
      }
    } else if (key.name === "n" || key.name === "N") {
      setShowNetworksModal(true)
    } else if (key.name === "tab" || key.name === "right") {
      cycleAccount(1)
    } else if (key.name === "left") {
      cycleAccount(-1)
    } else if (key.name === "x" || key.name === "X") {
      setShowResetModal(true)
    } else if (key.name === "q" || key.name === "Q" || key.name === "escape") {
      renderer.destroy()
      process.exit(0)
    }
  })

  const resolveBadge = (acc: Account) => {
    if (acc.type === "hd") {
      return `[HD-${acc.index ?? 0}]`
    } else if (acc.type === "imported") {
      return `[Imported]`
    } else if (acc.type === "watch-only") {
      return `[Watch-Only]`
    }
    return ""
  }

  const resolveNetworkBadge = (net: typeof activeNetwork) => {
    if (net.isLocal) return { text: "[LOCAL]", fg: "#22D3EE" }
    if (net.isTestnet || net.chainId !== 1) return { text: "[TESTNET]", fg: "#FBBF24" }
    return { text: "[MAINNET]", fg: "#34D399" }
  }

  const badge = resolveBadge(account)
  const netBadge = resolveNetworkBadge(activeNetwork)
  const networkShortName = activeNetwork.name.includes("Sepolia") ? "Sepolia" : activeNetwork.name

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Header subtitle="Dashboard" network={activeNetwork} status={status} />

      {/* Main 2-Column Responsive Dashboard Body */}
      <box
        style={{
          width: "100%",
          flexGrow: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        {/* Left Column: Account, Balance & Network Details */}
        <box
          style={{
            flexGrow: 1,
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Account Details Card */}
          <box
            title={` Account: ${account.label} ${badge} `}
            style={{
              border: true,
              borderColor: "#10B981",
              padding: 1,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            <box style={{ marginBottom: 1, flexDirection: "row", justifyContent: "space-between" }}>
              <text fg="#9CA3AF">Ethereum Address ({networkShortName}):</text>
              {wallet && wallet.accounts.length > 1 ? (
                <text fg="#60A5FA">[Tab] Quick Switch</text>
              ) : null}
            </box>
            <box style={{ marginBottom: 1 }}>
              <text fg="#60A5FA">
                <b>{account.address}</b>
              </text>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg="#9CA3AF">Press [<span fg="#60A5FA"><b>C</b></span>] to copy address</text>
              {wallet ? (
                <text fg="#FBBF24">Press [<span fg="#FBBF24"><b>A</b></span>] Manage Accounts</text>
              ) : null}
            </box>
          </box>

          {/* Balance Card */}
          <box
            title=" Balance "
            style={{
              border: true,
              borderColor: "#3B82F6",
              padding: 1,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            <box style={{ flexDirection: "row", alignItems: "center" }}>
              <text fg="#10B981">
                <b>{balance}</b>
              </text>
            </box>

            {balanceError ? (
              <box style={{ marginTop: 1 }}>
                <text fg="#F87171">⚠ {balanceError}</text>
              </box>
            ) : null}
          </box>

          {/* Network Card */}
          <box
            title=" Network Configuration "
            style={{
              border: true,
              borderColor: "#4B5563",
              padding: 1,
              flexDirection: "column",
            }}
          >
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
              <text fg="#9CA3AF">Network:</text>
              <box style={{ flexDirection: "row", gap: 1 }}>
                <text fg={netBadge.fg}><b>{netBadge.text}</b></text>
                <text fg="#FFFFFF"><b>{activeNetwork.name}</b></text>
              </box>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
              <text fg="#9CA3AF">Chain ID:</text>
              <text fg="#FFFFFF"><b>{activeNetwork.chainId}</b></text>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
              <text fg="#9CA3AF">Status:</text>
              <text fg={status.connected ? "#34D399" : "#EF4444"}>
                <b>
                  {status.connected
                    ? `🟢 Connected ${status.blockNumber !== undefined ? `(#${status.blockNumber})` : ""}`
                    : `🔴 Offline`}
                </b>
              </text>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg="#9CA3AF">RPC Endpoint:</text>
              <text fg="#9CA3AF">
                {activeNetwork.rpcUrl}
                {activeNetwork.rpcUrls && activeNetwork.rpcUrls.length > 1
                  ? ` (+${activeNetwork.rpcUrls.length - 1} fallbacks)`
                  : ""}
              </text>
            </box>
          </box>
        </box>

        {/* Right Column: Scan to Receive QR Code */}
        <box
          title=" Scan to Receive "
          style={{
            border: true,
            borderColor: "#10B981",
            paddingX: 1,
            paddingY: 0,
            width: 44,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <qr-code
            content={account.address}
            quietZone={4}
            scale={1}
            fit="none"
            foregroundColor="#FFFFFF"
            backgroundColor="#000000"
          />
          <box style={{ alignItems: "center" }}>
            <text fg="#9CA3AF">Scan with mobile wallet</text>
          </box>
        </box>
      </box>

      {/* Account Manager Modal */}
      {showAccountsModal && wallet && onSelectAccount && (
        <AccountsModal
          wallet={wallet}
          activeAccount={account}
          onSelectAccount={onSelectAccount}
          onAddDerived={onAddDerived!}
          onImportPrivateKey={onImportPrivateKey!}
          onImportKeystore={onImportKeystore!}
          onAddWatchOnly={onAddWatchOnly!}
          onRename={onRename!}
          onToggleHide={onToggleHide!}
          onRemove={onRemove!}
          onExportPrivateKey={onExportPrivateKey!}
          onExportMnemonic={onExportMnemonic!}
          onClose={() => setShowAccountsModal(false)}
        />
      )}

      {/* Networks & RPC Modal (FR-NET-02 & FR-NET-03) */}
      {showNetworksModal && (
        <NetworksModal
          networks={allNetworks}
          activeNetwork={activeNetwork}
          status={status}
          onSelectNetwork={async (chainId) => {
            await switchNetwork(chainId)
            await refreshBalance()
          }}
          onAddNetwork={addNetwork}
          onEditNetwork={editNetwork}
          onRemoveNetwork={removeNetwork}
          onClose={() => setShowNetworksModal(false)}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal ? (
        <ResetModal
          onConfirm={() => {
            setShowResetModal(false)
            onReset()
          }}
          onCancel={() => setShowResetModal(false)}
        />
      ) : null}

      {/* Fullscreen Footer */}
      <Footer notification={notification}>
        <text fg="#9CA3AF">
          [<span fg="#60A5FA"><b>C</b></span>] Copy  |  [<span fg="#FBBF24"><b>A</b></span>] Accounts  |  [<span fg="#34D399"><b>N</b></span>] Networks  |  [<span fg="#60A5FA"><b>R</b></span>] Refresh  |  [<span fg="#EF4444"><b>X</b></span>] Reset Vault  |  [<span fg="#9CA3AF"><b>Q</b></span>] Quit
        </text>
      </Footer>
    </box>
  )
}
