import { AppFooter } from "./AppFooter"

interface StatusBarProps {
  status?: "secure" | "unlocked" | "locked"
  version?: string
}

export function StatusBar({ status = "secure", version = "0.1.0" }: StatusBarProps) {
  return <AppFooter status={status} version={version} />
}
