import type { ReactNode } from "react"
import { useTheme } from "../context.js"

interface FooterProps {
  children?: ReactNode
  notification?: string | null
}

export function Footer({ children, notification }: FooterProps) {
  const { tokens } = useTheme()

  return (
    <box
      style={{
        width: "100%",
        border: true,
        borderColor: tokens.border,
        backgroundColor: tokens.surface,
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
          <text fg={tokens.success}>
            <b>{notification}</b>
          </text>
        </box>
      ) : null}
    </box>
  )
}
