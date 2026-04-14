import { useState, useEffect, useRef, useCallback } from "react"
import { Shield, Copy, Pencil, Trash2 } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import type { Entry } from "../../types"
import { TotpCountdown } from "./TotpCountdown"
import { TotpSetupDialog } from "./TotpSetupDialog"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"

interface TotpCardProps {
  entry: Entry
  onEntryUpdated: (entry: Entry) => void
}

interface TotpCode {
  code: string
  remainingSeconds: number
}

export function TotpCard({ entry, onEntryUpdated }: TotpCardProps) {
  const { showToast } = useToast()
  const { t } = useTranslation()

  const [totpCode, setTotpCode] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const fetchingRef = useRef(false)

  const fetchCode = useCallback(async () => {
    if (!entry.totpSecret || fetchingRef.current) return
    fetchingRef.current = true
    try {
      const result = await invoke<TotpCode>("generate_totp", {
        secret: entry.totpSecret,
      })
      setTotpCode(result.code)
      setCountdown(result.remainingSeconds)
      setError(null)
    } catch (e) {
      setError(String(e))
      setTotpCode(null)
    } finally {
      fetchingRef.current = false
    }
  }, [entry.totpSecret])

  // Tick every second — pure state update, no side effects
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-refetch when countdown expires
  useEffect(() => {
    if (countdown === 0 && entry.totpSecret && totpCode !== null) {
      fetchCode()
    }
  }, [countdown, entry.totpSecret, totpCode, fetchCode])

  // Initial fetch when entry changes
  useEffect(() => {
    setTotpCode(null)
    setError(null)
    setCountdown(0)
    if (entry.totpSecret) {
      fetchCode()
    }
  }, [entry.id, entry.totpSecret, fetchCode])

  const handleCopy = async () => {
    if (!totpCode) return
    try {
      await navigator.clipboard.writeText(totpCode)
      showToast("success", t("totp.copied"))
    } catch {
      showToast("error", "Failed to copy")
    }
  }

  const handleRemove = async () => {
    try {
      const updated = await invoke<Entry>("remove_totp_secret", { id: entry.id })
      onEntryUpdated(updated)
      showToast("success", t("totp.removed"))
    } catch (e) {
      showToast("error", String(e))
    } finally {
      setShowRemoveConfirm(false)
    }
  }

  // Not a website login - don't show TOTP
  if (entry.entryType !== "websiteLogin") return null

  // No TOTP secret set - show add button
  if (!entry.totpSecret) {
    return (
      <>
        <button
          onClick={() => setShowSetup(true)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("totp.addMfa")}</span>
        </button>

        <TotpSetupDialog
          entry={entry}
          open={showSetup}
          onOpenChange={setShowSetup}
          onSuccess={onEntryUpdated}
        />
      </>
    )
  }

  // TOTP secret set - show code
  return (
    <>
      <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            {t("totp.verificationCode")}
          </span>
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {totpCode && (
          <div className="flex items-center gap-3">
            <TotpCountdown remaining={countdown} />

            <button
              onClick={handleCopy}
              className="flex-1 flex items-center gap-2 text-left group"
              title={t("totp.clickToCopy")}
            >
              <span className="font-mono text-xl font-bold tracking-[0.2em] text-foreground group-hover:text-primary transition-colors">
                {totpCode.slice(0, 3)} {totpCode.slice(3)}
              </span>
              <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSetup(true)}
                className="p-1 rounded hover:bg-muted transition-colors"
                title={t("totp.editMfa")}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="p-1 rounded hover:bg-muted transition-colors"
                title={t("totp.removeMfa")}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>

      <TotpSetupDialog
        entry={entry}
        open={showSetup}
        onOpenChange={setShowSetup}
        onSuccess={onEntryUpdated}
      />

      <ConfirmDialog
        isOpen={showRemoveConfirm}
        title={t("totp.confirmRemove")}
        message={t("totp.confirmRemoveMessage")}
        onDiscard={handleRemove}
        onCancel={() => setShowRemoveConfirm(false)}
        onSave={() => setShowRemoveConfirm(false)}
        discardLabel={t("totp.removeMfa")}
      />
    </>
  )
}
