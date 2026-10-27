import { describe, it, expect } from "bun:test"
import { KeystoreService } from "../src/services/keystore.service.js"
import crypto from "node:crypto"
import { keccak256 } from "viem"
import { privateKeyToAddress } from "viem/accounts"

describe("KeystoreService", () => {
  const service = new KeystoreService()

  // Helper to generate a valid Web3 v3 keystore for testing
  function createTestKeystore(options: {
    password: string
    privateKey: `0x${string}`
    kdf: "scrypt" | "pbkdf2"
    cipher?: "aes-128-ctr" | "aes-128-cbc"
  }) {
    const { password, privateKey, kdf, cipher = "aes-128-ctr" } = options
    const salt = crypto.randomBytes(32)
    const iv = crypto.randomBytes(16)
    const address = privateKeyToAddress(privateKey).toLowerCase().replace(/^0x/, "")
    const privKeyBuffer = Buffer.from(privateKey.replace(/^0x/, ""), "hex")

    let derivedKey: Buffer
    let kdfparams: any

    if (kdf === "scrypt") {
      const n = 8192
      const r = 8
      const p = 1
      derivedKey = crypto.scryptSync(password, salt, 32, { N: n, r, p })
      kdfparams = {
        dklen: 32,
        salt: salt.toString("hex"),
        n,
        r,
        p,
      }
    } else {
      const iterations = 1000
      derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256")
      kdfparams = {
        dklen: 32,
        salt: salt.toString("hex"),
        c: iterations,
        prf: "hmac-sha256",
      }
    }

    const cipherKey = derivedKey.subarray(0, 16)
    const cipherInstance = crypto.createCipheriv(cipher, cipherKey, iv)
    const ciphertext = Buffer.concat([cipherInstance.update(privKeyBuffer), cipherInstance.final()])

    const macBuffer = Buffer.concat([derivedKey.subarray(16, 32), ciphertext])
    const mac = keccak256(macBuffer).replace(/^0x/, "").toLowerCase()

    return JSON.stringify({
      version: 3,
      id: crypto.randomUUID(),
      address,
      crypto: {
        ciphertext: ciphertext.toString("hex"),
        cipherparams: {
          iv: iv.toString("hex"),
        },
        cipher,
        kdf,
        kdfparams,
        mac,
      },
    })
  }

  it("parses a valid Web3 v3 keystore JSON", () => {
    const raw = createTestKeystore({
      password: "password123",
      privateKey: "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e",
      kdf: "scrypt",
    })

    const parsed = service.parseKeystoreJson(raw)
    expect(parsed.version).toBe(3)
    expect(parsed.crypto.kdf).toBe("scrypt")
    expect(parsed.crypto.cipher).toBe("aes-128-ctr")
  })

  it("decrypts an scrypt-based Web3 v3 keystore successfully", async () => {
    const privateKey = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e" as `0x${string}`
    const password = "my-secure-keystore-pass"
    const raw = createTestKeystore({
      password,
      privateKey,
      kdf: "scrypt",
    })

    const parsed = service.parseKeystoreJson(raw)
    const decryptedKey = await service.decryptKeystore(parsed, password)
    expect(decryptedKey.toLowerCase()).toBe(privateKey.toLowerCase())
  })

  it("decrypts a pbkdf2-based Web3 v3 keystore successfully", async () => {
    const privateKey = "0x689af8efa8d651d91d68f5542199051109a6363731f464b8e733e5b4fb7cb0c2" as `0x${string}`
    const password = "another-pbkdf2-password"
    const raw = createTestKeystore({
      password,
      privateKey,
      kdf: "pbkdf2",
    })

    const parsed = service.parseKeystoreJson(raw)
    const decryptedKey = await service.decryptKeystore(parsed, password)
    expect(decryptedKey.toLowerCase()).toBe(privateKey.toLowerCase())
  })

  it("throws on incorrect password (MAC failure)", async () => {
    const raw = createTestKeystore({
      password: "correct-password",
      privateKey: "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e",
      kdf: "scrypt",
    })

    const parsed = service.parseKeystoreJson(raw)
    expect(service.decryptKeystore(parsed, "wrong-password")).rejects.toThrow(
      "Incorrect keystore password or corrupt keystore file"
    )
  })

  it("throws on unsupported version or invalid JSON", () => {
    expect(() => service.parseKeystoreJson("{invalid-json")).toThrow("Invalid JSON format")
    expect(() => service.parseKeystoreJson(JSON.stringify({ version: 2, crypto: {} }))).toThrow(
      "Unsupported keystore version: 2"
    )
  })

  it("throws if address in keystore does not match decrypted private key", async () => {
    const raw = createTestKeystore({
      password: "password123",
      privateKey: "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a0747231e",
      kdf: "scrypt",
    })
    const parsed = service.parseKeystoreJson(raw)
    parsed.address = "0x0000000000000000000000000000000000000001" // tamper address

    expect(service.decryptKeystore(parsed, "password123")).rejects.toThrow(
      "Decrypted private key does not match address in keystore"
    )
  })
})

