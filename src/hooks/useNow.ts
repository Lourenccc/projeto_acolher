'use client';

import { useEffect, useState } from 'react';

/** Data/hora atual, atualizada periodicamente (padrão: a cada minuto). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** `true` somente após a hidratação — evita divergência servidor/cliente em datas. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
