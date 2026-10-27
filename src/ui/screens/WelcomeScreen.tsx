import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { LogoBanner } from "../components/LogoBanner.js"

interface WelcomeScreenProps {
  onCreateNew: (wordCount?: 12 | 24) => void
  onImport: () => void
}

export function WelcomeScreen({ onCreateNew, onImport }: WelcomeScreenProps) {
  const renderer = useRenderer()
  const [selectingWordCount, setSelectingWordCount] = useState(false)

  useKeyboard((key) => {
    if (selectingWordCount) {
      if (key.name === "1") {
        onCreateNew(12)
      } else if (key.name === "2") {
        onCreateNew(24)
      } else if (key.name === "escape") {
        setSelectingWordCount(false)
      }
    } else {
      if (key.name === "1") {
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
              <box style={{ flexDirection: "row", marginBottom: 1 }}>
                <text fg="#34D399">
                  <b>[1] Create New Wallet</b>
                </text>
                <text fg="#9CA3AF"> - Generate 12 or 24 words</text>
              </box>

              <box style={{ flexDirection: "row" }}>
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

              <box style={{ flexDirection: "row", marginBottom: 1 }}>
                <text fg="#34D399">
                  <b>[1] 12 Words</b>
                </text>
                <text fg="#9CA3AF"> - Standard security (128-bit entropy)</text>
              </box>

              <box style={{ flexDirection: "row" }}>
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
                ? "Press [1] for 12 words, [2] for 24 words, or [Esc] to go back"
                : "Press [1] or [2] on your keyboard to continue"}
            </text>
          </box>
        </box>
      </box>

      <Footer>
        <text fg="#9CA3AF">
          {selectingWordCount ? (
            <>
              [<span fg="#34D399"><b>1</b></span>] 12 Words  |  [<span fg="#60A5FA"><b>2</b></span>] 24 Words  |  [<span fg="#EF4444"><b>Esc</b></span>] Back
            </>
          ) : (
            <>
              [<span fg="#60A5FA"><b>1</b></span>] Create New  |  [<span fg="#60A5FA"><b>2</b></span>] Import  |  [<span fg="#EF4444"><b>Q</b></span>] Quit
            </>
          )}
        </text>
      </Footer>
    </box>
  )
}
