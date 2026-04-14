import { useState, useEffect, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import type { Entry } from "../../types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"

interface TotpSetupDialogProps {
  entry: Entry
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (entry: Entry) => void
}

interface TotpCode {
  code: string
  remainingSeconds: number
}

type InputType = "secret" | "uri"

export function TotpSetupDialog({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: TotpSetupDialogProps) {
  const { showToast } = useToast()
  const { t } = useTranslation()

  const [inputType, setInputType] = useState<InputType>("secret")
  const [inputValue, setInputValue] = useState("")
  const [previewCode, setPreviewCode] = useState<TotpCode | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setInputValue("")
      setPreviewCode(null)
      setPreviewError(null)
      setInputType("secret")
    }
  }, [open])

  // Debounced preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!inputValue.trim()) {
      setPreviewCode(null)
      setPreviewError(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await invoke<TotpCode>("generate_totp", {
          secret: inputValue.trim(),
        })
        setPreviewCode(result)
        setPreviewError(null)
      } catch (e) {
        setPreviewCode(null)
        setPreviewError(String(e))
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue])

  const handleSave = async () => {
    if (!inputValue.trim() || !previewCode) return

    setIsSaving(true)
    try {
      const updated = await invoke<Entry>("set_totp_secret", {
        id: entry.id,
        secret: inputValue.trim(),
      })
      onSuccess(updated)
      onOpenChange(false)
      showToast("success", t("totp.saved"))
    } catch (e) {
      showToast("error", String(e))
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = previewCode !== null && !previewError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {entry.totpSecret ? t("totp.editTitle") : t("totp.setupTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Input type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setInputType("secret")
                setInputValue("")
                setPreviewCode(null)
                setPreviewError(null)
              }}
              className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                inputType === "secret"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {t("totp.inputTypeSecret")}
            </button>
            <button
              onClick={() => {
                setInputType("uri")
                setInputValue("")
                setPreviewCode(null)
                setPreviewError(null)
              }}
              className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                inputType === "uri"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {t("totp.inputTypeUri")}
            </button>
          </div>

          {/* Input field */}
          <div className="space-y-1.5">
            <Label>
              {inputType === "secret"
                ? t("totp.secretLabel")
                : t("totp.uriLabel")}
            </Label>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                inputType === "secret"
                  ? t("totp.secretPlaceholder")
                  : t("totp.uriPlaceholder")
              }
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Preview */}
          {previewCode && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground mb-1">{t("totp.preview")}</p>
              <p className="font-mono text-lg font-bold tracking-[0.15em] text-foreground">
                {previewCode.code.slice(0, 3)} {previewCode.code.slice(3)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("totp.validFor", { s: previewCode.remainingSeconds })}
              </p>
            </div>
          )}

          {previewError && (
            <p className="text-xs text-destructive">
              {inputType === "secret" ? t("totp.invalidSecret") : t("totp.invalidUri")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("totp.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? t("totp.saving") : t("totp.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
