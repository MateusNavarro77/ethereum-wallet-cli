import { useState, useCallback, useEffect, useRef } from "react"
import { useService } from "../context.js"

export interface UseClipboardNotificationResult {
  notification: string | null
  copyText: (text: string, successMessage?: string) => Promise<boolean>
  setNotification: (message: string | null, durationMs?: number) => void
}

/**
 * Custom hook to handle clipboard operations and temporary notification banners.
 */
export function useClipboardNotification(defaultTimeoutMs = 3000): UseClipboardNotificationResult {
  const clipboardService = useService("clipboardService")
  const [notification, setNotificationState] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearExistingTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearExistingTimer()
  }, [clearExistingTimer])

  const setNotification = useCallback(
    (message: string | null, durationMs = defaultTimeoutMs) => {
      clearExistingTimer()
      setNotificationState(message)
      if (message !== null && durationMs > 0) {
        timerRef.current = setTimeout(() => {
          setNotificationState(null)
          timerRef.current = null
        }, durationMs)
      }
    },
    [clearExistingTimer, defaultTimeoutMs],
  )

  const copyText = useCallback(
    async (text: string, successMessage = "✔ Address copied to clipboard!") => {
      const success = await clipboardService.copy(text)
      if (success) {
        setNotification(successMessage, defaultTimeoutMs)
      } else {
        setNotification("Failed to copy automatically (copy manually)", defaultTimeoutMs)
      }
      return success
    },
    [clipboardService, setNotification, defaultTimeoutMs],
  )

  return {
    notification,
    copyText,
    setNotification,
  }
}

