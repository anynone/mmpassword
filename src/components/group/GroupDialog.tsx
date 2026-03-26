import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { useVaultStore } from "../../stores/vaultStore";
import { useToast } from "../common/Toast";
import type { Group } from "../../types";

interface GroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  group?: Group | null; // If provided, edit mode; otherwise, create mode
}

const iconOptions = [
  "folder",
  "work",
  "home",
  "shopping_cart",
  "credit_card",
  "mail",
  "cloud",
  "devices",
  "gamepad",
  "school",
  "favorite",
  "star",
  "code",
  "security",
  "vpn_key",
  "account_balance",
  "phone",
  "wifi",
  "car",
  "flight",
];

export function GroupDialog({ isOpen, onClose, group }: GroupDialogProps) {
  const { createGroup, updateGroup, deleteGroup } = useVaultStore();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("folder");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!group;

  useEffect(() => {
    if (group) {
      setName(group.name);
      setIcon(group.icon || "folder");
    } else {
      setName("");
      setIcon("folder");
    }
  }, [group, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!name.trim()) {
        showToast("error", "Group name is required");
        setIsSubmitting(false);
        return;
      }

      if (isEditMode && group) {
        await updateGroup(group.id, {
          name: name.trim(),
          icon,
        });
        showToast("success", "Group updated successfully");
      } else {
        await createGroup(name.trim(), icon);
        showToast("success", "Group created successfully");
      }

      onClose();
    } catch (error) {
      showToast("error", String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Group" : "New Group"}
      size="sm"
      footer={
        <>
          {isEditMode && (
            <Button
              variant="danger"
              onClick={async () => {
                if (group && confirm("Delete this group? Entries will be moved to root.")) {
                  await deleteGroup(group.id);
                  showToast("success", "Group deleted");
                  onClose();
                }
              }}
            >
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!name.trim()}
          >
            {isEditMode ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Work Accounts"
          leftIcon="folder"
          required
        />

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
            Icon
          </label>
          <div className="grid grid-cols-5 gap-2">
            {iconOptions.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`
                  p-3 rounded-lg transition-all duration-150
                  flex items-center justify-center
                  ${
                    icon === iconName
                      ? "bg-primary-container text-on-primary-container ring-2 ring-primary"
                      : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
                  }
                `}
              >
                <span className="material-symbols-outlined">{iconName}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
