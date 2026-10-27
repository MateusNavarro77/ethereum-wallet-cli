import type { ICryptoService, PasswordAssessment } from "../core/interfaces.js"
import type { EncryptedVault } from "../core/types.js"

export class CryptoService implements ICryptoService {
  private readonly iterations: number

  constructor(iterations = 100_000) {
    this.iterations = iterations
  }

  assessPasswordStrength(password: string): PasswordAssessment {
    const feedback: string[] = []
    let score = 0

    if (!password || password.length === 0) {
      return { score: 0, feedback: ["Password cannot be empty"], isAcceptable: false }
    }

    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    // Normalize to 0-4
    const normalizedScore = Math.min(4, score)

    if (password.length < 8) {
      feedback.push("Password should be at least 8 characters long")
    }
    if (!/[0-9]/.test(password)) {
      feedback.push("Include at least one number")
    }
    if (!/[A-Z]/.test(password)) {
      feedback.push("Include at least one uppercase letter")
    }

    return {
      score: normalizedScore,
      feedback,
      isAcceptable: password.length >= 8,
    }
  }

  async encrypt(plaintext: string, password: string): Promise<EncryptedVault> {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long")
    }

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const key = await this.deriveKey(password, salt, this.iterations)
    const encodedPlaintext = new TextEncoder().encode(plaintext)

    // AES-GCM in WebCrypto appends the 16-byte auth tag at the end of the ciphertext buffer
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encodedPlaintext,
    )

    const encryptedBytes = new Uint8Array(encryptedBuffer)
    const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16)
    const authTagBytes = encryptedBytes.slice(encryptedBytes.length - 16)

    const now = new Date().toISOString()
    return {
      version: 1,
      cipher: "aes-256-gcm",
      kdf: "pbkdf2",
      iterations: this.iterations,
      salt: Buffer.from(salt).toString("hex"),
      iv: Buffer.from(iv).toString("hex"),
      authTag: Buffer.from(authTagBytes).toString("hex"),
      ciphertext: Buffer.from(ciphertextBytes).toString("hex"),
      createdAt: now,
      updatedAt: now,
    }
  }

  async decrypt(vault: EncryptedVault, password: string): Promise<string> {
    if (vault.version !== 1 || vault.cipher !== "aes-256-gcm") {
      throw new Error(`Unsupported vault format: ${vault.cipher} v${vault.version}`)
    }

    const salt = Buffer.from(vault.salt, "hex")
    const iv = Buffer.from(vault.iv, "hex")
    const ciphertextBytes = Buffer.from(vault.ciphertext, "hex")
    const authTagBytes = Buffer.from(vault.authTag, "hex")

    // Reconstruct ciphertext + auth tag buffer for WebCrypto
    const combined = new Uint8Array(ciphertextBytes.length + authTagBytes.length)
    combined.set(ciphertextBytes, 0)
    combined.set(authTagBytes, ciphertextBytes.length)

    const key = await this.deriveKey(password, salt, vault.iterations)

    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
        },
        key,
        combined,
      )
      return new TextDecoder().decode(decrypted)
    } catch {
      throw new Error("Decryption failed: Incorrect password or corrupted vault")
    }
  }

  private async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number,
  ): Promise<CryptoKey> {
    const passwordKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    )

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as unknown as BufferSource,
        iterations,
        hash: "SHA-256",
      },
      passwordKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"],
    )
  }
}
