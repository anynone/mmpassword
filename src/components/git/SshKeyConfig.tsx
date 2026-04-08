import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { KeyRound, Loader2, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "../common/Toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DetectedSshKey, SshKeyValidation } from "../../types/git"

interface SshKeyConfigProps {
  onKeySelected: (keyPath: string) => void
  selectedKey?: string
}

export function SshKeyConfig({ onKeySelected, selectedKey }: SshKeyConfigProps) {
  const { showToast } = useToast()
  const [detectedKeys, setDetectedKeys] = useState<DetectedSshKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [manualKeyPath, setManualKeyPath] = useState("")
  const [validation, setValidation] = useState<SshKeyValidation | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => { loadSshKeys() }, [])

  const loadSshKeys = async () => {
    setIsLoading(true)
    try {
      const keys = await invoke<DetectedSshKey[]>("detect_ssh_keys")
      setDetectedKeys(keys)
      if (keys.length > 0 && !selectedKey) onKeySelected(keys[0].path)
    } catch (error) {
      showToast("error", `Failed to detect SSH keys: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const validateKey = async (keyPath: string) => {
    setIsValidating(true)
    setValidation(null)
    try {
      const result = await invoke<SshKeyValidation>("validate_ssh_key", { keyPath })
      setValidation(result)
      if (result.valid) showToast("success", `Valid ${result.keyType || ""} SSH key`)
    } catch (error) {
      showToast("error", `Failed to validate SSH key: ${error}`)
      setValidation({ valid: false, keyType: null, fingerprint: null, error: String(error) })
    } finally {
      setIsValidating(false)
    }
  }

  useEffect(() => { if (selectedKey) validateKey(selectedKey) }, [selectedKey])

  const handleKeySelect = (path: string) => { onKeySelected(path); setManualKeyPath("") }
  const handleManualInput = () => { if (manualKeyPath.trim()) onKeySelected(manualKeyPath.trim()) }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-headline font-bold flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        SSH Key Configuration
      </h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {detectedKeys.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Detected SSH Keys:</p>
              <div className="space-y-2">
                {detectedKeys.map((key) => (
                  <button
                    key={key.path}
                    onClick={() => handleKeySelect(key.path)}
                    className={cn(
                      "w-full p-3 rounded-xl bg-card hover:bg-accent transition-all cursor-pointer border text-left",
                      selectedKey === key.path ? "border-primary" : "hover:border-primary/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <KeyRound className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{key.path.split("/").pop()}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{key.keyType}</span>
                            {key.hasPublicKey && <span className="text-xs text-emerald-600">Has public key</span>}
                          </div>
                        </div>
                      </div>
                      {selectedKey === key.path && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Or enter key path manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualKeyPath}
                onChange={(e) => setManualKeyPath(e.target.value)}
                placeholder="~/.ssh/id_ed25519"
                className="flex-1 px-3 py-2 bg-card rounded-lg text-sm border focus:border-primary focus:outline-none"
              />
              <Button onClick={handleManualInput} disabled={!manualKeyPath.trim()} variant="secondary">
                Use
              </Button>
            </div>
          </div>

          {isValidating && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Validating SSH key...</span>
            </div>
          )}

          {validation && !isValidating && (
            <div className={cn("p-3 rounded-lg", validation.valid ? "bg-primary/10" : "bg-destructive/10")}>
              <div className="flex items-center gap-2">
                {validation.valid ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <div>
                  <p className={cn("text-sm font-medium", validation.valid ? "text-primary" : "text-destructive")}>
                    {validation.valid ? `Valid ${validation.keyType || "SSH"} Key` : "Invalid SSH Key"}
                  </p>
                  {validation.fingerprint && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{validation.fingerprint}</p>}
                  {validation.error && <p className="text-xs text-destructive mt-0.5">{validation.error}</p>}
                </div>
              </div>
            </div>
          )}

          {detectedKeys.length === 0 && !isLoading && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                No SSH keys detected in ~/.ssh directory. Please generate an SSH key or enter the path manually above.
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-2">
                Generate a new key with: <code className="bg-muted px-1 rounded">ssh-keygen -t ed25519 -C "your@email.com"</code>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
