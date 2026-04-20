import { useState, useEffect, useRef, type RefObject } from "react"
import { createPortal } from "react-dom"
import { RefreshCw, Check, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { generatePasswordString } from "../../utils/passwordGenerator"
import { DEFAULT_PASSWORD_OPTIONS, type PasswordOptions } from "../../types/common"

interface PasswordGeneratorPanelProps {
  triggerRef: RefObject<HTMLButtonElement | null>
  onApply: (password: string) => void
  onClose: () => void
}

export function PasswordGeneratorPanel({ triggerRef, onApply, onClose }: PasswordGeneratorPanelProps) {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [password, setPassword] = useState("")
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 })

  const regenerate = () => {
    setPassword(generatePasswordString(options))
  }

  useEffect(() => {
    regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  // Calculate position from trigger button
  useEffect(() => {
    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        })
      }
    }
    updatePosition()
    window.addEventListener("resize", updatePosition)
    return () => window.removeEventListener("resize", updatePosition)
  }, [triggerRef])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking the trigger button (it handles its own toggle)
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose, triggerRef])

  const updateOption = (key: keyof PasswordOptions, value: number | boolean) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: value }
      if (typeof value === "boolean" && !value) {
        const hasAny = next.uppercase || next.lowercase || next.digits || next.symbols
        if (!hasAny) return prev
      }
      if (key === "length") {
        next.length = Math.max(4, Math.min(64, value as number))
      }
      return next
    })
  }

  const handleApply = () => {
    onApply(password)
    onClose()
  }

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[9999] w-72 rounded-lg border border-border p-3 shadow-lg"
      style={{
        top: position.top,
        right: position.right,
        backgroundColor: 'rgb(var(--popover))',
        color: 'rgb(var(--popover-foreground))',
      }}
    >
      {/* Password Preview */}
      <div className="flex items-center gap-1.5 mb-3">
        <code
          className="flex-1 text-xs font-mono rounded px-2 py-1.5 break-all select-all min-h-[28px] leading-relaxed"
          style={{ backgroundColor: 'rgb(var(--accent))' }}
        >
          {password}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={regenerate}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Length */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">Length</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => updateOption("length", options.length - 1)}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <span className="text-xs font-mono w-6 text-center">{options.length}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => updateOption("length", options.length + 1)}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Character Types */}
      <div className="space-y-1.5 mb-3">
        <span className="text-xs text-muted-foreground">Characters</span>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={options.uppercase}
              onCheckedChange={(v) => updateOption("uppercase", v === true)}
            />
            <span>A-Z</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={options.lowercase}
              onCheckedChange={(v) => updateOption("lowercase", v === true)}
            />
            <span>a-z</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={options.digits}
              onCheckedChange={(v) => updateOption("digits", v === true)}
            />
            <span>0-9</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox
              checked={options.symbols}
              onCheckedChange={(v) => updateOption("symbols", v === true)}
            />
            <span>!@#$</span>
          </label>
        </div>
      </div>

      {/* Apply Button */}
      <Button
        type="button"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={handleApply}
      >
        <Check className="h-3 w-3 mr-1" />
        Apply
      </Button>
    </div>,
    document.body
  )
}
