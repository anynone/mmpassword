import { useState, useEffect, useCallback } from 'react';
import type { Group } from '../types';
import { groupsApi } from '../api/groups';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GroupForm } from '../components/GroupForm';

export function GroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Group | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreate = async (data: any) => {
    try {
      await groupsApi.create(data);
      setCreating(false);
      toast('Group created');
      loadGroups();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingGroup) return;
    try {
      await groupsApi.update(editingGroup.id, data);
      setEditingGroup(null);
      toast('Group updated');
      loadGroups();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await groupsApi.delete(deleting.id);
      setDeleting(null);
      toast('Group deleted');
      loadGroups();
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
        <h1 className="text-2xl font-semibold">Groups</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-90 transition-colors"
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 text-[var(--md-on-surface-variant)]">
          <span className="material-symbols-outlined text-4xl mb-2 block">folder</span>
          <p className="text-sm">No groups yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-xl border border-[var(--md-outline-variant)] p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--md-primary-container)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--md-on-primary-container)]">
                      {group.icon || 'folder'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium">{group.name}</h3>
                    <span className="text-xs text-[var(--md-on-surface-variant)]">
                      {group.entryCount} {group.entryCount === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="p-1.5 rounded-lg hover:bg-[var(--md-surface-container)] transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleting(group)}
                    className="p-1.5 rounded-lg hover:bg-[var(--md-error-container)] text-[var(--md-error)] transition-colors"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <GroupForm onSave={handleCreate} onCancel={() => setCreating(false)} />
      )}
      {editingGroup && (
        <GroupForm group={editingGroup} onSave={handleUpdate} onCancel={() => setEditingGroup(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete Group"
          message={`Are you sure you want to delete "${deleting.name}"? Entries in this group will become ungrouped.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
