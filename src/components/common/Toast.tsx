import { ReactNode, createContext, useContext, useCallback } from "react"
import { toast as sonnerToast } from "sonner"

type ToastType = "success" | "error" | "warning" | "info"

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const showToast = useCallback(
    (type: ToastType, message: string, duration = 3000) => {
      switch (type) {
        case "success":
          sonnerToast.success(message, { duration })
          break
        case "error":
          sonnerToast.error(message, { duration })
          break
        case "warning":
          sonnerToast.warning(message, { duration })
          break
        case "info":
          sonnerToast.info(message, { duration })
          break
      }
    },
    []
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  )
}
