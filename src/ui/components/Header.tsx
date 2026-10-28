import { useService } from "../context.js"
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

  const network = propNetwork || (networkService ? networkService.getActiveNetwork() : rpcService?.getNetwork())
  const status = propStatus

  const resolveBadge = (net?: NetworkConfig) => {
    if (!net) return { text: "[TESTNET]", fg: "#FBBF24" }
    if (net.isLocal) return { text: "[LOCAL]", fg: "#22D3EE" }
    if (net.isTestnet || net.chainId !== 1) return { text: "[TESTNET]", fg: "#FBBF24" }
    return { text: "[MAINNET]", fg: "#34D399" }
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
        borderColor: "#3B82F6",
        paddingX: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 1,
      }}
    >
      <box style={{ flexDirection: "row", gap: 1 }}>
        <text fg="#60A5FA">
          <b>⚡ TermiWallet</b>
        </text>
        {subtitle ? (
          <text fg="#9CA3AF">
            | <span fg="#E5E7EB">{subtitle}</span>
          </text>
        ) : null}
      </box>

      <box style={{ flexDirection: "row", gap: 1, alignItems: "center" }}>
        <text fg={badge.fg}>
          <b>{badge.text}</b>
        </text>
        {network ? (
          <text fg="#FFFFFF">
            <b>{network.name}</b> ({network.chainId})
          </text>
        ) : (
          <text fg="#FFFFFF">
            <b>Ethereum Sepolia</b> (11155111)
          </text>
        )}
        <text fg="#9CA3AF">|</text>
        <text fg={status?.connected === false ? "#EF4444" : "#34D399"}>
          <b>{connectionIndicator}</b>
        </text>
      </box>
    </box>
  )
}
