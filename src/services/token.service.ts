import type {
  ITokenService,
  IStorageService,
  IRpcService,
  TokenVerificationResult,
} from "../core/interfaces.js"
import type { TokenConfig } from "../core/types.js"
import { PRESET_TOKENS } from "../core/types.js"

export class TokenService implements ITokenService {
  private customTokens: Record<number, TokenConfig[]> = {}
  private hiddenTokenAddresses: Record<number, Set<string>> = {}

  constructor(
    private storageService: IStorageService,
    private rpcService: IRpcService,
  ) {}

  async loadTokens(): Promise<void> {
    try {
      const config = await this.storageService.loadConfig()
      if (config.tokens) {
        this.customTokens = {}
        this.hiddenTokenAddresses = {}

        for (const [chainIdStr, tokens] of Object.entries(config.tokens)) {
          const chainId = Number(chainIdStr)
          this.customTokens[chainId] = []
          this.hiddenTokenAddresses[chainId] = new Set<string>()

          for (const token of tokens) {
            if (token.hidden) {
              this.hiddenTokenAddresses[chainId].add(token.address.toLowerCase())
            }
            if (!token.isPreset) {
              this.customTokens[chainId].push(token)
            }
          }
        }
      }
    } catch {
      // Storage load failure defaults to empty custom tokens
      this.customTokens = {}
      this.hiddenTokenAddresses = {}
    }
  }

  getTokens(chainId: number): TokenConfig[] {
    const presets = (PRESET_TOKENS[chainId] || []).map((preset) => ({
      ...preset,
      hidden: this.hiddenTokenAddresses[chainId]?.has(preset.address.toLowerCase()) ?? false,
    }))

    const customs = (this.customTokens[chainId] || []).map((custom) => ({
      ...custom,
      hidden: this.hiddenTokenAddresses[chainId]?.has(custom.address.toLowerCase()) ?? false,
    }))

    // Combine presets + customs, ensuring no duplicate address entries
    const seen = new Set<string>()
    const result: TokenConfig[] = []

    for (const token of [...presets, ...customs]) {
      const lower = token.address.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        result.push(token)
      }
    }

    return result
  }

  async addToken(token: Omit<TokenConfig, "isPreset">): Promise<TokenConfig> {
    const chainId = token.chainId
    const existing = this.getTokens(chainId)
    const normalizedAddress = token.address.toLowerCase()

    if (existing.some((t) => t.address.toLowerCase() === normalizedAddress)) {
      throw new Error(`Token with address ${token.address} is already tracked on chain ${chainId}`)
    }

    const newToken: TokenConfig = {
      ...token,
      isPreset: false,
      hidden: false,
    }

    if (!this.customTokens[chainId]) {
      this.customTokens[chainId] = []
    }
    this.customTokens[chainId].push(newToken)

    await this.persistTokens()
    return newToken
  }

  async toggleHideToken(chainId: number, address: `0x${string}`): Promise<void> {
    if (!this.hiddenTokenAddresses[chainId]) {
      this.hiddenTokenAddresses[chainId] = new Set<string>()
    }

    const lower = address.toLowerCase()
    if (this.hiddenTokenAddresses[chainId].has(lower)) {
      this.hiddenTokenAddresses[chainId].delete(lower)
    } else {
      this.hiddenTokenAddresses[chainId].add(lower)
    }

    await this.persistTokens()
  }

  async removeCustomToken(chainId: number, address: `0x${string}`): Promise<void> {
    const lower = address.toLowerCase()
    const presets = PRESET_TOKENS[chainId] || []
    if (presets.some((p) => p.address.toLowerCase() === lower)) {
      throw new Error("Cannot delete a preset token; you can hide it instead.")
    }

    if (this.customTokens[chainId]) {
      this.customTokens[chainId] = this.customTokens[chainId].filter(
        (t) => t.address.toLowerCase() !== lower,
      )
    }

    if (this.hiddenTokenAddresses[chainId]) {
      this.hiddenTokenAddresses[chainId].delete(lower)
    }

    await this.persistTokens()
  }

  async verifyTokenContract(
    address: `0x${string}`,
    _chainId?: number,
  ): Promise<TokenVerificationResult> {
    const isAddressFormat = /^0x[a-fA-F0-9]{40}$/.test(address)
    if (!isAddressFormat) {
      return {
        isValidErc20: false,
        warning: "Invalid Ethereum address format.",
      }
    }

    const hasCode = await this.rpcService.hasBytecode(address)
    if (!hasCode) {
      return {
        isValidErc20: false,
        warning: "Address has no contract bytecode on this network (EOA or non-existent contract).",
      }
    }

    const metadata = await this.rpcService.getTokenMetadata(address)
    if (!metadata.isErc20) {
      return {
        isValidErc20: false,
        warning:
          "Contract does not respond to standard ERC-20 methods (name/symbol/decimals failed).",
        metadata: {
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
        },
      }
    }

    return {
      isValidErc20: true,
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
      },
    }
  }

  private async persistTokens(): Promise<void> {
    try {
      const config = await this.storageService.loadConfig()
      const allTokensMap: Record<number, TokenConfig[]> = {}

      const allChainIds = new Set<number>([
        ...Object.keys(PRESET_TOKENS).map(Number),
        ...Object.keys(this.customTokens).map(Number),
        ...Object.keys(this.hiddenTokenAddresses).map(Number),
      ])

      for (const chainId of allChainIds) {
        allTokensMap[chainId] = this.getTokens(chainId)
      }

      await this.storageService.saveConfig({
        ...config,
        tokens: allTokensMap,
      })
    } catch {
      // In-memory changes remain even if persistence fails
    }
  }
}

