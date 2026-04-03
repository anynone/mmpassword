import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionWithUrl, Entry, Group } from '../types';
import { subscriptionsApi } from '../api/subscriptions';
import { entriesApi } from '../api/entries';
import { groupsApi } from '../api/groups';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SubscriptionForm } from '../components/SubscriptionForm';
import { EntrySelector } from '../components/EntrySelector';

export function SubscriptionsPage() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUrl[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SubscriptionWithUrl | null>(null);
  const [deleting, setDeleting] = useState<SubscriptionWithUrl | null>(null);
  const [assigning, setAssigning] = useState<SubscriptionWithUrl | null>(null);
  const [assigningIds, setAssigningIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState<SubscriptionWithUrl | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [subs, ents, grps] = await Promise.all([
        subscriptionsApi.list(),
        entriesApi.list(),
        groupsApi.list(),
      ]);
      setSubscriptions(subs);
      setEntries(ents);
      setGroups(grps);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast('URL copied to clipboard');
    } catch {
      toast('Failed to copy URL', 'error');
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await subscriptionsApi.create(data);
      setCreating(false);
      toast('Subscription created');
      loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editing) return;
    try {
      await subscriptionsApi.update(editing.token, data);
      setEditing(null);
      toast('Subscription updated');
      loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await subscriptionsApi.delete(deleting.token);
      setDeleting(null);
      toast('Subscription deleted');
      loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleOpenAssign = async (sub: SubscriptionWithUrl) => {
    try {
      const subEntries = await subscriptionsApi.getEntries(sub.token);
      setAssigningIds(subEntries.map((e: Entry) => e.id));
      setAssigning(sub);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleSaveAssign = async (ids: string[]) => {
    if (!assigning) return;
    try {
      await subscriptionsApi.setEntries(assigning.token, ids);
      setAssigning(null);
      toast('Entries updated');
      loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleRefreshConfirm = async () => {
    if (!refreshing) return;
    try {
      await subscriptionsApi.refresh(refreshing.token);
      setRefreshing(null);
      toast('Token refreshed');
      loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const formatExpiry = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    if (d < now) return `Expired ${d.toLocaleDateString()}`;
    return `Expires ${d.toLocaleDateString()}`;
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
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-90 transition-colors"
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Subscription
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-12 text-[var(--md-on-surface-variant)]">
          <span className="material-symbols-outlined text-4xl mb-2 block">link</span>
          <p className="text-sm">No subscriptions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const expiry = formatExpiry(sub.expiresAt);
            const isExpired = sub.expiresAt && new Date(sub.expiresAt) < new Date();

            return (
              <div
                key={sub.id}
                className="bg-white rounded-xl border border-[var(--md-outline-variant)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-base text-[var(--md-primary)]">link</span>
                      <h3 className="font-medium">{sub.name}</h3>
                      {sub.entryCount > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]">
                          {sub.entryCount} entries
                        </span>
                      )}
                    </div>
                    {sub.description && (
                      <p className="text-sm text-[var(--md-on-surface-variant)] mb-2">{sub.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs bg-[var(--md-surface-container)] px-2 py-1 rounded truncate max-w-md block">
                        {sub.url}
                      </code>
                      <button
                        onClick={() => copyUrl(sub.url)}
                        className="p-1 rounded hover:bg-[var(--md-surface-container)] transition-colors"
                        title="Copy URL"
                      >
                        <span className="material-symbols-outlined text-base">content_copy</span>
                      </button>
                    </div>
                    {expiry && (
                      <span className={`text-xs ${isExpired ? 'text-[var(--md-error)]' : 'text-[var(--md-on-surface-variant)]'}`}>
                        {expiry}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(sub)}
                      className="p-2 rounded-lg hover:bg-[var(--md-surface-container)] transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      onClick={() => handleOpenAssign(sub)}
                      className="p-2 rounded-lg hover:bg-[var(--md-surface-container)] transition-colors"
                      title="Assign Entries"
                    >
                      <span className="material-symbols-outlined text-base">checklist</span>
                    </button>
                    <button
                      onClick={() => setRefreshing(sub)}
                      className="p-2 rounded-lg hover:bg-[var(--md-surface-container)] transition-colors"
                      title="Refresh Token"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                    </button>
                    <button
                      onClick={() => setDeleting(sub)}
                      className="p-2 rounded-lg hover:bg-[var(--md-error-container)] text-[var(--md-error)] transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <SubscriptionForm onSave={handleCreate} onCancel={() => setCreating(false)} />
      )}
      {editing && (
        <SubscriptionForm subscription={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
      )}
      {assigning && (
        <EntrySelector
          entries={entries}
          groups={groups}
          selectedIds={assigningIds}
          onSave={handleSaveAssign}
          onCancel={() => setAssigning(null)}
        />
      )}
      {refreshing && (
        <ConfirmDialog
          title="Refresh Token"
          message="The old subscription URL will stop working. A new URL will be generated. Continue?"
          confirmLabel="Refresh"
          danger
          onConfirm={handleRefreshConfirm}
          onCancel={() => setRefreshing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete Subscription"
          message={`Are you sure you want to delete "${deleting.name}"? The subscription URL will stop working immediately.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
