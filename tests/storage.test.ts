import { describe, expect, it, afterEach } from "bun:test"
import { statSync, unlinkSync, existsSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { StorageService } from "../src/services/storage.service.js"
import type { EncryptedVault } from "../src/core/types.js"

describe("StorageService", () => {
  const tempDir = join(tmpdir(), `termiwallet-test-${Date.now()}`)
  const tempVaultPath = join(tempDir, "vault.json")
  const storage = new StorageService(tempVaultPath)

  afterEach(() => {
    if (existsSync(tempVaultPath)) {
      unlinkSync(tempVaultPath)
    }
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  const dummyVault: EncryptedVault = {
    version: 1,
    cipher: "aes-256-gcm",
    kdf: "pbkdf2",
    iterations: 10000,
    salt: "aabbcc",
    iv: "ddeeff",
    authTag: "112233",
    ciphertext: "445566",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it("reports vaultExists correctly", async () => {
    expect(await storage.vaultExists()).toBe(false)
    await storage.saveVault(dummyVault)
    expect(await storage.vaultExists()).toBe(true)
  })

  it("persists vault file and enforces 0600 permissions", async () => {
    await storage.saveVault(dummyVault)

    const stats = statSync(tempVaultPath)
    // 0o600 in octal is 384 in decimal
    const permissions = stats.mode & 0o777
    expect(permissions).toBe(0o600)

    const loaded = await storage.loadVault()
    expect(loaded.salt).toBe(dummyVault.salt)
    expect(loaded.ciphertext).toBe(dummyVault.ciphertext)
  })

  it("deletes the vault file cleanly", async () => {
    await storage.saveVault(dummyVault)
    expect(await storage.vaultExists()).toBe(true)

    await storage.deleteVault()
    expect(await storage.vaultExists()).toBe(false)
    expect(existsSync(tempVaultPath)).toBe(false)
  })

  it("throws when loading non-existent vault", () => {
    expect(storage.loadVault()).rejects.toThrow("Vault file does not exist")
  })
})

