import { useService, useTheme } from "../context.js"
import type { NetworkConfig } from "../../core/types.js"
import type { NetworkConnectionStatus } from "../../core/interfaces.js"

interface HeaderProps {
  subtitle?: string
  network?: NetworkConfig
  status?: NetworkConnectionStatus
}

export function Header({ subtitle, network: propNetwork, status: propStatus }: HeaderProps) {
  const networkService = useService("networkService")
  const rpcService = useService("rpcService")
  const { tokens } = useTheme()

  const network = propNetwork || (networkService ? networkService.getActiveNetwork() : rpcService?.getNetwork())
  const status = propStatus

  const resolveBadge = (net?: NetworkConfig) => {
    if (!net) return { text: "[TESTNET]", fg: tokens.warning }
    if (net.isLocal) return { text: "[LOCAL]", fg: tokens.accent }
    if (net.isTestnet || net.chainId !== 1) return { text: "[TESTNET]", fg: tokens.warning }
    return { text: "[MAINNET]", fg: tokens.success }
  }

  const badge = resolveBadge(network)

  const connectionIndicator = status
    ? status.connected
      ? status.blockNumber !== undefined
        ? `🟢 #${status.blockNumber.toString()}`
        : `🟢 Connected`
      : `🔴 Offline`
    : `● Connected`

  return (
    <box
      style={{
        width: "100%",
        border: true,
        borderColor: tokens.borderActive,
        backgroundColor: tokens.surface,
        paddingX: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 1,
      }}
    >
      <box style={{ flexDirection: "row", gap: 1 }}>
        <text fg={tokens.primary}>
          <b>⚡ TermiWallet</b>
        </text>
        {subtitle ? (
          <text fg={tokens.textMuted}>
            | <span fg={tokens.text}>{subtitle}</span>
          </text>
        ) : null}
      </box>

      <box style={{ flexDirection: "row", gap: 1, alignItems: "center" }}>
        <text fg={badge.fg}>
          <b>{badge.text}</b>
        </text>
        {network ? (
          <text fg={tokens.text}>
            <b>{network.name}</b> ({network.chainId})
          </text>
        ) : (
          <text fg={tokens.text}>
            <b>Ethereum Sepolia</b> (11155111)
          </text>
        )}
        <text fg={tokens.textMuted}>|</text>
        <text fg={status?.connected === false ? tokens.error : tokens.success}>
          <b>{connectionIndicator}</b>
        </text>
      </box>
    </box>
  )
}
