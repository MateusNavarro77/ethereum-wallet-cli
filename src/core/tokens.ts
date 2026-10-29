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
  IThemeService,
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
  themeService: IThemeService
}

export type ServiceToken = keyof ServiceMap
