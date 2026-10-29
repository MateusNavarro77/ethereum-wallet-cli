import { useTheme } from "../context.js"
import type { SendStep } from "../hooks/useSendTransaction.js"

export interface SendStepperProps {
  currentStep: SendStep
}

interface StepDef {
  key: SendStep
  label: string
  number: number
}

const STEPS: StepDef[] = [
  { key: "recipient-asset", label: "Asset & To", number: 1 },
  { key: "amount", label: "Amount", number: 2 },
  { key: "gas", label: "Gas Fee", number: 3 },
  { key: "review", label: "Review", number: 4 },
]

export function SendStepper({ currentStep }: SendStepperProps) {
  const { tokens } = useTheme()

  const getStepIndex = (s: SendStep) => {
    if (s === "recipient-asset") return 0
    if (s === "amount") return 1
    if (s === "gas") return 2
    if (s === "review" || s === "status") return 3
    return 0
  }

  const currentIndex = getStepIndex(currentStep)

  return (
    <box
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingLeft: 1,
        paddingRight: 1,
        marginBottom: 1,
        border: true,
        borderColor: tokens.border,
      }}
    >
      {STEPS.map((step, idx) => {
        const isCurrent = idx === currentIndex
        const isCompleted = idx < currentIndex

        const textColor = isCurrent
          ? tokens.primary
          : isCompleted
            ? tokens.success
            : tokens.textMuted

        const icon = isCompleted ? "✔" : `[${step.number}]`

        return (
          <box key={step.key} style={{ flexDirection: "row", alignItems: "center" }}>
            <text fg={textColor}>
              <b>
                {icon} {step.label}
              </b>
            </text>
            {idx < STEPS.length - 1 && (
              <text fg={tokens.textMuted} style={{ marginLeft: 1, marginRight: 1 }}>
                →
              </text>
            )}
          </box>
        )
      })}
    </box>
  )
}
