import type { ServiceMap, ServiceToken } from "../core/tokens.js"
import { CryptoService } from "../services/crypto.service.js"
import { WalletService } from "../services/wallet.service.js"
import { StorageService } from "../services/storage.service.js"
import { RpcService } from "../services/rpc.service.js"
import { NetworkService } from "../services/network.service.js"
import { ClipboardService } from "../services/clipboard.service.js"
import { KeystoreService } from "../services/keystore.service.js"
import { TokenService } from "../services/token.service.js"
import { PriceService } from "../services/price.service.js"
import { ThemeService } from "../services/theme.service.js"

export class ServiceContainer {
  private factories = new Map<ServiceToken, (c: ServiceContainer) => unknown>()
  private instances = new Map<ServiceToken, unknown>()

  /**
   * Register a singleton factory. The factory will be invoked once when resolved,
   * and the resulting instance cached for subsequent calls.
   */
  registerSingleton<K extends ServiceToken>(
    token: K,
    factory: (container: ServiceContainer) => ServiceMap[K],
  ): this {
    this.factories.set(token, factory)
    this.instances.delete(token)
    return this
  }

  /**
   * Register an existing instance directly (useful for tests or pre-instantiated clients).
   */
  registerInstance<K extends ServiceToken>(token: K, instance: ServiceMap[K]): this {
    this.instances.set(token, instance)
    return this
  }

  /**
   * Check if a token is registered.
   */
  has(token: ServiceToken): boolean {
    return this.instances.has(token) || this.factories.has(token)
  }

  /**
   * Resolve a service by its token.
   */
  resolve<K extends ServiceToken>(token: K): ServiceMap[K] {
    if (this.instances.has(token)) {
      return this.instances.get(token) as ServiceMap[K]
    }

    const factory = this.factories.get(token)
    if (!factory) {
      throw new Error(`Service not registered for token: ${String(token)}`)
    }

    const instance = factory(this) as ServiceMap[K]
    this.instances.set(token, instance)
    return instance
  }

  /**
   * Create an isolated fork of this container (e.g. for test isolation).
   */
  clone(): ServiceContainer {
    const clone = new ServiceContainer()
    for (const [k, v] of this.factories.entries()) {
      clone.factories.set(k, v)
    }
    for (const [k, v] of this.instances.entries()) {
      clone.instances.set(k, v)
    }
    return clone
  }
}

export function createDefaultContainer(): ServiceContainer {
  const container = new ServiceContainer()

  container.registerSingleton("cryptoService", () => new CryptoService())
  container.registerSingleton("walletService", () => new WalletService())
  container.registerSingleton("storageService", () => new StorageService())
  container.registerSingleton("rpcService", () => new RpcService())
  container.registerSingleton("networkService", (c) => new NetworkService(c.resolve("rpcService"), c.resolve("storageService")))
  container.registerSingleton("clipboardService", () => new ClipboardService())
  container.registerSingleton("keystoreService", () => new KeystoreService())
  container.registerSingleton(
    "tokenService",
    (c) => new TokenService(c.resolve("storageService"), c.resolve("rpcService")),
  )
  container.registerSingleton("priceService", (c) => new PriceService(c.resolve("storageService")))
  container.registerSingleton("themeService", (c) => new ThemeService(c.resolve("storageService")))

  return container
}

