import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useTranslation } from "../../i18n"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onDiscard: () => void
  onSave: () => void
  onCancel: () => void
  saveLabel?: string
  discardLabel?: string
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onDiscard,
  onSave,
  onCancel,
  saveLabel,
  discardLabel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t("confirm.cancel")}
          </Button>
          <Button variant="outline" onClick={onDiscard}>
            {discardLabel || t("confirm.dontSave")}
          </Button>
          <Button onClick={onSave}>
            {saveLabel || t("confirm.save")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
