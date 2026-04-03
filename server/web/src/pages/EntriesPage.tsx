import { useState, useEffect, useCallback } from 'react';
import type { Entry, Group } from '../types';
import { entriesApi } from '../api/entries';
import { groupsApi } from '../api/groups';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EntryForm } from '../components/EntryForm';

export function EntriesPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Entry | null>(null);

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const loadData = useCallback(async () => {
    try {
      const [entriesData, groupsData] = await Promise.all([
        entriesApi.list(),
        groupsApi.list(),
      ]);
      setEntries(entriesData);
      setGroups(groupsData);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = entries.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: any) => {
    try {
      await entriesApi.create(data);
      setCreating(false);
      toast('Entry created');
      loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingEntry) return;
    try {
      await entriesApi.update(editingEntry.id, data);
      setEditingEntry(null);
      toast('Entry updated');
      loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await entriesApi.delete(deleting.id);
      setDeleting(null);
      toast('Entry deleted');
      loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-3xl text-[var(--md-primary)]">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Entries</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-90 transition-colors"
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Entry
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--md-on-surface-variant)] text-base">
            search
          </span>
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[var(--md-outline-variant)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--md-on-surface-variant)]">
          <span className="material-symbols-outlined text-4xl mb-2 block">key</span>
          <p className="text-sm">No entries found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--md-outline-variant)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--md-surface-container-low)]">
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Group</th>
                <th className="text-left px-4 py-3 font-medium">Tags</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="border-t border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-low)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {entry.icon && (
                        <span className="material-symbols-outlined text-base text-[var(--md-on-surface-variant)]">
                          {entry.icon}
                        </span>
                      )}
                      <span className="font-medium">{entry.title}</span>
                      {entry.favorite && (
                        <span className="material-symbols-outlined text-base text-amber-500">star</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--md-on-surface-variant)]">
                    {entry.groupId ? groupMap.get(entry.groupId) ?? 'Unknown' : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {entry.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-[var(--md-surface-container-high)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-1.5 rounded-lg hover:bg-[var(--md-surface-container)] transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => setDeleting(entry)}
                        className="p-1.5 rounded-lg hover:bg-[var(--md-error-container)] text-[var(--md-error)] transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <EntryForm groups={groups} onSave={handleCreate} onCancel={() => setCreating(false)} />
      )}
      {editingEntry && (
        <EntryForm entry={editingEntry} groups={groups} onSave={handleUpdate} onCancel={() => setEditingEntry(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete Entry"
          message={`Are you sure you want to delete "${deleting.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
