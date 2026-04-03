import { useState } from 'react';

const ICONS = [
  'folder', 'folder_open', 'key', 'lock', 'mail', 'code', 'group', 'person',
  'shield', 'vpn_key', 'credit_card', 'account_balance', 'shopping_cart', 'phone',
  'laptop', 'cloud', 'wifi', 'bluetooth', 'storage', 'database', 'settings',
  'security', 'password', 'visibility', 'link', 'language', 'globe', 'star',
  'favorite', 'bookmark', 'search', 'add', 'edit', 'delete', 'content_copy',
  'check', 'close', 'arrow_back', 'navigate_next',
];

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string | null) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search
    ? ICONS.filter((i) => i.toLowerCase().includes(search.toLowerCase()))
    : ICONS;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 border border-[var(--md-outline-variant)] rounded-lg hover:bg-[var(--md-surface-container)] transition-colors"
      >
        {value ? (
          <>
            <span className="material-symbols-outlined text-xl">{value}</span>
            <span className="text-sm">{value}</span>
          </>
        ) : (
          <span className="text-sm text-[var(--md-on-surface-variant)]">Choose icon</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl p-4 w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Choose Icon</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-[var(--md-surface-container)]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--md-outline-variant)] rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
            />

            {value && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-xs text-[var(--md-on-surface-variant)]">Selected:</span>
                <span className="material-symbols-outlined text-xl text-[var(--md-primary)]">{value}</span>
                <span className="text-sm">{value}</span>
                <button
                  type="button"
                  onClick={() => { onChange(null); setOpen(false); }}
                  className="ml-auto text-xs text-[var(--md-error)] hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="grid grid-cols-8 gap-1 overflow-y-auto flex-1">
              {filtered.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  title={icon}
                  onClick={() => { onChange(icon); setOpen(false); }}
                  className={`p-2 rounded-lg flex items-center justify-center hover:bg-[var(--md-primary-container)] transition-colors ${
                    value === icon ? 'bg-[var(--md-primary-container)] ring-2 ring-[var(--md-primary)]' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
