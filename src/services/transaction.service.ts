import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  erc20Abi,
  defineChain,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mainnet, sepolia } from "viem/chains"
import type {
  ITransactionService,
  IRpcService,
  IWalletService,
} from "../core/interfaces.js"
import type {
  GasEstimateResult,
  GasFeePresets,
  NetworkConfig,
  PrepareTransactionParams,
  SendTransactionParams,
  TransactionReceiptSummary,
  WalletData,
} from "../core/types.js"

export class TransactionService implements ITransactionService {
  constructor(
    private rpcService: IRpcService,
    private walletService: IWalletService,
    private customWalletClient?: any,
  ) {}

  private getPublicClient(): any {
    if (this.rpcService.getPublicClient) {
      const client = this.rpcService.getPublicClient()
      if (client) return client
    }

    const network = this.rpcService.getNetwork()
    return createPublicClient({
      chain: this.resolveChain(network),
      transport: http(network.rpcUrl),
    })
  }

  private resolveChain(network: NetworkConfig) {
    if (network.chainId === 1) return mainnet
    if (network.chainId === 11155111) return sepolia

    return defineChain({
      id: network.chainId,
      name: network.name,
      nativeCurrency: {
        name: network.symbol,
        symbol: network.symbol,
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: network.rpcUrls && network.rpcUrls.length > 0 ? network.rpcUrls : [network.rpcUrl],
        },
      },
    })
  }

  async getFeePresets(): Promise<GasFeePresets> {
    const publicClient = this.getPublicClient()

    let baseFeePerGas: bigint | undefined
    try {
      const block = await publicClient.getBlock({ blockTag: "latest" })
      if (block && typeof block.baseFeePerGas === "bigint") {
        baseFeePerGas = block.baseFeePerGas
      }
    } catch {
      baseFeePerGas = undefined
    }

    if (baseFeePerGas !== undefined) {
      let priorityFee = 1_500_000_000n // default 1.5 Gwei
      try {
        const fees = await publicClient.estimateFeesPerGas()
        if (fees && typeof fees.maxPriorityFeePerGas === "bigint") {
          priorityFee = fees.maxPriorityFeePerGas
        }
      } catch {
        // Fallback to default priorityFee
      }

      const lowPriority = (priorityFee * 80n) / 100n || 1_000_000_000n
      const medPriority = priorityFee
      const highPriority = (priorityFee * 150n) / 100n || 2_500_000_000n

      const lowMax = (baseFeePerGas * 105n) / 100n + lowPriority
      const medMax = (baseFeePerGas * 120n) / 100n + medPriority
      const highMax = (baseFeePerGas * 150n) / 100n + highPriority

      return {
        isEip1559: true,
        baseFeePerGas,
        presets: {
          low: {
            level: "low",
            label: "Low",
            maxFeePerGas: lowMax,
            maxPriorityFeePerGas: lowPriority,
            estimatedWaitSeconds: 60,
          },
          medium: {
            level: "medium",
            label: "Medium",
            maxFeePerGas: medMax,
            maxPriorityFeePerGas: medPriority,
            estimatedWaitSeconds: 30,
          },
          high: {
            level: "high",
            label: "High",
            maxFeePerGas: highMax,
            maxPriorityFeePerGas: highPriority,
            estimatedWaitSeconds: 15,
          },
        },
      }
    }

    // Legacy fallback
    let gasPrice = 20_000_000_000n // default 20 Gwei
    try {
      const price = await publicClient.getGasPrice()
      if (typeof price === "bigint") {
        gasPrice = price
      }
    } catch {
      // Fallback to default
    }

    const lowPrice = (gasPrice * 80n) / 100n || 1_000_000_000n
    const medPrice = gasPrice
    const highPrice = (gasPrice * 130n) / 100n

    return {
      isEip1559: false,
      presets: {
        low: {
          level: "low",
          label: "Low",
          maxFeePerGas: lowPrice,
          maxPriorityFeePerGas: 0n,
          gasPrice: lowPrice,
          estimatedWaitSeconds: 60,
        },
        medium: {
          level: "medium",
          label: "Medium",
          maxFeePerGas: medPrice,
          maxPriorityFeePerGas: 0n,
          gasPrice: medPrice,
          estimatedWaitSeconds: 30,
        },
        high: {
          level: "high",
          label: "High",
          maxFeePerGas: highPrice,
          maxPriorityFeePerGas: 0n,
          gasPrice: highPrice,
          estimatedWaitSeconds: 15,
        },
      },
    }
  }

  async estimateGas(params: PrepareTransactionParams): Promise<GasEstimateResult> {
    const publicClient = this.getPublicClient()
    const presets = await this.getFeePresets()

    let gasLimit: bigint
    if (params.tokenAddress) {
      try {
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [params.to, params.value],
        })
        const estimated = await publicClient.estimateGas({
          account: params.from,
          to: params.tokenAddress,
          data,
          value: 0n,
        })
        gasLimit = (estimated * 110n) / 100n // 10% safety buffer
      } catch {
        gasLimit = 65000n
      }
    } else {
      try {
        gasLimit = await publicClient.estimateGas({
          account: params.from,
          to: params.to,
          value: params.value,
        })
      } catch {
        gasLimit = 21000n
      }
    }

    const feePerGas = presets.isEip1559
      ? presets.presets.medium.maxFeePerGas
      : presets.presets.medium.gasPrice ?? 20_000_000_000n

    const estimatedFeeWei = gasLimit * feePerGas
    const formattedFeeEth = this.rpcService.formatEther(estimatedFeeWei)

    return {
      gasLimit,
      estimatedFeeWei,
      formattedFeeEth,
      presets,
    }
  }

  async sendTransaction(params: SendTransactionParams): Promise<`0x${string}`> {
    if (params.account.type === "watch-only") {
      throw new Error("Cannot send transactions from a watch-only account")
    }

    const network = this.rpcService.getNetwork()
    const walletData: WalletData = {
      accounts: [params.account],
      mnemonic: params.mnemonic,
      defaultChainId: network.chainId,
    }

    const privateKey = await this.walletService.getExportPrivateKey(
      walletData,
      params.account.address,
      params.masterPassword,
    )

    const localAccount = privateKeyToAccount(privateKey)
    const walletClient =
      this.customWalletClient ??
      createWalletClient({
        account: localAccount,
        chain: this.resolveChain(network),
        transport: http(network.rpcUrl),
      })

    if (params.token) {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [params.to, params.value],
      })

      const txParams: any = {
        account: localAccount,
        to: params.token.address,
        value: 0n,
        data,
      }
      if (params.gasLimit) txParams.gas = params.gasLimit
      if (params.maxFeePerGas) txParams.maxFeePerGas = params.maxFeePerGas
      if (params.maxPriorityFeePerGas) txParams.maxPriorityFeePerGas = params.maxPriorityFeePerGas
      if (params.gasPrice) txParams.gasPrice = params.gasPrice
      if (typeof params.nonce === "number") txParams.nonce = params.nonce

      const hash = await walletClient.sendTransaction(txParams)
      return hash
    }

    const txParams: any = {
      account: localAccount,
      to: params.to,
      value: params.value,
    }
    if (params.gasLimit) txParams.gas = params.gasLimit
    if (params.maxFeePerGas) txParams.maxFeePerGas = params.maxFeePerGas
    if (params.maxPriorityFeePerGas) txParams.maxPriorityFeePerGas = params.maxPriorityFeePerGas
    if (params.gasPrice) txParams.gasPrice = params.gasPrice
    if (typeof params.nonce === "number") txParams.nonce = params.nonce

    const hash = await walletClient.sendTransaction(txParams)
    return hash
  }

  async waitForReceipt(hash: `0x${string}`): Promise<TransactionReceiptSummary> {
    const publicClient = this.getPublicClient()
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return {
      hash: receipt.transactionHash,
      status: receipt.status === "success" ? "success" : "reverted",
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    }
  }
}

