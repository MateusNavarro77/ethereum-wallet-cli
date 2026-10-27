import { describe, expect, it } from "bun:test"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { testRender, act } from "./test-utils.js"
import { createDefaultContainer } from "../src/container/index.js"
import { StorageService } from "../src/services/storage.service.js"
import {
  useBalance,
  useClipboardNotification,
  useUnlock,
  usePasswordForm,
  useImportMnemonic,
  useMnemonicBackup,
} from "../src/ui/hooks/index.js"
import { ContainerProvider } from "../src/ui/context.js"

describe("UI Custom Hooks", () => {
  describe("useBalance", () => {
    it("fetches balance and retrieves network info", async () => {
      const container = createDefaultContainer()
      const mockRpc = {
        getBalance: async () => 1000000000000000000n, // 1 ETH
        formatEther: (_wei: bigint) => "1.0",
        getNetwork: () => ({
          name: "Sepolia Testnet",
          symbol: "SEP",
          chainId: 11155111,
          rpcUrl: "https://rpc.sepolia.org",
        }),
      }

      container.registerInstance("rpcService", mockRpc as any)

      let currentHook: any
      function TestComponent() {
        currentHook = useBalance("0x0000000000000000000000000000000000000001")
        return <text>{currentHook.balance}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      expect(currentHook.network.name).toBe("Sepolia Testnet")
      expect(currentHook.network.symbol).toBe("SEP")

      await act(async () => {
        await currentHook.refreshBalance()
      })
      await setup.renderOnce()

      expect(currentHook.balance).toBe("1.0 SEP")
      expect(currentHook.balanceError).toBeNull()

      setup.renderer.destroy()
    })

    it("handles RPC errors gracefully", async () => {
      const container = createDefaultContainer()
      const failingRpc = {
        getBalance: async () => {
          throw new Error("RPC network timeout")
        },
        formatEther: () => "0",
        getNetwork: () => ({
          name: "Sepolia Testnet",
          symbol: "SEP",
          chainId: 11155111,
          rpcUrl: "https://rpc.sepolia.org",
        }),
      }

      container.registerInstance("rpcService", failingRpc as any)

      let currentHook: any
      function TestComponent() {
        currentHook = useBalance("0x0000000000000000000000000000000000000001")
        return <text>{currentHook.balance}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      await act(async () => {
        await currentHook.refreshBalance()
      })
      await setup.renderOnce()

      expect(currentHook.balance).toBe("Unavailable (RPC error)")
      expect(currentHook.balanceError).toBe("RPC network timeout")

      setup.renderer.destroy()
    })
  })

  describe("useClipboardNotification", () => {
    it("sets and clears notification banner", async () => {
      const container = createDefaultContainer()
      let currentHook: any
      function TestComponent() {
        currentHook = useClipboardNotification(50)
        return <text>{currentHook.notification || "none"}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      expect(currentHook.notification).toBeNull()
      act(() => {
        currentHook.setNotification("Custom Alert", 100)
      })
      await setup.renderOnce()
      expect(currentHook.notification).toBe("Custom Alert")

      setup.renderer.destroy()
    })

    it("copies text using clipboardService", async () => {
      const container = createDefaultContainer()
      const mockClipboard = {
        copy: async (_text: string) => true,
      }
      container.registerInstance("clipboardService", mockClipboard as any)

      let currentHook: any
      function TestComponent() {
        currentHook = useClipboardNotification(100)
        return <text>{currentHook.notification || "none"}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      let success = false
      await act(async () => {
        success = await currentHook.copyText("0x123")
      })
      expect(success).toBe(true)
      await setup.renderOnce()
      expect(currentHook.notification).toBe("✔ Address copied to clipboard!")

      setup.renderer.destroy()
    })
  })

  describe("useUnlock", () => {
    it("validates empty password", async () => {
      const container = createDefaultContainer()
      let unlocked = false
      let currentHook: any
      function TestComponent() {
        currentHook = useUnlock({ onUnlocked: () => { unlocked = true } })
        return <text>{currentHook.errorMessage}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      await act(async () => {
        await currentHook.handleUnlock()
      })
      await setup.renderOnce()

      expect(currentHook.errorMessage).toBe("Please enter your wallet password")
      expect(unlocked).toBe(false)

      setup.renderer.destroy()
    })

    it("authenticates and decrypts vault on correct password", async () => {
      const tempVault = join(tmpdir(), `termiwallet-hook-test-${Date.now()}.json`)
      const container = createDefaultContainer()
      container.registerInstance("storageService", new StorageService(tempVault))
      const cryptoService = container.resolve("cryptoService")
      const storageService = container.resolve("storageService")

      const dummyWallet = {
        version: 1,
        mnemonic: "test test test test test test test test test test test junk",
        accounts: [{ address: "0x123", index: 0, label: "Account 1" }],
        activeNetwork: "sepolia",
      }

      const encrypted = await cryptoService.encrypt(JSON.stringify(dummyWallet), "password123")
      await storageService.saveVault(encrypted)

      let unlockedWallet: any = null
      let currentHook: any
      function TestComponent() {
        currentHook = useUnlock({ onUnlocked: (w) => { unlockedWallet = w } })
        return <text>{currentHook.errorMessage}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      act(() => {
        currentHook.setPassword("password123")
      })
      await setup.renderOnce()
      await act(async () => {
        await currentHook.handleUnlock()
      })
      await setup.renderOnce()

      expect(currentHook.errorMessage).toBe("")
      expect(unlockedWallet).not.toBeNull()
      expect(unlockedWallet.accounts[0].address).toBe("0x123")

      await storageService.deleteVault()
      setup.renderer.destroy()
    })
  })

  describe("usePasswordForm", () => {
    it("assesses strength and enforces min length and match", async () => {
      const container = createDefaultContainer()
      let submitted = ""
      let currentHook: any
      function TestComponent() {
        currentHook = usePasswordForm({ onComplete: (p) => { submitted = p } })
        return <text>{currentHook.errorMessage}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      // Less than 8 chars
      act(() => {
        currentHook.setPassword("short")
        currentHook.setConfirmPassword("short")
      })
      await setup.renderOnce()
      act(() => {
        currentHook.handleProceed()
      })
      await setup.renderOnce()
      expect(currentHook.errorMessage).toBe("Password must be at least 8 characters long")
      expect(submitted).toBe("")

      // Mismatched
      act(() => {
        currentHook.setPassword("strongpassword123")
        currentHook.setConfirmPassword("different123")
      })
      await setup.renderOnce()
      act(() => {
        currentHook.handleProceed()
      })
      await setup.renderOnce()
      expect(currentHook.errorMessage).toBe("Passwords do not match")
      expect(submitted).toBe("")

      // Matching and valid
      act(() => {
        currentHook.setPassword("strongpassword123")
        currentHook.setConfirmPassword("strongpassword123")
      })
      await setup.renderOnce()
      act(() => {
        currentHook.handleProceed()
      })
      await setup.renderOnce()
      expect(currentHook.errorMessage).toBe("")
      expect(submitted).toBe("strongpassword123")
      expect(currentHook.strength.label).toBeDefined()

      setup.renderer.destroy()
    })

    it("toggles field focus between password and confirm", async () => {
      const container = createDefaultContainer()
      let currentHook: any
      function TestComponent() {
        currentHook = usePasswordForm({ onComplete: () => {} })
        return <text>{currentHook.focusedField}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      expect(currentHook.focusedField).toBe("password")
      act(() => {
        currentHook.toggleFocus()
      })
      await setup.renderOnce()
      expect(currentHook.focusedField).toBe("confirm")

      setup.renderer.destroy()
    })
  })

  describe("useImportMnemonic", () => {
    it("handles multi-word paste properly", async () => {
      const container = createDefaultContainer()
      let currentHook: any
      function TestComponent() {
        currentHook = useImportMnemonic({ onComplete: () => {} })
        return <text>{currentHook.words[0]}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      act(() => {
        currentHook.handleWordChange(
          0,
          "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
        )
      })
      await setup.renderOnce()

      expect(currentHook.words[0]).toBe("abandon")
      expect(currentHook.words[11]).toBe("about")
      expect(currentHook.focusedIndex).toBe(11)

      setup.renderer.destroy()
    })

    it("validates mnemonic before completing", async () => {
      const container = createDefaultContainer()
      let completedPhrase = ""
      let currentHook: any
      function TestComponent() {
        currentHook = useImportMnemonic({ onComplete: (p) => { completedPhrase = p } })
        return <text>{currentHook.errorMessage}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      act(() => {
        currentHook.handleProceed()
      })
      await setup.renderOnce()
      expect(currentHook.errorMessage).toContain("Please enter all 12 words")

      act(() => {
        currentHook.handleWordChange(
          0,
          "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
        )
      })
      await setup.renderOnce()
      act(() => {
        currentHook.handleProceed()
      })
      await setup.renderOnce()
      expect(currentHook.errorMessage).toBe("")
      expect(completedPhrase).toContain("abandon")

      setup.renderer.destroy()
    })
  })

  describe("useMnemonicBackup", () => {
    it("requires backup confirmation before continuing", async () => {
      const container = createDefaultContainer()
      let continued = false
      const testMnemonic = "one two three four five six seven eight nine ten eleven twelve"
      let currentHook: any
      function TestComponent() {
        currentHook = useMnemonicBackup({ mnemonic: testMnemonic, onComplete: () => { continued = true } })
        return <text>{currentHook.backedUp ? "yes" : "no"}</text>
      }

      const setup = await testRender(
        <ContainerProvider container={container}>
          <TestComponent />
        </ContainerProvider>,
        {},
      )

      expect(currentHook.words.length).toBe(12)
      expect(currentHook.backedUp).toBe(false)

      act(() => {
        currentHook.handleContinue()
      })
      await setup.renderOnce()
      expect(currentHook.errorMessage).toContain("confirm that you have safely backed up")
      expect(continued).toBe(false)

      act(() => {
        currentHook.toggleBackedUp()
      })
      await setup.renderOnce()
      expect(currentHook.backedUp).toBe(true)

      act(() => {
        currentHook.handleContinue()
      })
      await setup.renderOnce()
      expect(continued).toBe(true)

      setup.renderer.destroy()
    })
  })
})

