import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../common/Toast";
import type { GitSyncResult } from "../../types/git";

interface SyncStatusProps {
  onSync?: () => void;
}

export function SyncStatus({ onSync }: SyncStatusProps) {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<GitSyncResult | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await invoke<GitSyncResult>("sync_git_vault");
      setSyncResult(result);

      if (result.success) {
        showToast(
          "success",
          `Synced! ${result.entriesPulled} pulled, ${result.entriesPushed} pushed`
        );
        onSync?.();
      } else {
        showToast("error", result.error || "Sync failed");
      }
    } catch (error) {
      showToast("error", `Sync failed: ${error}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    setIsSyncing(true);
    try {
      await invoke<string>("save_git_vault", {
        commitMessage: "Update vault",
      });
      showToast("success", "Vault saved to Git");
      onSync?.();
    } catch (error) {
      showToast("error", `Failed to save: ${error}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">sync</span>
        Git Sync Status
      </h3>

      {/* Sync actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSyncing}
          className="flex-1 py-2 px-4 bg-secondary text-white rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isSyncing ? (
            <span className="material-symbols-outlined animate-spin">sync</span>
          ) : (
            <span className="material-symbols-outlined">upload</span>
          )}
          Save
        </button>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isSyncing ? (
            <span className="material-symbols-outlined animate-spin">sync</span>
          ) : (
            <span className="material-symbols-outlined">sync</span>
          )}
          Sync
        </button>
      </div>

      {/* Last sync result */}
      {syncResult && (
        <div
          className={`p-3 rounded-lg ${
            syncResult.success ? "bg-primary-container" : "bg-error-container"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`material-symbols-outlined ${
                syncResult.success ? "text-primary" : "text-error"
              }`}
            >
              {syncResult.success ? "check_circle" : "error"}
            </span>
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  syncResult.success
                    ? "text-on-primary-container"
                    : "text-on-error-container"
                }`}
              >
                {syncResult.success ? "Sync completed" : "Sync failed"}
              </p>
              {syncResult.success && (
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {syncResult.entriesPulled} entries pulled,{" "}
                  {syncResult.entriesPushed} entries pushed
                </p>
              )}
              {syncResult.error && (
                <p className="text-xs text-on-error-container mt-0.5">
                  {syncResult.error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
