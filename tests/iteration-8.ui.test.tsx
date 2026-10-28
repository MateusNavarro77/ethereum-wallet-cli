import { describe, expect, it } from "bun:test"
import { act } from "react"
import { testRender } from "./test-utils.js"
import { ContainerProvider } from "../src/ui/context.js"
import { createDefaultContainer } from "../src/container/index.js"
import { TokensModal } from "../src/ui/components/TokensModal.js"
import { TokenFormModal } from "../src/ui/components/TokenFormModal.js"
import { DashboardScreen } from "../src/ui/screens/DashboardScreen.js"
import {
  SEPOLIA_NETWORK,
  type Account,
  type WalletData,
  type TokenConfig,
} from "../src/core/types.js"

const sampleAccount1: Account = {
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  label: "Vault Account 1",
  type: "hd",
  index: 0,
  createdAt: new Date().toISOString(),
}

const sampleAccount2: Account = {
  address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  label: "Vault Account 2",
  type: "hd",
  index: 1,
  createdAt: new Date().toISOString(),
}

const sampleWallet: WalletData = {
  version: 2,
  mnemonic: "test test test test test test test test test test test junk",
  accounts: [sampleAccount1, sampleAccount2],
  defaultChainId: 11155111,
  activeChainId: 11155111,
}

const sampleTokens: TokenConfig[] = [
  {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    symbol: "USDC",
    name: "Sepolia USDC",
    decimals: 6,
    chainId: 11155111,
    isPreset: true,
  },
  {
    address: "0x2222222222222222222222222222222222222222",
    symbol: "MYTOKEN",
    name: "Custom MyToken",
    decimals: 18,
    chainId: 11155111,
    isPreset: false,
    hidden: false,
  },
]

describe("Iteration 8 UI Components: Balances, ERC-20 Tokens & Portfolio", () => {
  it("renders DashboardScreen with native balance, tokens list, and shortcuts (FR-BAL-01, FR-BAL-02, FR-BAL-04)", async () => {
    const container = createDefaultContainer()
    const mockRpc = {
      ...container.resolve("rpcService"),
      getBalance: async () => 2_500_000_000_000_000_000n, // 2.5 SEP
      getTokenBalance: async () => 100_000_000n, // 100 USDC
      formatEther: () => "2.5",
      formatUnits: (v: bigint) => (v === 100_000_000n ? "100" : "0"),
      getNetwork: () => SEPOLIA_NETWORK,
    }
    const mockPrice = {
      getPriceUsd: async () => 2500,
      getPricesUsd: async () => ({ SEP: 2500, USDC: 1 }),
      isFiatEnabled: () => true,
      setFiatEnabled: async () => {},
    }
    container.registerInstance("rpcService", mockRpc as any)
    container.registerInstance("priceService", mockPrice as any)

    const setup = await testRender(
      <ContainerProvider container={container}>
        <DashboardScreen
          account={sampleAccount1}
          wallet={sampleWallet}
          onReset={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    // Wait for portfolio hook async fetch
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60))
    })
    await setup.renderOnce()

    const text = setup.captureCharFrame()
    expect(text).toContain("Balances & Portfolio")
    expect(text).toContain("Native (SEP)")
    expect(text).toContain("2.5")
    expect(text).toContain("USDC")
    expect(text).toContain("[P]")
    expect(text).toContain("[T]")
    expect(text).toContain("Tokens")

    setup.renderer.destroy()
  })

  it("toggles aggregate view across accounts with [P] (FR-BAL-06)", async () => {
    const container = createDefaultContainer()
    const mockRpc = {
      ...container.resolve("rpcService"),
      getBalance: async () => 1_000_000_000_000_000_000n, // 1.0 SEP per account
      getTokenBalance: async () => 50_000_000n, // 50 USDC per account
      formatEther: (wei: bigint) => (wei === 2_000_000_000_000_000_000n ? "2.0" : "1.0"),
      formatUnits: (val: bigint) => (val === 100_000_000n ? "100" : "50"),
      getNetwork: () => SEPOLIA_NETWORK,
    }
    const mockPrice = {
      getPriceUsd: async () => 2500,
      getPricesUsd: async () => ({ SEP: 2500, USDC: 1 }),
      isFiatEnabled: () => true,
      setFiatEnabled: async () => {},
    }
    container.registerInstance("rpcService", mockRpc as any)
    container.registerInstance("priceService", mockPrice as any)

    const setup = await testRender(
      <ContainerProvider container={container}>
        <DashboardScreen
          account={sampleAccount1}
          wallet={sampleWallet}
          onReset={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60))
    })
    await setup.renderOnce()

    // Press P to toggle aggregate view
    await act(async () => {
      setup.mockInput.pressKey("p")
      await new Promise((r) => setTimeout(r, 60))
    })
    await setup.renderOnce()

    const text = setup.captureCharFrame()
    expect(text).toContain("Aggregate Balances & Portfolio")
    expect(text).toContain("Aggregated view across 2 visible")

    setup.renderer.destroy()
  })

  it("renders TokensModal with badges and toggles hide/unhide with [H] (FR-BAL-07)", async () => {
    let hideToggled = false
    const setup = await testRender(
      <TokensModal
        tokens={sampleTokens}
        chainId={11155111}
        onToggleHide={async () => {
          hideToggled = true
        }}
        onAddToken={async () => {}}
        onRemoveToken={async () => {}}
        onVerifyToken={async () => ({ isValidErc20: true })}
        onClose={() => {}}
      />,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    const text = setup.captureCharFrame()
    expect(text).toContain("Tracked ERC-20 Tokens")
    expect(text).toContain("USDC")
    expect(text).toContain("[Preset]")
    expect(text).toContain("MYTOKEN")
    expect(text).toContain("[Custom]")

    // Press H on selected token
    await act(async () => {
      setup.mockInput.pressKey("h")
      await new Promise((r) => setTimeout(r, 20))
    })

    expect(hideToggled).toBe(true)

    setup.renderer.destroy()
  })

  it("verifies and confirms valid ERC-20 in TokenFormModal (FR-BAL-03)", async () => {
    let submittedData: any = null
    const setup = await testRender(
      <TokenFormModal
        initialAddress="0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f"
        onVerify={async () => ({
          isValidErc20: true,
          metadata: { name: "Synthetix Network", symbol: "SNX", decimals: 18 },
        })}
        onSubmit={async (data) => {
          submittedData = data
        }}
        onClose={() => {}}
      />,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    let text = setup.captureCharFrame()
    expect(text).toContain("Add ERC-20 Token")

    // Press enter on initialAddress
    await act(async () => {
      setup.mockInput.pressEnter()
      await new Promise((r) => setTimeout(r, 30))
    })

    await setup.renderOnce()
    text = setup.captureCharFrame()
    expect(text).toContain("Valid ERC-20 Contract Verified")
    expect(text).toContain("SNX")
    expect(text).toContain("Synthetix Network")

    // Confirm add
    await act(async () => {
      setup.mockInput.pressEnter()
      await new Promise((r) => setTimeout(r, 20))
    })

    expect(submittedData).not.toBeNull()
    expect(submittedData.symbol).toBe("SNX")
    expect(submittedData.decimals).toBe(18)

    setup.renderer.destroy()
  })

  it("displays warning on unverified contract and allows force add with [F] (FR-BAL-08)", async () => {
    let submittedData: any = null
    const setup = await testRender(
      <TokenFormModal
        initialAddress="0x0000000000000000000000000000000000000001"
        onVerify={async () => ({
          isValidErc20: false,
          warning: "Contract does not implement standard ERC-20 decimals/symbol methods.",
          metadata: { name: "Non-standard Token", symbol: "NONSTD", decimals: 18 },
        })}
        onSubmit={async (data) => {
          submittedData = data
        }}
        onClose={() => {}}
      />,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()

    // Press enter to verify
    await act(async () => {
      setup.mockInput.pressEnter()
      await new Promise((r) => setTimeout(r, 30))
    })

    await setup.renderOnce()
    const text = setup.captureCharFrame()
    expect(text).toContain("Warning: Contract Not Verified as Standard ERC-20")
    expect(text).toContain("[F] Force Add Anyway")

    // Force add with F
    await act(async () => {
      setup.mockInput.pressKey("f")
      await new Promise((r) => setTimeout(r, 20))
    })

    expect(submittedData).not.toBeNull()
    expect(submittedData.symbol).toBe("NONSTD")

    setup.renderer.destroy()
  })
})
