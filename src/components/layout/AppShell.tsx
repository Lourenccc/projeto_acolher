'use client';

import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { ToastProvider } from '@/components/ui/Toast';
import { AppDataProvider } from '@/store/AppDataProvider';
import { DesktopSidebar, MobileSidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <AppDataProvider>
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Pular para o conteúdo
        </a>

        <DesktopSidebar />
        <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className="flex min-h-screen flex-col lg:pl-64">
          <Topbar onOpenMenu={() => setMenuOpen(true)} />
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-6 lg:px-8">
            <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              <strong className="font-semibold">Demonstração:</strong> dados fictícios, mantidos apenas na memória do
              navegador. Não insira dados reais de pacientes nem informações clínicas.
            </p>
          </div>
          <main id="conteudo" tabIndex={-1} className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </AppDataProvider>
    </ToastProvider>
  );
}
