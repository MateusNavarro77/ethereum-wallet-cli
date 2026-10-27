import { useKeyboard } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { useMnemonicBackup } from "../hooks/index.js"

interface MnemonicScreenProps {
  mnemonic: string
  onComplete: () => void
  onCancel?: () => void
}

export function MnemonicScreen({ mnemonic, onComplete, onCancel }: MnemonicScreenProps) {
  const {
    backedUp,
    toggleBackedUp,
    errorMessage,
    words,
    handleContinue,
  } = useMnemonicBackup({ mnemonic, onComplete })

  useKeyboard((key) => {
    if (key.name === "space") {
      toggleBackedUp()
    } else if (key.name === "return") {
      handleContinue()
    } else if (key.name === "escape" && onCancel) {
      onCancel()
    }
  })

  // Group into columns of 4 rows x 3 columns
  const rows = [0, 1, 2, 3]

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Header subtitle="Backup Recovery Phrase" />

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
            flexDirection: "column",
            border: true,
            borderColor: "#F59E0B",
            padding: 1,
            width: 76,
          }}
        >
          <box style={{ marginBottom: 1 }}>
            <text fg="#FBBF24">
              <b>Backup Your Recovery Phrase (BIP-39)</b>
            </text>
          </box>

          {/* Warning Box */}
          <box
            style={{
              border: true,
              borderColor: "#EF4444",
              backgroundColor: "#1F1D1D",
              padding: 1,
              marginBottom: 1,
              flexDirection: "column",
            }}
          >
            <text fg="#F87171">
              <b>IMPORTANT:</b> Write down these 12 words in order and keep them safe.
            </text>
            <text fg="#D1D5DB">
              Anyone who has this recovery phrase can steal your funds. Never share it!
            </text>
          </box>

          {/* 12-Word Grid */}
          <box
            title=" Recovery Phrase "
            style={{
              border: true,
              borderColor: "#FBBF24",
              padding: 1,
              flexDirection: "column",
              marginBottom: 1,
            }}
          >
            {rows.map((rowIndex) => {
              const w1 = rowIndex
              const w2 = rowIndex + 4
              const w3 = rowIndex + 8
              return (
                <box key={rowIndex} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <box style={{ width: 23, flexDirection: "row" }}>
                    <text fg="#60A5FA">{String(w1 + 1).padStart(2, " ")}. </text>
                    <text fg="#FFFFFF"><b>{words[w1]}</b></text>
                  </box>
                  <box style={{ width: 23, flexDirection: "row" }}>
                    <text fg="#60A5FA">{String(w2 + 1).padStart(2, " ")}. </text>
                    <text fg="#FFFFFF"><b>{words[w2]}</b></text>
                  </box>
                  <box style={{ width: 23, flexDirection: "row" }}>
                    <text fg="#60A5FA">{String(w3 + 1).padStart(2, " ")}. </text>
                    <text fg="#FFFFFF"><b>{words[w3]}</b></text>
                  </box>
                </box>
              )
            })}
          </box>

          {/* Checkbox confirmation */}
          <box style={{ flexDirection: "row", marginBottom: 1, gap: 1 }}>
            <text fg={backedUp ? "#10B981" : "#F59E0B"}>
              {backedUp ? "[✔]" : "[ ]"}
            </text>
            <text fg={backedUp ? "#10B981" : "#E5E7EB"}>
              <b> I have safely backed up my 12-word recovery phrase</b>
            </text>
          </box>

          {errorMessage ? (
            <box style={{ marginBottom: 1 }}>
              <text fg="#EF4444">⚠ {errorMessage}</text>
            </box>
          ) : null}

          <box style={{ marginTop: 1, flexDirection: "row", justifyContent: "space-between" }}>
            <text fg="#9CA3AF">[Space] Toggle confirmation | [Enter] Create Wallet</text>
            {onCancel ? <text fg="#60A5FA">[Esc] Back</text> : null}
          </box>
        </box>
      </box>

      <Footer>
        <text fg="#9CA3AF">
          [<span fg="#60A5FA"><b>Space</b></span>] Toggle Checkbox  |  [<span fg="#10B981"><b>Enter</b></span>] Complete Setup
          {onCancel ? <>  |  [<span fg="#EF4444"><b>Esc</b></span>] Back</> : null}
        </text>
      </Footer>
    </box>
  )
}
