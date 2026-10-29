import { useState, useCallback } from "react"
import { useService } from "../context.js"

export interface UseImportMnemonicOptions {
  onComplete: (mnemonic: string) => void
  initialWordCount?: 12 | 24
}

export interface UseImportMnemonicResult {
  wordCount: 12 | 24
  words: string[]
  focusedIndex: number
  errorMessage: string
  setWords: React.Dispatch<React.SetStateAction<string[]>>
  setFocusedIndex: React.Dispatch<React.SetStateAction<number>>
  toggleWordCount: () => void
  nextField: () => void
  prevField: () => void
  handleWordChange: (index: number, val: string) => void
  handleProceed: () => void
}

/**
 * Custom hook to manage BIP-39 mnemonic input, paste splitting, focus navigation, and validation.
 * Supports both 12 and 24-word phrases and automatically detects phrase length on paste.
 */
export function useImportMnemonic({
  onComplete,
  initialWordCount = 12,
}: UseImportMnemonicOptions): UseImportMnemonicResult {
  const walletService = useService("walletService")

  const [wordCount, setWordCount] = useState<12 | 24>(initialWordCount)
  const [words, setWords] = useState<string[]>(Array(initialWordCount).fill(""))
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")

  const toggleWordCount = useCallback(() => {
    setErrorMessage("")
    setWordCount((prev) => {
      const nextCount: 12 | 24 = prev === 12 ? 24 : 12
      setWords((prevWords) => {
        if (nextCount > prevWords.length) {
          return [...prevWords, ...Array(nextCount - prevWords.length).fill("")]
        }
        return prevWords.slice(0, nextCount)
      })
      setFocusedIndex(0)
      return nextCount
    })
  }, [])

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
        const targetCount: 12 | 24 = splitWords.length > 12 ? 24 : wordCount

        if (targetCount !== wordCount) {
          setWordCount(targetCount)
        }

        setWords((prev) => {
          const next = Array(targetCount)
            .fill("")
            .map((_, i) => prev[i] || "")
          for (let i = 0; i < splitWords.length && index + i < targetCount; i++) {
            next[index + i] = splitWords[i].toLowerCase()
          }
          return next
        })

        const nextIndex = Math.min(targetCount - 1, index + splitWords.length)
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
      setErrorMessage(`Invalid ${wordCount}-word BIP-39 mnemonic phrase. Check for typos or invalid words.`)
      return
    }

    onComplete(fullPhrase)
  }, [words, wordCount, walletService, onComplete])

  return {
    wordCount,
    words,
    focusedIndex,
    errorMessage,
    setWords,
    setFocusedIndex,
    toggleWordCount,
    nextField,
    prevField,
    handleWordChange,
    handleProceed,
  }
}
