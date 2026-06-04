import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { FieldBatchUnit } from "@/lib/fieldBatch"
import { cn } from "@/lib/utils"
import { useTranslation } from "../../i18n"

interface BulkAddFieldButtonProps {
  onAdd: (quantity: number, unit: FieldBatchUnit) => void
  placement?: "top" | "bottom"
  className?: string
}

const MAX_QUANTITY = 50

const normalizeQuantity = (value: string) => {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return 1
  return Math.min(MAX_QUANTITY, Math.max(1, parsed))
}

export function BulkAddFieldButton({
  onAdd,
  placement = "bottom",
  className,
}: BulkAddFieldButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState("1")
  const [unit, setUnit] = useState<FieldBatchUnit>("row")
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const normalizedQuantity = useMemo(() => normalizeQuantity(quantity), [quantity])
  const rowsToAdd = unit === "group" ? normalizedQuantity * 2 : normalizedQuantity

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const updatePanelPosition = () => {
      const triggerRect = rootRef.current?.getBoundingClientRect()
      const panelRect = panelRef.current?.getBoundingClientRect()
      if (!triggerRect || !panelRect) return

      const gap = 8
      const viewportPadding = 8
      const maxLeft = window.innerWidth - panelRect.width - viewportPadding
      const left = Math.max(
        viewportPadding,
        Math.min(triggerRect.left, Math.max(viewportPadding, maxLeft))
      )

      const topPlacement = triggerRect.top - panelRect.height - gap
      const bottomPlacement = triggerRect.bottom + gap
      const preferredTop = placement === "top" ? topPlacement : bottomPlacement
      const alternateTop = placement === "top" ? bottomPlacement : topPlacement
      const canUsePreferred =
        preferredTop >= viewportPadding &&
        preferredTop + panelRect.height <= window.innerHeight - viewportPadding
      const rawTop = canUsePreferred ? preferredTop : alternateTop
      const maxTop = window.innerHeight - panelRect.height - viewportPadding
      const top = Math.max(
        viewportPadding,
        Math.min(rawTop, Math.max(viewportPadding, maxTop))
      )

      setPanelStyle({ left, top })
    }

    updatePanelPosition()
    window.addEventListener("resize", updatePanelPosition)
    window.addEventListener("scroll", updatePanelPosition, true)
    return () => {
      window.removeEventListener("resize", updatePanelPosition)
      window.removeEventListener("scroll", updatePanelPosition, true)
    }
  }, [open, placement])

  const handleSingleAdd = () => {
    onAdd(1, "row")
  }

  const handleBulkAdd = () => {
    onAdd(normalizedQuantity, unit)
    setQuantity(String(normalizedQuantity))
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("rounded-r-none", className)}
        onClick={handleSingleAdd}
      >
        <Plus className="h-4 w-4 mr-1" />
        {t("entryDetail.addField")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("rounded-l-none px-2", className)}
        aria-label={t("entryDetail.bulkAddOptions")}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </Button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className={cn(
            "fixed z-[1000] w-64 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          )}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                {t("entryDetail.bulkAddQuantity")}
              </label>
              <Input
                type="number"
                min={1}
                max={MAX_QUANTITY}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                onBlur={() => setQuantity(String(normalizedQuantity))}
                className="h-8 w-20"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                {t("entryDetail.bulkAddUnit")}
              </label>
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value as FieldBatchUnit)}
                className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="row">{t("entryDetail.bulkAddRows")}</option>
                <option value="group">{t("entryDetail.bulkAddGroups")}</option>
              </select>
            </div>

            <div className="rounded-md bg-accent/60 px-3 py-2 text-xs text-muted-foreground">
              <div>{t("entryDetail.bulkAddPreview", { count: rowsToAdd })}</div>
              {unit === "group" && (
                <div className="mt-1">{t("entryDetail.bulkAddGroupHint")}</div>
              )}
            </div>

            <Button type="button" size="sm" className="w-full" onClick={handleBulkAdd}>
              {t("entryDetail.bulkAddConfirm")}
            </Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
