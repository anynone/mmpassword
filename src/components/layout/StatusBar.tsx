import { AppFooter } from "./AppFooter"

interface StatusBarProps {
  status?: "secure" | "unlocked" | "locked"
  version?: string
  isSyncing?: boolean
}

export function StatusBar({ status = "secure", version = "0.1.0", isSyncing = false }: StatusBarProps) {
  return <AppFooter status={status} version={version} isSyncing={isSyncing} />
}
