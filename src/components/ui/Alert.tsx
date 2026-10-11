import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

const styles: Record<AlertTone, { box: string; Icon: typeof Info }> = {
  info: { box: 'bg-sky-50 text-sky-900 ring-sky-200', Icon: Info },
  success: { box: 'bg-emerald-50 text-emerald-900 ring-emerald-200', Icon: CheckCircle2 },
  warning: { box: 'bg-amber-50 text-amber-900 ring-amber-200', Icon: ShieldAlert },
  error: { box: 'bg-red-50 text-red-800 ring-red-200', Icon: AlertCircle },
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Mensagem em linha. Erros usam role="alert" para serem anunciados imediatamente. */
export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { box, Icon } = styles[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'note'}
      className={cn('flex gap-3 rounded-lg p-3 text-sm ring-1 ring-inset', box, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
