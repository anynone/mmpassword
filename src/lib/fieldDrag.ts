const FIELD_DRAG_SELECTOR = "[data-field-drag-id]"

export const getFieldDragTargetId = (clientX: number, clientY: number) => {
  const element = document.elementFromPoint(clientX, clientY)
  const target = element?.closest<HTMLElement>(FIELD_DRAG_SELECTOR)
  return target?.dataset.fieldDragId ?? null
}

export const lockPageWhileDragging = () => {
  const previousCursor = document.body.style.cursor
  const previousUserSelect = document.body.style.userSelect

  document.body.style.cursor = "grabbing"
  document.body.style.userSelect = "none"

  return () => {
    document.body.style.cursor = previousCursor
    document.body.style.userSelect = previousUserSelect
  }
}
