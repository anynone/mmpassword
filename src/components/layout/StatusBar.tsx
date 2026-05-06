import { AppFooter } from "./AppFooter"

interface StatusBarProps {
  status?: "secure" | "unlocked" | "locked"
  isSyncing?: boolean
}

export function StatusBar({ status = "secure", isSyncing = false }: StatusBarProps) {
  return <AppFooter status={status} isSyncing={isSyncing} />
}
