import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { testRender, act } from "../../test-utils.js"
import { ContainerProvider } from "../../../src/ui/context.js"
import { createDefaultContainer } from "../../../src/container/index.js"
import { SendModal } from "../../../src/ui/components/SendModal.js"
import { DashboardScreen } from "../../../src/ui/screens/DashboardScreen.js"
import { SEPOLIA_NETWORK } from "../../../src/core/types.js"
import type { Account, WalletData } from "../../../src/core/types.js"

const sampleAccount: Account = {
  address: "0x985476E6534F9f999944556892b4146a433785b9",
  label: "Primary Vault",
  type: "hd",
  index: 0,
  createdAt: new Date().toISOString(),
}

const sampleWallet: WalletData = {
  accounts: [sampleAccount],
  activeAddress: sampleAccount.address,
  mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  defaultChainId: SEPOLIA_NETWORK.chainId,
}

describe("SendModal component", () => {
  let tempDir: string
  let originalHome: string | undefined

  beforeEach(() => {
    originalHome = process.env.TERMIWALLET_HOME
    tempDir = mkdtempSync(join(tmpdir(), "termiwallet-send-test-"))
    process.env.TERMIWALLET_HOME = tempDir
  })

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.TERMIWALLET_HOME = originalHome
    } else {
      delete process.env.TERMIWALLET_HOME
    }
    rmSync(tempDir, { recursive: true, force: true })
  })

  const createMockContainer = (overrides?: {
    txHash?: `0x${string}`
  }) => {
    const container = createDefaultContainer()
    const txHash = overrides?.txHash ?? ("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as `0x${string}`)

    const mockRpc = {
      getBalance: async () => 2_000_000_000_000_000_000n, // 2.0 ETH
      getTokenBalance: async () => 100_000_000n,
      getTokenMetadata: async () => ({ name: "USDC", symbol: "USDC", decimals: 6, isErc20: true }),
      hasBytecode: async () => true,
      getBlockNumber: async () => 12345n,
      verifyRpc: async () => ({ chainId: SEPOLIA_NETWORK.chainId, healthy: true }),
      switchNetwork: () => {},
      formatEther: (wei: bigint) => (Number(wei) / 1e18).toString(),
      formatUnits: (val: bigint, dec: number) => (Number(val) / 10 ** dec).toString(),
      getNetwork: () => SEPOLIA_NETWORK,
    }

    const mockTx = {
      getFeePresets: async () => ({
        isEip1559: true,
        baseFeePerGas: 20_000_000_000n,
        presets: {
          low: { level: "low", label: "Low", maxFeePerGas: 16_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n, estimatedWaitSeconds: 60 },
          medium: { level: "medium", label: "Medium", maxFeePerGas: 20_000_000_000n, maxPriorityFeePerGas: 1_500_000_000n, estimatedWaitSeconds: 30 },
          high: { level: "high", label: "High", maxFeePerGas: 30_000_000_000n, maxPriorityFeePerGas: 2_500_000_000n, estimatedWaitSeconds: 15 },
        },
      }),
      estimateGas: async () => ({
        gasLimit: 21000n,
        estimatedFeeWei: 21000n * 20_000_000_000n,
        formattedFeeEth: "0.00042",
        presets: {
          isEip1559: true,
          baseFeePerGas: 20_000_000_000n,
          presets: {
            low: { level: "low", label: "Low", maxFeePerGas: 16_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n, estimatedWaitSeconds: 60 },
            medium: { level: "medium", label: "Medium", maxFeePerGas: 20_000_000_000n, maxPriorityFeePerGas: 1_500_000_000n, estimatedWaitSeconds: 30 },
            high: { level: "high", label: "High", maxFeePerGas: 30_000_000_000n, maxPriorityFeePerGas: 2_500_000_000n, estimatedWaitSeconds: 15 },
          },
        },
      }),
      sendTransaction: async () => txHash,
      waitForReceipt: async () => ({
        hash: txHash,
        status: "success",
        blockNumber: 12345n,
        gasUsed: 21000n,
      }),
    }

    container.registerInstance("rpcService", mockRpc as any)
    container.registerInstance("transactionService", mockTx as any)

    return container
  }

  it("renders SendModal with Stepper and Step 1 (Asset & Recipient)", async () => {
    const container = createMockContainer()
    let closed = false

    const setup = await testRender(
      <ContainerProvider container={container}>
        <SendModal
          account={sampleAccount}
          wallet={sampleWallet}
          onClose={() => { closed = true }}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    const output = setup.captureCharFrame()

    expect(output).toContain("Send Transaction")
    expect(output).toContain("[1] Asset & To")
    expect(output).toContain("[2] Amount")
    expect(output).toContain("[3] Gas Fee")
    expect(output).toContain("[4] Review")
    expect(output).toContain("Recipient Address")

    setup.renderer.destroy()
  })

  it("opens SendModal from DashboardScreen when pressing [E]", async () => {
    const container = createMockContainer()

    const setup = await testRender(
      <ContainerProvider container={container}>
        <DashboardScreen
          account={sampleAccount}
          wallet={sampleWallet}
          onReset={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    let output = setup.captureCharFrame()
    expect(output).toContain("[E]")
    expect(output).toContain("Send")
    expect(output).not.toContain("Send Transaction")

    // Press 'e'
    await act(async () => {
      setup.mockInput.pressKey("e")
    })
    await setup.renderOnce()

    output = setup.captureCharFrame()
    expect(output).toContain("Send Transaction")
    expect(output).toContain("[1] Asset & To")

    setup.renderer.destroy()
  })
})
