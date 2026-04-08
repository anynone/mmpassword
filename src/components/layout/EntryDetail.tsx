import { useState } from "react"
import { Plus, Pencil, Key, Lock, MousePointerClick } from "lucide-react"
import type { Entry } from "../../types"
import type { FieldType } from "../../types"
import { useVaultStore, type FieldInput } from "../../stores/vaultStore"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { InlineField } from "../entry/InlineField"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"

interface EntryDetailProps {
  entry: Entry | null
  onCopyField: (fieldName: string, value: string) => void
  isSubscription?: boolean
}

export function EntryDetail({ entry, onCopyField, isSubscription: isSubscriptionProp }: EntryDetailProps) {
  const {
    editingState,
    startEditing,
    cancelEditing,
    updateFormData,
    createEntry,
    updateEntry,
    isSubscriptionEntry,
  } = useVaultStore()

  const { showToast } = useToast()
  const { t } = useTranslation()
  const isSubscription = isSubscriptionProp ?? (entry ? isSubscriptionEntry(entry.id) : false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const isEditing = editingState.mode === "editing"
  const isCreating = editingState.mode === "creating"
  const isActive = isEditing || isCreating
  const formData = isActive ? editingState.currentData : null

  // Build field list from either formData (edit/create) or entry (view)
  const displayFields: FieldInput[] = isActive && formData
    ? formData.fields
    : entry
      ? entry.fields.map((f, i) => ({
          id: `view-${i}`,
          name: f.name,
          value: f.value,
          fieldType: f.fieldType || ("text" as FieldType),
        }))
      : []

  const handleSaveEdit = async () => {
    if (!formData || editingState.mode !== "editing") return
    setIsSubmitting(true)
    try {
      if (!formData.title.trim()) {
        showToast("error", t("entryDetail.titleRequired"))
        return
      }
      const entryFields = formData.fields
        .filter((f) => f.name.trim() && f.value.trim())
        .map((f) => ({
          name: f.name.trim(),
          value: f.value,
          fieldType: f.fieldType,
          protected: f.fieldType === "password",
        }))
      await updateEntry(editingState.entryId, {
        title: formData.title.trim(),
        groupId: formData.groupId || undefined,
        fields: entryFields,
        tags: [],
        favorite: formData.favorite,
      })
      showToast("success", t("entryDetail.entryUpdated"))
      cancelEditing()
    } catch (error) {
      showToast("error", String(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveCreate = async () => {
    if (!formData || editingState.mode !== "creating") return
    setIsSubmitting(true)
    try {
      if (!formData.title.trim()) {
        showToast("error", t("entryDetail.titleRequired"))
        return
      }
      const entryFields = formData.fields
        .filter((f) => f.name.trim() && f.value.trim())
        .map((f) => ({
          name: f.name.trim(),
          value: f.value,
          fieldType: f.fieldType,
          protected: f.fieldType === "password",
        }))
      const newEntry = await createEntry({
        title: formData.title.trim(),
        entryType: formData.entryType,
        groupId: formData.groupId || undefined,
        fields: entryFields,
        tags: [],
        favorite: formData.favorite,
      })
      useVaultStore.getState().selectEntry(newEntry.id)
      cancelEditing()
      showToast("success", t("entryDetail.entryCreated"))
    } catch (error) {
      showToast("error", String(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = isCreating ? handleSaveCreate : handleSaveEdit
  const handleCancel = () => cancelEditing()

  const handleConfirmDiscard = () => {
    setConfirmOpen(false)
    const action = pendingAction
    setPendingAction(null)
    cancelEditing()
    action?.()
  }

  const handleConfirmSave = async () => {
    setConfirmOpen(false)
    await handleSave()
    const action = pendingAction
    setPendingAction(null)
    action?.()
  }

  const handleConfirmCancel = () => {
    setConfirmOpen(false)
    setPendingAction(null)
  }

  const updateField = (index: number, key: keyof FieldInput, value: string) => {
    if (!formData) return
    const newFields = formData.fields.map((f, i) =>
      i === index ? { ...f, [key]: value } : f
    )
    updateFormData({ fields: newFields })
  }

  const addField = () => {
    if (!formData) return
    updateFormData({
      fields: [...formData.fields, { id: crypto.randomUUID(), name: "", value: "", fieldType: "text" as FieldType }],
    })
  }

  const removeField = (index: number) => {
    if (!formData) return
    updateFormData({ fields: formData.fields.filter((_, i) => i !== index) })
  }

  const generatePassword = (index: number) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
    let password = ""
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    updateField(index, "value", password)
  }

  // No entry selected and not creating
  if (!entry && !isCreating) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center">
          <MousePointerClick className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {t("entryDetail.selectEntry")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            {isCreating ? (
              <Plus className="h-5 w-5 text-primary" />
            ) : (
              <Key className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-headline font-bold text-lg">{isCreating ? (formData?.title || t("entryDetail.newEntry")) : entry?.title ?? ""}</h2>
            {!isCreating && entry?.groupId && (
              <p className="text-xs text-muted-foreground">{t("entryDetail.inGroup")}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isActive ? (
            <>
              <Button variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
                {t("entryDetail.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSubmitting || (formData ? !formData.title.trim() : true)}
              >
                {isCreating ? t("entryDetail.createEntry") : t("entryDetail.saveChanges")}
              </Button>
            </>
          ) : (
            <>
              {!isSubscription && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => entry && startEditing(entry)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("entryDetail.editEntry")}
                </Button>
              )}
              {isSubscription && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/30 text-secondary-foreground text-xs font-medium">
                  <Lock className="h-3 w-3" />
                  {t("subscription.readOnly")}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Fields section */}
        <div className="space-y-4">
          {displayFields.map((field, index) => (
            <InlineField
              key={field.id}
              field={field}
              isEditing={isActive}
              onChange={(key, value) => updateField(index, key, value)}
              onRemove={() => removeField(index)}
              onCopy={onCopyField}
              onGeneratePassword={() => generatePassword(index)}
            />
          ))}

          {isActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={addField}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("entryDetail.addField")}
            </Button>
          )}
        </div>

        {/* Metadata */}
        {entry && !isCreating && (
          <>
            <Separator className="my-8" />
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="block font-semibold mb-1">{t("entryDetail.created")}</span>
                <span>{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="block font-semibold mb-1">{t("entryDetail.lastModified")}</span>
                <span>{new Date(entry.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={isCreating ? t("confirm.unsavedNewEntry") : t("confirm.unsavedChanges")}
        message={isCreating ? t("confirm.unsavedNewEntryMessage") : t("confirm.unsavedChangesMessage")}
        onDiscard={handleConfirmDiscard}
        onSave={handleConfirmSave}
        onCancel={handleConfirmCancel}
      />
    </div>
  )
}
