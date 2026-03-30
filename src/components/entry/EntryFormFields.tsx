import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { IconButton } from "../common/IconButton";
import { PasswordStrengthIndicator } from "../common/PasswordStrengthIndicator";
import { useVaultStore, type EntryFormData, type FieldInput } from "../../stores/vaultStore";
import type { FieldType, EntryType } from "../../types";

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

interface EntryFormFieldsProps {
  data: EntryFormData;
  onChange: (data: Partial<EntryFormData>) => void;
  showEntryType: boolean;
  isSubmitting: boolean;
}

export function EntryFormFields({ data, onChange, showEntryType, isSubmitting }: EntryFormFieldsProps) {
  const groups = useVaultStore((s) => s.groups);

  const updateField = (index: number, key: keyof FieldInput, value: string) => {
    const newFields = data.fields.map((f, i) =>
      i === index ? { ...f, [key]: value } : f
    );
    onChange({ fields: newFields });
  };

  const addField = () => {
    onChange({ fields: [...data.fields, { id: crypto.randomUUID(), name: "", value: "", fieldType: "text" as FieldType }] });
  };

  const removeField = (index: number) => {
    onChange({ fields: data.fields.filter((_, i) => i !== index) });
  };

  const generatePassword = (index: number) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateField(index, "value", password);
  };

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <Input
          label="Title"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g., Gmail Account"
          required
          disabled={isSubmitting}
        />

        {showEntryType && (
          <Select
            label="Entry Type"
            value={data.entryType}
            onChange={(e) => onChange({ entryType: e.target.value as EntryType })}
            options={entryTypeOptions}
          />
        )}

        <Select
          label="Group"
          value={data.groupId}
          onChange={(e) => onChange({ groupId: e.target.value })}
          options={groupOptions}
          placeholder="No group (root)"
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.favorite}
            onChange={(e) => onChange({ favorite: e.target.checked })}
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

        {data.fields.map((field, index) => (
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
                  onChange={(e) => updateField(index, "fieldType", e.target.value as FieldType)}
                  options={fieldTypeOptions}
                />
              </div>
              <div className="col-span-7 relative">
                <Input
                  type={field.fieldType === "password" ? "password" : "text"}
                  value={field.value}
                  onChange={(e) => updateField(index, "value", e.target.value)}
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

        {data.fields.some((f) => f.fieldType === "password" && f.value) && (
          <PasswordStrengthIndicator
            password={data.fields.find((f) => f.fieldType === "password")?.value || ""}
          />
        )}
      </div>
    </div>
  );
}
