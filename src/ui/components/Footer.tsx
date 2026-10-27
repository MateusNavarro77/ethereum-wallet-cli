import type { ReactNode } from "react"

interface FooterProps {
  children?: ReactNode
  notification?: string | null
}

export function Footer({ children, notification }: FooterProps) {
  return (
    <box
      style={{
        width: "100%",
        border: true,
        borderColor: "#4B5563",
        paddingX: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 1,
      }}
    >
      <box style={{ flexDirection: "row", gap: 1 }}>{children}</box>

      {notification ? (
        <box>
          <text fg="#34D399">
            <b>{notification}</b>
          </text>
        </box>
      ) : null}
    </box>
  )
}

