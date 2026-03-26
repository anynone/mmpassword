import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 3000) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const typeStyles: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: "bg-tertiary-container text-on-tertiary-container", icon: "check_circle" },
  error: { bg: "bg-error-container text-on-error-container", icon: "error" },
  warning: { bg: "bg-secondary-container text-on-secondary-container", icon: "warning" },
  info: { bg: "bg-primary-container text-on-primary-container", icon: "info" },
};

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { bg, icon } = typeStyles[toast.type];

  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => onRemove(toast.id), toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        animate-in slide-in-from-right-full duration-300
        ${bg}
      `}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-2 hover:opacity-70 transition-opacity"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}
