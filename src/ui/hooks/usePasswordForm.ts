import { useState, useCallback, useMemo } from "react"
import { useService } from "../context.js"
import type { PasswordAssessment } from "../../core/interfaces.js"

export interface StrengthDisplay {
  bar: string
  color: string
  label: string
}

export interface UsePasswordFormOptions {
  onComplete: (password: string) => void
  minLength?: number
}

export interface UsePasswordFormResult {
  password: string
  setPassword: (val: string) => void
  confirmPassword: string
  setConfirmPassword: (val: string) => void
  focusedField: "password" | "confirm"
  setFocusedField: (field: "password" | "confirm" | ((prev: "password" | "confirm") => "password" | "confirm")) => void
  toggleFocus: () => void
  errorMessage: string
  setErrorMessage: (msg: string) => void
  assessment: PasswordAssessment
  strength: StrengthDisplay
  handleProceed: () => void
}

const STRENGTH_BARS = ["░░░░", "█░░░", "██░░", "███░", "████"]
const STRENGTH_COLORS = ["#888888", "#EF4444", "#F59E0B", "#10B981", "#059669"]
const STRENGTH_LABALS = ["Too Weak", "Weak", "Fair", "Good", "Strong"]

/**
 * Custom hook for master password creation, confirmation, and strength assessment.
 */
export function usePasswordForm({
  onComplete,
  minLength = 8,
}: UsePasswordFormOptions): UsePasswordFormResult {
  const cryptoService = useService("cryptoService")

  const [password, setPasswordState] = useState("")
  const [confirmPassword, setConfirmPasswordState] = useState("")
  const [focusedField, setFocusedField] = useState<"password" | "confirm">("password")
  const [errorMessage, setErrorMessage] = useState("")

  const setPassword = useCallback((val: string) => {
    setPasswordState(val)
    setErrorMessage("")
  }, [])

  const setConfirmPassword = useCallback((val: string) => {
    setConfirmPasswordState(val)
    setErrorMessage("")
  }, [])

  const toggleFocus = useCallback(() => {
    setFocusedField((prev) => (prev === "password" ? "confirm" : "password"))
  }, [])

  // Derived state: calculate assessment during render without extra effects
  const assessment = useMemo(() => {
    return cryptoService.assessPasswordStrength(password)
  }, [cryptoService, password])

  // Derived strength display object
  const strength = useMemo<StrengthDisplay>(() => {
    const score = Math.max(0, Math.min(4, assessment.score))
    return {
      bar: STRENGTH_BARS[score] ?? "░░░░",
      color: STRENGTH_COLORS[score] ?? "#888888",
      label: STRENGTH_LABALS[score] ?? "",
    }
  }, [assessment.score])

  const handleProceed = useCallback(() => {
    if (password.length < minLength) {
      setErrorMessage(`Password must be at least ${minLength} characters long`)
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match")
      return
    }
    setErrorMessage("")
    onComplete(password)
  }, [password, confirmPassword, minLength, onComplete])

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    focusedField,
    setFocusedField,
    toggleFocus,
    errorMessage,
    setErrorMessage,
    assessment,
    strength,
    handleProceed,
  }
}
