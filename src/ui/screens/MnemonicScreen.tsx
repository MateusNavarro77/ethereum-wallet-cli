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
    stage,
    words,
    challenge,
    focusedChallengeIndex,
    errorMessage,
    setFocusedChallengeIndex,
    handleChallengeWordChange,
    proceedToVerification,
    handleVerifyAndSubmit,
    backToDisplay,
  } = useMnemonicBackup({ mnemonic, onComplete })

  useKeyboard((key) => {
    if (stage === "display") {
      if (key.name === "return" || key.name === "space") {
        proceedToVerification()
      } else if (key.name === "escape" && onCancel) {
        onCancel()
      }
    } else {
      // Stage: verify
      if (key.name === "tab") {
        setFocusedChallengeIndex((focusedChallengeIndex + 1) % challenge.length)
      } else if (key.name === "return") {
        if (focusedChallengeIndex === challenge.length - 1) {
          handleVerifyAndSubmit()
        } else {
          setFocusedChallengeIndex(focusedChallengeIndex + 1)
        }
      } else if (key.name === "escape") {
        backToDisplay()
      } else if (key.name === "up") {
        setFocusedChallengeIndex(Math.max(0, focusedChallengeIndex - 1))
      } else if (key.name === "down") {
        setFocusedChallengeIndex(Math.min(challenge.length - 1, focusedChallengeIndex + 1))
      }
    }
  })

  const cols = 3
  const numRows = words.length / cols
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
      <Header subtitle={stage === "display" ? "Backup Recovery Phrase" : "Verify Recovery Phrase"} />

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
            borderColor: stage === "display" ? "#F59E0B" : "#3B82F6",
            padding: 1,
            width: 76,
          }}
        >
          {stage === "display" ? (
            <>
              <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
                <text fg="#FBBF24">
                  <b>Backup Your Recovery Phrase (BIP-39)</b>
                </text>
                <text fg="#60A5FA">[{words.length} Words]</text>
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
                  <b>IMPORTANT:</b> Write down these {words.length} words in order and keep them safe.
                </text>
                <text fg="#D1D5DB">
                  You will be asked to confirm 3 random words in the next step to verify backup.
                </text>
              </box>

              {/* Word Grid */}
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
                  const colIndices = Array.from({ length: cols }, (_, c) => rowIndex + c * numRows)
                  return (
                    <box key={rowIndex} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      {colIndices.map((wIdx) => (
                        <box key={wIdx} style={{ width: 23, flexDirection: "row" }}>
                          <text fg="#60A5FA">{String(wIdx + 1).padStart(2, " ")}. </text>
                          <text fg="#FFFFFF"><b>{words[wIdx]}</b></text>
                        </box>
                      ))}
                    </box>
                  )
                })}
              </box>

              <box style={{ marginTop: 1, flexDirection: "row", justifyContent: "space-between" }}>
                <text fg="#9CA3AF">[Enter] Proceed to Backup Verification</text>
                {onCancel ? <text fg="#60A5FA">[Esc] Back</text> : null}
              </box>
            </>
          ) : (
            <>
              <box style={{ marginBottom: 1 }}>
                <text fg="#60A5FA">
                  <b>Verify Recovery Phrase Backup (FR-ACC-02)</b>
                </text>
              </box>

              <box
                style={{
                  border: true,
                  borderColor: "#3B82F6",
                  padding: 1,
                  marginBottom: 1,
                  flexDirection: "column",
                }}
              >
                <text fg="#D1D5DB">
                  Please enter the words corresponding to the requested positions below to confirm your backup:
                </text>
              </box>

              {/* 3 Challenge Word Inputs */}
              <box style={{ flexDirection: "column", marginBottom: 1 }}>
                {challenge.map((item, idx) => (
                  <box
                    key={item.position}
                    title={` Word #${item.position} `}
                    style={{
                      border: true,
                      borderColor: focusedChallengeIndex === idx ? "#60A5FA" : "#4B5563",
                      height: 3,
                      marginBottom: 1,
                    }}
                  >
                    <input
                      placeholder={`Enter word #${item.position}...`}
                      value={item.enteredWord}
                      onInput={(val) => handleChallengeWordChange(idx, val)}
                      focused={focusedChallengeIndex === idx}
                    />
                  </box>
                ))}
              </box>

              {errorMessage ? (
                <box style={{ marginBottom: 1 }}>
                  <text fg="#EF4444">⚠ {errorMessage}</text>
                </box>
              ) : null}

              <box style={{ marginTop: 1, flexDirection: "row", justifyContent: "space-between" }}>
                <text fg="#9CA3AF">[Tab] Next Word | [Enter] Verify & Finish</text>
                <text fg="#60A5FA">[Esc] Back to Words</text>
              </box>
            </>
          )}
        </box>
      </box>

      <Footer>
        <text fg="#9CA3AF">
          {stage === "display" ? (
            <>
              [<span fg="#10B981"><b>Enter</b></span>] Continue to Verification
              {onCancel ? <>  |  [<span fg="#EF4444"><b>Esc</b></span>] Back</> : null}
            </>
          ) : (
            <>
              [<span fg="#60A5FA"><b>Tab</b></span>] Next Word  |  [<span fg="#10B981"><b>Enter</b></span>] Verify & Save  |  [<span fg="#EF4444"><b>Esc</b></span>] Review Words
            </>
          )}
        </text>
      </Footer>
    </box>
  )
}
