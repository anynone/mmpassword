import { useState } from 'react';
import type { Entry, Group, CreateEntryRequest, UpdateEntryRequest, Field } from '../types';
import { FieldEditor } from './FieldEditor';
import { IconPicker } from './IconPicker';

interface EntryFormProps {
  entry?: Entry;
  groups: Group[];
  onSave: (data: CreateEntryRequest | UpdateEntryRequest) => void;
  onCancel: () => void;
}

export function EntryForm({ entry, groups, onSave, onCancel }: EntryFormProps) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [groupId, setGroupId] = useState<string | null>(entry?.groupId ?? null);
  const [fields, setFields] = useState<Field[]>(entry?.fields ?? []);
  const [tagsText, setTagsText] = useState(entry?.tags?.join(', ') ?? '');
  const [favorite, setFavorite] = useState(entry?.favorite ?? false);
  const [icon, setIcon] = useState<string | null>(entry?.icon ?? null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const data = {
      title: title.trim(),
      groupId,
      fields: fields.length > 0 ? fields : undefined,
      tags: tags.length > 0 ? tags : undefined,
      favorite,
      icon,
    };

    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--md-outline-variant)]">
          <h3 className="text-lg font-semibold">{entry ? 'Edit Entry' : 'New Entry'}</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--md-surface-container)]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[var(--md-outline-variant)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
                placeholder="Entry title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Group</label>
              <select
                value={groupId ?? ''}
                onChange={(e) => setGroupId(e.target.value || null)}
                className="w-full px-3 py-2 border border-[var(--md-outline-variant)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fields</label>
              <FieldEditor fields={fields} onChange={setFields} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--md-outline-variant)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
                placeholder="Comma-separated tags"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={(e) => setFavorite(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--md-primary)]"
                />
                <span className="text-sm">Favorite</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Icon</label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--md-surface-container)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-90 transition-colors"
            >
              {entry ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
