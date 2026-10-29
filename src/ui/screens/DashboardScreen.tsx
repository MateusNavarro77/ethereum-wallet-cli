import { useState, useCallback } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { registerQRCode } from "@opentui/qrcode/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { HotkeyButton } from "../components/HotkeyButton.js"
import { ResetModal } from "../components/ResetModal.js"
import { AccountsModal } from "../components/AccountsModal.js"
import { NetworksModal } from "../components/NetworksModal.js"
import { TokensModal } from "../components/TokensModal.js"
import { SettingsModal } from "../components/SettingsModal.js"
import { SendModal } from "../components/SendModal.js"
import { useTheme } from "../context.js"
import {
  usePortfolio,
  useTokens,
  useNetwork,
  useClipboardNotification,
} from "../hooks/index.js"
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
  masterPassword?: string
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
  masterPassword,
}: DashboardScreenProps) {
  const renderer = useRenderer()
  const { tokens } = useTheme()
  const [showResetModal, setShowResetModal] = useState(false)
  const [showAccountsModal, setShowAccountsModal] = useState(false)
  const [showNetworksModal, setShowNetworksModal] = useState(false)
  const [showTokensModal, setShowTokensModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)

  const { notification, copyText, setNotification } = useClipboardNotification(3000)

  const handleBalanceUpdateSuccess = useCallback(() => {
    setNotification("✔ Balances updated", 2500)
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

  const {
    isAggregate,
    toggleAggregate,
    nativeBalance,
    nativeFiat,
    tokens: portfolioTokens,
    totalFiat,
    isRefreshing,
    lastUpdated,
    error: portfolioError,
    refresh: refreshPortfolio,
  } = usePortfolio(account.address, wallet?.accounts, handleBalanceUpdateSuccess)

  const {
    tokens: allConfiguredTokens,
    addToken,
    toggleHideToken,
    removeCustomToken,
    verifyTokenContract,
    refreshTokens,
  } = useTokens(activeNetwork.chainId)

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
    if (showResetModal || showAccountsModal || showNetworksModal || showTokensModal || showSettingsModal || showSendModal) return

    if (key.name === "c" || key.name === "C") {
      if (!isAggregate) {
        handleCopy()
      }
    } else if (key.name === "e" || key.name === "E") {
      setShowSendModal(true)
    } else if (key.name === "r" || key.name === "R") {
      refreshPortfolio()
      refreshStatus()
    } else if (key.name === "p" || key.name === "P") {
      toggleAggregate()
    } else if (key.name === "s" || key.name === "S") {
      setShowSettingsModal(true)
    } else if (key.name === "t" || key.name === "T") {
      setShowTokensModal(true)
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
    if (net.isLocal) return { text: "[LOCAL]", fg: tokens.accent }
    if (net.isTestnet || net.chainId !== 1) return { text: "[TESTNET]", fg: tokens.warning }
    return { text: "[MAINNET]", fg: tokens.success }
  }

  const badge = resolveBadge(account)
  const netBadge = resolveNetworkBadge(activeNetwork)
  const networkShortName = activeNetwork.name.includes("Sepolia")
    ? "Sepolia"
    : activeNetwork.name.includes("Mainnet")
      ? "Mainnet"
      : activeNetwork.name

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: tokens.background,
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
            title={isAggregate ? " Portfolio: All Accounts (Aggregate) [AGGREGATE] " : ` Account: ${account.label} ${badge} `}
            style={{
              border: true,
              borderColor: isAggregate ? tokens.secondary : tokens.success,
              backgroundColor: tokens.background,
              padding: 1,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            {isAggregate ? (
              <>
                <box style={{ marginBottom: 1, flexDirection: "row", justifyContent: "space-between" }}>
                  <text fg={tokens.success}>
                    Aggregated view across {wallet ? wallet.accounts.filter((a) => !a.hidden).length : 1} visible accounts
                  </text>
                  <HotkeyButton onPress={toggleAggregate} color={tokens.secondary}>[P] Switch to Single</HotkeyButton>
                </box>
                <box style={{ marginBottom: 1 }}>
                  <text fg={tokens.textMuted}>Showing combined native ETH and ERC-20 token balances for active network.</text>
                </box>
                <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <HotkeyButton onPress={toggleAggregate} color={tokens.secondary}>[P] Return to single account view</HotkeyButton>
                  {wallet ? (
                    <HotkeyButton onPress={() => setShowAccountsModal(true)} color={tokens.warning}>[A] Manage Accounts</HotkeyButton>
                  ) : null}
                </box>
              </>
            ) : (
              <>
                <box style={{ marginBottom: 1, flexDirection: "row", justifyContent: "space-between" }}>
                  <text fg={tokens.textMuted}>Ethereum Address ({networkShortName}):</text>
                  {wallet && wallet.accounts.length > 1 ? (
                    <HotkeyButton onPress={() => cycleAccount(1)} color={tokens.primary}>[Tab] Quick Switch</HotkeyButton>
                  ) : null}
                </box>
                <box style={{ marginBottom: 1 }}>
                  <text fg={tokens.primary}>
                    <b>{account.address}</b>
                  </text>
                </box>
                <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <HotkeyButton onPress={handleCopy} color={tokens.textMuted}>[C] Copy address</HotkeyButton>
                  {wallet ? (
                    <HotkeyButton onPress={() => setShowAccountsModal(true)} color={tokens.warning}>[A] Manage Accounts</HotkeyButton>
                  ) : null}
                </box>
              </>
            )}
          </box>

          {/* Balance & Portfolio Card */}
          <box
            title={isAggregate ? " Aggregate Balances & Portfolio " : " Balances & Portfolio "}
            style={{
              border: true,
              borderColor: tokens.borderActive,
              backgroundColor: tokens.background,
              padding: 1,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            {/* Native Balance */}
            <box style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 1 }}>
              <box style={{ flexDirection: "row", gap: 1 }}>
                <text fg={tokens.textMuted}>Native ({activeNetwork.symbol}):</text>
                <text fg={tokens.success}>
                  <b>{nativeBalance}</b>
                </text>
                {nativeFiat ? <text fg={tokens.primary}>(≈ {nativeFiat})</text> : null}
              </box>
              <HotkeyButton onPress={toggleAggregate} color={tokens.secondary}>[P] {isAggregate ? "Single View" : "Aggregate"}</HotkeyButton>
            </box>

            {/* ERC-20 Tokens List */}
            <box style={{ flexDirection: "column", marginTop: 1, marginBottom: 1 }}>
              <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
                <text fg={tokens.textMuted}>ERC-20 Tokens ({portfolioTokens.length}):</text>
                <HotkeyButton onPress={() => setShowTokensModal(true)} color={tokens.warning}>[T] Manage Tokens</HotkeyButton>
              </box>
              {portfolioTokens.length === 0 ? (
                <box style={{ flexDirection: "row", gap: 1 }}><text fg={tokens.textSubtle}>No active tokens tracked.</text><HotkeyButton onPress={() => setShowTokensModal(true)} color={tokens.warning}>[T] Add or unhide tokens</HotkeyButton></box>
              ) : (
                portfolioTokens.slice(0, 4).map((t) => (
                  <box key={t.address} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <text fg={tokens.text}>
                      • <b>{t.symbol}</b>: {t.formattedBalance} {t.symbol}
                    </text>
                    {t.fiatValue ? <text fg={tokens.primary}>≈ {t.fiatValue}</text> : null}
                  </box>
                ))
              )}
              {portfolioTokens.length > 4 ? (
                <HotkeyButton onPress={() => setShowTokensModal(true)} color={tokens.textSubtle}>+ {portfolioTokens.length - 4} more tokens... [T] View all</HotkeyButton>
              ) : null}
            </box>

            {/* Total Fiat Portfolio Value */}
            {totalFiat ? (
              <box style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 1 }}>
                <text fg={tokens.textMuted}>Est. Total Fiat Value:</text>
                <text fg={tokens.success}><b>{totalFiat} USD</b></text>
              </box>
            ) : null}

            {/* Refreshing & Timestamp Status */}
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
              <text fg={isRefreshing ? tokens.warning : tokens.textSubtle}>
                {isRefreshing
                  ? "⟳ Updating balances..."
                  : lastUpdated
                    ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                    : "Status: Initializing"}
              </text>
              <HotkeyButton onPress={() => { refreshPortfolio(); refreshStatus() }} color={tokens.secondary}>[R] Refresh</HotkeyButton>
            </box>

            {portfolioError ? (
              <box style={{ marginTop: 1 }}>
                <text fg={tokens.error}>⚠ {portfolioError}</text>
              </box>
            ) : null}
          </box>

          {/* Network Card */}
          <box
            title=" Network Configuration "
            style={{
              border: true,
              borderColor: tokens.border,
              backgroundColor: tokens.background,
              padding: 1,
              flexDirection: "column",
            }}
          >
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
              <text fg={tokens.textMuted}>Network:</text>
              <box style={{ flexDirection: "row", gap: 1 }}>
                <text fg={netBadge.fg}><b>{netBadge.text}</b></text>
                <text fg={tokens.text}><b>{activeNetwork.name}</b></text>
              </box>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
              <text fg={tokens.textMuted}>Chain ID:</text>
              <text fg={tokens.text}><b>{activeNetwork.chainId}</b></text>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
              <text fg={tokens.textMuted}>Status:</text>
              <text fg={status.connected ? tokens.success : tokens.error}>
                <b>
                  {status.connected
                    ? `🟢 Connected ${status.blockNumber !== undefined ? `(#${status.blockNumber})` : ""}`
                    : `🔴 Offline`}
                </b>
              </text>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg={tokens.textMuted}>RPC Endpoint:</text>
              <text fg={tokens.textMuted}>
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
            borderColor: tokens.success,
            backgroundColor: tokens.background,
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
            foregroundColor={tokens.text}
            backgroundColor={tokens.background}
          />
          <box style={{ alignItems: "center" }}>
            <text fg={tokens.textMuted}>Scan with mobile wallet</text>
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

      {/* Networks & RPC Modal */}
      {showNetworksModal && (
        <NetworksModal
          networks={allNetworks}
          activeNetwork={activeNetwork}
          status={status}
          onSelectNetwork={async (chainId) => {
            await switchNetwork(chainId)
            await refreshPortfolio()
            refreshTokens()
          }}
          onAddNetwork={addNetwork}
          onEditNetwork={editNetwork}
          onRemoveNetwork={removeNetwork}
          onClose={() => setShowNetworksModal(false)}
        />
      )}

      {/* ERC-20 Tokens Manager Modal */}
      {showTokensModal && (
        <TokensModal
          tokens={allConfiguredTokens}
          chainId={activeNetwork.chainId}
          onToggleHide={async (addr) => {
            await toggleHideToken(addr)
            await refreshPortfolio()
          }}
          onAddToken={async (tokenData) => {
            await addToken({
              address: tokenData.address,
              name: tokenData.name,
              symbol: tokenData.symbol,
              decimals: tokenData.decimals,
              chainId: activeNetwork.chainId,
            })
            await refreshPortfolio()
          }}
          onRemoveToken={async (addr) => {
            await removeCustomToken(addr)
            await refreshPortfolio()
          }}
          onVerifyToken={verifyTokenContract}
          onClose={() => {
            setShowTokensModal(false)
            refreshPortfolio()
          }}
        />
      )}

      {/* Settings & Theme Selector Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* Send Transaction Stepper Modal */}
      {showSendModal && (
        <SendModal
          account={account}
          wallet={wallet}
          masterPassword={masterPassword}
          onClose={() => {
            setShowSendModal(false)
            refreshPortfolio()
          }}
          onSuccess={() => {
            setNotification("✔ Transaction broadcast successfully!", 4000)
            refreshPortfolio()
          }}
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
        <box style={{ flexDirection: "row", gap: 1 }}>
          <HotkeyButton onPress={() => setShowSendModal(true)} color={tokens.accent}>[E] Send</HotkeyButton>
          {!isAggregate ? <HotkeyButton onPress={handleCopy} color={tokens.textMuted}>[C] Copy</HotkeyButton> : null}
          <HotkeyButton onPress={toggleAggregate} color={tokens.secondary}>[P] {isAggregate ? "Single" : "Aggregate"}</HotkeyButton>
          <HotkeyButton onPress={() => setShowSettingsModal(true)} color={tokens.primary}>[S] Settings</HotkeyButton>
          <HotkeyButton onPress={() => setShowTokensModal(true)} color={tokens.warning}>[T] Tokens</HotkeyButton>
          {wallet ? <HotkeyButton onPress={() => setShowAccountsModal(true)} color={tokens.warning}>[A] Accounts</HotkeyButton> : null}
          <HotkeyButton onPress={() => setShowNetworksModal(true)} color={tokens.success}>[N] Networks</HotkeyButton>
          <HotkeyButton onPress={() => { refreshPortfolio(); refreshStatus() }} color={tokens.secondary}>[R] Refresh</HotkeyButton>
          <HotkeyButton onPress={() => setShowResetModal(true)} color={tokens.error}>[X] Reset</HotkeyButton>
          <HotkeyButton onPress={() => { renderer.destroy(); process.exit(0) }} color={tokens.textMuted}>[Q] Quit</HotkeyButton>
        </box>
      </Footer>
    </box>
  )
}
