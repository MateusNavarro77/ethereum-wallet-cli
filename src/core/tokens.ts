import type {
  ICryptoService,
  IWalletService,
  IStorageService,
  IRpcService,
  INetworkService,
  IClipboardService,
  IKeystoreService,
  ITokenService,
  IPriceService,
} from "./interfaces.js"

export interface ServiceMap {
  cryptoService: ICryptoService
  walletService: IWalletService
  storageService: IStorageService
  rpcService: IRpcService
  networkService: INetworkService
  clipboardService: IClipboardService
  keystoreService: IKeystoreService
  tokenService: ITokenService
  priceService: IPriceService
}

export type ServiceToken = keyof ServiceMap
