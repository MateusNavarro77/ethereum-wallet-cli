import { useState, type ReactNode } from "react"

interface HotkeyButtonProps {
  children: ReactNode
  onPress: () => void
  color?: string
}

export function HotkeyButton({ children, onPress, color = "#60A5FA" }: HotkeyButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <box
      onMouseDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        onPress()
      }}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
      style={{ backgroundColor: hovered ? "#1F2937" : "transparent" }}
    >
      <text selectable={false} fg={hovered ? "#FFFFFF" : color}>{children}</text>
    </box>
  )
}
