import { useState } from 'react';
import type { SubscriptionWithUrl, CreateSubscriptionRequest, UpdateSubscriptionRequest } from '../types';

interface SubscriptionFormProps {
  subscription?: SubscriptionWithUrl;
  onSave: (data: CreateSubscriptionRequest | UpdateSubscriptionRequest) => void;
  onCancel: () => void;
}

export function SubscriptionForm({ subscription, onSave, onCancel }: SubscriptionFormProps) {
  const [name, setName] = useState(subscription?.name ?? '');
  const [description, setDescription] = useState(subscription?.description ?? '');
  const [expiresAt, setExpiresAt] = useState<string>(
    subscription?.expiresAt
      ? new Date(subscription.expiresAt).toISOString().slice(0, 16)
      : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: CreateSubscriptionRequest | UpdateSubscriptionRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--md-outline-variant)]">
          <h3 className="text-lg font-semibold">
            {subscription ? 'Edit Subscription' : 'New Subscription'}
          </h3>
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
              placeholder="Subscription name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-[var(--md-outline-variant)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] resize-none"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Expires At</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--md-outline-variant)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
            />
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
              {subscription ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
