import { Modal } from "./Modal";
import { Button } from "./Button";

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
  saveLabel = "Save",
  discardLabel = "Don't Save",
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onDiscard}>
            {discardLabel}
          </Button>
          <Button onClick={onSave}>
            {saveLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-on-surface">{message}</p>
    </Modal>
  );
}
