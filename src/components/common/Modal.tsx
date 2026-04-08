import { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-3xl",
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
  closeOnEscape = true,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className={cn("flex flex-col max-h-[85vh] gap-0 p-0", sizeClasses[size])}
        onPointerDownOutside={closeOnOverlay ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
      >
        {title && (
          <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
            <DialogTitle className="font-headline font-bold text-lg">
              {title}
            </DialogTitle>
          </DialogHeader>
        )}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>

        {footer && (
          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-muted/30">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
