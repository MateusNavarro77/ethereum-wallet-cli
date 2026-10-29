import type { ASCIIFontName } from "@opentui/core"
import { useTheme } from "../context.js"

interface LogoBannerProps {
  text?: string
  font?: ASCIIFontName
  color?: string
  subtitle?: string
  description?: string
}

export function LogoBanner({
  text = "TermiWallet",
  font = "tiny",
  color,
  subtitle,
  description,
}: LogoBannerProps) {
  const { tokens } = useTheme()
  const bannerColor = color || tokens.primary

  return (
    <box
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 1,
      }}
    >
      <ascii-font text={text} font={font} color={bannerColor} />
      {subtitle ? (
        <box style={{ marginTop: 1, alignItems: "center" }}>
          <text fg={tokens.secondary}>
            <b>{subtitle}</b>
          </text>
        </box>
      ) : null}
      {description ? (
        <box style={{ marginTop: subtitle ? 0 : 1, alignItems: "center" }}>
          <text fg={tokens.textMuted}>{description}</text>
        </box>
      ) : null}
    </box>
  )
}
