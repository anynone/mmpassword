import { useState, useEffect, useRef } from "react"
import { RefreshCw, Check, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { generatePasswordString } from "../../utils/passwordGenerator"
import { DEFAULT_PASSWORD_OPTIONS, type PasswordOptions } from "../../types/common"

interface PasswordGeneratorPanelProps {
  onApply: (password: string) => void
  onClose: () => void
}

export function PasswordGeneratorPanel({ onApply, onClose }: PasswordGeneratorPanelProps) {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [password, setPassword] = useState("")
  const panelRef = useRef<HTMLDivElement>(null)

  const regenerate = () => {
    setPassword(generatePasswordString(options))
  }

  useEffect(() => {
    regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid the opening click immediately closing
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  const updateOption = (key: keyof PasswordOptions, value: number | boolean) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: value }
      // Ensure at least one character type is enabled
      if (typeof value === "boolean" && !value) {
        const hasAny = next.uppercase || next.lowercase || next.digits || next.symbols
        if (!hasAny) return prev
      }
      // Clamp length to 4-64
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

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-border bg-popover p-3 shadow-lg"
    >
      {/* Password Preview */}
      <div className="flex items-center gap-1.5 mb-3">
        <code className="flex-1 text-xs font-mono bg-accent/50 rounded px-2 py-1.5 break-all select-all min-h-[28px] leading-relaxed">
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
    </div>
  )
}
