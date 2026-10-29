import { createContext, useContext, type ReactNode } from "react"
import { ServiceContainer } from "../container/index.js"
import type { ServiceMap, ServiceToken } from "../core/tokens.js"
import { ThemeProvider, useTheme, type ThemeContextValue } from "./theme/context.js"

const ContainerContext = createContext<ServiceContainer | null>(null)

export interface ContainerProviderProps {
  container: ServiceContainer
  children: ReactNode
}

export function ContainerProvider({ container, children }: ContainerProviderProps) {
  const themeService = container.has("themeService") ? container.resolve("themeService") : undefined

  return (
    <ContainerContext.Provider value={container}>
      <ThemeProvider themeService={themeService}>
        {children}
      </ThemeProvider>
    </ContainerContext.Provider>
  )
}

export function useContainer(): ServiceContainer {
  const container = useContext(ContainerContext)
  if (!container) {
    throw new Error("useContainer must be used within a ContainerProvider")
  }
  return container
}

export function useService<K extends ServiceToken>(token: K): ServiceMap[K] {
  const container = useContainer()
  return container.resolve(token)
}

export { useTheme, ThemeProvider, type ThemeContextValue }


