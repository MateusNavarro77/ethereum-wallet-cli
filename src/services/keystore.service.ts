import crypto from "node:crypto"
import { keccak256 } from "viem"
import { privateKeyToAddress } from "viem/accounts"
import type { IKeystoreService } from "../core/interfaces.js"
import type { Web3KeystoreV3 } from "../core/types.js"

export class KeystoreService implements IKeystoreService {
  parseKeystoreJson(content: string): Web3KeystoreV3 {
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error("Invalid JSON format in keystore file")
    }

    // Support both "crypto" and "Crypto" capitalization in standard Web3 Keystore v3
    const cryptoObj = parsed.crypto || parsed.Crypto
    if (!cryptoObj) {
      throw new Error("Missing 'crypto' definition in Web3 keystore")
    }

    if (parsed.version !== 3) {
      throw new Error(`Unsupported keystore version: ${parsed.version}. Only version 3 is supported.`)
    }

    if (!cryptoObj.cipher || !cryptoObj.ciphertext || !cryptoObj.cipherparams?.iv || !cryptoObj.kdf || !cryptoObj.mac) {
      throw new Error("Incomplete Web3 v3 crypto parameters in keystore")
    }

    return {
      version: 3,
      id: parsed.id || "",
      address: parsed.address || "",
      crypto: {
        cipher: cryptoObj.cipher.toLowerCase(),
        ciphertext: cryptoObj.ciphertext,
        cipherparams: {
          iv: cryptoObj.cipherparams.iv,
        },
        kdf: cryptoObj.kdf.toLowerCase(),
        kdfparams: cryptoObj.kdfparams,
        mac: cryptoObj.mac.toLowerCase(),
      },
    }
  }

  async decryptKeystore(keystore: Web3KeystoreV3, password: string): Promise<`0x${string}`> {
    const passwordBuffer = Buffer.from(password, "utf8")
    const { kdf, kdfparams, cipher, ciphertext, cipherparams, mac } = keystore.crypto

    let derivedKey: Buffer

    if (kdf === "scrypt") {
      const salt = Buffer.from(kdfparams.salt, "hex")
      const n = kdfparams.n || 262144
      const r = kdfparams.r || 8
      const p = kdfparams.p || 1
      const dklen = kdfparams.dklen || 32

      derivedKey = crypto.scryptSync(passwordBuffer, salt, dklen, {
        N: n,
        r,
        p,
        maxmem: 1024 * 1024 * 1024,
      })
    } else if (kdf === "pbkdf2") {
      const salt = Buffer.from(kdfparams.salt, "hex")
      const iterations = kdfparams.c || 262144
      const dklen = kdfparams.dklen || 32
      const prf = kdfparams.prf === "hmac-sha256" ? "sha256" : "sha256"

      derivedKey = crypto.pbkdf2Sync(passwordBuffer, salt, iterations, dklen, prf)
    } else {
      throw new Error(`Unsupported KDF algorithm: ${kdf}`)
    }

    const ciphertextBuffer = Buffer.from(ciphertext, "hex")

    // Verify MAC = keccak256(derivedKey[16..32] + ciphertext)
    const macBuffer = Buffer.concat([derivedKey.subarray(16, 32), ciphertextBuffer])
    const calculatedMac = keccak256(macBuffer).replace(/^0x/, "").toLowerCase()

    if (calculatedMac !== mac.toLowerCase().replace(/^0x/, "")) {
      throw new Error("Incorrect keystore password or corrupt keystore file")
    }

    // Decrypt ciphertext using derivedKey[0..16]
    const encryptionKey = derivedKey.subarray(0, 16)
    const iv = Buffer.from(cipherparams.iv, "hex")

    let decrypted: Buffer
    if (cipher === "aes-128-ctr") {
      const decipher = crypto.createDecipheriv("aes-128-ctr", encryptionKey, iv)
      decrypted = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()])
    } else if (cipher === "aes-128-cbc") {
      const decipher = crypto.createDecipheriv("aes-128-cbc", encryptionKey, iv)
      decrypted = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()])
    } else {
      throw new Error(`Unsupported cipher: ${cipher}`)
    }

    const privateKeyHex = `0x${decrypted.toString("hex").padStart(64, "0")}` as `0x${string}`

    // If an address is included in the keystore, verify it matches
    if (keystore.address) {
      const derivedAddress = privateKeyToAddress(privateKeyHex).toLowerCase().replace(/^0x/, "")
      const expectedAddress = keystore.address.toLowerCase().replace(/^0x/, "")
      if (expectedAddress && derivedAddress !== expectedAddress) {
        throw new Error("Decrypted private key does not match address in keystore")
      }
    }

    return privateKeyHex
  }
}

