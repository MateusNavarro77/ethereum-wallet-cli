import { useState, useCallback } from "react"
import { useService } from "../context.js"

export interface UseImportMnemonicOptions {
  onComplete: (mnemonic: string) => void
  wordCount?: number
}

export interface UseImportMnemonicResult {
  words: string[]
  focusedIndex: number
  errorMessage: string
  setWords: React.Dispatch<React.SetStateAction<string[]>>
  setFocusedIndex: React.Dispatch<React.SetStateAction<number>>
  nextField: () => void
  prevField: () => void
  handleWordChange: (index: number, val: string) => void
  handleProceed: () => void
}

/**
 * Custom hook to manage BIP-39 mnemonic input, paste splitting, focus navigation, and validation.
 */
export function useImportMnemonic({
  onComplete,
  wordCount = 12,
}: UseImportMnemonicOptions): UseImportMnemonicResult {
  const walletService = useService("walletService")

  const [words, setWords] = useState<string[]>(Array(wordCount).fill(""))
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")

  const nextField = useCallback(() => {
    setFocusedIndex((prev) => (prev + 1) % wordCount)
  }, [wordCount])

  const prevField = useCallback(() => {
    setFocusedIndex((prev) => (prev - 1 + wordCount) % wordCount)
  }, [wordCount])

  const handleWordChange = useCallback(
    (index: number, val: string) => {
      setErrorMessage("")
      const trimmed = val.trim()

      // If user pasted or typed multiple words separated by whitespace
      if (trimmed.includes(" ")) {
        const splitWords = trimmed.split(/\s+/).filter(Boolean)
        setWords((prev) => {
          const next = [...prev]
          for (let i = 0; i < splitWords.length && index + i < wordCount; i++) {
            next[index + i] = splitWords[i].toLowerCase()
          }
          return next
        })
        const nextIndex = Math.min(wordCount - 1, index + splitWords.length)
        setFocusedIndex(nextIndex)
        return
      }

      setWords((prev) => {
        const next = [...prev]
        next[index] = val.toLowerCase().trim()
        return next
      })
    },
    [wordCount],
  )

  const handleProceed = useCallback(() => {
    const fullPhrase = words.map((w) => w.trim().toLowerCase()).join(" ")
    const filledCount = words.filter((w) => w.trim().length > 0).length

    if (filledCount < wordCount) {
      setErrorMessage(`Please enter all ${wordCount} words (${filledCount}/${wordCount} filled)`)
      return
    }

    const isValid = walletService.validateMnemonic(fullPhrase)
    if (!isValid) {
      setErrorMessage("Invalid BIP-39 mnemonic phrase. Check for typos or invalid words.")
      return
    }

    onComplete(fullPhrase)
  }, [words, wordCount, walletService, onComplete])

  return {
    words,
    focusedIndex,
    errorMessage,
    setWords,
    setFocusedIndex,
    nextField,
    prevField,
    handleWordChange,
    handleProceed,
  }
}

