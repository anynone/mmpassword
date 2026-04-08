import { ReactNode } from "react"
import { Lock } from "lucide-react"

interface AppHeaderProps {
  children?: ReactNode
  tagline?: string
}

export function AppHeader({ children, tagline }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-2 bg-background/80 backdrop-blur-xl border-b border-border/30 shrink-0">
      <div className="flex items-center gap-3">
        <Lock className="h-6 w-6 text-primary" />
        <span className="text-lg font-headline font-extrabold tracking-tight">
          mmpassword
        </span>
        {tagline && (
          <>
            <div className="h-4 w-px bg-border/30 mx-2" />
            <span className="text-muted-foreground text-xs font-medium">
              {tagline}
            </span>
          </>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </header>
  )
}
