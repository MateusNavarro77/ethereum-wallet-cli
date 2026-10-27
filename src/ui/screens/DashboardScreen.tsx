import { useState, useCallback } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { registerQRCode } from "@opentui/qrcode/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { ResetModal } from "../components/ResetModal.js"
import { useBalance, useClipboardNotification } from "../hooks/index.js"
import type { Account } from "../../core/types.js"

// Ensure QR code renderable is registered in OpenTUI
registerQRCode()

export interface DashboardScreenProps {
  account: Account
  onReset: () => void
}

export function DashboardScreen({ account, onReset }: DashboardScreenProps) {
  const renderer = useRenderer()
  const [showResetModal, setShowResetModal] = useState(false)

  const { notification, copyText, setNotification } = useClipboardNotification(3000)

  const handleBalanceUpdateSuccess = useCallback(() => {
    setNotification("✔ Balance updated", 2500)
  }, [setNotification])

  const { balance, balanceError, network, refreshBalance } = useBalance(
    account.address,
    handleBalanceUpdateSuccess,
  )

  const handleCopy = useCallback(async () => {
    await copyText(account.address, "✔ Address copied to clipboard!")
  }, [copyText, account.address])

  useKeyboard((key) => {
    if (showResetModal) return

    if (key.name === "c" || key.name === "C") {
      handleCopy()
    } else if (key.name === "r" || key.name === "R") {
      refreshBalance()
    } else if (key.name === "x" || key.name === "X") {
      setShowResetModal(true)
    } else if (key.name === "q" || key.name === "Q" || key.name === "escape") {
      renderer.destroy()
      process.exit(0)
    }
  })

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Header subtitle="Sepolia Dashboard" />

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
            title={` Account: ${account.label} `}
            style={{
              border: true,
              borderColor: "#10B981",
              padding: 1,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            <box style={{ marginBottom: 1 }}>
              <text fg="#9CA3AF">Ethereum Address (Sepolia):</text>
            </box>
            <box style={{ marginBottom: 1 }}>
              <text fg="#60A5FA">
                <b>{account.address}</b>
              </text>
            </box>
            <box>
              <text fg="#9CA3AF">Press [<span fg="#60A5FA"><b>C</b></span>] to copy address to system clipboard</text>
            </box>
          </box>

          {/* Balance Card */}
          <box
            title=" Sepolia Balance "
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
              <text fg="#FFFFFF"><b>{network.name}</b></text>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
              <text fg="#9CA3AF">Chain ID:</text>
              <text fg="#FFFFFF"><b>{network.chainId}</b></text>
            </box>
            <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <text fg="#9CA3AF">RPC Endpoint:</text>
              <text fg="#9CA3AF">{network.rpcUrl}</text>
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
          [<span fg="#60A5FA"><b>C</b></span>] Copy Address  |  [<span fg="#60A5FA"><b>R</b></span>] Refresh  |  [<span fg="#EF4444"><b>X</b></span>] Reset Vault  |  [<span fg="#9CA3AF"><b>Q</b></span>] Quit
        </text>
      </Footer>
    </box>
  )
}
