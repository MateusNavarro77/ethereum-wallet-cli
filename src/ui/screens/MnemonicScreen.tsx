import { useKeyboard } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { HotkeyButton } from "../components/HotkeyButton.js"
import { useTheme } from "../context.js"
import { useMnemonicBackup } from "../hooks/index.js"

interface MnemonicScreenProps {
  mnemonic: string
  onComplete: () => void
  onCancel?: () => void
}

export function MnemonicScreen({ mnemonic, onComplete, onCancel }: MnemonicScreenProps) {
  const { tokens } = useTheme()
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
        backgroundColor: tokens.background,
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
            borderColor: stage === "display" ? tokens.warning : tokens.borderActive,
            backgroundColor: tokens.card,
            padding: 1,
            width: 76,
          }}
        >
          {stage === "display" ? (
            <>
              <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
                <text fg={tokens.warning}>
                  <b>Backup Your Recovery Phrase (BIP-39)</b>
                </text>
                <text fg={tokens.primary}>[{words.length} Words]</text>
              </box>

              {/* Warning Box */}
              <box
                style={{
                  border: true,
                  borderColor: tokens.error,
                  backgroundColor: tokens.surface,
                  padding: 1,
                  marginBottom: 1,
                  flexDirection: "column",
                }}
              >
                <text fg={tokens.error}>
                  <b>IMPORTANT:</b> Write down these {words.length} words in order and keep them safe.
                </text>
                <text fg={tokens.textMuted}>
                  You will be asked to confirm 3 random words in the next step to verify backup.
                </text>
              </box>

              {/* Word Grid */}
              <box
                title=" Recovery Phrase "
                style={{
                  border: true,
                  borderColor: tokens.warning,
                  backgroundColor: tokens.surface,
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
                          <text fg={tokens.primary}>{String(wIdx + 1).padStart(2, " ")}. </text>
                          <text fg={tokens.text}><b>{words[wIdx]}</b></text>
                        </box>
                      ))}
                    </box>
                  )
                })}
              </box>

              <box style={{ marginTop: 1, flexDirection: "row", justifyContent: "space-between" }}>
                <HotkeyButton onPress={proceedToVerification} color={tokens.success}>[Enter] Proceed to Backup Verification</HotkeyButton>
                {onCancel ? <HotkeyButton onPress={onCancel} color={tokens.textMuted}>[Esc] Back</HotkeyButton> : null}
              </box>
            </>
          ) : (
            <>
              <box style={{ marginBottom: 1 }}>
                <text fg={tokens.primary}>
                  <b>Verify Recovery Phrase Backup</b>
                </text>
              </box>

              <box
                style={{
                  border: true,
                  borderColor: tokens.borderActive,
                  backgroundColor: tokens.surface,
                  padding: 1,
                  marginBottom: 1,
                  flexDirection: "column",
                }}
              >
                <text fg={tokens.textMuted}>
                  Please enter the words corresponding to the requested positions below to confirm your backup:
                </text>
              </box>

              {/* 3 Challenge Word Inputs */}
              <box style={{ flexDirection: "column", marginBottom: 1 }}>
                {challenge.map((item, idx) => (
                  <box
                    key={item.position}
                    onMouseDown={() => setFocusedChallengeIndex(idx)}
                    title={` Word #${item.position} `}
                    style={{
                      border: true,
                      borderColor: focusedChallengeIndex === idx ? tokens.borderActive : tokens.border,
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
                  <text fg={tokens.error}>⚠ {errorMessage}</text>
                </box>
              ) : null}

              <box style={{ marginTop: 1, flexDirection: "row", justifyContent: "space-between" }}>
                <box style={{ flexDirection: "row", gap: 1 }}>
                  <HotkeyButton onPress={() => setFocusedChallengeIndex((focusedChallengeIndex + 1) % challenge.length)} color={tokens.secondary}>[Tab] Next Word</HotkeyButton>
                  <HotkeyButton onPress={handleVerifyAndSubmit} color={tokens.success}>[Enter] Verify & Finish</HotkeyButton>
                  <HotkeyButton onPress={backToDisplay} color={tokens.textMuted}>[Esc] Back to Words</HotkeyButton>
                </box>
              </box>
            </>
          )}
        </box>
      </box>

      <Footer>
        <box style={{ flexDirection: "row", gap: 1 }}>
          {stage === "display" ? (
            <HotkeyButton onPress={proceedToVerification} color={tokens.success}>[Enter] Continue to Verification</HotkeyButton>
          ) : (
            <>
              <HotkeyButton onPress={() => setFocusedChallengeIndex((focusedChallengeIndex + 1) % challenge.length)} color={tokens.secondary}>[Tab] Next Word</HotkeyButton>
              <HotkeyButton onPress={handleVerifyAndSubmit} color={tokens.success}>[Enter] Verify & Save</HotkeyButton>
              <HotkeyButton onPress={backToDisplay} color={tokens.error}>[Esc] Review Words</HotkeyButton>
            </>
          )}
          {stage === "display" && onCancel ? <HotkeyButton onPress={onCancel} color={tokens.error}>[Esc] Back</HotkeyButton> : null}
        </box>
      </Footer>
    </box>
  )
}
