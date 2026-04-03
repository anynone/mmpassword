import { Modal } from "./Modal";
import { Button } from "./Button";
import { useTranslation } from "../../i18n";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onDiscard: () => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  discardLabel?: string;
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
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {t("confirm.cancel")}
          </Button>
          <Button variant="outline" onClick={onDiscard}>
            {discardLabel || t("confirm.dontSave")}
          </Button>
          <Button onClick={onSave}>
            {saveLabel || t("confirm.save")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-on-surface">{message}</p>
    </Modal>
  );
}
