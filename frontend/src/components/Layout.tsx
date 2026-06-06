import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { List, X } from '@phosphor-icons/react';
import Sidebar from './Sidebar';

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen min-w-0 bg-surface-50 text-surface-900">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню по фону"
            className="absolute inset-0 bg-surface-950/35"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(82vw,18rem)] bg-surface-50 shadow-raised">
            <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3">
              <span className="font-display text-lg font-semibold text-surface-950">AssetControl</span>
              <button className="icon-button icon-button-sm" onClick={() => setDrawerOpen(false)} aria-label="Закрыть меню">
                <X className="h-5 w-5" weight="regular" />
              </button>
            </div>
            <Sidebar variant="drawer" onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <main id="content" className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:ml-64 xl:p-8">
        <div className="mx-auto mb-5 flex w-full max-w-[1400px] items-center gap-3 border-b border-surface-200 pb-4">
          <button
            type="button"
            className="icon-button icon-button-sm lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Открыть меню"
          >
            <List className="h-5 w-5" weight="regular" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">AssetControl workspace</p>
            <p className="truncate text-sm text-surface-700">Локальная демонстрация учёта и контроля оборудования</p>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
