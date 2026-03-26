/**
 * Git SSH integration types
 */

/** SSH key configuration */
export interface SshKeyConfig {
  keyPath: string;
  passphraseKeyringId?: string;
}

/** Detected SSH key information */
export interface DetectedSshKey {
  path: string;
  keyType: string;
  hasPublicKey: boolean;
}

/** SSH key validation result */
export interface SshKeyValidation {
  valid: boolean;
  keyType?: string | null;
  fingerprint?: string | null;
  error?: string | null;
}

/** Git repository configuration */
export interface GitRepository {
  url: string;
  branch: string;
  vaultPath: string;
  sshConfig: SshKeyConfig;
}

/** Git sync status */
export type SyncStatus =
  | "synced"
  | "localAhead"
  | "remoteAhead"
  | "diverged"
  | "syncing"
  | "error";

/** Git sync state */
export interface GitSyncState {
  lastCommitSha: string;
  lastSyncAt: string;
  localHash: string;
  status: SyncStatus;
}

/** Git access validation result */
export interface GitAccessValidation {
  valid: boolean;
  repoName?: string | null;
  defaultBranch?: string | null;
  error?: string | null;
}

/** Git sync result */
export interface GitSyncResult {
  success: boolean;
  entriesPulled: number;
  entriesPushed: number;
  conflicts: number;
  newCommitSha?: string | null;
  error?: string | null;
}
