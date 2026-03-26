import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../common/Toast";
import type { DetectedSshKey, SshKeyValidation } from "../../types/git";

interface SshKeyConfigProps {
  onKeySelected: (keyPath: string) => void;
  selectedKey?: string;
}

export function SshKeyConfig({ onKeySelected, selectedKey }: SshKeyConfigProps) {
  const { showToast } = useToast();
  const [detectedKeys, setDetectedKeys] = useState<DetectedSshKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manualKeyPath, setManualKeyPath] = useState("");
  const [validation, setValidation] = useState<SshKeyValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Load detected SSH keys
  useEffect(() => {
    loadSshKeys();
  }, []);

  const loadSshKeys = async () => {
    setIsLoading(true);
    try {
      const keys = await invoke<DetectedSshKey[]>("detect_ssh_keys");
      setDetectedKeys(keys);
      // Auto-select first key if available
      if (keys.length > 0 && !selectedKey) {
        onKeySelected(keys[0].path);
      }
    } catch (error) {
      showToast("error", `Failed to detect SSH keys: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const validateKey = async (keyPath: string) => {
    setIsValidating(true);
    setValidation(null);
    try {
      const result = await invoke<SshKeyValidation>("validate_ssh_key", {
        keyPath,
      });
      setValidation(result);
      if (result.valid) {
        showToast("success", `Valid ${result.keyType || ""} SSH key`);
      }
    } catch (error) {
      showToast("error", `Failed to validate SSH key: ${error}`);
      setValidation({
        valid: false,
        keyType: null,
        fingerprint: null,
        error: String(error),
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Validate key when selection changes
  useEffect(() => {
    if (selectedKey) {
      validateKey(selectedKey);
    }
  }, [selectedKey]);

  const handleKeySelect = (path: string) => {
    onKeySelected(path);
    setManualKeyPath("");
  };

  const handleManualInput = () => {
    if (manualKeyPath.trim()) {
      onKeySelected(manualKeyPath.trim());
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">vpn_key</span>
        SSH Key Configuration
      </h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-primary">sync</span>
        </div>
      ) : (
        <>
          {/* Detected keys */}
          {detectedKeys.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-on-surface-variant">
                Detected SSH Keys:
              </p>
              <div className="space-y-2">
                {detectedKeys.map((key) => (
                  <button
                    key={key.path}
                    onClick={() => handleKeySelect(key.path)}
                    className={`w-full p-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-all cursor-pointer border text-left ${
                      selectedKey === key.path
                        ? "border-primary"
                        : "border-transparent hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-on-surface-variant">
                          vpn_key
                        </span>
                        <div>
                          <p className="font-medium text-on-surface text-sm">
                            {key.path.split("/").pop()}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-on-surface-variant">
                              {key.keyType}
                            </span>
                            {key.hasPublicKey && (
                              <span className="text-xs text-emerald-600">
                                • Has public key
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedKey === key.path && (
                        <span className="material-symbols-outlined text-primary">
                          check_circle
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual key input */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-on-surface-variant">
              Or enter key path manually:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualKeyPath}
                onChange={(e) => setManualKeyPath(e.target.value)}
                placeholder="~/.ssh/id_ed25519"
                className="flex-1 px-3 py-2 bg-surface-container-lowest rounded-lg text-sm border border-outline-variant focus:border-primary focus:outline-none"
              />
              <button
                onClick={handleManualInput}
                disabled={!manualKeyPath.trim()}
                className="px-4 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Use
              </button>
            </div>
          </div>

          {/* Validation status */}
          {isValidating && (
            <div className="flex items-center gap-2 p-3 bg-surface-container rounded-lg">
              <span className="material-symbols-outlined animate-spin text-primary">
                sync
              </span>
              <span className="text-sm text-on-surface-variant">
                Validating SSH key...
              </span>
            </div>
          )}

          {validation && !isValidating && (
            <div
              className={`p-3 rounded-lg ${
                validation.valid
                  ? "bg-primary-container"
                  : "bg-error-container"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined ${
                    validation.valid ? "text-primary" : "text-error"
                  }`}
                >
                  {validation.valid ? "check_circle" : "error"}
                </span>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      validation.valid
                        ? "text-on-primary-container"
                        : "text-on-error-container"
                    }`}
                  >
                    {validation.valid
                      ? `Valid ${validation.keyType || "SSH"} Key`
                      : "Invalid SSH Key"}
                  </p>
                  {validation.fingerprint && (
                    <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                      {validation.fingerprint}
                    </p>
                  )}
                  {validation.error && (
                    <p className="text-xs text-on-error-container mt-0.5">
                      {validation.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No keys detected message */}
          {detectedKeys.length === 0 && !isLoading && (
            <div className="p-4 bg-tertiary-container rounded-lg">
              <p className="text-sm text-on-tertiary-container">
                No SSH keys detected in ~/.ssh directory. Please generate an SSH
                key or enter the path manually above.
              </p>
              <p className="text-xs text-on-tertiary-container mt-2">
                Generate a new key with:{" "}
                <code className="bg-surface-container px-1 rounded">
                  ssh-keygen -t ed25519 -C "your@email.com"
                </code>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
