import { useState } from "react"
import { Plus, Pencil, Key, Lock, Copy, Eye, MousePointerClick } from "lucide-react"
import type { Entry } from "../../types"
import type { Field } from "../../types"
import { useVaultStore } from "../../stores/vaultStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "../common/ConfirmDialog"
import { EntryFormFields } from "../entry/EntryFormFields"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"
import { cn } from "@/lib/utils"

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

  const handleSaveEdit = async () => {
    if (!formData || editingState.mode !== "editing") return
    setIsSubmitting(true)
    try {
      if (!formData.title.trim()) {
        showToast("error", t("entryDetail.titleRequired"))
        return
      }
      const entryFields: Field[] = formData.fields
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
      const entryFields: Field[] = formData.fields
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

  const formatFieldName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ")
  }

  const maskPassword = (value: string) => {
    return "\u2022".repeat(value.length)
  }

  // Creating mode
  if (isCreating && formData) {
    return (
      <div className="flex-1 bg-background flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-headline font-bold text-lg">
              {t("entryDetail.newEntry")}
            </h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <EntryFormFields
            data={formData}
            onChange={updateFormData}
            showEntryType={true}
            isSubmitting={isSubmitting}
          />
        </div>
        <div className="flex-shrink-0 px-6 py-4 bg-muted/30 border-t border-border/30 flex justify-end gap-3">
          <Button variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            {t("entryDetail.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !formData.title.trim()}>
            {t("entryDetail.createEntry")}
          </Button>
        </div>
        <ConfirmDialog
          isOpen={confirmOpen}
          title={t("confirm.unsavedNewEntry")}
          message={t("confirm.unsavedNewEntryMessage")}
          onDiscard={handleConfirmDiscard}
          onSave={handleConfirmSave}
          onCancel={handleConfirmCancel}
        />
      </div>
    )
  }

  // No entry selected
  if (!entry) {
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

  // Editing mode
  if (isEditing && formData) {
    return (
      <div className="flex-1 bg-background flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-headline font-bold text-lg">
              {t("entryDetail.editEntry")}
            </h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <EntryFormFields
            data={formData}
            onChange={updateFormData}
            showEntryType={false}
            isSubmitting={isSubmitting}
          />
        </div>
        <div className="flex-shrink-0 px-6 py-4 bg-muted/30 border-t border-border/30 flex justify-end gap-3">
          <Button variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            {t("entryDetail.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !formData.title.trim()}>
            {t("entryDetail.saveChanges")}
          </Button>
        </div>
        <ConfirmDialog
          isOpen={confirmOpen}
          title={t("confirm.unsavedChanges")}
          message={t("confirm.unsavedChangesMessage")}
          onDiscard={handleConfirmDiscard}
          onSave={handleConfirmSave}
          onCancel={handleConfirmCancel}
        />
      </div>
    )
  }

  // Viewing mode
  return (
    <div className="flex-1 bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-lg">{entry.title}</h2>
            {entry.groupId && (
              <p className="text-xs text-muted-foreground">{t("entryDetail.inGroup")}</p>
            )}
          </div>
        </div>
        {!isSubscription && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startEditing(entry)}
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
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <Card>
          <CardContent className="p-4 space-y-4">
            {entry.fields.map((field, index) => (
              <div key={index} className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  {formatFieldName(field.name)}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-accent rounded-lg px-4 py-3">
                    <p className={cn("text-sm break-all", field.fieldType === "password" && "font-mono tracking-wider")}>
                      {field.fieldType === "password"
                        ? maskPassword(field.value)
                        : field.value || "-"}
                    </p>
                  </div>
                  {field.value && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onCopyField(field.name, field.value)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {field.fieldType === "password" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {}}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

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
      </div>
    </div>
  )
}
