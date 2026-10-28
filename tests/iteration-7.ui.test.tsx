import { describe, expect, it } from "bun:test"
import { act } from "react"
import { testRender } from "./test-utils.js"
import { ContainerProvider } from "../src/ui/context.js"
import { createDefaultContainer } from "../src/container/index.js"
import { NetworksModal } from "../src/ui/components/NetworksModal.js"
import { NetworkFormModal } from "../src/ui/components/NetworkFormModal.js"
import { DashboardScreen } from "../src/ui/screens/DashboardScreen.js"
import {
  MAINNET_NETWORK,
  SEPOLIA_NETWORK,
  ANVIL_NETWORK,
  type NetworkConfig,
  type Account,
  type WalletData,
} from "../src/core/types.js"

const sampleCustomNet: NetworkConfig = {
  chainId: 1337,
  name: "Geth Private Devnet",
  rpcUrl: "http://127.0.0.1:8545",
  rpcUrls: ["http://127.0.0.1:8545", "http://127.0.0.1:8546"],
  symbol: "GETH",
  isLocal: true,
  isTestnet: true,
}

const sampleAccount: Account = {
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  label: "Primary Vault",
  type: "hd",
  index: 0,
  createdAt: new Date().toISOString(),
}

const sampleWallet: WalletData = {
  version: 2,
  mnemonic: "test test test test test test test test test test test junk",
  accounts: [sampleAccount],
  defaultChainId: 11155111,
  activeChainId: 11155111,
  customNetworks: [sampleCustomNet],
}

describe("Iteration 7 UI Components: Networks & RPC Management", () => {
  it("renders NetworksModal with presets, badges, active indicator, and fallback count (FR-NET-01, 05, 06, 08)", async () => {
    const container = createDefaultContainer()
    const allNetworks = [MAINNET_NETWORK, SEPOLIA_NETWORK, ANVIL_NETWORK, sampleCustomNet]

    const setup = await testRender(
      <ContainerProvider container={container}>
        <NetworksModal
          networks={allNetworks}
          activeNetwork={SEPOLIA_NETWORK}
          status={{ connected: true, blockNumber: 1234567n }}
          onSelectNetwork={async () => {}}
          onAddNetwork={async () => sampleCustomNet}
          onEditNetwork={async () => sampleCustomNet}
          onRemoveNetwork={async () => {}}
          onClose={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    // Title and counts
    expect(frame).toContain("Manage Networks & RPC (FR-NET-02 & FR-NET-03)")
    expect(frame).toContain("4 Networks Configured")

    // Network names & distinct badges
    expect(frame).toContain("[MAINNET]")
    expect(frame).toContain("Ethereum Mainnet")
    expect(frame).toContain("[TESTNET]")
    expect(frame).toContain("Ethereum Sepolia")
    expect(frame).toContain("[LOCAL]")
    expect(frame).toContain("Anvil Localhost")
    expect(frame).toContain("Geth Private Devnet")

    // Active indicator
    expect(frame).toContain("* [ACTIVE]")

    // Preset & Custom origins
    expect(frame).toContain("[Preset]")
    expect(frame).toContain("[Custom]")

    // Fallback RPC indicator (FR-NET-05)
    expect(frame).toContain("[2 RPCs]")

    // Hotkey bar
    expect(frame).toContain("[Enter] Switch")
    expect(frame).toContain("[A] Add")
    expect(frame).toContain("[E] Edit")
    expect(frame).toContain("[D] Delete")

    setup.renderer.destroy()
  })

  it("navigates and switches network with Enter in NetworksModal (FR-NET-02)", async () => {
    const container = createDefaultContainer()
    const allNetworks = [MAINNET_NETWORK, SEPOLIA_NETWORK, ANVIL_NETWORK]
    let switchedChainId = 0

    const setup = await testRender(
      <ContainerProvider container={container}>
        <NetworksModal
          networks={allNetworks}
          activeNetwork={MAINNET_NETWORK}
          onSelectNetwork={async (chainId) => {
            switchedChainId = chainId
          }}
          onAddNetwork={async () => sampleCustomNet}
          onEditNetwork={async () => sampleCustomNet}
          onRemoveNetwork={async () => {}}
          onClose={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()

    // Press down arrow to move from Mainnet (0) to Sepolia (1)
    await act(async () => {
      setup.mockInput.pressArrow("down")
    })
    await setup.renderOnce()

    // Press Enter to switch
    await act(async () => {
      setup.mockInput.pressEnter()
    })

    expect(switchedChainId).toBe(SEPOLIA_NETWORK.chainId)
    setup.renderer.destroy()
  })

  it("protects preset networks from editing and deletion (FR-NET-03)", async () => {
    const container = createDefaultContainer()
    const allNetworks = [MAINNET_NETWORK, SEPOLIA_NETWORK]

    const setup = await testRender(
      <ContainerProvider container={container}>
        <NetworksModal
          networks={allNetworks}
          activeNetwork={MAINNET_NETWORK}
          onSelectNetwork={async () => {}}
          onAddNetwork={async () => sampleCustomNet}
          onEditNetwork={async () => sampleCustomNet}
          onRemoveNetwork={async () => {}}
          onClose={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()

    // Press 'e' on Mainnet (preset)
    await act(async () => {
      setup.mockInput.pressKey("e")
    })
    await setup.renderOnce()
    let frame = setup.captureCharFrame()
    expect(frame).toContain("Preset networks cannot be modified (FR-NET-03)")

    // Press 'd' on Mainnet (preset)
    await act(async () => {
      setup.mockInput.pressKey("d")
    })
    await setup.renderOnce()
    frame = setup.captureCharFrame()
    expect(frame).toContain("Preset networks cannot be removed (FR-NET-03)")

    setup.renderer.destroy()
  })

  it("prompts confirmation and deletes custom network (FR-NET-03)", async () => {
    const container = createDefaultContainer()
    const allNetworks = [sampleCustomNet]
    let removedChainId = 0

    const setup = await testRender(
      <ContainerProvider container={container}>
        <NetworksModal
          networks={allNetworks}
          activeNetwork={sampleCustomNet}
          onSelectNetwork={async () => {}}
          onAddNetwork={async () => sampleCustomNet}
          onEditNetwork={async () => sampleCustomNet}
          onRemoveNetwork={async (chainId) => {
            removedChainId = chainId
          }}
          onClose={() => {}}
        />
      </ContainerProvider>,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()

    // Press 'd' on custom network
    await act(async () => {
      setup.mockInput.pressKey("d")
    })
    await setup.renderOnce()
    let frame = setup.captureCharFrame()
    expect(frame).toContain("Confirm Network Removal")
    expect(frame).toContain("Are you sure you want to remove Geth Private Devnet")

    // Confirm with 'y'
    await act(async () => {
      setup.mockInput.pressKey("y")
    })

    expect(removedChainId).toBe(1337)
    setup.renderer.destroy()
  })

  it("renders NetworkFormModal with navigable inputs for custom networks", async () => {
    const setup = await testRender(
      <NetworkFormModal
        onSave={async () => {}}
        onCancel={() => {}}
      />,
      { width: 100, height: 35 },
    )

    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame).toContain("Add Custom Network (FR-NET-03)")
    expect(frame).toContain("Network Name")
    expect(frame).toContain("RPC URL(s)")
    expect(frame).toContain("Chain ID")
    expect(frame).toContain("Currency Symbol")
    expect(frame).toContain("Block Explorer URL")
    expect(frame).toContain("[Tab / ↑↓] Next Field")

    setup.renderer.destroy()
  })

  it("renders DashboardScreen with network badge, chain ID, status, and [N] Networks shortcut (FR-NET-02, FR-NET-07, FR-NET-08)", async () => {
    const container = createDefaultContainer()

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
    const frame = setup.captureCharFrame()

    // Network card verification
    expect(frame).toContain("Network Configuration")
    expect(frame).toContain("[TESTNET]")
    expect(frame).toContain("Ethereum Sepolia")
    expect(frame).toContain("11155111")
    expect(frame).toContain("Status:")

    // Footer shortcut
    expect(frame).toContain("[N] Networks")

    setup.renderer.destroy()
  })
})

