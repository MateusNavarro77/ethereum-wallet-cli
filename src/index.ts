#!/usr/bin/env bun
import { createDefaultContainer } from "./container/index.js"
import { runUi } from "./ui/index.js"

async function main() {
  const container = createDefaultContainer()
  await runUi(container)
}

main().catch((err) => {
  console.error("Fatal error starting TermiWallet:", err)
  process.exit(1)
})

