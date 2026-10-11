'use client';

import type { Appointment, ID, Patient } from '@/types';
import { WEEKDAYS_LONG, formatDate, toDateKey } from '@/lib/dates';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_TONE, MODALITY_LABEL } from '@/lib/labels';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { describeAppointment, formatRange } from './shared';

interface WeekListProps {
  days: Date[];
  appointments: Appointment[];
  patientById: Map<string, Patient>;
  now: Date;
  onSelect: (id: ID) => void;
}

/** Visualização em lista por dia — ideal para celulares e leitores de tela. */
export function WeekList({ days, appointments, patientById, now, onSelect }: WeekListProps) {
  const todayKey = toDateKey(now);

  return (
    <div className="space-y-4">
      {days.map((d) => {
        const key = toDateKey(d);
        const items = appointments.filter((a) => a.start.startsWith(key));
        const headingId = `dia-${key}`;
        return (
          <section
            key={key}
            aria-labelledby={headingId}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <h3
              id={headingId}
              className={cn(
                'border-b border-slate-100 px-4 py-2.5 text-sm font-semibold',
                key === todayKey ? 'bg-brand-50 text-brand-900' : 'bg-slate-50 text-slate-700',
              )}
            >
              {WEEKDAYS_LONG[d.getDay()]}, {formatDate(d)}
              {key === todayKey && <span className="ml-2 font-normal">(hoje)</span>}
            </h3>
            {items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">Nenhum atendimento.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((a) => {
                  const patient = patientById.get(a.patientId);
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(a.id)}
                        aria-label={describeAppointment(a, patient)}
                        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                      >
                        <span className="w-24 shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                          {formatRange(a)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block truncate text-sm font-medium text-slate-800',
                              a.status === 'cancelado' && 'line-through',
                            )}
                          >
                            {patient?.name ?? 'Paciente não encontrado'}
                          </span>
                          <span className="block text-xs text-slate-500">{MODALITY_LABEL[a.modality]}</span>
                        </span>
                        <Badge tone={APPOINTMENT_STATUS_TONE[a.status]}>{APPOINTMENT_STATUS_LABEL[a.status]}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
