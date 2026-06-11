import { useMemo, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import jsQR from "jsqr"
import { FileImage, Import, RefreshCw } from "lucide-react"
import type { Vault } from "../../types"
import { useVaultStore } from "../../stores/vaultStore"
import { useTranslation } from "../../i18n"
import { useToast } from "../common/Toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ImportAction = "update" | "create" | "skip"

interface GoogleAuthenticatorImportItem {
  index: number
  name: string
  issuer: string
  label: string
  algorithm: string
  digits: number
  otpType: string
  supported: boolean
  unsupportedReason?: string
  suggestedEntryId?: string
  suggestedEntryTitle?: string
  suggestedEntryHasTotp: boolean
}

interface ImportDecision {
  index: number
  action: ImportAction
  entryId?: string
  title?: string
}

interface TotpImportResult {
  vault: Vault
  importedCount: number
  updatedCount: number
  createdCount: number
  skippedCount: number
}

interface GoogleAuthenticatorImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

async function readImageData(file: File): Promise<ImageData> {
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = url
    })

    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas is not available")

    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function decodeQrFile(file: File): Promise<string> {
  const imageData = await readImageData(file)
  const qr = jsQR(imageData.data, imageData.width, imageData.height)
  if (!qr?.data) {
    throw new Error("No QR code found")
  }
  return qr.data
}

function initialDecisionFor(item: GoogleAuthenticatorImportItem): ImportDecision {
  if (!item.supported) {
    return { index: item.index, action: "skip" }
  }
  if (item.suggestedEntryId) {
    return { index: item.index, action: "update", entryId: item.suggestedEntryId }
  }
  return { index: item.index, action: "create", title: item.label }
}

export function GoogleAuthenticatorImportDialog({
  open,
  onOpenChange,
}: GoogleAuthenticatorImportDialogProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const entries = useVaultStore((state) => state.entries)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [migrationUri, setMigrationUri] = useState("")
  const [items, setItems] = useState<GoogleAuthenticatorImportItem[]>([])
  const [decisions, setDecisions] = useState<Record<number, ImportDecision>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const selectedCount = useMemo(
    () => Object.values(decisions).filter((decision) => decision.action !== "skip").length,
    [decisions]
  )

  const hasInvalidDecision = useMemo(
    () =>
      items.some((item) => {
        const decision = decisions[item.index]
        if (!decision || decision.action === "skip") return false
        if (decision.action === "update") return !decision.entryId
        if (decision.action === "create") return !decision.title?.trim()
        return true
      }),
    [decisions, items]
  )

  const reset = () => {
    setMigrationUri("")
    setItems([])
    setDecisions({})
    setError(null)
    setIsPreviewing(false)
    setIsImporting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset()
  }

  const preview = async (value = migrationUri) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setIsPreviewing(true)
    setError(null)
    try {
      const previewItems = await invoke<GoogleAuthenticatorImportItem[]>(
        "preview_google_authenticator_import",
        { uri: trimmed }
      )
      const nextDecisions = Object.fromEntries(
        previewItems.map((item) => [item.index, initialDecisionFor(item)])
      )
      setItems(previewItems)
      setDecisions(nextDecisions)
    } catch (e) {
      setItems([])
      setDecisions({})
      setError(String(e))
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return
    setIsPreviewing(true)
    setError(null)
    try {
      const decoded = await decodeQrFile(file)
      setMigrationUri(decoded)
      await preview(decoded)
    } catch (e) {
      setError(String(e))
      setItems([])
      setDecisions({})
    } finally {
      setIsPreviewing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const updateDecision = (index: number, update: Partial<ImportDecision>) => {
    setDecisions((current) => ({
      ...current,
      [index]: {
        ...current[index],
        index,
        ...update,
      },
    }))
  }

  const handleImport = async () => {
    if (selectedCount === 0 || hasInvalidDecision) return

    setIsImporting(true)
    setError(null)
    try {
      const result = await invoke<TotpImportResult>("import_google_authenticator", {
        uri: migrationUri.trim(),
        decisions: Object.values(decisions),
      })
      useVaultStore.setState({
        vault: result.vault,
        entries: result.vault.entries,
        groups: result.vault.groups,
      })
      showToast(
        "success",
        t("totp.import.success", {
          imported: result.importedCount,
          updated: result.updatedCount,
          created: result.createdCount,
        })
      )
      handleOpenChange(false)
    } catch (e) {
      setError(String(e))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("totp.import.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="ga-migration-uri">{t("totp.import.uriLabel")}</Label>
            <textarea
              id="ga-migration-uri"
              value={migrationUri}
              onChange={(event) => setMigrationUri(event.target.value)}
              placeholder={t("totp.import.uriPlaceholder")}
              spellCheck={false}
              className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPreviewing || isImporting}
              >
                <FileImage className="mr-2 h-4 w-4" />
                {t("totp.import.chooseImage")}
              </Button>
              <Button
                type="button"
                onClick={() => preview()}
                loading={isPreviewing}
                disabled={!migrationUri.trim() || isImporting}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("totp.import.preview")}
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>{t("totp.import.accounts")}</Label>
                <span className="text-xs text-muted-foreground">
                  {t("totp.import.selected", { count: selectedCount })}
                </span>
              </div>

              <div className="overflow-hidden rounded-md border border-border">
                {items.map((item) => {
                  const decision = decisions[item.index] ?? initialDecisionFor(item)
                  return (
                    <div
                      key={item.index}
                      className="grid gap-3 border-b border-border p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_180px_minmax(180px,1fr)]"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{item.label}</p>
                          {item.supported ? (
                            <Badge variant="secondary">{item.otpType}</Badge>
                          ) : (
                            <Badge variant="destructive">{t("totp.import.unsupported")}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.algorithm} / {item.digits}
                          {item.suggestedEntryTitle
                            ? ` / ${t("totp.import.match", { title: item.suggestedEntryTitle })}`
                            : ""}
                        </p>
                        {item.unsupportedReason && (
                          <p className="text-xs text-destructive">{item.unsupportedReason}</p>
                        )}
                        {item.suggestedEntryHasTotp && decision.action === "update" && (
                          <p className="text-xs text-amber-600">
                            {t("totp.import.replaceExisting")}
                          </p>
                        )}
                      </div>

                      <Select
                        value={decision.action}
                        onValueChange={(value) =>
                          updateDecision(item.index, {
                            action: value as ImportAction,
                            entryId:
                              value === "update"
                                ? decision.entryId ?? item.suggestedEntryId
                                : undefined,
                            title: value === "create" ? decision.title ?? item.label : undefined,
                          })
                        }
                        disabled={!item.supported}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="update" disabled={entries.length === 0}>
                            {t("totp.import.actionUpdate")}
                          </SelectItem>
                          <SelectItem value="create">
                            {t("totp.import.actionCreate")}
                          </SelectItem>
                          <SelectItem value="skip">
                            {t("totp.import.actionSkip")}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {decision.action === "update" && (
                        <Select
                          value={decision.entryId ?? ""}
                          onValueChange={(entryId) => updateDecision(item.index, { entryId })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("totp.import.entryPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {entries.map((entry) => (
                              <SelectItem key={entry.id} value={entry.id}>
                                {entry.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {decision.action === "create" && (
                        <Input
                          value={decision.title ?? item.label}
                          onChange={(event) =>
                            updateDecision(item.index, { title: event.target.value })
                          }
                          placeholder={t("totp.import.titlePlaceholder")}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
          >
            {t("totp.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            loading={isImporting}
            disabled={selectedCount === 0 || hasInvalidDecision || isPreviewing}
          >
            <Import className="mr-2 h-4 w-4" />
            {t("totp.import.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
