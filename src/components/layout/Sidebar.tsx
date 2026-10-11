'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CalendarDays, HeartHandshake, LayoutDashboard, Settings, Users, Wallet, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm" aria-hidden="true">
          <HeartHandshake className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-semibold leading-tight text-slate-900">Acolher</p>
          <p className="text-xs text-slate-500">Gestão de consultórios</p>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon className={cn('h-5 w-5', active ? 'text-brand-700' : 'text-slate-400')} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="m-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
        <p className="font-semibold">Ambiente de demonstração</p>
        <p className="mt-0.5">Todos os dados são fictícios. Não há autenticação nem armazenamento real.</p>
      </div>
    </div>
  );
}

/** Sidebar fixa em telas grandes. */
export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
      <SidebarContent />
    </aside>
  );
}

/** Menu lateral em gaveta para telas pequenas (dialog nativo: foco preso e Esc fecha). */
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Menu de navegação"
      onClose={onClose}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 h-full max-h-full w-72 max-w-[85vw] bg-white p-0 shadow-xl backdrop:bg-slate-900/40 lg:hidden"
    >
      <div className="relative h-full">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="absolute right-3 top-5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </dialog>
  );
}
