import { useState } from "react";
import type { Entry } from "../../types";
import type { Field } from "../../types";
import { useVaultStore } from "../../stores/vaultStore";
import { IconButton } from "../common/IconButton";
import { Button } from "../common/Button";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { EntryFormFields } from "../entry/EntryFormFields";
import { useToast } from "../common/Toast";
import { useTranslation } from "../../i18n";

interface EntryDetailProps {
  entry: Entry | null;
  onCopyField: (fieldName: string, value: string) => void;
  isSubscription?: boolean;
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
  } = useVaultStore();

  const { showToast } = useToast();
  const { t } = useTranslation();
  const isSubscription = isSubscriptionProp ?? (entry ? isSubscriptionEntry(entry.id) : false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isEditing = editingState.mode === "editing";
  const isCreating = editingState.mode === "creating";
  const isActive = isEditing || isCreating;

  const formData = isActive ? editingState.currentData : null;

  // Save handler for edit mode
  const handleSaveEdit = async () => {
    if (!formData || editingState.mode !== "editing") return;
    setIsSubmitting(true);
    try {
      if (!formData.title.trim()) {
        showToast("error", t("entryDetail.titleRequired"));
        return;
      }
      const entryFields: Field[] = formData.fields
        .filter((f) => f.name.trim() && f.value.trim())
        .map((f) => ({
          name: f.name.trim(),
          value: f.value,
          fieldType: f.fieldType,
          protected: f.fieldType === "password",
        }));
      await updateEntry(editingState.entryId, {
        title: formData.title.trim(),
        groupId: formData.groupId || undefined,
        fields: entryFields,
        tags: [],
        favorite: formData.favorite,
      });
      showToast("success", t("entryDetail.entryUpdated"));
      cancelEditing();
    } catch (error) {
      showToast("error", String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save handler for create mode
  const handleSaveCreate = async () => {
    if (!formData || editingState.mode !== "creating") return;
    setIsSubmitting(true);
    try {
      if (!formData.title.trim()) {
        showToast("error", t("entryDetail.titleRequired"));
        return;
      }
      const entryFields: Field[] = formData.fields
        .filter((f) => f.name.trim() && f.value.trim())
        .map((f) => ({
          name: f.name.trim(),
          value: f.value,
          fieldType: f.fieldType,
          protected: f.fieldType === "password",
        }));
      const newEntry = await createEntry({
        title: formData.title.trim(),
        entryType: formData.entryType,
        groupId: formData.groupId || undefined,
        fields: entryFields,
        tags: [],
        favorite: formData.favorite,
      });
      // Select the newly created entry
      useVaultStore.getState().selectEntry(newEntry.id);
      cancelEditing();
      showToast("success", t("entryDetail.entryCreated"));
    } catch (error) {
      showToast("error", String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = isCreating ? handleSaveCreate : handleSaveEdit;
  const handleCancel = () => {
    cancelEditing();
  };

  const handleConfirmDiscard = () => {
    setConfirmOpen(false);
    const action = pendingAction;
    setPendingAction(null);
    cancelEditing();
    action?.();
  };

  const handleConfirmSave = async () => {
    setConfirmOpen(false);
    await handleSave();
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  };

  const handleConfirmCancel = () => {
    setConfirmOpen(false);
    setPendingAction(null);
  };

  const formatFieldName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ");
  };

  const maskPassword = (value: string) => {
    return "\u2022".repeat(value.length);
  };

  // Creating mode - show form even without an entry
  if (isCreating && formData) {
    return (
      <div className="flex-1 bg-surface flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-primary">add</span>
            </div>
            <h2 className="font-headline font-bold text-lg text-on-surface">
              {t("entryDetail.newEntry")}
            </h2>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <EntryFormFields
            data={formData}
            onChange={updateFormData}
            showEntryType={true}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 bg-surface-container-low border-t border-outline-variant/10 flex justify-end gap-3">
          <Button variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            {t("entryDetail.cancel")}
          </Button>
          <Button onClick={handleSave} loading={isSubmitting} disabled={!formData.title.trim()}>
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
    );
  }

  // No entry selected (viewing mode)
  if (!entry) {
    return (
      <div className="flex-1 bg-surface flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
            select
          </span>
          <p className="text-sm text-on-surface-variant">
            {t("entryDetail.selectEntry")}
          </p>
        </div>
      </div>
    );
  }

  // Editing mode with entry
  if (isEditing && formData) {
    return (
      <div className="flex-1 bg-surface flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-primary">edit</span>
            </div>
            <h2 className="font-headline font-bold text-lg text-on-surface">
              {t("entryDetail.editEntry")}
            </h2>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <EntryFormFields
            data={formData}
            onChange={updateFormData}
            showEntryType={false}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 bg-surface-container-low border-t border-outline-variant/10 flex justify-end gap-3">
          <Button variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            {t("entryDetail.cancel")}
          </Button>
          <Button onClick={handleSave} loading={isSubmitting} disabled={!formData.title.trim()}>
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
    );
  }

  // Viewing mode
  return (
    <div className="flex-1 bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-primary">
              key
            </span>
          </div>
          <div>
            <h2 className="font-headline font-bold text-lg text-on-surface">
              {entry.title}
            </h2>
            {entry.groupId && (
              <p className="text-xs text-on-surface-variant">
                {t("entryDetail.inGroup")}
              </p>
            )}
          </div>
        </div>
        {!isSubscription && (
          <IconButton
            icon="edit"
            tooltip={t("entryDetail.editEntry")}
            onClick={() => startEditing(entry)}
          />
        )}
        {isSubscription && (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-medium">
            <span className="material-symbols-outlined text-sm">lock</span>
            {t("subscription.readOnly")}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Fields */}
        <div className="space-y-4">
          {entry.fields.map((field, index) => (
            <div key={index} className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                {formatFieldName(field.name)}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-surface-container-highest rounded-lg px-4 py-3">
                  <p className="text-sm text-on-surface break-all">
                    {field.fieldType === "password"
                      ? maskPassword(field.value)
                      : field.value || "-"}
                  </p>
                </div>
                {field.value && (
                  <>
                    <IconButton
                      icon="content_copy"
                      size="sm"
                      tooltip={`${t("entryDetail.copy") || "Copy"} ${formatFieldName(field.name)}`}
                      onClick={() => onCopyField(field.name, field.value)}
                    />
                    {field.fieldType === "password" && (
                      <IconButton
                        icon="visibility"
                        size="sm"
                        tooltip={t("entryDetail.showPassword")}
                        onClick={() => {
                          // Toggle visibility would need state
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Metadata */}
        <div className="mt-8 pt-4 border-t border-outline-variant/20">
          <div className="grid grid-cols-2 gap-4 text-xs text-on-surface-variant">
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
    </div>
  );
}
