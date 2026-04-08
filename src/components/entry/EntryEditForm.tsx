import { useState, useEffect } from "react"
import { Plus, Trash2, KeyRound } from "lucide-react"
import { Modal } from "../common/Modal"
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
import { useVaultStore } from "../../stores/vaultStore"
import { useToast } from "../common/Toast"
import type { Entry, Field, FieldType, EntryType } from "../../types"

interface EntryEditFormProps {
  isOpen: boolean
  onClose: () => void
  entry?: Entry | null
  defaultGroupId?: string
}

interface FieldInput {
  id: string
  name: string
  value: string
  fieldType: FieldType
  isNew?: boolean
}

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

const defaultFields: FieldInput[] = [
  { id: crypto.randomUUID(), name: "Username", value: "", fieldType: "username" },
  { id: crypto.randomUUID(), name: "Password", value: "", fieldType: "password" },
  { id: crypto.randomUUID(), name: "Website", value: "", fieldType: "url" },
]

export function EntryEditForm({
  isOpen,
  onClose,
  entry,
  defaultGroupId,
}: EntryEditFormProps) {
  const { createEntry, updateEntry, groups } = useVaultStore()
  const { showToast } = useToast()

  const [title, setTitle] = useState("")
  const [entryType, setEntryType] = useState<EntryType>("websiteLogin")
  const [groupId, setGroupId] = useState<string>("")
  const [fields, setFields] = useState<FieldInput[]>(defaultFields)
  const [favorite, setFavorite] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditMode = !!entry

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setEntryType(entry.entryType || "websiteLogin")
      setGroupId(entry.groupId || "")
      setFavorite(entry.favorite || false)
      setFields(
        entry.fields.map((f) => ({
          id: crypto.randomUUID(),
          name: f.name,
          value: f.value,
          fieldType: f.fieldType || "text",
        }))
      )
    } else {
      setTitle("")
      setEntryType("websiteLogin")
      setGroupId(defaultGroupId || "")
      setFavorite(false)
      setFields(defaultFields)
    }
  }, [entry, defaultGroupId, isOpen])

  const addField = () => {
    setFields([
      ...fields,
      { id: crypto.randomUUID(), name: "", value: "", fieldType: "text", isNew: true },
    ])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, key: keyof FieldInput, value: string) => {
    setFields(
      fields.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    )
  }

  const generatePassword = (index: number) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
    let password = ""
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    updateField(index, "value", password)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!title.trim()) {
        showToast("error", "Title is required")
        setIsSubmitting(false)
        return
      }

      const entryFields: Field[] = fields
        .filter((f) => f.name.trim() && f.value.trim())
        .map((f) => ({
          name: f.name.trim(),
          value: f.value,
          fieldType: f.fieldType,
          protected: f.fieldType === "password",
        }))

      if (isEditMode && entry) {
        await updateEntry(entry.id, {
          title: title.trim(),
          groupId: groupId || undefined,
          fields: entryFields,
          tags: [],
          favorite,
        })
        showToast("success", "Entry updated successfully")
      } else {
        await createEntry({
          title: title.trim(),
          entryType,
          groupId: groupId || undefined,
          fields: entryFields,
          tags: [],
          favorite,
        })
        showToast("success", "Entry created successfully")
      }

      onClose()
    } catch (error) {
      showToast("error", String(error))
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isEditMode ? "Save Changes" : "Create Entry"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Gmail Account"
              required
            />
          </div>

          {!isEditMode && (
            <div className="space-y-2">
              <Label>Entry Type</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType(v as EntryType)}>
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
            <Select value={groupId || "__none__"} onValueChange={(v) => setGroupId(v === "__none__" ? "" : v)}>
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
              id="edit-favorite"
              checked={favorite}
              onCheckedChange={(checked) => setFavorite(checked === true)}
            />
            <Label htmlFor="edit-favorite" className="cursor-pointer text-sm font-normal">
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
            <Button type="button" variant="ghost" size="sm" onClick={addField}>
              <Plus className="h-4 w-4 mr-1" />
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
                    onValueChange={(v) => updateField(index, "fieldType", v as FieldType)}
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

          {fields.some((f) => f.fieldType === "password" && f.value) && (
            <PasswordStrengthIndicator
              password={fields.find((f) => f.fieldType === "password")?.value || ""}
            />
          )}
        </div>
      </form>
    </Modal>
  )
}
