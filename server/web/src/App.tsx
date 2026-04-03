import { useState } from 'react';
import { EntriesPage } from './pages/EntriesPage';
import { GroupsPage } from './pages/GroupsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';

type Page = 'entries' | 'groups' | 'subscriptions';

interface NavItem {
  id: Page;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'entries', label: 'Entries', icon: 'key' },
  { id: 'groups', label: 'Groups', icon: 'folder' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'link' },
];

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('entries');

  const renderPage = () => {
    switch (currentPage) {
      case 'entries':
        return <EntriesPage />;
      case 'groups':
        return <GroupsPage />;
      case 'subscriptions':
        return <SubscriptionsPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[var(--md-surface-container)] border-r border-[var(--md-outline-variant)] flex flex-col">
        {/* Logo / Title */}
        <div className="p-4 border-b border-[var(--md-outline-variant)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-[var(--md-primary)]">shield</span>
            <div>
              <h1 className="text-sm font-bold leading-tight">mmpassword</h1>
              <p className="text-xs text-[var(--md-on-surface-variant)]">Server Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                currentPage === item.id
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                  : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
              }`}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--md-outline-variant)]">
          <p className="text-xs text-[var(--md-on-surface-variant)] text-center">mmpassword v0.1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 bg-[var(--md-surface)]">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
