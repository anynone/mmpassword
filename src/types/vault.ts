import type { Group } from "./group";
import type { Entry } from "./entry";

export interface Vault {
  id: string;
  name: string;
  version: number;
  description?: string;
  groups: Group[];
  entries: Entry[];
  trash: Entry[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultMeta {
  path: string;
  name: string;
  lastAccessed: string;
  isGithub: boolean;
}
