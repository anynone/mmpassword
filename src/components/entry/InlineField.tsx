import { useState, useRef } from "react"
import { Copy, Eye, EyeOff, KeyRound, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PasswordStrengthIndicator } from "../common/PasswordStrengthIndicator"
import { PasswordGeneratorPanel } from "./PasswordGeneratorPanel"
import type { FieldType } from "../../types"
import type { FieldInput } from "../../stores/vaultStore"
import { cn } from "@/lib/utils"

export const fieldTypeOptions = [
  { value: "text", label: "Text" },
  { value: "password", label: "Password" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "notes", label: "Notes" },
  { value: "username", label: "Username" },
]

interface InlineFieldProps {
  field: FieldInput
  isEditing: boolean
  onChange: (key: keyof FieldInput, value: string) => void
  onRemove: () => void
  onCopy?: (fieldName: string, value: string) => void
  onGeneratePassword?: () => void
}

const formatFieldName = (name: string) => {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ")
}

export function InlineField({
  field,
  isEditing,
  onChange,
  onRemove,
  onCopy,
  onGeneratePassword,
}: InlineFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const generatorBtnRef = useRef<HTMLButtonElement>(null)
  const isPassword = field.fieldType === "password"
  const maskPassword = (value: string) => "\u2022".repeat(value.length)

  return (
    <div className="space-y-1">
      {/* Single row: label/name + value + actions — same structure in both modes */}
      <div className="flex items-center gap-2">
        {/* Left: field name & type */}
        <div className="w-28 flex-shrink-0">
          {isEditing ? (
            <Input
              value={field.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Name"
              className="h-10 text-xs font-semibold uppercase tracking-wider bg-transparent border-border/30"
            />
          ) : (
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 leading-10 block truncate">
              {formatFieldName(field.name)}
            </label>
          )}
        </div>

        {isEditing && (
          <div className="w-24 flex-shrink-0">
            <Select
              value={field.fieldType}
              onValueChange={(value) => onChange("fieldType", value as FieldType)}
            >
              <SelectTrigger className="h-10 text-xs border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fieldTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Center: value */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="relative">
              <Input
                type={isPassword && !showPassword ? "password" : "text"}
                value={field.value}
                onChange={(e) => onChange("value", e.target.value)}
                placeholder="Value"
                className={cn(
                  "h-10 bg-accent/50 border-border/30",
                  isPassword && "pr-20"
                )}
              />
              {isPassword && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <div className="relative">
                    <Button
                      ref={generatorBtnRef}
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowGenerator(!showGenerator)}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    {showGenerator && (
                      <PasswordGeneratorPanel
                        triggerRef={generatorBtnRef}
                        onApply={(pwd) => {
                          onGeneratePassword?.()
                          onChange("value", pwd)
                        }}
                        onClose={() => setShowGenerator(false)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-accent rounded-lg px-4 h-10 flex items-center">
              <p className={cn(
                "text-sm break-all truncate",
                isPassword && "font-mono tracking-wider"
              )}>
                {isPassword
                  ? (showPassword ? field.value : maskPassword(field.value))
                  : field.value || "-"}
              </p>
            </div>
          )}
        </div>

        {/* Right: action buttons — fixed width slot so layout doesn't shift */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {!isEditing && field.value && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onCopy?.(field.name, field.value)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              {isPassword && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              )}
            </>
          )}
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Password strength indicator in edit mode */}
      {isEditing && isPassword && field.value && (
        <PasswordStrengthIndicator password={field.value} />
      )}
    </div>
  )
}
