export interface Field {
  name: string;
  value: string;
  fieldType: string;
  protected: boolean;
}

export interface Entry {
  id: string;
  title: string;
  entryType: string;
  groupId: string | null;
  fields: Field[];
  tags: string[];
  favorite: boolean;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryRequest {
  title: string;
  entryType?: string;
  groupId?: string | null;
  fields?: Field[];
  tags?: string[];
  favorite?: boolean;
  icon?: string | null;
}

export interface UpdateEntryRequest {
  title?: string;
  entryType?: string;
  groupId?: string | null;
  fields?: Field[];
  tags?: string[];
  favorite?: boolean;
  icon?: string | null;
}

export interface Group {
  id: string;
  name: string;
  icon: string | null;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  icon?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  icon?: string | null;
}

export interface SubscriptionWithUrl {
  id: number;
  token: string;
  url: string;
  name: string;
  description: string | null;
  expiresAt: string | null;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionRequest {
  name: string;
  description?: string;
  expiresAt?: string | null;
}

export interface UpdateSubscriptionRequest {
  name?: string;
  description?: string | null;
  expiresAt?: string | null;
}
