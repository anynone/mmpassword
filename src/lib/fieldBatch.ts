import type { FieldType } from "../types"

export type FieldBatchUnit = "row" | "group"

export interface NewFieldInput {
  id: string
  name: string
  value: string
  fieldType: FieldType
  isNew?: boolean
}

const createField = (fieldType: FieldType, name = ""): NewFieldInput => ({
  id: crypto.randomUUID(),
  name,
  value: "",
  fieldType,
  isNew: true,
})

export const createFieldBatch = (
  quantity: number,
  unit: FieldBatchUnit
): NewFieldInput[] => {
  const count = Math.max(1, Math.floor(quantity))

  if (unit === "group") {
    return Array.from({ length: count }).flatMap(() => [
      createField("username", "Username"),
      createField("password", "Password"),
    ])
  }

  return Array.from({ length: count }, () => createField("text"))
}
