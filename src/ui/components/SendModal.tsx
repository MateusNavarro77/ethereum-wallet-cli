import { useCallback } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../context.js"
import { HotkeyButton } from "./HotkeyButton.js"
import { SendStepper } from "./SendStepper.js"
import { useSendTransaction } from "../hooks/useSendTransaction.js"
import type { Account, FeePresetLevel, WalletData } from "../../core/types.js"

export interface SendModalProps {
  account: Account
  wallet?: WalletData
  masterPassword?: string
  onClose: () => void
  onSuccess?: (hash: `0x${string}`) => void
}

export function SendModal({
  account,
  wallet,
  masterPassword,
  onClose,
  onSuccess,
}: SendModalProps) {
  const { tokens } = useTheme()

  const {
    step,
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
    txStatus,
    txHash,
    txError,
    nativeBalance,
    tokenBalance,
    availableTokens,
    activeNetworkSymbol,
    currentFeeEth,
    totalNativeRequired,
    applySendMax,
    nextStep,
    prevStep,
    confirmAndBroadcast,
  } = useSendTransaction({
    account,
    wallet,
    masterPassword,
    onSuccess,
  })

  // Cycle tokens on Tab in Step 1
  const cycleAsset = useCallback(() => {
    if (availableTokens.length === 0) return
    if (!selectedToken) {
      setSelectedToken(availableTokens[0])
    } else {
      const idx = availableTokens.findIndex((t) => t.address === selectedToken.address)
      if (idx === -1 || idx === availableTokens.length - 1) {
        setSelectedToken(null) // back to native ETH
      } else {
        setSelectedToken(availableTokens[idx + 1])
      }
    }
  }, [availableTokens, selectedToken, setSelectedToken])

  const handleNext = useCallback(async () => {
    await nextStep()
  }, [nextStep])

  const handleConfirm = useCallback(async () => {
    await confirmAndBroadcast()
  }, [confirmAndBroadcast])

  useKeyboard((key) => {
    if (step === "status") {
      if (txStatus === "confirmed" || txStatus === "failed") {
        if (key.name === "escape" || key.name === "return" || key.name === "q") {
          onClose()
        }
      }
      return
    }

    if (key.name === "escape") {
      if (step === "recipient-asset") {
        onClose()
      } else {
        prevStep()
      }
      return
    }

    if (step === "recipient-asset") {
      if (key.name === "tab") {
        cycleAsset()
      } else if (key.name === "return") {
        handleNext()
      }
    } else if (step === "amount") {
      if (key.name === "return") {
        handleNext()
      }
    } else if (step === "gas") {
      if (key.name === "1" || key.name === "l" || key.name === "L") {
        setSelectedPreset("low")
      } else if (key.name === "2" || key.name === "m" || key.name === "M") {
        setSelectedPreset("medium")
      } else if (key.name === "3" || key.name === "h" || key.name === "H") {
        setSelectedPreset("high")
      } else if (key.name === "left" || key.name === "up") {
        const order: FeePresetLevel[] = ["low", "medium", "high"]
        const curr = order.indexOf(selectedPreset)
        setSelectedPreset(order[(curr - 1 + order.length) % order.length])
      } else if (key.name === "right" || key.name === "down") {
        const order: FeePresetLevel[] = ["low", "medium", "high"]
        const curr = order.indexOf(selectedPreset)
        setSelectedPreset(order[(curr + 1) % order.length])
      } else if (key.name === "return") {
        handleNext()
      }
    } else if (step === "review") {
      if (key.name === "return" || key.name === "c" || key.name === "C") {
        handleConfirm()
      } else if (key.name === "b" || key.name === "B") {
        prevStep()
      }
    }
  })

  const assetSymbol = selectedToken ? selectedToken.symbol : activeNetworkSymbol
  const formattedAvailableBalance = selectedToken
    ? `${(Number(tokenBalance) / 10 ** selectedToken.decimals).toFixed(4)} ${assetSymbol}`
    : `${(Number(nativeBalance) / 1e18).toFixed(4)} ${assetSymbol}`

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: tokens.overlay,
        zIndex: 50,
      }}
    >
      <box
        title=" Send Transaction (FR-SND-01 / FR-SND-02) "
        style={{
          border: true,
          borderColor: tokens.borderActive,
          backgroundColor: tokens.card,
          padding: 1,
          width: 74,
          flexDirection: "column",
        }}
      >
        {/* Stepper Header */}
        <SendStepper currentStep={step} />

        {/* STEP 1: ASSET & RECIPIENT */}
        {step === "recipient-asset" && (
          <box style={{ flexDirection: "column" }}>
            <box style={{ marginBottom: 1, justifyContent: "space-between" }}>
              <box style={{ flexDirection: "row" }}>
                <text fg={tokens.text}>Asset: </text>
                <text fg={tokens.primary}><b>{assetSymbol}</b></text>
                <text fg={tokens.textMuted}> {selectedToken ? `(${selectedToken.name})` : "(Native Gas Token)"}</text>
              </box>
              {availableTokens.length > 0 && (
                <HotkeyButton onPress={cycleAsset} color={tokens.secondary}>
                  [Tab] Switch Asset
                </HotkeyButton>
              )}
            </box>

            <box
              title=" Recipient Address (EIP-55 Checksum) "
              style={{
                border: true,
                borderColor: recipientError ? tokens.error : tokens.borderActive,
                height: 3,
                marginBottom: 1,
              }}
            >
              <input
                value={recipient}
                onChange={setRecipient}
                placeholder="0x..."
              />
            </box>

            {recipientError && (
              <box style={{ marginBottom: 1 }}>
                <text fg={tokens.error}>✖ {recipientError}</text>
              </box>
            )}

            <box style={{ marginTop: 1, justifyContent: "flex-end" }}>
              <HotkeyButton onPress={onClose} color={tokens.textMuted}>
                [Esc] Cancel
              </HotkeyButton>
              <box style={{ marginLeft: 1 }}>
                <HotkeyButton onPress={handleNext} color={tokens.primary}>
                  [Enter] Next: Amount
                </HotkeyButton>
              </box>
            </box>
          </box>
        )}

        {/* STEP 2: AMOUNT & SEND MAX */}
        {step === "amount" && (
          <box style={{ flexDirection: "column" }}>
            <box style={{ marginBottom: 1, justifyContent: "space-between" }}>
              <box style={{ flexDirection: "row" }}>
                <text fg={tokens.textMuted}>Available Balance: </text>
                <text fg={tokens.text}><b>{formattedAvailableBalance}</b></text>
              </box>
              <HotkeyButton onPress={applySendMax} color={tokens.warning}>
                [M] Send Max
              </HotkeyButton>
            </box>

            <box
              title={` Amount (${assetSymbol}) `}
              style={{
                border: true,
                borderColor: amountError ? tokens.error : tokens.borderActive,
                height: 3,
                marginBottom: 1,
              }}
            >
              <input
                value={amount}
                onChange={setAmount}
                placeholder="0.0"
              />
            </box>

            {amountError && (
              <box style={{ marginBottom: 1 }}>
                <text fg={tokens.error}>✖ {amountError}</text>
              </box>
            )}

            <box style={{ marginTop: 1, justifyContent: "space-between" }}>
              <HotkeyButton onPress={prevStep} color={tokens.textMuted}>
                [Esc] Back
              </HotkeyButton>
              <HotkeyButton onPress={handleNext} color={tokens.primary}>
                [Enter] Next: Gas Fee
              </HotkeyButton>
            </box>
          </box>
        )}

        {/* STEP 3: GAS FEE PRESETS */}
        {step === "gas" && (
          <box style={{ flexDirection: "column" }}>
            <box style={{ marginBottom: 1 }}>
              <text fg={tokens.textMuted}>
                Select fee preset derived from network conditions (FR-GAS-03):
              </text>
            </box>

            <box style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
              {(["low", "medium", "high"] as FeePresetLevel[]).map((level) => {
                const isSelected = selectedPreset === level
                const presetData = gasEstimate?.presets.presets[level]
                const waitTime = presetData ? `~${presetData.estimatedWaitSeconds}s` : ""
                const label = level === "low" ? "[1] Low" : level === "medium" ? "[2] Medium" : "[3] High"

                return (
                  <box
                    key={level}
                    onMouseDown={() => setSelectedPreset(level)}
                    style={{
                      border: true,
                      borderColor: isSelected ? tokens.borderActive : tokens.border,
                      backgroundColor: isSelected ? tokens.surface : tokens.card,
                      padding: 1,
                      width: 22,
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <text fg={isSelected ? tokens.primary : tokens.text}>
                      <b>{label}</b>
                    </text>
                    <text fg={tokens.textMuted}>{waitTime}</text>
                  </box>
                )
              })}
            </box>

            <box style={{ marginBottom: 1, backgroundColor: tokens.surface, padding: 1, flexDirection: "row" }}>
              <text fg={tokens.text}>Estimated Gas Fee: </text>
              <text fg={tokens.accent}>
                <b>
                  {currentFeeEth} {activeNetworkSymbol}
                </b>
              </text>
              <text fg={tokens.textMuted}> (Limit: {gasEstimate?.gasLimit.toString() || "21000"})</text>
            </box>

            <box style={{ marginTop: 1, justifyContent: "space-between" }}>
              <HotkeyButton onPress={prevStep} color={tokens.textMuted}>
                [Esc] Back
              </HotkeyButton>
              <HotkeyButton onPress={handleNext} color={tokens.primary}>
                [Enter] Next: Review
              </HotkeyButton>
            </box>
          </box>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {step === "review" && (
          <box style={{ flexDirection: "column" }}>
            <box style={{ marginBottom: 1 }}>
              <text fg={tokens.primary}>
                <b>Transaction Review Summary (FR-SND-07)</b>
              </text>
            </box>

            <box
              style={{
                border: true,
                borderColor: tokens.border,
                backgroundColor: tokens.surface,
                padding: 1,
                flexDirection: "column",
                marginBottom: 1,
              }}
            >
              <box style={{ justifyContent: "space-between", marginBottom: 1 }}>
                <text fg={tokens.textMuted}>From Account:</text>
                <text fg={tokens.text}>
                  <b>{account.label}</b> ({account.address.slice(0, 6)}...{account.address.slice(-4)})
                </text>
              </box>

              <box style={{ justifyContent: "space-between", marginBottom: 1 }}>
                <text fg={tokens.textMuted}>Recipient Address:</text>
                <text fg={tokens.text}>{recipient}</text>
              </box>

              <box style={{ justifyContent: "space-between", marginBottom: 1 }}>
                <text fg={tokens.textMuted}>Transfer Amount:</text>
                <text fg={tokens.primary}>
                  <b>
                    {amount} {assetSymbol}
                  </b>
                </text>
              </box>

              <box style={{ justifyContent: "space-between", marginBottom: 1 }}>
                <text fg={tokens.textMuted}>Estimated Gas Fee:</text>
                <text fg={tokens.text}>
                  {currentFeeEth} {activeNetworkSymbol} ({selectedPreset.toUpperCase()})
                </text>
              </box>

              <box
                style={{
                  border: true,
                  borderColor: tokens.border,
                  padding: 1,
                  justifyContent: "space-between",
                }}
              >
                <text fg={tokens.text}>
                  <b>Total Outflow:</b>
                </text>
                <text fg={tokens.success}>
                  <b>
                    {totalNativeRequired} {activeNetworkSymbol}
                    {selectedToken ? ` + ${amount} ${selectedToken.symbol}` : ""}
                  </b>
                </text>
              </box>
            </box>

            {account.type === "watch-only" && (
              <box style={{ marginBottom: 1, padding: 1, backgroundColor: tokens.error }}>
                <text fg={tokens.textInverse}>
                  <b>⚠ WATCH-ONLY ACCOUNT: Signing is blocked for this account.</b>
                </text>
              </box>
            )}

            <box style={{ marginTop: 1, justifyContent: "space-between" }}>
              <HotkeyButton onPress={prevStep} color={tokens.textMuted}>
                [Esc] Back
              </HotkeyButton>
              {account.type !== "watch-only" && (
                <HotkeyButton onPress={handleConfirm} color={tokens.success}>
                  [Enter] Confirm & Sign
                </HotkeyButton>
              )}
            </box>
          </box>
        )}

        {/* STEP 5 / STATUS DISPLAY */}
        {step === "status" && (
          <box style={{ flexDirection: "column", alignItems: "center", padding: 1 }}>
            {txStatus === "broadcasting" && (
              <box style={{ flexDirection: "column", alignItems: "center" }}>
                <text fg={tokens.accent}>
                  <b>⏳ Signing and broadcasting transaction...</b>
                </text>
                <text fg={tokens.textMuted}>Communicating with JSON-RPC endpoint</text>
              </box>
            )}

            {txStatus === "pending" && (
              <box style={{ flexDirection: "column", alignItems: "center" }}>
                <text fg={tokens.warning}>
                  <b>⏳ Transaction Broadcast! Pending Confirmation...</b>
                </text>
                {txHash && (
                  <box style={{ marginTop: 1, marginBottom: 1 }}>
                    <text fg={tokens.text}>
                      Tx Hash: <b>{txHash}</b>
                    </text>
                  </box>
                )}
                <text fg={tokens.textMuted}>Waiting for receipt on chain...</text>
              </box>
            )}

            {txStatus === "confirmed" && (
              <box style={{ flexDirection: "column", alignItems: "center" }}>
                <text fg={tokens.success}>
                  <b>✔ Transaction Confirmed on Chain!</b>
                </text>
                {txHash && (
                  <box style={{ marginTop: 1, marginBottom: 1 }}>
                    <text fg={tokens.text}>
                      Tx Hash: <b>{txHash}</b>
                    </text>
                  </box>
                )}
                <box style={{ marginTop: 1 }}>
                  <HotkeyButton onPress={onClose} color={tokens.primary}>
                    [Enter] Done
                  </HotkeyButton>
                </box>
              </box>
            )}

            {txStatus === "failed" && (
              <box style={{ flexDirection: "column", alignItems: "center" }}>
                <text fg={tokens.error}>
                  <b>✖ Transaction Failed</b>
                </text>
                <box style={{ marginTop: 1, marginBottom: 1 }}>
                  <text fg={tokens.text}>{txError || "Unknown RPC Error"}</text>
                </box>
                <box style={{ marginTop: 1 }}>
                  <HotkeyButton onPress={onClose} color={tokens.textMuted}>
                    [Enter] Close
                  </HotkeyButton>
                </box>
              </box>
            )}
          </box>
        )}
      </box>
    </box>
  )
}
