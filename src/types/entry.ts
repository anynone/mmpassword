export type EntryType = "websiteLogin" | "secureNote";

export type FieldType = "text" | "password" | "email" | "url" | "notes" | "username";

export interface Field {
  name: string;
  value: string;
  fieldType: FieldType;
  protected?: boolean;
}

export interface Entry {
  id: string;
  title: string;
  entryType: EntryType;
  groupId?: string;
  fields: Field[];
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  icon?: string;
  /** TOTP secret key (base32 encoded), undefined = no MFA */
  totpSecret?: string;
}

export interface CreateEntryRequest {
  title: string;
  entryType: EntryType;
  groupId?: string;
  fields: Field[];
  tags: string[];
  favorite: boolean;
}

export interface UpdateEntryRequest {
  title: string;
  groupId?: string;
  fields: Field[];
  tags: string[];
  favorite: boolean;
}
