import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { LogoBanner } from "../components/LogoBanner.js"
import { HotkeyButton } from "../components/HotkeyButton.js"

interface WelcomeScreenProps {
  onCreateNew: (wordCount?: 12 | 24) => void
  onImport: () => void
}

export function WelcomeScreen({ onCreateNew, onImport }: WelcomeScreenProps) {
  const renderer = useRenderer()
  const [selectingWordCount, setSelectingWordCount] = useState(false)
  const [selectedOption, setSelectedOption] = useState(0)
  const activateOption = (index: number) => selectingWordCount
    ? onCreateNew(index === 0 ? 12 : 24)
    : index === 0 ? setSelectingWordCount(true) : onImport()

  useKeyboard((key) => {
    if (selectingWordCount) {
      if (["up", "down", "left", "right"].includes(key.name)) {
        setSelectedOption((prev) => prev === 0 ? 1 : 0)
      } else if (key.name === "return" || key.name === "space") {
        activateOption(selectedOption)
      } else if (key.name === "1") {
        onCreateNew(12)
      } else if (key.name === "2") {
        onCreateNew(24)
      } else if (key.name === "escape") {
        setSelectingWordCount(false)
      }
    } else {
      if (["up", "down", "left", "right"].includes(key.name)) {
        setSelectedOption((prev) => prev === 0 ? 1 : 0)
      } else if (key.name === "return" || key.name === "space") {
        activateOption(selectedOption)
      } else if (key.name === "1") {
        setSelectingWordCount(true)
      } else if (key.name === "2") {
        onImport()
      } else if (key.name === "q" || key.name === "Q" || key.name === "escape") {
        renderer.destroy()
        process.exit(0)
      }
    }
  })

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Header subtitle="Welcome" />

      <box
        style={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <box
          style={{
            width: 72,
            border: true,
            borderColor: "#3B82F6",
            padding: 1,
            flexDirection: "column",
          }}
        >
          <LogoBanner
            subtitle="Welcome to TermiWallet"
            description="A keyboard-driven Ethereum terminal wallet for Sepolia testnet."
          />

          {!selectingWordCount ? (
            <box
              style={{
                border: true,
                borderColor: "#4B5563",
                padding: 1,
                flexDirection: "column",
                marginBottom: 1,
              }}
            >
              <box onMouseDown={() => activateOption(0)} onMouseOver={() => setSelectedOption(0)} style={{ flexDirection: "row", marginBottom: 1, backgroundColor: selectedOption === 0 ? "#1F2937" : "transparent" }}>
                <text fg="#34D399">
                  <b>[1] Create New Wallet</b>
                </text>
                <text fg="#9CA3AF"> - Generate 12 or 24 words</text>
              </box>

              <box onMouseDown={() => activateOption(1)} onMouseOver={() => setSelectedOption(1)} style={{ flexDirection: "row", backgroundColor: selectedOption === 1 ? "#1F2937" : "transparent" }}>
                <text fg="#60A5FA">
                  <b>[2] Import from Mnemonic</b>
                </text>
                <text fg="#9CA3AF"> - Restore 12 or 24 words</text>
              </box>
            </box>
          ) : (
            <box
              style={{
                border: true,
                borderColor: "#F59E0B",
                padding: 1,
                flexDirection: "column",
                marginBottom: 1,
              }}
            >
              <box style={{ marginBottom: 1 }}>
                <text fg="#FBBF24">
                  <b>Select Recovery Phrase Length (FR-ACC-01)</b>
                </text>
              </box>

              <box onMouseDown={() => activateOption(0)} onMouseOver={() => setSelectedOption(0)} style={{ flexDirection: "row", marginBottom: 1, backgroundColor: selectedOption === 0 ? "#1F2937" : "transparent" }}>
                <text fg="#34D399">
                  <b>[1] 12 Words</b>
                </text>
                <text fg="#9CA3AF"> - Standard security (128-bit entropy)</text>
              </box>

              <box onMouseDown={() => activateOption(1)} onMouseOver={() => setSelectedOption(1)} style={{ flexDirection: "row", backgroundColor: selectedOption === 1 ? "#1F2937" : "transparent" }}>
                <text fg="#60A5FA">
                  <b>[2] 24 Words</b>
                </text>
                <text fg="#9CA3AF"> - High security (256-bit entropy)</text>
              </box>
            </box>
          )}

          <box style={{ alignItems: "center" }}>
            <text fg="#9CA3AF">
              {selectingWordCount
                ? "Use ↑/↓ and Enter, click an option, or press 1/2. Esc goes back."
                : "Use ↑/↓ and Enter, click an option, or press 1/2."}
            </text>
          </box>
        </box>
      </box>

      <Footer>
        <box style={{ flexDirection: "row", gap: 1 }}>
          {selectingWordCount ? <><HotkeyButton onPress={() => onCreateNew(12)} color="#34D399">[1] 12 Words</HotkeyButton><HotkeyButton onPress={() => onCreateNew(24)}>[2] 24 Words</HotkeyButton><HotkeyButton onPress={() => setSelectingWordCount(false)} color="#EF4444">[Esc] Back</HotkeyButton></> : <><HotkeyButton onPress={() => setSelectingWordCount(true)}>[1] Create New</HotkeyButton><HotkeyButton onPress={onImport}>[2] Import</HotkeyButton><HotkeyButton onPress={() => { renderer.destroy(); process.exit(0) }} color="#EF4444">[Q] Quit</HotkeyButton></>}
        </box>
      </Footer>
    </box>
  )
}
