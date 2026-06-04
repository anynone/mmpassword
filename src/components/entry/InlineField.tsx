import { type DragEvent, useEffect, useState, useRef } from "react"
import { Copy, Eye, EyeOff, KeyRound, Trash2, History, GripVertical } from "lucide-react"
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
import type { FieldType, PasswordHistoryEntry } from "../../types"
import type { FieldInput } from "../../stores/vaultStore"
import { cn } from "@/lib/utils"
import { useTranslation } from "../../i18n"

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
  passwordHistory?: PasswordHistoryEntry[]
  autoFocusName?: boolean
  focusSignal?: number
  errorMessage?: string
  draggable?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
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
  passwordHistory,
  autoFocusName = false,
  focusSignal,
  errorMessage,
  draggable = false,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: InlineFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState(false)
  const [revealedHistory, setRevealedHistory] = useState<Record<number, boolean>>({})
  const nameInputRef = useRef<HTMLInputElement>(null)
  const generatorBtnRef = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()
  const isPassword = field.fieldType === "password"
  const hasHistory = !isEditing && isPassword && passwordHistory && passwordHistory.length > 0
  const hasNameError = Boolean(errorMessage)
  const maskPassword = (value: string) => "\u2022".repeat(value.length)

  useEffect(() => {
    if (isEditing && autoFocusName) {
      nameInputRef.current?.focus()
    }
  }, [autoFocusName, focusSignal, isEditing])

  return (
    <div
      className={cn(
        "space-y-1 rounded-md transition-colors",
        isDragging && "opacity-50",
        isDragOver && !isDragging && "bg-primary/5 ring-1 ring-primary/30"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Single row: label/name + value + actions — same structure in both modes */}
      <div className="flex items-center gap-2">
        {isEditing && draggable && (
          <button
            type="button"
            draggable
            aria-label={t("entryDetail.dragField")}
            title={t("entryDetail.dragField")}
            className="h-10 w-6 flex-shrink-0 cursor-grab rounded-md text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <GripVertical className="mx-auto h-4 w-4" />
          </button>
        )}
        {/* Left: field name & type */}
        <div className="w-28 flex-shrink-0">
          {isEditing ? (
            <Input
              ref={nameInputRef}
              value={field.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder={t("entryDetail.fieldNamePlaceholder")}
              className={cn(
                "h-10 bg-transparent placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/60",
                hasNameError
                  ? "border-destructive focus-visible:ring-destructive"
                  : field.name.trim()
                    ? "border-border/30"
                    : "border-dashed border-border/50",
                field.name.trim()
                  ? "text-xs font-semibold uppercase tracking-wider"
                  : "text-sm font-normal normal-case tracking-normal"
              )}
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
                placeholder={t("entryDetail.fieldValuePlaceholder")}
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

      {isEditing && errorMessage && (
        <p className="ml-1 text-xs text-destructive">{errorMessage}</p>
      )}

      {/* Password strength indicator in edit mode */}
      {isEditing && isPassword && field.value && (
        <PasswordStrengthIndicator password={field.value} />
      )}

      {/* Password history in view mode */}
      {hasHistory && (
        <div className="ml-28 mt-1">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpandedHistory(!expandedHistory)}
          >
            <History className="h-3 w-3" />
            <span>历史密码 ({passwordHistory!.length})</span>
            <span className="text-[10px]">{expandedHistory ? "▲" : "▼"}</span>
          </button>
          {expandedHistory && (
            <div className="mt-1 space-y-1">
              {passwordHistory!.map((entry, i) => {
                const revealed = revealedHistory[i] ?? false
                return (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono tracking-wider min-w-0 truncate">
                      {revealed ? entry.value : maskPassword(entry.value)}
                    </span>
                    <span className="text-[10px] whitespace-nowrap ml-auto">
                      {new Date(entry.changedAt).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="hover:text-foreground transition-colors flex-shrink-0"
                      onClick={() => setRevealedHistory(prev => ({ ...prev, [i]: !prev[i] }))}
                    >
                      {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      className="hover:text-foreground transition-colors flex-shrink-0"
                      onClick={() => onCopy?.("历史密码", entry.value)}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
