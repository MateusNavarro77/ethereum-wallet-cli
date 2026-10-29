import { testRender as opentuiTestRender } from "@opentui/react/test-utils"
import { act } from "react"
import type { ReactNode } from "react"
import type { TestRendererOptions, TestRendererSetup } from "@opentui/core/testing"

export async function testRender(
  node: ReactNode,
  testRendererOptions: TestRendererOptions = {},
): Promise<TestRendererSetup> {
  let setup: TestRendererSetup
  await act(async () => {
    setup = await opentuiTestRender(node, testRendererOptions)
  })

  const originalDestroy = setup!.renderer.destroy.bind(setup!.renderer)
  setup!.renderer.destroy = () => {
    act(() => {
      originalDestroy()
    })
  }

  return setup!
}

export { act }
