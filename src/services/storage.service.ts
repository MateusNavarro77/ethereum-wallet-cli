import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, unlinkSync } from "node:fs"
import { homedir } from "node:os"
import { join, dirname } from "node:path"
import type { IStorageService } from "../core/interfaces.js"
import type { AppConfig, EncryptedVault } from "../core/types.js"

export class StorageService implements IStorageService {
  private readonly vaultPath: string
  private readonly configPath: string

  constructor(customPath?: string, customConfigPath?: string) {
    if (customPath) {
      this.vaultPath = customPath
      this.configPath = customConfigPath || join(dirname(customPath), "config.json")
    } else {
      const baseDir = process.env.TERMIWALLET_HOME || join(homedir(), ".termiwallet")
      this.vaultPath = join(baseDir, "vault.json")
      this.configPath = customConfigPath || join(baseDir, "config.json")
    }
  }

  getVaultPath(): string {
    return this.vaultPath
  }

  getConfigPath(): string {
    return this.configPath
  }

  async vaultExists(): Promise<boolean> {
    return existsSync(this.vaultPath)
  }

  async configExists(): Promise<boolean> {
    return existsSync(this.configPath)
  }

  async saveVault(vault: EncryptedVault): Promise<void> {
    const dir = dirname(this.vaultPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 })
    }

    const content = JSON.stringify(vault, null, 2)
    writeFileSync(this.vaultPath, content, { encoding: "utf8", mode: 0o600 })

    // Ensure permissions are strictly 0600 even if file already existed
    try {
      chmodSync(this.vaultPath, 0o600)
    } catch {
      // Ignored on platforms without POSIX permissions (e.g. Windows FAT32)
    }
  }

  async loadVault(): Promise<EncryptedVault> {
    if (!existsSync(this.vaultPath)) {
      throw new Error(`Vault file does not exist at ${this.vaultPath}`)
    }

    const raw = readFileSync(this.vaultPath, "utf8")
    try {
      return JSON.parse(raw) as EncryptedVault
    } catch {
      throw new Error("Vault file is corrupted or not valid JSON")
    }
  }

  async deleteVault(): Promise<void> {
    if (existsSync(this.vaultPath)) {
      unlinkSync(this.vaultPath)
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    const dir = dirname(this.configPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 })
    }

    const content = JSON.stringify(config, null, 2)
    writeFileSync(this.configPath, content, { encoding: "utf8", mode: 0o600 })

    try {
      chmodSync(this.configPath, 0o600)
    } catch {
      // Ignored on non-POSIX platforms
    }
  }

  async loadConfig(): Promise<AppConfig> {
    if (!existsSync(this.configPath)) {
      return {}
    }

    const raw = readFileSync(this.configPath, "utf8")
    try {
      return JSON.parse(raw) as AppConfig
    } catch {
      throw new Error("Config file is corrupted or not valid JSON")
    }
  }
}
