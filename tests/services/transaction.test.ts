import { describe, expect, it } from "bun:test"
import { TransactionService } from "../../src/services/transaction.service.js"
import { SEPOLIA_NETWORK } from "../../src/core/types.js"
import type {
  Account,
  HdAccount,
  ImportedAccount,
  WatchOnlyAccount,
  TokenConfig,
} from "../../src/core/types.js"

describe("TransactionService", () => {
  const dummyMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
  const dummyAddress = "0x985476E6534F9f999944556892b4146a433785b9" as `0x${string}`
  const recipientAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`

  const hdAccount: HdAccount = {
    address: dummyAddress,
    index: 0,
    label: "Account 1",
    type: "hd",
    createdAt: new Date().toISOString(),
  }

  const watchOnlyAccount: WatchOnlyAccount = {
    address: dummyAddress,
    label: "Watch Account",
    type: "watch-only",
    createdAt: new Date().toISOString(),
  }

  const dummyToken: TokenConfig = {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    symbol: "USDC",
    name: "Sepolia USDC",
    decimals: 6,
    chainId: SEPOLIA_NETWORK.chainId,
  }

  const createMockRpcService = (mockClient: any) => ({
    getBalance: async () => 1_000_000_000_000_000_000n,
    getTokenBalance: async () => 500_000_000n,
    getTokenMetadata: async () => ({ name: "USDC", symbol: "USDC", decimals: 6, isErc20: true }),
    hasBytecode: async () => true,
    getBlockNumber: async () => 1000n,
    verifyRpc: async () => ({ chainId: SEPOLIA_NETWORK.chainId, healthy: true }),
    switchNetwork: () => {},
    formatEther: (wei: bigint) => (Number(wei) / 1e18).toString(),
    formatUnits: (val: bigint, dec: number) => (Number(val) / 10 ** dec).toString(),
    getNetwork: () => SEPOLIA_NETWORK,
    getPublicClient: () => mockClient,
  })

  const createMockWalletService = (privateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef") => ({
    generateMnemonic: () => dummyMnemonic,
    validateMnemonic: () => true,
    deriveAccount: () => ({ address: dummyAddress, privateKey: privateKey as `0x${string}`, index: 0, label: "Account 1" }),
    createWallet: () => ({} as any),
    importWallet: () => ({} as any),
    migrateWalletData: () => ({} as any),
    getNextDerivationIndex: () => 1,
    addDerivedAccount: () => ({} as any),
    importPrivateKey: async () => ({} as any),
    importKeystore: async () => ({} as any),
    addWatchOnlyAccount: () => ({} as any),
    renameAccount: () => ({} as any),
    toggleHideAccount: () => ({} as any),
    removeAccount: () => ({} as any),
    getExportPrivateKey: async (_w: any, _addr: `0x${string}`) => {
      if (_w.accounts?.[0]?.type === "watch-only") {
        throw new Error("Cannot export private key: this is a watch-only account")
      }
      return privateKey as `0x${string}`
    },
    getExportMnemonic: () => dummyMnemonic,
  })

  it("calculates EIP-1559 fee presets when baseFeePerGas is available", async () => {
    const mockClient = {
      getBlock: async () => ({ baseFeePerGas: 20_000_000_000n }),
      estimateFeesPerGas: async () => ({
        maxFeePerGas: 25_000_000_000n,
        maxPriorityFeePerGas: 2_000_000_000n,
      }),
      estimateGas: async () => 21000n,
    }

    const rpc = createMockRpcService(mockClient)
    const wallet = createMockWalletService()
    const txService = new TransactionService(rpc as any, wallet as any)

    const presets = await txService.getFeePresets()
    expect(presets.isEip1559).toBe(true)
    expect(presets.baseFeePerGas).toBe(20_000_000_000n)
    expect(presets.presets.low.level).toBe("low")
    expect(presets.presets.medium.level).toBe("medium")
    expect(presets.presets.high.level).toBe("high")
    expect(presets.presets.medium.maxFeePerGas).toBeGreaterThan(presets.presets.low.maxFeePerGas)
    expect(presets.presets.high.maxFeePerGas).toBeGreaterThan(presets.presets.medium.maxFeePerGas)
  })

  it("falls back to legacy fee presets when baseFeePerGas is missing", async () => {
    const mockClient = {
      getBlock: async () => ({ baseFeePerGas: null }),
      getGasPrice: async () => 15_000_000_000n,
      estimateGas: async () => 21000n,
    }

    const rpc = createMockRpcService(mockClient)
    const wallet = createMockWalletService()
    const txService = new TransactionService(rpc as any, wallet as any)

    const presets = await txService.getFeePresets()
    expect(presets.isEip1559).toBe(false)
    expect(presets.presets.medium.gasPrice).toBe(15_000_000_000n)
    expect(presets.presets.low.gasPrice).toBeLessThan(presets.presets.medium.gasPrice!)
    expect(presets.presets.high.gasPrice).toBeGreaterThan(presets.presets.medium.gasPrice!)
  })

  it("estimates gas for native ETH transfers (FR-GAS-01)", async () => {
    const mockClient = {
      getBlock: async () => ({ baseFeePerGas: 10_000_000_000n }),
      estimateFeesPerGas: async () => ({
        maxFeePerGas: 12_000_000_000n,
        maxPriorityFeePerGas: 1_000_000_000n,
      }),
      estimateGas: async () => 21000n,
    }

    const rpc = createMockRpcService(mockClient)
    const wallet = createMockWalletService()
    const txService = new TransactionService(rpc as any, wallet as any)

    const estimate = await txService.estimateGas({
      from: dummyAddress,
      to: recipientAddress,
      value: 100_000_000_000_000_000n,
    })

    expect(estimate.gasLimit).toBe(21000n)
    expect(estimate.estimatedFeeWei).toBeGreaterThan(0n)
    expect(estimate.formattedFeeEth).toBeDefined()
  })

  it("estimates gas for ERC-20 transfers with safety buffer (FR-GAS-01)", async () => {
    const mockClient = {
      getBlock: async () => ({ baseFeePerGas: 10_000_000_000n }),
      estimateFeesPerGas: async () => ({
        maxFeePerGas: 12_000_000_000n,
        maxPriorityFeePerGas: 1_000_000_000n,
      }),
      estimateGas: async () => 50000n,
    }

    const rpc = createMockRpcService(mockClient)
    const wallet = createMockWalletService()
    const txService = new TransactionService(rpc as any, wallet as any)

    const estimate = await txService.estimateGas({
      from: dummyAddress,
      to: recipientAddress,
      value: 10_000_000n,
      tokenAddress: dummyToken.address,
      tokenDecimals: dummyToken.decimals,
    })

    // 50000 * 1.1 = 55000
    expect(estimate.gasLimit).toBe(55000n)
  })

  it("blocks transactions from watch-only accounts (FR-SND-08)", async () => {
    const mockClient = {}
    const rpc = createMockRpcService(mockClient)
    const wallet = createMockWalletService()
    const txService = new TransactionService(rpc as any, wallet as any)

    await expect(
      txService.sendTransaction({
        account: watchOnlyAccount,
        to: recipientAddress,
        value: 100_000_000_000_000_000n,
      }),
    ).rejects.toThrow("Cannot send transactions from a watch-only account")
  })

  it("sends native ETH transaction successfully (FR-SND-01)", async () => {
    const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as `0x${string}`
    const mockWalletClient = {
      sendTransaction: async (params: any) => {
        expect(params.to).toBe(recipientAddress)
        expect(params.value).toBe(100_000_000_000_000_000n)
        return mockTxHash
      },
    }

    const rpc = createMockRpcService({})
    const wallet = createMockWalletService()
    const txService = new TransactionService(rpc as any, wallet as any, mockWalletClient)

    const hash = await txService.sendTransaction({
      account: hdAccount,
      to: recipientAddress,
      value: 100_000_000_000_000_000n,
      mnemonic: dummyMnemonic,
    })

    expect(hash).toBe(mockTxHash)
  })

  it("sends ERC-20 token transaction successfully (FR-SND-02)", async () => {
    const mockTxHash = "0x9999991234567890abcdef1234567890abcdef1234567890abcdef1234567890" as `0x${string}`
    const mockWalletClient = {
      sendTransaction: async (params: any) => {
        expect(params.to).toBe(dummyToken.address)
        expect(params.value).toBe(0n)
        expect(params.data).toBeDefined()
        return mockTxHash
      },
    }

    const rpc = createMockRpcService({})
    const wallet = createMockWalletService()
    const txService = new TransactionService(rpc as any, wallet as any, mockWalletClient)

    const hash = await txService.sendTransaction({
      account: hdAccount,
      to: recipientAddress,
      value: 100_000_000n,
      token: dummyToken,
      mnemonic: dummyMnemonic,
    })

    expect(hash).toBe(mockTxHash)
  })

  it("polls and returns transaction receipt summary (FR-SND-09)", async () => {
    const mockReceipt = {
      transactionHash: "0xabcdef" as `0x${string}`,
      status: "success",
      blockNumber: 12345n,
      gasUsed: 21000n,
    }
    const mockClient = {
      waitForTransactionReceipt: async () => mockReceipt,
    }

    const rpc = createMockRpcService(mockClient)
    const wallet = createMockWalletService()
    const txService = new TransactionService(rpc as any, wallet as any)

    const receipt = await txService.waitForReceipt("0xabcdef")
    expect(receipt.hash).toBe("0xabcdef")
    expect(receipt.status).toBe("success")
    expect(receipt.blockNumber).toBe(12345n)
    expect(receipt.gasUsed).toBe(21000n)
  })
})

