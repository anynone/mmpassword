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

export const reorderItems = <T,>(
  items: T[],
  fromIndex: number,
  toIndex: number
): T[] => {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items
  }

  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, movedItem)
  return nextItems
}
