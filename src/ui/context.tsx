import { createContext, useContext, type ReactNode } from "react"
import { ServiceContainer } from "../container/index.js"
import type { ServiceMap, ServiceToken } from "../core/tokens.js"

const ContainerContext = createContext<ServiceContainer | null>(null)

export interface ContainerProviderProps {
  container: ServiceContainer
  children: ReactNode
}

export function ContainerProvider({ container, children }: ContainerProviderProps) {
  return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>
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

