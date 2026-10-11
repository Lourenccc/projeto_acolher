'use client';

import { Menu } from 'lucide-react';
import { useAppData } from '@/store/AppDataProvider';
import { useMounted, useNow } from '@/hooks/useNow';
import { WEEKDAYS_LONG, formatDate } from '@/lib/dates';
import { getInitials } from '@/lib/format';

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { settings } = useAppData();
  const now = useNow();
  const mounted = useMounted();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu de navegação"
        aria-haspopup="dialog"
        className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <p className="min-w-0 flex-1 truncate text-sm text-slate-500">
        {mounted ? (
          <>
            <span className="font-medium text-slate-700">{WEEKDAYS_LONG[now.getDay()]}</span>, {formatDate(now)}
          </>
        ) : (
          ' '
        )}
      </p>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-800">{settings.professionalName}</p>
          <p className="text-xs text-slate-500">{settings.clinicName}</p>
        </div>
        <span
          className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800"
          aria-hidden="true"
        >
          {getInitials(settings.professionalName)}
        </span>
      </div>
    </header>
  );
}
