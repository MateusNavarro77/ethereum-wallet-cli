import type {
  ICryptoService,
  IWalletService,
  IStorageService,
  IRpcService,
  IClipboardService,
} from "./interfaces.js"

export interface ServiceMap {
  cryptoService: ICryptoService
  walletService: IWalletService
  storageService: IStorageService
  rpcService: IRpcService
  clipboardService: IClipboardService
}

export type ServiceToken = keyof ServiceMap

