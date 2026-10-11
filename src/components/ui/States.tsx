'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { CloudOff, Inbox, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/* ------------------------------ Carregamento ----------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-lg bg-slate-200/70 motion-safe:animate-pulse', className)} />;
}

export function LoadingRegion({ label = 'Carregando dados…', children }: { label?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/* --------------------------------- Vazio --------------------------------- */

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700" aria-hidden="true">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* --------------------------------- Erro ---------------------------------- */

interface ErrorStateProps {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Não foi possível carregar os dados', message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600" aria-hidden="true">
        <CloudOff className="h-6 w-6" />
      </div>
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{message}</p>}
      <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
        Se você ativou a simulação de falhas, desative-a em{' '}
        <Link href="/configuracoes" className="font-medium text-brand-700 underline underline-offset-2">
          Configurações
        </Link>
        .
      </p>
      {onRetry && (
        <Button className="mt-4" variant="secondary" icon={<RotateCw className="h-4 w-4" aria-hidden="true" />} onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
