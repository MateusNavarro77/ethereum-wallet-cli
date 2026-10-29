import { useState, useCallback, useEffect } from "react"
import { useService } from "../context.js"
import type { TokenConfig } from "../../core/types.js"
import type { TokenVerificationResult } from "../../core/interfaces.js"

export interface UseTokensResult {
  tokens: TokenConfig[]
  addToken: (token: Omit<TokenConfig, "isPreset">) => Promise<TokenConfig>
  toggleHideToken: (address: `0x${string}`) => Promise<void>
  removeCustomToken: (address: `0x${string}`) => Promise<void>
  verifyTokenContract: (address: `0x${string}`) => Promise<TokenVerificationResult>
  refreshTokens: () => void
}

export function useTokens(chainId: number): UseTokensResult {
  const tokenService = useService("tokenService")
  const [tokens, setTokens] = useState<TokenConfig[]>(() => tokenService.getTokens(chainId))

  const refreshTokens = useCallback(() => {
    setTokens(tokenService.getTokens(chainId))
  }, [tokenService, chainId])

  useEffect(() => {
    refreshTokens()
  }, [refreshTokens])

  const addToken = useCallback(
    async (token: Omit<TokenConfig, "isPreset">) => {
      const added = await tokenService.addToken(token)
      refreshTokens()
      return added
    },
    [tokenService, refreshTokens],
  )

  const toggleHideToken = useCallback(
    async (address: `0x${string}`) => {
      await tokenService.toggleHideToken(chainId, address)
      refreshTokens()
    },
    [tokenService, chainId, refreshTokens],
  )

  const removeCustomToken = useCallback(
    async (address: `0x${string}`) => {
      await tokenService.removeCustomToken(chainId, address)
      refreshTokens()
    },
    [tokenService, chainId, refreshTokens],
  )

  const verifyTokenContract = useCallback(
    async (address: `0x${string}`) => {
      return tokenService.verifyTokenContract(address, chainId)
    },
    [tokenService, chainId],
  )

  return {
    tokens,
    addToken,
    toggleHideToken,
    removeCustomToken,
    verifyTokenContract,
    refreshTokens,
  }
}

