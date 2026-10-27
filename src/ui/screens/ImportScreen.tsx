import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { useService } from "../context.js"

interface ImportScreenProps {
  onComplete: (mnemonic: string) => void
  onCancel: () => void
}

export function ImportScreen({ onComplete, onCancel }: ImportScreenProps) {
  const walletService = useService("walletService")
  const [words, setWords] = useState<string[]>(Array(12).fill(""))
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")

  const handleWordChange = (index: number, val: string) => {
    setErrorMessage("")
    const trimmed = val.trim()

    // If user pasted or typed multiple words separated by whitespace
    if (trimmed.includes(" ")) {
      const splitWords = trimmed.split(/\s+/).filter(Boolean)
      setWords((prev) => {
        const next = [...prev]
        for (let i = 0; i < splitWords.length && index + i < 12; i++) {
          next[index + i] = splitWords[i].toLowerCase()
        }
        return next
      })
      const nextIndex = Math.min(11, index + splitWords.length)
      setFocusedIndex(nextIndex)
      return
    }

    setWords((prev) => {
      const next = [...prev]
      next[index] = val.toLowerCase().trim()
      return next
    })
  }

  const handleProceed = () => {
    const fullPhrase = words.map((w) => w.trim().toLowerCase()).join(" ")
    const filledCount = words.filter((w) => w.trim().length > 0).length

    if (filledCount < 12) {
      setErrorMessage(`Please enter all 12 words (${filledCount}/12 filled)`)
      return
    }

    const isValid = walletService.validateMnemonic(fullPhrase)
    if (!isValid) {
      setErrorMessage("Invalid BIP-39 mnemonic phrase. Check for typos or invalid words.")
      return
    }

    onComplete(fullPhrase)
  }

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel()
    } else if (key.name === "tab") {
      setFocusedIndex((prev) => (prev + 1) % 12)
    } else if (key.name === "return") {
      if (focusedIndex === 11) {
        handleProceed()
      } else {
        setFocusedIndex((prev) => (prev + 1) % 12)
      }
    } else if (key.name === "down") {
      setFocusedIndex((prev) => (prev + 1 < 12 ? prev + 1 : prev))
    } else if (key.name === "up") {
      setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev))
    }
  })

  // 4 rows x 3 columns
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
          <box style={{ marginBottom: 1 }}>
            <text fg="#60A5FA">
              <b>Enter Your 12-Word Recovery Phrase</b>
            </text>
          </box>

          <box style={{ marginBottom: 1 }}>
            <text fg="#9CA3AF">
              Tip: You can paste your entire 12-word phrase into word #1 to auto-fill all boxes.
            </text>
          </box>

          {/* 12 Numbered Inputs arranged in 3 columns */}
          <box style={{ flexDirection: "column", marginBottom: 1 }}>
            {rows.map((r) => {
              const col1 = r
              const col2 = r + 4
              const col3 = r + 8

              return (
                <box key={r} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
                  {/* Col 1 */}
                  <box
                    title={` #${String(col1 + 1).padStart(2, " ")} `}
                    style={{
                      border: true,
                      borderColor: focusedIndex === col1 ? "#60A5FA" : "#4B5563",
                      width: 24,
                      height: 3,
                    }}
                  >
                    <input
                      placeholder="word..."
                      value={words[col1]}
                      onInput={(val) => handleWordChange(col1, val)}
                      onSubmit={() => setFocusedIndex((prev) => (prev + 1) % 12)}
                      focused={focusedIndex === col1}
                    />
                  </box>

                  {/* Col 2 */}
                  <box
                    title={` #${String(col2 + 1).padStart(2, " ")} `}
                    style={{
                      border: true,
                      borderColor: focusedIndex === col2 ? "#60A5FA" : "#4B5563",
                      width: 24,
                      height: 3,
                    }}
                  >
                    <input
                      placeholder="word..."
                      value={words[col2]}
                      onInput={(val) => handleWordChange(col2, val)}
                      onSubmit={() => setFocusedIndex((prev) => (prev + 1) % 12)}
                      focused={focusedIndex === col2}
                    />
                  </box>

                  {/* Col 3 */}
                  <box
                    title={` #${String(col3 + 1).padStart(2, " ")} `}
                    style={{
                      border: true,
                      borderColor: focusedIndex === col3 ? "#60A5FA" : "#4B5563",
                      width: 24,
                      height: 3,
                    }}
                  >
                    <input
                      placeholder="word..."
                      value={words[col3]}
                      onInput={(val) => handleWordChange(col3, val)}
                      onSubmit={() => {
                        if (col3 === 11) handleProceed()
                        else setFocusedIndex((prev) => (prev + 1) % 12)
                      }}
                      focused={focusedIndex === col3}
                    />
                  </box>
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
            <text fg="#9CA3AF">[Tab] Next word | [Enter] Continue</text>
            <text fg="#60A5FA">[Esc] Back to Welcome</text>
          </box>
        </box>
      </box>

      <Footer>
        <text fg="#9CA3AF">
          [<span fg="#60A5FA"><b>Tab</b></span>] Next Word  |  [<span fg="#10B981"><b>Enter</b></span>] Validate & Continue  |  [<span fg="#EF4444"><b>Esc</b></span>] Back
        </text>
      </Footer>
    </box>
  )
}

