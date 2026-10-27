import type {
  ICryptoService,
  IWalletService,
  IStorageService,
  IRpcService,
  IClipboardService,
  IKeystoreService,
} from "./interfaces.js"

export interface ServiceMap {
  cryptoService: ICryptoService
  walletService: IWalletService
  storageService: IStorageService
  rpcService: IRpcService
  clipboardService: IClipboardService
  keystoreService: IKeystoreService
}

export type ServiceToken = keyof ServiceMap
