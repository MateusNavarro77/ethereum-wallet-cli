import type { ASCIIFontName } from "@opentui/core"

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
  color = "#60A5FA",
  subtitle,
  description,
}: LogoBannerProps) {
  return (
    <box
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 1,
      }}
    >
      <ascii-font text={text} font={font} color={color} />
      {subtitle ? (
        <box style={{ marginTop: 1, alignItems: "center" }}>
          <text fg="#60A5FA">
            <b>{subtitle}</b>
          </text>
        </box>
      ) : null}
      {description ? (
        <box style={{ marginTop: subtitle ? 0 : 1, alignItems: "center" }}>
          <text fg="#D1D5DB">{description}</text>
        </box>
      ) : null}
    </box>
  )
}
