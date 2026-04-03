import { useState } from 'react';
import type { Entry, Group } from '../types';

interface EntrySelectorProps {
  entries: Entry[];
  groups: Group[];
  selectedIds: string[];
  onSave: (ids: string[]) => void;
  onCancel: () => void;
}

export function EntrySelector({ entries, groups, selectedIds, onSave, onCancel }: EntrySelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(entries.map((e) => e.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--md-outline-variant)]">
          <div>
            <h3 className="text-lg font-semibold">Select Entries</h3>
            <p className="text-sm text-[var(--md-on-surface-variant)]">
              Selected {selected.size} of {entries.length} entries
            </p>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--md-surface-container)]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] hover:opacity-90 transition-colors"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-[var(--md-surface-container-high)] hover:opacity-90 transition-colors"
          >
            Deselect All
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {entries.length === 0 && (
            <p className="text-sm text-[var(--md-on-surface-variant)] text-center py-8">
              No entries available
            </p>
          )}
          {entries.map((entry) => (
            <label
              key={entry.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--md-surface-container)] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(entry.id)}
                onChange={() => toggle(entry.id)}
                className="w-4 h-4 rounded accent-[var(--md-primary)]"
              />
              <span className="text-sm flex-1">{entry.title}</span>
              {entry.groupId && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]">
                  {groupMap.get(entry.groupId) ?? 'Unknown'}
                </span>
              )}
            </label>
          ))}
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
            type="button"
            onClick={() => onSave(Array.from(selected))}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
