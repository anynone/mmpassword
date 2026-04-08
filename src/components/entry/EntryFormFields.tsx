import { Plus, Trash2, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PasswordStrengthIndicator } from "../common/PasswordStrengthIndicator"
import { useVaultStore, type EntryFormData, type FieldInput } from "../../stores/vaultStore"
import type { FieldType, EntryType } from "../../types"

const fieldTypeOptions = [
  { value: "text", label: "Text" },
  { value: "password", label: "Password" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "notes", label: "Notes" },
  { value: "username", label: "Username" },
]

const entryTypeOptions = [
  { value: "websiteLogin", label: "Website Login" },
  { value: "secureNote", label: "Secure Note" },
]

interface EntryFormFieldsProps {
  data: EntryFormData
  onChange: (data: Partial<EntryFormData>) => void
  showEntryType: boolean
  isSubmitting: boolean
}

export function EntryFormFields({ data, onChange, showEntryType, isSubmitting }: EntryFormFieldsProps) {
  const groups = useVaultStore((s) => s.groups)

  const updateField = (index: number, key: keyof FieldInput, value: string) => {
    const newFields = data.fields.map((f, i) =>
      i === index ? { ...f, [key]: value } : f
    )
    onChange({ fields: newFields })
  }

  const addField = () => {
    onChange({ fields: [...data.fields, { id: crypto.randomUUID(), name: "", value: "", fieldType: "text" as FieldType }] })
  }

  const removeField = (index: number) => {
    onChange({ fields: data.fields.filter((_, i) => i !== index) })
  }

  const generatePassword = (index: number) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
    let password = ""
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    updateField(index, "value", password)
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entry-title">Title</Label>
          <Input
            id="entry-title"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g., Gmail Account"
            required
            disabled={isSubmitting}
          />
        </div>

        {showEntryType && (
          <div className="space-y-2">
            <Label>Entry Type</Label>
            <Select
              value={data.entryType}
              onValueChange={(value) => onChange({ entryType: value as EntryType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entryTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Group</Label>
          <Select
            value={data.groupId || "__none__"}
            onValueChange={(value) => onChange({ groupId: value === "__none__" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="No group (root)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No group (root)</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="entry-favorite"
            checked={data.favorite}
            onCheckedChange={(checked) => onChange({ favorite: checked === true })}
          />
          <Label htmlFor="entry-favorite" className="cursor-pointer text-sm font-normal">
            Mark as favorite
          </Label>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Fields
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addField}
          >
            <Plus className="h-4 w-4 mr-1" />
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
                  onValueChange={(value) => updateField(index, "fieldType", value as FieldType)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-7 relative">
                <Input
                  type={field.fieldType === "password" ? "password" : "text"}
                  value={field.value}
                  onChange={(e) => updateField(index, "value", e.target.value)}
                  placeholder="Value"
                  className={field.fieldType === "password" ? "pr-10" : ""}
                />
                {field.fieldType === "password" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => generatePassword(index)}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-destructive hover:bg-destructive/10"
              onClick={() => removeField(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {data.fields.some((f) => f.fieldType === "password" && f.value) && (
          <PasswordStrengthIndicator
            password={data.fields.find((f) => f.fieldType === "password")?.value || ""}
          />
        )}
      </div>
    </div>
  )
}
