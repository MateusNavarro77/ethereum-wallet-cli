interface HeaderProps {
  subtitle?: string
}

export function Header({ subtitle }: HeaderProps) {
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

      <box style={{ flexDirection: "row", gap: 1 }}>
        <text fg="#34D399">
          ● <b>Ethereum Sepolia</b> (11155111)
        </text>
      </box>
    </box>
  )
}

