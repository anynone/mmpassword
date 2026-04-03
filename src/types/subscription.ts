export interface SubscriptionMeta {
  url: string;
  name: string;
  entryCount: number;
  lastAccessed: string;
}

export interface MergedEntry {
  id: string;
  title: string;
  entryType: string;
  groupId?: string;
  fields: Array<{
    name: string;
    value: string;
    fieldType: string;
    protected?: boolean;
  }>;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  icon?: string;
  source: "local" | "subscription";
}
