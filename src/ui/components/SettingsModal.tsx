import { useState, useEffect } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../context.js"
import { HotkeyButton } from "./HotkeyButton.js"

export interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    tokens,
    availableThemes,
    activeThemeId,
    previewTheme,
    revertPreview,
    setTheme,
  } = useTheme()

  const initialIndex = availableThemes.findIndex((t) => t.id === activeThemeId)
  const [selectedIndex, setSelectedIndex] = useState(initialIndex >= 0 ? initialIndex : 0)

  // Preview the theme on selection change
  useEffect(() => {
    const selectedTheme = availableThemes[selectedIndex]
    if (selectedTheme) {
      previewTheme(selectedTheme.id)
    }
  }, [selectedIndex, availableThemes, previewTheme])

  useKeyboard((key) => {
    if (key.name === "escape" || key.name === "q" || key.name === "Q") {
      revertPreview()
      onClose()
    } else if (key.name === "up" || key.name === "k") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : availableThemes.length - 1))
    } else if (key.name === "down" || key.name === "j") {
      setSelectedIndex((prev) => (prev < availableThemes.length - 1 ? prev + 1 : 0))
    } else if (key.name === "return" || key.name === "enter") {
      const selected = availableThemes[selectedIndex]
      if (selected) {
        setTheme(selected.id)
      }
      onClose()
    }
  })

  const currentTheme = availableThemes[selectedIndex]

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
      }}
    >
      <box
        style={{
          width: 76,
          border: true,
          borderColor: tokens.borderActive,
          
          paddingX: 2,
          paddingY: 1,
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <box
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 1,
          }}
        >
          <text fg={tokens.primary}>
            <b>⚙ Settings & Theme Selector</b>
          </text>
          <text fg={tokens.textMuted}>[Esc] Cancel</text>
        </box>

        {/* Section title & instructions */}
        <box style={{ marginBottom: 1, flexDirection: "column" }}>
          <text fg={tokens.text}>
            <b>Choose Color Theme:</b>
          </text>
          <text fg={tokens.textMuted}>
            Navigate with <span fg={tokens.accent}>↑/↓</span> to preview live. Press <span fg={tokens.success}>Enter</span> to apply.
          </text>
        </box>

        {/* Themes List */}
        <box
          style={{
            flexDirection: "column",
            border: true,
            borderColor: tokens.borderSubtle,
            backgroundColor: tokens.surface,
            paddingX: 1,
            paddingY: 1,
            marginBottom: 1,
          }}
        >
          {availableThemes.map((t, idx) => {
            const isFocused = idx === selectedIndex
            const isConfirmedActive = t.id === activeThemeId

            return (
              <box
                key={t.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingX: 1,
                  backgroundColor: isFocused ? tokens.selectionBg : "transparent",
                }}
              >
                <box style={{ flexDirection: "row", gap: 1 }}>
                  <text fg={isFocused ? tokens.selectionFg : tokens.textMuted}>
                    {isFocused ? "▶" : " "}
                  </text>
                  <text fg={isConfirmedActive ? tokens.success : tokens.textSubtle}>
                    {isConfirmedActive ? "●" : "○"}
                  </text>
                  <text
                    fg={
                      isFocused
                        ? tokens.selectionFg
                        : isConfirmedActive
                          ? tokens.text
                          : tokens.textMuted
                    }
                  >
                    <b>{t.name}</b>
                    {t.isCustom ? " [Custom]" : ""}
                  </text>
                </box>

                <text fg={isFocused ? tokens.selectionFg : tokens.textSubtle}>
                  {t.id === activeThemeId ? "[Active]" : ""}
                </text>
              </box>
            )
          })}
        </box>

        {/* Theme Details & Description */}
        {currentTheme?.description && (
          <box style={{ marginBottom: 1, paddingX: 1 }}>
            <text fg={tokens.textMuted}>
              <i>{currentTheme.description}</i>
            </text>
          </box>
        )}

        {/* Live Palette Swatches Preview */}
        <box
          style={{
            flexDirection: "column",
            border: true,
            borderColor: tokens.borderSubtle,
            backgroundColor: tokens.background,
            paddingX: 1,
            paddingY: 1,
            marginBottom: 1,
          }}
        >
          <box style={{ marginBottom: 1 }}>
            <text fg={tokens.textMuted}>Live Palette Swatches:</text>
          </box>
          <box style={{ flexDirection: "row", gap: 1, flexWrap: "wrap" }}>
            <text fg={tokens.primary}>■ Primary</text>
            <text fg={tokens.secondary}>■ Secondary</text>
            <text fg={tokens.accent}>■ Accent</text>
            <text fg={tokens.success}>■ Success</text>
            <text fg={tokens.warning}>■ Warning</text>
            <text fg={tokens.error}>■ Error</text>
            <text fg={tokens.text}>■ Text</text>
            <text fg={tokens.textMuted}>■ Muted</text>
          </box>
        </box>

        {/* Actions Footer */}
        <box
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 2,
            marginTop: 1,
          }}
        >
          <HotkeyButton
            onPress={() => {
              revertPreview()
              onClose()
            }}
            color={tokens.error}
          >
            [Esc] Cancel
          </HotkeyButton>
          <HotkeyButton
            onPress={() => {
              if (currentTheme) {
                setTheme(currentTheme.id)
              }
              onClose()
            }}
            color={tokens.success}
          >
            [Enter] Apply Theme
          </HotkeyButton>
        </box>
      </box>
    </box>
  )
}
