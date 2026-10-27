import { useState, useCallback, useMemo } from "react"

export interface UseMnemonicBackupOptions {
  mnemonic: string
  onComplete: () => void
}

export interface ChallengeItem {
  index: number // 0-based
  position: number // 1-based (e.g. 3 for 3rd word)
  enteredWord: string
}

export type BackupStage = "display" | "verify"

export interface UseMnemonicBackupResult {
  stage: BackupStage
  words: string[]
  challenge: ChallengeItem[]
  focusedChallengeIndex: number
  errorMessage: string
  backedUp: boolean
  toggleBackedUp: () => void
  handleContinue: () => void
  setStage: (stage: BackupStage) => void
  setFocusedChallengeIndex: (index: number) => void
  handleChallengeWordChange: (challengeIdx: number, val: string) => void
  proceedToVerification: () => void
  handleVerifyAndSubmit: () => void
  backToDisplay: () => void
}

/**
 * Custom hook to manage recovery phrase display and 3-word verification challenge (FR-ACC-02).
 */
export function useMnemonicBackup({
  mnemonic,
  onComplete,
}: UseMnemonicBackupOptions): UseMnemonicBackupResult {
  const [stage, setStage] = useState<BackupStage>("display")
  const [backedUp, setBackedUp] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [focusedChallengeIndex, setFocusedChallengeIndex] = useState(0)

  const words = useMemo(() => {
    return mnemonic.trim().split(/\s+/).filter(Boolean)
  }, [mnemonic])

  // Generate 3 random distinct indices
  const initialChallenge = useMemo(() => {
    const total = words.length
    if (total < 3) return []
    const indices: number[] = []
    while (indices.length < 3) {
      const rand = Math.floor(Math.random() * total)
      if (!indices.includes(rand)) {
        indices.push(rand)
      }
    }
    indices.sort((a, b) => a - b)
    return indices.map((idx) => ({
      index: idx,
      position: idx + 1,
      enteredWord: "",
    }))
  }, [words])

  const [challenge, setChallenge] = useState<ChallengeItem[]>(initialChallenge)

  const toggleBackedUp = useCallback(() => {
    setBackedUp((prev) => !prev)
    setErrorMessage("")
  }, [])

  const handleContinue = useCallback(() => {
    if (!backedUp) {
      setErrorMessage("Please confirm that you have safely backed up your recovery phrase.")
      return
    }
    onComplete()
  }, [backedUp, onComplete])

  const proceedToVerification = useCallback(() => {
    setErrorMessage("")
    setFocusedChallengeIndex(0)
    setStage("verify")
  }, [])

  const backToDisplay = useCallback(() => {
    setErrorMessage("")
    setStage("display")
  }, [])

  const handleChallengeWordChange = useCallback((challengeIdx: number, val: string) => {
    setErrorMessage("")
    setChallenge((prev) => {
      const next = [...prev]
      next[challengeIdx] = {
        ...next[challengeIdx],
        enteredWord: val.trim().toLowerCase(),
      }
      return next
    })
  }, [])

  const handleVerifyAndSubmit = useCallback(() => {
    for (let i = 0; i < challenge.length; i++) {
      const item = challenge[i]
      const expected = words[item.index]?.toLowerCase()
      if (!item.enteredWord) {
        setErrorMessage(`Please enter word #${item.position}`)
        setFocusedChallengeIndex(i)
        return
      }
      if (item.enteredWord !== expected) {
        setErrorMessage(`Word #${item.position} does not match your backup. Please try again.`)
        setFocusedChallengeIndex(i)
        return
      }
    }

    onComplete()
  }, [challenge, words, onComplete])

  return {
    stage,
    words,
    challenge,
    focusedChallengeIndex,
    errorMessage,
    backedUp,
    toggleBackedUp,
    handleContinue,
    setStage,
    setFocusedChallengeIndex,
    handleChallengeWordChange,
    proceedToVerification,
    handleVerifyAndSubmit,
    backToDisplay,
  }
}
