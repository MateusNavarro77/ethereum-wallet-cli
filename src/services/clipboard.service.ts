import { spawn } from "node:child_process"
import type { IClipboardService } from "../core/interfaces.js"

export class ClipboardService implements IClipboardService {
  async copy(text: string): Promise<boolean> {
    // 1. Try system CLI clipboard tools
    const systemSuccess = await this.copyViaSystemTool(text)
    if (systemSuccess) {
      return true
    }

    // 2. OSC 52 ANSI terminal escape sequence fallback
    try {
      this.copyViaOsc52(text)
      return true
    } catch {
      return false
    }
  }

  private copyViaSystemTool(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      let command: string | null = null
      let args: string[] = []

      if (process.platform === "darwin") {
        command = "pbcopy"
      } else if (process.platform === "linux") {
        if (process.env.WAYLAND_DISPLAY) {
          command = "wl-copy"
        } else {
          command = "xclip"
          args = ["-selection", "clipboard"]
        }
      }

      if (!command) {
        return resolve(false)
      }

      try {
        const proc = spawn(command, args, { stdio: ["pipe", "ignore", "ignore"] })
        proc.on("error", () => resolve(false))
        proc.on("close", (code) => resolve(code === 0))
        proc.stdin.write(text)
        proc.stdin.end()
      } catch {
        resolve(false)
      }
    })
  }

  private copyViaOsc52(text: string): void {
    const base64 = Buffer.from(text).toString("base64")
    // OSC 52 sequence: ESC ] 52 ; c ; <base64> BEL
    process.stdout.write(`\x1b]52;c;${base64}\x07`)
  }
}

