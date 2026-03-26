import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { IconButton } from "../common/IconButton";
import { PasswordStrengthIndicator } from "../common/PasswordStrengthIndicator";
import { useVaultStore } from "../../stores/vaultStore";
import { useToast } from "../common/Toast";
import type { Entry, Field, FieldType, EntryType } from "../../types";

interface EntryEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: Entry | null;
  defaultGroupId?: string;
}

interface FieldInput {
  id: string;
  name: string;
  value: string;
  fieldType: FieldType;
  isNew?: boolean;
}

const fieldTypeOptions = [
  { value: "text", label: "Text" },
  { value: "password", label: "Password" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "notes", label: "Notes" },
  { value: "username", label: "Username" },
];

const entryTypeOptions = [
  { value: "websiteLogin", label: "Website Login" },
  { value: "secureNote", label: "Secure Note" },
];

const defaultFields: FieldInput[] = [
  { id: crypto.randomUUID(), name: "Username", value: "", fieldType: "username" },
  { id: crypto.randomUUID(), name: "Password", value: "", fieldType: "password" },
  { id: crypto.randomUUID(), name: "Website", value: "", fieldType: "url" },
];

export function EntryEditForm({
  isOpen,
  onClose,
  entry,
  defaultGroupId,
}: EntryEditFormProps) {
  const { createEntry, updateEntry, groups } = useVaultStore();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("websiteLogin");
  const [groupId, setGroupId] = useState<string>("");
  const [fields, setFields] = useState<FieldInput[]>(defaultFields);
  const [favorite, setFavorite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!entry;

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setEntryType(entry.entryType || "websiteLogin");
      setGroupId(entry.groupId || "");
      setFavorite(entry.favorite || false);
      setFields(
        entry.fields.map((f) => ({
          id: crypto.randomUUID(),
          name: f.name,
          value: f.value,
          fieldType: f.fieldType || "text",
        }))
      );
    } else {
      setTitle("");
      setEntryType("websiteLogin");
      setGroupId(defaultGroupId || "");
      setFavorite(false);
      setFields(defaultFields);
    }
  }, [entry, defaultGroupId, isOpen]);

  const addField = () => {
    setFields([
      ...fields,
      { id: crypto.randomUUID(), name: "", value: "", fieldType: "text", isNew: true },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (
    index: number,
    key: keyof FieldInput,
    value: string
  ) => {
    setFields(
      fields.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  };

  const generatePassword = (index: number) => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateField(index, "value", password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!title.trim()) {
        showToast("error", "Title is required");
        setIsSubmitting(false);
        return;
      }

      const entryFields: Field[] = fields
        .filter((f) => f.name.trim() && f.value.trim())
        .map((f) => ({
          name: f.name.trim(),
          value: f.value,
          fieldType: f.fieldType,
          protected: f.fieldType === "password",
        }));

      if (isEditMode && entry) {
        await updateEntry(entry.id, {
          title: title.trim(),
          groupId: groupId || undefined,
          fields: entryFields,
          tags: [],
          favorite: favorite,
        });
        showToast("success", "Entry updated successfully");
      } else {
        await createEntry({
          title: title.trim(),
          entryType: entryType,
          groupId: groupId || undefined,
          fields: entryFields,
          tags: [],
          favorite: favorite,
        });
        showToast("success", "Entry created successfully");
      }

      onClose();
    } catch (error) {
      showToast("error", String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupOptions = groups.map((g) => ({
    value: g.id,
    label: g.name,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Entry" : "New Entry"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!title.trim()}
          >
            {isEditMode ? "Save Changes" : "Create Entry"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Gmail Account"
            required
          />

          {!isEditMode && (
            <Select
              label="Entry Type"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as EntryType)}
              options={entryTypeOptions}
            />
          )}

          <Select
            label="Group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            options={groupOptions}
            placeholder="No group (root)"
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="w-4 h-4 rounded border-outline text-primary focus:ring-primary/40"
            />
            <span className="text-sm text-on-surface">Mark as favorite</span>
          </label>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
              Fields
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon="add"
              onClick={addField}
            >
              Add Field
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-12 gap-2">
                <div className="col-span-3">
                  <Input
                    value={field.name}
                    onChange={(e) => updateField(index, "name", e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div className="col-span-2">
                  <Select
                    value={field.fieldType}
                    onChange={(e) =>
                      updateField(index, "fieldType", e.target.value as FieldType)
                    }
                    options={fieldTypeOptions}
                  />
                </div>
                <div className="col-span-7 relative">
                  <Input
                    type={field.fieldType === "password" ? "password" : "text"}
                    value={field.value}
                    onChange={(e) =>
                      updateField(index, "value", e.target.value)
                    }
                    placeholder="Value"
                  />
                  {field.fieldType === "password" && (
                    <IconButton
                      icon="key"
                      size="sm"
                      tooltip="Generate Password"
                      className="absolute right-12 top-1/2 -translate-y-1/2"
                      onClick={() => generatePassword(index)}
                    />
                  )}
                </div>
              </div>
              <IconButton
                icon="delete"
                size="sm"
                tooltip="Remove Field"
                onClick={() => removeField(index)}
                className="text-error hover:bg-error-container/20"
              />
            </div>
          ))}

          {/* Password Strength */}
          {fields.some((f) => f.fieldType === "password" && f.value) && (
            <PasswordStrengthIndicator
              password={fields.find((f) => f.fieldType === "password")?.value || ""}
            />
          )}
        </div>
      </form>
    </Modal>
  );
}
