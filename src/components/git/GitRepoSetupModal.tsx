import { GitRepoSetup } from "./GitRepoSetup"
import type { GitRepoMeta } from "../../types/git"

interface GitRepoSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (
    repoUrl: string,
    branch: string,
    vaultPath: string,
    keyPath: string,
    password: string,
    isNew: boolean,
    name?: string
  ) => void
  initialRepo?: GitRepoMeta | null
}

/**
 * Modal wrapper around the two-step GitRepoSetup flow
 * (connect form → vault selection). Reused by the welcome screen and by the
 * "add vault" flow in the main screen.
 */
export function GitRepoSetupModal({
  isOpen,
  onClose,
  onComplete,
  initialRepo = null,
}: GitRepoSetupModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
        <GitRepoSetup
          onComplete={onComplete}
          onBack={onClose}
          initialRepo={initialRepo}
        />
      </div>
    </div>
  )
}
