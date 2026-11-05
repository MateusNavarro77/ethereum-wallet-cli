import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { isAddress, getAddress, parseUnits, parseEther } from "viem"
import { useService } from "../context.js"
import type {
  Account,
  FeePresetLevel,
  GasEstimateResult,
  TokenConfig,
  TransactionStatus,
  WalletData,
} from "../../core/types.js"

export type SendStep = "recipient-asset" | "amount" | "gas" | "review" | "status"

export interface UseSendTransactionOptions {
  account: Account
  wallet?: WalletData
  masterPassword?: string
  onSuccess?: (hash: `0x${string}`) => void
}

export interface UseSendTransactionResult {
  step: SendStep
  setStep: (step: SendStep) => void
  selectedToken: TokenConfig | null
  setSelectedToken: (token: TokenConfig | null) => void
  recipient: string
  setRecipient: (recipient: string) => void
  recipientError: string | null
  amount: string
  setAmount: (amount: string) => void
  amountError: string | null
  selectedPreset: FeePresetLevel
  setSelectedPreset: (preset: FeePresetLevel) => void
  gasEstimate: GasEstimateResult | null
  isEstimatingGas: boolean
  isValidating: boolean
  validationMessage: string | null
  confirmText: string
  setConfirmText: (text: string) => void
  confirmError: string | null
  txStatus: TransactionStatus
  txHash: `0x${string}` | null
  txError: string | null
  nativeBalance: bigint
  tokenBalance: bigint
  isLoadingBalances: boolean
  availableTokens: TokenConfig[]
  activeNetworkSymbol: string
  currentFeeWei: bigint
  currentFeeEth: string
  totalNativeRequired: string
  applySendMax: () => void
  nextStep: () => Promise<boolean>
  prevStep: () => void
  confirmAndBroadcast: () => Promise<`0x${string}` | undefined>
  reset: () => void
}

export function useSendTransaction({
  account,
  wallet,
  masterPassword,
  onSuccess,
}: UseSendTransactionOptions): UseSendTransactionResult {
  const transactionService = useService("transactionService")
  const rpcService = useService("rpcService")
  const tokenService = useService("tokenService")
  const networkService = useService("networkService")

  const activeNetwork = networkService.getActiveNetwork()

  const [step, setStepState] = useState<SendStep>("recipient-asset")
  const stepRef = useRef<SendStep>("recipient-asset")

  const [selectedToken, setSelectedTokenState] = useState<TokenConfig | null>(null)
  const selectedTokenRef = useRef<TokenConfig | null>(null)

  const [recipient, setRecipientState] = useState("")
  const recipientRef = useRef("")

  const [recipientError, setRecipientError] = useState<string | null>(null)

  const [amount, setAmountState] = useState("")
  const amountRef = useRef("")

  const [amountError, setAmountError] = useState<string | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<FeePresetLevel>("medium")

  const [gasEstimate, setGasEstimate] = useState<GasEstimateResult | null>(null)
  const [isEstimatingGas, setIsEstimatingGas] = useState(false)

  const [isValidating, setIsValidating] = useState(false)
  const isValidatingRef = useRef(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  const [confirmText, setConfirmTextState] = useState("")
  const confirmTextRef = useRef("")
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const [txStatus, setTxStatus] = useState<TransactionStatus>("idle")
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const [nativeBalance, setNativeBalance] = useState<bigint>(0n)
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n)
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)

  const setStep = useCallback((s: SendStep) => {
    stepRef.current = s
    setStepState(s)
  }, [])

  const availableTokens = useMemo(() => {
    return tokenService.getTokens(activeNetwork.chainId).filter((t) => !t.hidden)
  }, [tokenService, activeNetwork.chainId])

  const setRecipient = useCallback((val: string) => {
    recipientRef.current = val
    setRecipientState(val)
    setRecipientError(null)
  }, [])

  const setAmount = useCallback((val: string) => {
    amountRef.current = val
    setAmountState(val)
    setAmountError(null)
  }, [])

  const setConfirmText = useCallback((val: string) => {
    confirmTextRef.current = val
    setConfirmTextState(val)
    setConfirmError(null)
  }, [])

  const setSelectedToken = useCallback((token: TokenConfig | null) => {
    selectedTokenRef.current = token
    setSelectedTokenState(token)
    amountRef.current = ""
    setAmountState("")
    setAmountError(null)
  }, [])

  // Fetch balances for account and active asset
  const fetchBalances = useCallback(async () => {
    setIsLoadingBalances(true)
    try {
      const ethBal = await rpcService.getBalance(account.address)
      setNativeBalance(ethBal)

      const currentTok = selectedTokenRef.current
      if (currentTok) {
        const tokBal = await rpcService.getTokenBalance(currentTok.address, account.address)
        setTokenBalance(tokBal)
      } else {
        setTokenBalance(0n)
      }
    } catch {
      // Ignored if offline
    } finally {
      setIsLoadingBalances(false)
    }
  }, [account.address, rpcService])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances, selectedToken])

  // Estimate gas
  const refreshGasEstimate = useCallback(
    async (targetRecipient?: string, targetValueWei?: bigint) => {
      setIsEstimatingGas(true)
      const currentTok = selectedTokenRef.current
      try {
        const to = (
          targetRecipient && isAddress(targetRecipient)
            ? getAddress(targetRecipient)
            : "0x0000000000000000000000000000000000000001"
        ) as `0x${string}`

        const estimate = await transactionService.estimateGas({
          from: account.address,
          to,
          value: targetValueWei ?? 0n,
          tokenAddress: currentTok?.address,
          tokenDecimals: currentTok?.decimals,
        })
        setGasEstimate(estimate)
      } catch {
        // Fallback estimate if estimation fails
        try {
          const presets = await transactionService.getFeePresets()
          const gasLimit = currentTok ? 65000n : 21000n
          const feePerGas = presets.isEip1559
            ? presets.presets.medium.maxFeePerGas
            : presets.presets.medium.gasPrice ?? 20_000_000_000n
          const estimatedFeeWei = gasLimit * feePerGas
          setGasEstimate({
            gasLimit,
            estimatedFeeWei,
            formattedFeeEth: rpcService.formatEther(estimatedFeeWei),
            presets,
          })
        } catch {
          // Keep prior
        }
      } finally {
        setIsEstimatingGas(false)
      }
    },
    [account.address, transactionService, rpcService],
  )

  useEffect(() => {
    refreshGasEstimate()
  }, [refreshGasEstimate, selectedToken])

  // Active gas fee calculation based on selected preset
  const currentFeeWei = useMemo(() => {
    if (!gasEstimate) return 0n
    const preset = gasEstimate.presets.presets[selectedPreset]
    const gasPriceOrMax = gasEstimate.presets.isEip1559 ? preset.maxFeePerGas : preset.gasPrice ?? 20_000_000_000n
    return gasEstimate.gasLimit * gasPriceOrMax
  }, [gasEstimate, selectedPreset])

  const currentFeeEth = useMemo(() => {
    return rpcService.formatEther(currentFeeWei)
  }, [rpcService, currentFeeWei])

  // Total native ETH required (Amount + Gas for ETH; Gas only for Tokens)
  const totalNativeRequired = useMemo(() => {
    if (selectedToken) {
      return currentFeeEth
    }
    try {
      const parsedAmount = amount.trim() ? parseEther(amount.trim()) : 0n
      return rpcService.formatEther(parsedAmount + currentFeeWei)
    } catch {
      return currentFeeEth
    }
  }, [selectedToken, amount, currentFeeWei, currentFeeEth, rpcService])

  // Apply "Send Max" (FR-SND-06)
  const applySendMax = useCallback(() => {
    setAmountError(null)
    const currentTok = selectedTokenRef.current
    if (currentTok) {
      // For ERC-20, max is the entire token balance
      const formatted = rpcService.formatUnits(tokenBalance, currentTok.decimals)
      setAmount(formatted)
      if (nativeBalance < currentFeeWei) {
        setAmountError(`Insufficient ${activeNetwork.symbol} to pay for gas (${currentFeeEth} required)`)
      }
    } else {
      // For native ETH, max is (nativeBalance - currentFeeWei)
      if (nativeBalance <= currentFeeWei) {
        setAmount("0")
        setAmountError(`Insufficient balance to cover gas fee (${currentFeeEth} ${activeNetwork.symbol})`)
      } else {
        const maxWei = nativeBalance - currentFeeWei
        setAmount(rpcService.formatEther(maxWei))
      }
    }
  }, [tokenBalance, nativeBalance, currentFeeWei, currentFeeEth, rpcService, activeNetwork.symbol, setAmount])

  // Navigate to next step with validation
  const nextStep = useCallback(async (): Promise<boolean> => {
    if (isValidatingRef.current) return false

    const currentStep = stepRef.current
    const currentRec = recipientRef.current.trim()
    const currentTok = selectedTokenRef.current
    const currentAmt = amountRef.current.trim()

    if (currentStep === "recipient-asset") {
      if (!currentRec) {
        setRecipientError("Recipient address is required")
        return false
      }
      if (!isAddress(currentRec)) {
        setRecipientError("Invalid Ethereum address format")
        return false
      }
      try {
        const checksummed = getAddress(currentRec)
        setRecipient(checksummed)
      } catch {
        setRecipientError("Invalid EIP-55 address checksum")
        return false
      }

      isValidatingRef.current = true
      setIsValidating(true)
      setValidationMessage("Validating recipient & fetching account balances...")
      try {
        await fetchBalances()
        await refreshGasEstimate(currentRec)
        setStep("amount")
        return true
      } finally {
        isValidatingRef.current = false
        setIsValidating(false)
        setValidationMessage(null)
      }
    }

    if (currentStep === "amount") {
      if (!currentAmt) {
        setAmountError("Amount is required")
        return false
      }

      const num = Number(currentAmt)
      if (isNaN(num) || num <= 0) {
        setAmountError("Amount must be greater than zero")
        return false
      }

      let parsedWei: bigint
      try {
        parsedWei = currentTok
          ? parseUnits(currentAmt, currentTok.decimals)
          : parseEther(currentAmt)
      } catch {
        setAmountError("Invalid number format for decimals")
        return false
      }

      if (currentTok) {
        if (parsedWei > tokenBalance) {
          setAmountError(`Amount exceeds available token balance (${rpcService.formatUnits(tokenBalance, currentTok.decimals)} ${currentTok.symbol})`)
          return false
        }
        if (nativeBalance < currentFeeWei) {
          setAmountError(`Insufficient ${activeNetwork.symbol} to pay for gas (${currentFeeEth} required)`)
          return false
        }
      } else {
        if (parsedWei > nativeBalance) {
          setAmountError(`Amount exceeds available balance (${rpcService.formatEther(nativeBalance)} ${activeNetwork.symbol})`)
          return false
        }
        if (parsedWei + currentFeeWei > nativeBalance) {
          setAmountError(`Total (Amount + Gas) exceeds balance by ${rpcService.formatEther((parsedWei + currentFeeWei) - nativeBalance)} ${activeNetwork.symbol}`)
          return false
        }
      }

      isValidatingRef.current = true
      setIsValidating(true)
      setValidationMessage("Validating amount & estimating network gas fees...")
      try {
        await refreshGasEstimate(currentRec, parsedWei)
        setStep("gas")
        return true
      } finally {
        isValidatingRef.current = false
        setIsValidating(false)
        setValidationMessage(null)
      }
    }

    if (currentStep === "gas") {
      setConfirmText("")
      setStep("review")
      return true
    }

    return true
  }, [
    tokenBalance,
    nativeBalance,
    currentFeeWei,
    currentFeeEth,
    fetchBalances,
    refreshGasEstimate,
    rpcService,
    activeNetwork.symbol,
    setRecipient,
    setConfirmText,
    setStep,
  ])

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (isValidatingRef.current) return
    const currentStep = stepRef.current
    if (currentStep === "amount") setStep("recipient-asset")
    else if (currentStep === "gas") setStep("amount")
    else if (currentStep === "review") {
      setConfirmText("")
      setStep("gas")
    }
  }, [setStep, setConfirmText])

  // Confirm and broadcast (FR-SND-08 & FR-SND-09)
  const confirmAndBroadcast = useCallback(async (): Promise<`0x${string}` | undefined> => {
    if (account.type === "watch-only") {
      setTxError("Cannot send transactions from a watch-only account")
      setTxStatus("failed")
      setStep("status")
      return undefined
    }

    if (confirmTextRef.current.trim().toLowerCase() !== "confirm") {
      setConfirmError('Please type "confirm" to sign and broadcast')
      return undefined
    }

    setConfirmError(null)
    setTxStatus("broadcasting")
    setTxError(null)
    setStep("status")

    try {
      const currentAmt = amountRef.current.trim()
      const currentTok = selectedTokenRef.current
      const currentRec = recipientRef.current.trim()

      const parsedValue = currentTok
        ? parseUnits(currentAmt, currentTok.decimals)
        : parseEther(currentAmt)

      const preset = gasEstimate?.presets.presets[selectedPreset]
      const to = getAddress(currentRec) as `0x${string}`

      const hash = await transactionService.sendTransaction({
        account,
        to,
        value: parsedValue,
        token: currentTok ?? undefined,
        mnemonic: wallet?.mnemonic,
        masterPassword,
        gasLimit: gasEstimate?.gasLimit,
        maxFeePerGas: gasEstimate?.presets.isEip1559 ? preset?.maxFeePerGas : undefined,
        maxPriorityFeePerGas: gasEstimate?.presets.isEip1559 ? preset?.maxPriorityFeePerGas : undefined,
        gasPrice: !gasEstimate?.presets.isEip1559 ? preset?.gasPrice : undefined,
      })

      setTxHash(hash)
      setTxStatus("pending")

      // Poll in background for receipt
      transactionService
        .waitForReceipt(hash)
        .then((receipt) => {
          if (receipt.status === "success") {
            setTxStatus("confirmed")
            fetchBalances()
            onSuccess?.(hash)
          } else {
            setTxStatus("failed")
            setTxError("Transaction reverted on chain")
          }
        })
        .catch((err) => {
          setTxStatus("failed")
          setTxError(err instanceof Error ? err.message : String(err))
        })

      return hash
    } catch (err) {
      setTxStatus("failed")
      setTxError(err instanceof Error ? err.message : String(err))
      return undefined
    }
  }, [
    account,
    gasEstimate,
    selectedPreset,
    transactionService,
    wallet?.mnemonic,
    masterPassword,
    fetchBalances,
    onSuccess,
    setStep,
  ])

  const reset = useCallback(() => {
    isValidatingRef.current = false
    setIsValidating(false)
    setValidationMessage(null)
    setStep("recipient-asset")
    setSelectedToken(null)
    setRecipient("")
    setRecipientError(null)
    setAmount("")
    setAmountError(null)
    setConfirmText("")
    setConfirmError(null)
    setSelectedPreset("medium")
    setTxStatus("idle")
    setTxHash(null)
    setTxError(null)
  }, [setStep, setSelectedToken, setRecipient, setAmount, setConfirmText])

  return {
    step,
    setStep,
    selectedToken,
    setSelectedToken,
    recipient,
    setRecipient,
    recipientError,
    amount,
    setAmount,
    amountError,
    selectedPreset,
    setSelectedPreset,
    gasEstimate,
    isEstimatingGas,
    isValidating,
    validationMessage,
    confirmText,
    setConfirmText,
    confirmError,
    txStatus,
    txHash,
    txError,
    nativeBalance,
    tokenBalance,
    isLoadingBalances,
    availableTokens,
    activeNetworkSymbol: activeNetwork.symbol,
    currentFeeWei,
    currentFeeEth,
    totalNativeRequired,
    applySendMax,
    nextStep,
    prevStep,
    confirmAndBroadcast,
    reset,
  }
}
