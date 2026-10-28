import type {
  ICryptoService,
  IWalletService,
  IStorageService,
  IRpcService,
  INetworkService,
  IClipboardService,
  IKeystoreService,
} from "./interfaces.js"

export interface ServiceMap {
  cryptoService: ICryptoService
  walletService: IWalletService
  storageService: IStorageService
  rpcService: IRpcService
  networkService: INetworkService
  clipboardService: IClipboardService
  keystoreService: IKeystoreService
}

export type ServiceToken = keyof ServiceMap
