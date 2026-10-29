import { useState, type ReactNode } from "react"
import { useTheme } from "../context.js"

interface HotkeyButtonProps {
  children: ReactNode
  onPress: () => void
  color?: string
}

export function HotkeyButton({ children, onPress, color }: HotkeyButtonProps) {
  const [hovered, setHovered] = useState(false)
  const { tokens } = useTheme()

  const defaultFg = color || tokens.secondary

  return (
    <box
      onMouseDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        onPress()
      }}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
      style={{ backgroundColor: hovered ? tokens.surface : "transparent" }}
    >
      <text selectable={false} fg={hovered ? tokens.text : defaultFg}>
        {children}
      </text>
    </box>
  )
}
