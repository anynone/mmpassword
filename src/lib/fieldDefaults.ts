import type { FieldType } from "../types"

const defaultFieldNames: Record<FieldType, string> = {
  text: "Text",
  password: "Password",
  email: "Email",
  url: "URL",
  notes: "Notes",
  username: "Username",
}

export function getDefaultFieldName(fieldType: FieldType): string {
  return defaultFieldNames[fieldType] ?? "Text"
}
