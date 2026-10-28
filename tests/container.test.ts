import { describe, expect, it } from "bun:test"
import { createDefaultContainer, ServiceContainer } from "../src/container/index.js"
import type { IClipboardService } from "../src/core/interfaces.js"

describe("ServiceContainer", () => {
  it("resolves default singleton services", () => {
    const container = createDefaultContainer()

    const crypto1 = container.resolve("cryptoService")
    const crypto2 = container.resolve("cryptoService")
    expect(crypto1).toBe(crypto2) // Singleton check

    const wallet = container.resolve("walletService")
    const storage = container.resolve("storageService")
    const rpc = container.resolve("rpcService")
    const network = container.resolve("networkService")
    const clipboard = container.resolve("clipboardService")

    expect(wallet).toBeDefined()
    expect(storage).toBeDefined()
    expect(rpc).toBeDefined()
    expect(network).toBeDefined()
    expect(clipboard).toBeDefined()
  })

  it("allows registering custom instance for mocking", () => {
    const container = new ServiceContainer()
    let copiedText = ""

    const mockClipboard: IClipboardService = {
      copy: async (text: string) => {
        copiedText = text
        return true
      },
    }

    container.registerInstance("clipboardService", mockClipboard)
    const resolved = container.resolve("clipboardService")
    expect(resolved).toBe(mockClipboard)

    resolved.copy("hello mock")
    expect(copiedText).toBe("hello mock")
  })

  it("throws when resolving an unregistered token", () => {
    const container = new ServiceContainer()
    expect(() => container.resolve("cryptoService")).toThrow("Service not registered")
  })
})

