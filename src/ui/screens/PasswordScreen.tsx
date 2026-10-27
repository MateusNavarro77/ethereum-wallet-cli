import { useKeyboard } from "@opentui/react"
import { Header } from "../components/Header.js"
import { Footer } from "../components/Footer.js"
import { usePasswordForm } from "../hooks/index.js"

interface PasswordScreenProps {
  onComplete: (password: string) => void
  onCancel?: () => void
  title?: string
}

export function PasswordScreen({
  onComplete,
  onCancel,
  title = "Set Master Password",
}: PasswordScreenProps) {
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    focusedField,
    setFocusedField,
    toggleFocus,
    errorMessage,
    strength,
    handleProceed,
  } = usePasswordForm({ onComplete })

  useKeyboard((key) => {
    if (key.name === "tab" || key.name === "down" || key.name === "up") {
      toggleFocus()
    } else if (key.name === "return") {
      if (focusedField === "password" && password.length >= 8) {
        setFocusedField("confirm")
      } else {
        handleProceed()
      }
    } else if (key.name === "escape" && onCancel) {
      onCancel()
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
      <Header subtitle={title} />

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
            borderColor: "#3B82F6",
            padding: 1,
            width: 68,
          }}
        >
          <box style={{ marginBottom: 1 }}>
            <text fg="#60A5FA">
              <b>{title}</b>
            </text>
          </box>

          <box style={{ marginBottom: 1 }}>
            <text fg="#D1D5DB">
              Choose a secure password to encrypt your wallet vault locally.
            </text>
          </box>

          {/* Password Field */}
          <box
            title=" Wallet Password "
            style={{
              border: true,
              borderColor: focusedField === "password" ? "#60A5FA" : "#4B5563",
              height: 3,
              marginBottom: 1,
            }}
          >
            <input
              placeholder="Enter master password (min 8 characters)..."
              value={password}
              onInput={setPassword}
              onSubmit={handleProceed}
              focused={focusedField === "password"}
            />
          </box>

          {/* Confirm Password Field */}
          <box
            title=" Confirm Password "
            style={{
              border: true,
              borderColor: focusedField === "confirm" ? "#60A5FA" : "#4B5563",
              height: 3,
              marginBottom: 1,
            }}
          >
            <input
              placeholder="Re-enter password to confirm..."
              value={confirmPassword}
              onInput={setConfirmPassword}
              onSubmit={handleProceed}
              focused={focusedField === "confirm"}
            />
          </box>

          {/* Strength & Feedback */}
          <box style={{ flexDirection: "row", marginBottom: 1, gap: 1 }}>
            <text fg="#9CA3AF">Strength: </text>
            <text fg={strength.color}>{strength.bar}</text>
            <text fg={strength.color}> ({strength.label})</text>
          </box>

          {errorMessage ? (
            <box style={{ marginBottom: 1 }}>
              <text fg="#EF4444">⚠ {errorMessage}</text>
            </box>
          ) : null}

          <box style={{ marginTop: 1, flexDirection: "row", justifyContent: "space-between" }}>
            <text fg="#9CA3AF">[Tab] Switch field | [Enter] Continue</text>
            {onCancel ? <text fg="#60A5FA">[Esc] Back</text> : null}
          </box>
        </box>
      </box>

      <Footer>
        <text fg="#9CA3AF">
          [<span fg="#60A5FA"><b>Tab</b></span>] Switch Field  |  [<span fg="#10B981"><b>Enter</b></span>] Continue
          {onCancel ? <>  |  [<span fg="#EF4444"><b>Esc</b></span>] Back</> : null}
        </text>
      </Footer>
    </box>
  )
}
