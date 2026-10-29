import { describe, expect, it } from "bun:test"
import { act, testRender } from "../../test-utils.js"
import { createDefaultContainer } from "../../../src/container/index.js"
import { ContainerProvider } from "../../../src/ui/context.js"
import { useNetwork } from "../../../src/ui/hooks/useNetwork.js"
import { useTokens } from "../../../src/ui/hooks/useTokens.js"

describe("network and token hooks", () => {
  it("runs network mutations and reports connection failures", async () => {
    const container = createDefaultContainer()
    let active = { chainId: 1, name: "Main", rpcUrl: "https://rpc", symbol: "ETH" }
    let networks = [active]
    let failStatus = false
    const networkService = {
      getActiveNetwork: () => active, getAllNetworks: () => networks,
      getConnectionStatus: async () => { if (failStatus) throw new Error("offline"); return { connected: true, blockNumber: 5n } },
      setActiveNetwork: async (id: number) => { active = { chainId: id, name: "Next", rpcUrl: "https://next", symbol: "NXT" } },
      getPresets: () => networks.slice(0, 1), getCustomNetworks: () => networks.slice(1),
      addCustomNetwork: async (n: any) => { const added = { ...n, isTestnet: true, isLocal: false }; networks = [...networks, added]; return added },
      editCustomNetwork: async (id: number, updates: any) => { const changed = { ...networks.find((n) => n.chainId === id)!, ...updates }; networks = networks.map((n) => n.chainId === id ? changed : n); return changed },
      removeCustomNetwork: async (id: number) => { networks = networks.filter((n) => n.chainId !== id) },
    }
    container.registerInstance("networkService", networkService as any)
    let hook: any
    function Harness() { hook = useNetwork(0); return <text>{hook.activeNetwork.name}</text> }
    const setup = await testRender(<ContainerProvider container={container}><Harness /></ContainerProvider>)
    await act(async () => { await hook.refreshStatus() })
    expect(hook.status.connected).toBe(true)
    await act(async () => { await hook.switchNetwork(2) })
    expect(hook.activeNetwork.chainId).toBe(2)
    const added = await act(async () => hook.addNetwork({ chainId: 3, name: "Custom", rpcUrl: "https://custom", symbol: "C" }))
    expect(added.chainId).toBe(3)
    await act(async () => { await hook.editNetwork(3, { name: "Edited" }) })
    expect(networks[1].name).toBe("Edited")
    await act(async () => { await hook.removeNetwork(3) })
    failStatus = true
    await act(async () => { await hook.refreshStatus() })
    expect(hook.status.error).toBe("offline")
    setup.renderer.destroy()
  })

  it("refreshes tokens after mutations and scopes operations to the selected chain", async () => {
    const container = createDefaultContainer()
    let tokens: any[] = []
    let scope = 0
    const tokenService = {
      getTokens: (chain: number) => { scope = chain; return tokens },
      addToken: async (token: any) => { const added = { ...token, isPreset: false }; tokens = [...tokens, added]; return added },
      toggleHideToken: async (chain: number, address: string) => { scope = chain; tokens = tokens.map((t) => t.address === address ? { ...t, hidden: !t.hidden } : t) },
      removeCustomToken: async (chain: number, address: string) => { scope = chain; tokens = tokens.filter((t) => t.address !== address) },
      verifyTokenContract: async (address: string, chain: number) => ({ isValidErc20: true, metadata: { address, chain } }),
    }
    container.registerInstance("tokenService", tokenService as any)
    let hook: any
    function Harness() { hook = useTokens(11155111); return <text>{hook.tokens.length}</text> }
    const setup = await testRender(<ContainerProvider container={container}><Harness /></ContainerProvider>)
    const token = { address: "0x0000000000000000000000000000000000000001", symbol: "T", name: "Token", decimals: 18, chainId: 11155111 }
    await act(async () => { await hook.addToken(token) })
    expect(hook.tokens).toHaveLength(1)
    await act(async () => { await hook.toggleHideToken(token.address) })
    expect(hook.tokens[0].hidden).toBe(true)
    expect((await hook.verifyTokenContract(token.address)).isValidErc20).toBe(true)
    await act(async () => { await hook.removeCustomToken(token.address) })
    expect(hook.tokens).toHaveLength(0)
    expect(scope).toBe(11155111)
    setup.renderer.destroy()
  })
})
