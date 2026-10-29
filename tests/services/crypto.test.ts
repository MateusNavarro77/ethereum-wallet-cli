import { describe, expect, it } from "bun:test"
import { CryptoService } from "../../src/services/crypto.service.js"

describe("CryptoService", () => {
  const cryptoService = new CryptoService(10_000) // Lower iterations for fast test suite

  it("assesses password strength correctly", () => {
    const weak = cryptoService.assessPasswordStrength("short")
    expect(weak.isAcceptable).toBe(false)
    expect(weak.score).toBeLessThanOrEqual(1)

    const strong = cryptoService.assessPasswordStrength("SuperSecure123!")
    expect(strong.isAcceptable).toBe(true)
    expect(strong.score).toBeGreaterThanOrEqual(4)
  })

  it("encrypts and decrypts a plaintext payload successfully", async () => {
    const password = "ValidPassword123!"
    const secretData = JSON.stringify({ mnemonic: "test phrase", account: 0 })

    const vault = await cryptoService.encrypt(secretData, password)
    expect(vault.version).toBe(1)
    expect(vault.cipher).toBe("aes-256-gcm")
    expect(vault.salt).toBeDefined()
    expect(vault.iv).toBeDefined()
    expect(vault.authTag).toBeDefined()
    expect(vault.ciphertext).toBeDefined()

    const decrypted = await cryptoService.decrypt(vault, password)
    expect(decrypted).toBe(secretData)
  })

  it("fails to decrypt with an incorrect password", async () => {
    const password = "CorrectPassword123!"
    const wrongPassword = "WrongPassword123!"
    const secret = "TopSecretInfo"

    const vault = await cryptoService.encrypt(secret, password)
    expect(cryptoService.decrypt(vault, wrongPassword)).rejects.toThrow("Decryption failed")
  })

  it("fails to decrypt if ciphertext is tampered with", async () => {
    const password = "Password123!"
    const vault = await cryptoService.encrypt("Payload", password)

    // Tamper with the last byte of ciphertext
    const tamperedCiphertext =
      vault.ciphertext.slice(0, -2) + (vault.ciphertext.endsWith("00") ? "11" : "00")
    const tamperedVault = { ...vault, ciphertext: tamperedCiphertext }

    expect(cryptoService.decrypt(tamperedVault, password)).rejects.toThrow("Decryption failed")
  })

  it("rejects password shorter than 8 characters for encryption", () => {
    expect(cryptoService.encrypt("secret", "short")).rejects.toThrow(
      "Password must be at least 8 characters long",
    )
  })
})

