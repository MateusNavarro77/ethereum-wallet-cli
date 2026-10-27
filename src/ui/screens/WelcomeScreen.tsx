import { useKeyboard, useRenderer } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"

interface WelcomeScreenProps {
  onCreateNew: () => void
  onImport: () => void
}

export function WelcomeScreen({ onCreateNew, onImport }: WelcomeScreenProps) {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "1") {
      onCreateNew()
    } else if (key.name === "2") {
      onImport()
    } else if (key.name === "q" || key.name === "Q" || key.name === "escape") {
      renderer.destroy()
      process.exit(0)
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
            width: 64,
            border: true,
            borderColor: "#3B82F6",
            padding: 1,
            flexDirection: "column",
          }}
        >
          <box style={{ marginBottom: 1, alignItems: "center" }}>
            <text fg="#60A5FA">
              <b>Welcome to TermiWallet</b>
            </text>
          </box>

          <box style={{ marginBottom: 1 }}>
            <text fg="#D1D5DB">
              A keyboard-driven Ethereum terminal wallet for Sepolia testnet.
            </text>
          </box>

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
              <text fg="#9CA3AF"> - Generate fresh 12-word recovery phrase</text>
            </box>

            <box style={{ flexDirection: "row" }}>
              <text fg="#60A5FA">
                <b>[2] Import from Mnemonic</b>
              </text>
              <text fg="#9CA3AF"> - Restore from existing 12 words</text>
            </box>
          </box>

          <box style={{ alignItems: "center" }}>
            <text fg="#9CA3AF">Press [1] or [2] on your keyboard to continue</text>
          </box>
        </box>
      </box>

      <Footer>
        <text fg="#9CA3AF">
          [<span fg="#60A5FA"><b>1</b></span>] Create New  |  [<span fg="#60A5FA"><b>2</b></span>] Import  |  [<span fg="#EF4444"><b>Q</b></span>] Quit
        </text>
      </Footer>
    </box>
  )
}

