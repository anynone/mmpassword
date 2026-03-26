import type { Entry } from "../../types";
import { IconButton } from "../common/IconButton";

interface EntryDetailProps {
  entry: Entry | null;
  onEdit: (entry: Entry) => void;
  onCopyField: (fieldName: string, value: string) => void;
}

export function EntryDetail({ entry, onEdit, onCopyField }: EntryDetailProps) {
  if (!entry) {
    return (
      <div className="flex-1 bg-surface flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
            select
          </span>
          <p className="text-sm text-on-surface-variant">
            Select an entry to view details
          </p>
        </div>
      </div>
    );
  }

  const formatFieldName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ");
  };

  const maskPassword = (value: string) => {
    return "•".repeat(value.length);
  };

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
                In group
              </p>
            )}
          </div>
        </div>
        <IconButton
          icon="edit"
          tooltip="Edit Entry"
          onClick={() => onEdit(entry)}
        />
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
                      tooltip={`Copy ${formatFieldName(field.name)}`}
                      onClick={() => onCopyField(field.name, field.value)}
                    />
                    {field.fieldType === "password" && (
                      <IconButton
                        icon="visibility"
                        size="sm"
                        tooltip="Show Password"
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
              <span className="block font-semibold mb-1">Created</span>
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="block font-semibold mb-1">Last Modified</span>
              <span>{new Date(entry.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
