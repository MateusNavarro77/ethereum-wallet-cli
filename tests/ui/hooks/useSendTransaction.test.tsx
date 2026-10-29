import { describe, expect, it } from "bun:test"
import { act, testRender } from "../../test-utils.js"
import { createDefaultContainer } from "../../../src/container/index.js"
import { ContainerProvider } from "../../../src/ui/context.js"
import { useSendTransaction } from "../../../src/ui/hooks/useSendTransaction.js"
import { SEPOLIA_NETWORK } from "../../../src/core/types.js"
import type {
  HdAccount,
  WatchOnlyAccount,
  TokenConfig,
} from "../../../src/core/types.js"

describe("useSendTransaction hook", () => {
  const dummyAddress = "0x985476E6534F9f999944556892b4146a433785b9" as `0x${string}`
  const validRecipient = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`
  const dummyMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

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

  const setupMockContainer = (overrides?: {
    nativeBalance?: bigint
    tokenBalance?: bigint
    gasLimit?: bigint
    feePerGas?: bigint
    sendTxHash?: `0x${string}`
    receiptStatus?: "success" | "reverted"
  }) => {
    const container = createDefaultContainer()

    const nativeBalance = overrides?.nativeBalance ?? 1_000_000_000_000_000_000n // 1.0 ETH
    const tokenBalance = overrides?.tokenBalance ?? 500_000_000n // 500 USDC
    const gasLimit = overrides?.gasLimit ?? 21000n
    const feePerGas = overrides?.feePerGas ?? 20_000_000_000n // 20 Gwei
    const sendTxHash = overrides?.sendTxHash ?? ("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`)
    const receiptStatus = overrides?.receiptStatus ?? "success"

    const mockRpc = {
      getBalance: async () => nativeBalance,
      getTokenBalance: async () => tokenBalance,
      getTokenMetadata: async () => ({ name: "USDC", symbol: "USDC", decimals: 6, isErc20: true }),
      hasBytecode: async () => true,
      getBlockNumber: async () => 1000n,
      verifyRpc: async () => ({ chainId: SEPOLIA_NETWORK.chainId, healthy: true }),
      switchNetwork: () => {},
      formatEther: (wei: bigint) => (Number(wei) / 1e18).toString(),
      formatUnits: (val: bigint, dec: number) => (Number(val) / 10 ** dec).toString(),
      getNetwork: () => SEPOLIA_NETWORK,
    }

    const mockTxService = {
      getFeePresets: async () => ({
        isEip1559: true,
        baseFeePerGas: feePerGas,
        presets: {
          low: { level: "low", label: "Low", maxFeePerGas: feePerGas * 8n / 10n, maxPriorityFeePerGas: 1_000_000_000n, estimatedWaitSeconds: 60 },
          medium: { level: "medium", label: "Medium", maxFeePerGas: feePerGas, maxPriorityFeePerGas: 1_500_000_000n, estimatedWaitSeconds: 30 },
          high: { level: "high", label: "High", maxFeePerGas: feePerGas * 15n / 10n, maxPriorityFeePerGas: 2_500_000_000n, estimatedWaitSeconds: 15 },
        },
      }),
      estimateGas: async () => ({
        gasLimit,
        estimatedFeeWei: gasLimit * feePerGas,
        formattedFeeEth: (Number(gasLimit * feePerGas) / 1e18).toString(),
        presets: {
          isEip1559: true,
          baseFeePerGas: feePerGas,
          presets: {
            low: { level: "low", label: "Low", maxFeePerGas: feePerGas * 8n / 10n, maxPriorityFeePerGas: 1_000_000_000n, estimatedWaitSeconds: 60 },
            medium: { level: "medium", label: "Medium", maxFeePerGas: feePerGas, maxPriorityFeePerGas: 1_500_000_000n, estimatedWaitSeconds: 30 },
            high: { level: "high", label: "High", maxFeePerGas: feePerGas * 15n / 10n, maxPriorityFeePerGas: 2_500_000_000n, estimatedWaitSeconds: 15 },
          },
        },
      }),
      sendTransaction: async () => sendTxHash,
      waitForReceipt: async () => ({
        hash: sendTxHash,
        status: receiptStatus,
        blockNumber: 555n,
        gasUsed: gasLimit,
      }),
    }

    const mockTokens = {
      getTokens: () => [dummyToken],
    }

    container.registerInstance("rpcService", mockRpc as any)
    container.registerInstance("transactionService", mockTxService as any)
    container.registerInstance("tokenService", mockTokens as any)

    return container
  }

  it("validates recipient address format and EIP-55 checksum (FR-SND-03)", async () => {
    const container = setupMockContainer()
    let hook: any
    function Harness() {
      hook = useSendTransaction({ account: hdAccount, wallet: { accounts: [hdAccount], mnemonic: dummyMnemonic, defaultChainId: 11155111 } })
      return <text>{hook.step}</text>
    }

    const setup = await testRender(
      <ContainerProvider container={container}>
        <Harness />
      </ContainerProvider>,
    )

    // Initially on recipient-asset step
    expect(hook.step).toBe("recipient-asset")

    // Empty address rejected
    await act(async () => {
      const ok = await hook.nextStep()
      expect(ok).toBe(false)
    })
    expect(hook.recipientError).toBe("Recipient address is required")

    // Invalid address rejected
    await act(async () => {
      hook.setRecipient("invalid-eth-address")
      const ok = await hook.nextStep()
      expect(ok).toBe(false)
    })
    expect(hook.recipientError).toBe("Invalid Ethereum address format")

    // Valid address advances to amount step
    await act(async () => {
      hook.setRecipient(validRecipient)
      const ok = await hook.nextStep()
      expect(ok).toBe(true)
    })
    expect(hook.step).toBe("amount")
    expect(hook.recipientError).toBeNull()

    setup.renderer.destroy()
  })

  it("validates amount against balance and calculates send max (FR-SND-05 & FR-SND-06)", async () => {
    // 1 ETH balance, 21000 gas * 20 Gwei = 0.00042 ETH fee
    const container = setupMockContainer({
      nativeBalance: 1_000_000_000_000_000_000n,
      gasLimit: 21000n,
      feePerGas: 20_000_000_000n,
    })

    let hook: any
    function Harness() {
      hook = useSendTransaction({ account: hdAccount, wallet: { accounts: [hdAccount], mnemonic: dummyMnemonic, defaultChainId: 11155111 } })
      return <text>{hook.step}</text>
    }

    const setup = await testRender(
      <ContainerProvider container={container}>
        <Harness />
      </ContainerProvider>,
    )

    // Set valid recipient and advance to amount step
    await act(async () => {
      hook.setRecipient(validRecipient)
      await hook.nextStep()
    })
    expect(hook.step).toBe("amount")

    // Invalid zero or negative amount rejected
    await act(async () => {
      hook.setAmount("0")
      const ok = await hook.nextStep()
      expect(ok).toBe(false)
    })
    expect(hook.amountError).toBe("Amount must be greater than zero")

    // Exceeding balance rejected
    await act(async () => {
      hook.setAmount("2.5")
      const ok = await hook.nextStep()
      expect(ok).toBe(false)
    })
    expect(hook.amountError).toContain("Amount exceeds available balance")

    // Apply Send Max for ETH (1.0 - 0.00042 = 0.99958 ETH)
    await act(async () => {
      hook.applySendMax()
    })
    expect(Number(hook.amount)).toBeCloseTo(0.99958, 4)
    expect(hook.amountError).toBeNull()

    // Now advance to gas step
    await act(async () => {
      const ok = await hook.nextStep()
      expect(ok).toBe(true)
    })
    expect(hook.step).toBe("gas")

    setup.renderer.destroy()
  })

  it("handles token send max and gas fee validation (FR-SND-02 & FR-SND-06)", async () => {
    // 500 USDC, 0.05 ETH
    const container = setupMockContainer({
      nativeBalance: 50_000_000_000_000_000n,
      tokenBalance: 500_000_000n,
      gasLimit: 65000n,
      feePerGas: 20_000_000_000n,
    })

    let hook: any
    function Harness() {
      hook = useSendTransaction({ account: hdAccount, wallet: { accounts: [hdAccount], mnemonic: dummyMnemonic, defaultChainId: 11155111 } })
      return <text>{hook.step}</text>
    }

    const setup = await testRender(
      <ContainerProvider container={container}>
        <Harness />
      </ContainerProvider>,
    )

    // Select token and advance
    await act(async () => {
      hook.setSelectedToken(dummyToken)
      hook.setRecipient(validRecipient)
      await hook.nextStep()
    })
    expect(hook.selectedToken?.symbol).toBe("USDC")
    expect(hook.step).toBe("amount")

    // Apply send max on token sets 500 USDC
    await act(async () => {
      hook.applySendMax()
    })
    expect(hook.amount).toBe("500")

    // Advance to gas step and then to review
    await act(async () => {
      await hook.nextStep()
    })
    expect(hook.step).toBe("gas")

    await act(async () => {
      await hook.nextStep()
    })
    expect(hook.step).toBe("review")

    setup.renderer.destroy()
  })

  it("blocks watch-only accounts and executes broadcast on HD accounts (FR-SND-08 & FR-SND-09)", async () => {
    const container = setupMockContainer()

    // 1. Watch-only test
    let watchHook: any
    function WatchHarness() {
      watchHook = useSendTransaction({ account: watchOnlyAccount })
      return <text>{watchHook.step}</text>
    }
    const watchSetup = await testRender(
      <ContainerProvider container={container}>
        <WatchHarness />
      </ContainerProvider>,
    )

    await act(async () => {
      watchHook.setRecipient(validRecipient)
      await watchHook.nextStep()
      watchHook.setAmount("0.1")
      await watchHook.nextStep()
      await watchHook.nextStep()
    })
    expect(watchHook.step).toBe("review")

    await act(async () => {
      await watchHook.confirmAndBroadcast()
    })
    expect(watchHook.txStatus).toBe("failed")
    expect(watchHook.txError).toContain("watch-only")
    watchSetup.renderer.destroy()

    // 2. HD Account test
    let successHash: string | undefined
    let hdHook: any
    function HdHarness() {
      hdHook = useSendTransaction({
        account: hdAccount,
        wallet: { accounts: [hdAccount], mnemonic: dummyMnemonic, defaultChainId: 11155111 },
        onSuccess: (h) => {
          successHash = h
        },
      })
      return <text>{hdHook.step}</text>
    }
    const hdSetup = await testRender(
      <ContainerProvider container={container}>
        <HdHarness />
      </ContainerProvider>,
    )

    await act(async () => {
      hdHook.setRecipient(validRecipient)
      await hdHook.nextStep()
      hdHook.setAmount("0.1")
      await hdHook.nextStep()
      await hdHook.nextStep()
    })
    expect(hdHook.step).toBe("review")

    await act(async () => {
      await hdHook.confirmAndBroadcast()
    })

    expect(hdHook.txHash).toBeDefined()
    expect(hdHook.txStatus).toBe("confirmed")
    expect(successHash).toBe(hdHook.txHash)
    hdSetup.renderer.destroy()
  })
})
