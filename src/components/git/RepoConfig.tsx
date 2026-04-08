import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Loader2, ShieldCheck, CheckCircle, XCircle, ArrowRight } from "lucide-react"
import { useToast } from "../common/Toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { GitAccessValidation } from "../../types/git"

interface RepoConfigProps {
  sshKeyPath: string
  onConfigured: (repoUrl: string, branch: string) => void
}

export function RepoConfig({ sshKeyPath, onConfigured }: RepoConfigProps) {
  const { showToast } = useToast()
  const [repoUrl, setRepoUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [isValidating, setIsValidating] = useState(false)
  const [validation, setValidation] = useState<GitAccessValidation | null>(null)

  const validateAccess = async () => {
    if (!repoUrl.trim()) { showToast("error", "Please enter a repository URL"); return }
    const isSsh = repoUrl.startsWith("git@") || repoUrl.startsWith("ssh://")
    const isHttps = repoUrl.startsWith("https://") || repoUrl.startsWith("http://")
    if (!isSsh && !isHttps) {
      showToast("error", "URL must be in SSH (git@host:user/repo.git) or HTTPS (https://host/user/repo.git) format")
      return
    }
    setIsValidating(true)
    setValidation(null)
    try {
      const result = await invoke<GitAccessValidation>("validate_git_access", { repoUrl, keyPath: sshKeyPath })
      setValidation(result)
      if (result.valid) {
        showToast("success", "Repository access verified!")
        if (result.defaultBranch) setBranch(result.defaultBranch)
      }
    } catch (error) {
      showToast("error", `Failed to validate access: ${error}`)
      setValidation({ valid: false, repoName: null, defaultBranch: null, error: String(error) })
    } finally {
      setIsValidating(false)
    }
  }

  const handleContinue = () => {
    if (!validation?.valid) { showToast("error", "Please validate repository access first"); return }
    onConfigured(repoUrl, branch)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Repository URL:</label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => { setRepoUrl(e.target.value); setValidation(null) }}
          placeholder="git@host:user/repo.git or ssh://git@host:port/user/repo.git"
          className="w-full px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none font-mono"
        />
        <p className="text-xs text-muted-foreground">SSH or HTTPS URL from your Git provider (GitHub, GitLab, Gitea, etc.)</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Branch:</label>
        <input
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="main"
          className="w-full px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none"
        />
      </div>

      <Button
        onClick={validateAccess}
        disabled={isValidating || !repoUrl.trim()}
        variant="secondary"
        className="w-full"
      >
        {isValidating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
        {isValidating ? "Validating..." : "Validate Access"}
      </Button>

      {validation && (
        <div className={cn("p-3 rounded-lg", validation.valid ? "bg-primary/10" : "bg-destructive/10")}>
          <div className="flex items-center gap-2">
            {validation.valid ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <p className={cn("text-sm font-medium", validation.valid ? "text-primary" : "text-destructive")}>
                {validation.valid ? "Access verified!" : "Access validation failed"}
              </p>
              {validation.repoName && <p className="text-xs text-muted-foreground">{validation.repoName}</p>}
            </div>
          </div>
        </div>
      )}

      {validation?.valid && (
        <Button onClick={handleContinue} className="w-full">
          <ArrowRight className="h-4 w-4 mr-2" />
          Continue
        </Button>
      )}

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Tip:</span> Make sure your SSH key is added to your Git provider.
        </p>
      </div>
    </div>
  )
}
