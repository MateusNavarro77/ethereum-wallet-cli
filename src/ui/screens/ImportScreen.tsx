import { useKeyboard } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { useImportMnemonic } from "../hooks/index.js"

interface ImportScreenProps {
  onComplete: (mnemonic: string) => void
  onCancel: () => void
}

export function ImportScreen({ onComplete, onCancel }: ImportScreenProps) {
  const {
    wordCount,
    words,
    focusedIndex,
    errorMessage,
    setFocusedIndex,
    toggleWordCount,
    handleWordChange,
    handleProceed,
  } = useImportMnemonic({ onComplete })

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel()
    } else if (key.name === "tab") {
      setFocusedIndex((prev) => (prev + 1) % wordCount)
    } else if (key.name === "return") {
      if (focusedIndex === wordCount - 1) {
        handleProceed()
      } else {
        setFocusedIndex((prev) => (prev + 1) % wordCount)
      }
    } else if (key.name === "down") {
      setFocusedIndex((prev) => (prev + 1 < wordCount ? prev + 1 : prev))
    } else if (key.name === "up") {
      setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev))
    }
  })

  // Arrange into rows and columns
  // For 12 words: 4 rows x 3 cols
  // For 24 words: 8 rows x 3 cols
  const cols = 3
  const numRows = wordCount / cols
  const rows = Array.from({ length: numRows }, (_, i) => i)

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Header subtitle="Import from Mnemonic" />

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
            width: 78,
            border: true,
            borderColor: "#3B82F6",
            padding: 1,
            flexDirection: "column",
          }}
        >
          <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
            <text fg="#60A5FA">
              <b>Enter Your {wordCount}-Word Recovery Phrase</b>
            </text>
            <text fg="#34D399">[{wordCount} Words]</text>
          </box>

          <box style={{ marginBottom: 1 }}>
            <text fg="#9CA3AF">
              Tip: Paste entire phrase into #1 to auto-split. Press [T] to toggle 12/24 words.
            </text>
          </box>

          {/* Numbered Inputs arranged in 3 columns */}
          <box style={{ flexDirection: "column", marginBottom: 1 }}>
            {rows.map((r) => {
              const colIndices = Array.from({ length: cols }, (_, c) => r + c * numRows)

              return (
                <box key={r} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
                  {colIndices.map((idx) => (
                    <box
                      key={idx}
                      title={` #${String(idx + 1).padStart(2, " ")} `}
                      style={{
                        border: true,
                        borderColor: focusedIndex === idx ? "#60A5FA" : "#4B5563",
                        width: 24,
                        height: 3,
                      }}
                    >
                      <input
                        value={words[idx] || ""}
                        onInput={(val) => handleWordChange(idx, val)}
                        focused={focusedIndex === idx}
                        placeholder="..."
                      />
                    </box>
                  ))}
                </box>
              )
            })}
          </box>

          {errorMessage ? (
            <box style={{ marginBottom: 1 }}>
              <text fg="#EF4444">⚠ {errorMessage}</text>
            </box>
          ) : null}

          <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <text fg="#9CA3AF">[Tab] Next | [Enter] Continue</text>
            <text fg="#60A5FA">[Esc] Back</text>
          </box>
        </box>
      </box>

      <Footer>
        <text fg="#9CA3AF">
          [<span fg="#60A5FA"><b>Tab</b></span>] Next Field  |  [<span fg="#10B981"><b>Enter</b></span>] Submit  |  [<span fg="#34D399"><b>T</b></span>] Toggle 12/24  |  [<span fg="#EF4444"><b>Esc</b></span>] Back
        </text>
      </Footer>
    </box>
  )
}
