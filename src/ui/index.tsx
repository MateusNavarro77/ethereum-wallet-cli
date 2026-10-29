import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { registerQRCode } from "@opentui/qrcode/react"
import { ContainerProvider } from "./context.js"
import { App } from "./App.js"
import type { ServiceContainer } from "../container/index.js"

export async function runUi(container: ServiceContainer): Promise<void> {
  registerQRCode()
  const renderer = await createCliRenderer()
  const root = createRoot(renderer)

  root.render(
    <ContainerProvider container={container}>
      <App />
    </ContainerProvider>,
  )

  const handleExit = () => {
    try {
      renderer.destroy()
    } catch {
      // Ignore during exit
    }
    process.exit(0)
  }

  process.on("SIGINT", handleExit)
  process.on("SIGTERM", handleExit)
}

