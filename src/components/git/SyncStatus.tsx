import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { RefreshCw, Upload, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useToast } from "../common/Toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { GitSyncResult } from "../../types/git"

interface SyncStatusProps {
  onSync?: () => void
}

export function SyncStatus({ onSync }: SyncStatusProps) {
  const { showToast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<GitSyncResult | null>(null)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await invoke<GitSyncResult>("sync_git_vault")
      setSyncResult(result)
      if (result.success) {
        showToast("success", `Synced! ${result.entriesPulled} pulled, ${result.entriesPushed} pushed`)
        onSync?.()
      } else {
        showToast("error", result.error || "Sync failed")
      }
    } catch (error) {
      showToast("error", `Sync failed: ${error}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSave = async () => {
    setIsSyncing(true)
    try {
      await invoke<string>("save_git_vault", { commitMessage: "Update vault" })
      showToast("success", "Vault saved to Git")
      onSync?.()
    } catch (error) {
      showToast("error", `Failed to save: ${error}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-headline font-bold flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-primary" />
        Git Sync Status
      </h3>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSyncing} variant="secondary" className="flex-1">
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Save
        </Button>
        <Button onClick={handleSync} disabled={isSyncing} className="flex-1">
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sync
        </Button>
      </div>

      {syncResult && (
        <div className={cn("p-3 rounded-lg", syncResult.success ? "bg-primary/10" : "bg-destructive/10")}>
          <div className="flex items-center gap-2">
            {syncResult.success ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div className="flex-1">
              <p className={cn("text-sm font-medium", syncResult.success ? "text-primary" : "text-destructive")}>
                {syncResult.success ? "Sync completed" : "Sync failed"}
              </p>
              {syncResult.success && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {syncResult.entriesPulled} entries pulled, {syncResult.entriesPushed} entries pushed
                </p>
              )}
              {syncResult.error && <p className="text-xs text-destructive mt-0.5">{syncResult.error}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
