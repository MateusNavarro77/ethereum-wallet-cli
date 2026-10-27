import { generateMnemonic, mnemonicToAccount, english } from "viem/accounts"
import { validateMnemonic } from "@scure/bip39"
import type { IWalletService, DerivedKey } from "../core/interfaces.js"
import type { WalletData } from "../core/types.js"
import { SEPOLIA_NETWORK } from "../core/types.js"

export class WalletService implements IWalletService {
  generateMnemonic(): string {
    return generateMnemonic(english)
  }

  validateMnemonic(mnemonic: string): boolean {
    return validateMnemonic(mnemonic, english)
  }

  deriveAccount(mnemonic: string, accountIndex = 0): DerivedKey {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error("Invalid BIP-39 mnemonic phrase")
    }

    // BIP-44 path for Ethereum: m/44'/60'/0'/0/index
    const account = mnemonicToAccount(mnemonic, {
      accountIndex: 0,
      addressIndex: accountIndex,
    })

    return {
      address: account.address,
      privateKey: (account as unknown as { getHdKey(): { privateKey?: Uint8Array } }).getHdKey
        ? (`0x${Buffer.from((account as unknown as { getHdKey(): { privateKey: Uint8Array } }).getHdKey().privateKey).toString("hex")}` as `0x${string}`)
        : ("0x" as `0x${string}`),
      index: accountIndex,
      label: accountIndex === 0 ? "Account 1" : `Account ${accountIndex + 1}`,
    }
  }

  createWallet(mnemonic: string, defaultLabel = "Account 1"): WalletData {
    const primaryAccount = this.deriveAccount(mnemonic, 0)
    return {
      mnemonic,
      accounts: [
        {
          address: primaryAccount.address,
          index: 0,
          label: defaultLabel,
        },
      ],
      defaultChainId: SEPOLIA_NETWORK.chainId,
    }
  }

  importWallet(mnemonic: string, defaultLabel = "Account 1"): WalletData {
    const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, " ")
    if (!this.validateMnemonic(normalized)) {
      throw new Error("Invalid BIP-39 mnemonic recovery phrase")
    }
    return this.createWallet(normalized, defaultLabel)
  }
}

