'use client';

import type { ReactNode } from 'react';
import { useAppData } from '@/store/AppDataProvider';
import { ErrorState, LoadingRegion } from '@/components/ui/States';

/** Exibe esqueleto durante o carregamento, estado de erro com nova tentativa ou o conteúdo. */
export function DataBoundary({ skeleton, children }: { skeleton: ReactNode; children: ReactNode }) {
  const { status, error, reload } = useAppData();

  if (status === 'loading') return <LoadingRegion>{skeleton}</LoadingRegion>;
  if (status === 'error') return <ErrorState message={error} onRetry={() => void reload()} />;
  return <>{children}</>;
}
