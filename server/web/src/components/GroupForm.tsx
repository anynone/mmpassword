import { useState } from 'react';
import type { Group, CreateGroupRequest, UpdateGroupRequest } from '../types';
import { IconPicker } from './IconPicker';

interface GroupFormProps {
  group?: Group;
  onSave: (data: CreateGroupRequest | UpdateGroupRequest) => void;
  onCancel: () => void;
}

export function GroupForm({ group, onSave, onCancel }: GroupFormProps) {
  const [name, setName] = useState(group?.name ?? '');
  const [icon, setIcon] = useState<string | null>(group?.icon ?? null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: CreateGroupRequest | UpdateGroupRequest = {
      name: name.trim(),
      icon: icon ?? undefined,
    };

    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--md-outline-variant)]">
          <h3 className="text-lg font-semibold">{group ? 'Edit Group' : 'New Group'}</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--md-surface-container)]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[var(--md-outline-variant)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              placeholder="Group name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Icon</label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {group ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
