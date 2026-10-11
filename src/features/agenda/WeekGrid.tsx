'use client';

import type { Appointment, DateKey, ID, Patient } from '@/types';
import { WEEKDAYS_SHORT, formatDate, pad2, parseLocalDateTime, toDateKey } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { APPOINTMENT_BLOCK_STYLE, describeAppointment, formatRange } from './shared';

const HOUR_PX = 64;

interface WeekGridProps {
  days: Date[];
  appointments: Appointment[];
  patientById: Map<string, Patient>;
  startHour: number;
  endHour: number;
  now: Date;
  onSelect: (id: ID) => void;
  onSlot: (date: DateKey, time: string) => void;
}

/**
 * Grade semanal por horários. Os atendimentos são botões focáveis (Tab/Enter).
 * Clicar numa faixa vazia agenda naquele horário (atalho de mouse; pelo teclado,
 * use o botão "Novo agendamento").
 */
export function WeekGrid({ days, appointments, patientById, startHour, endHour, now, onSelect, onSlot }: WeekGridProps) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const columns = `4rem repeat(${days.length}, minmax(7.5rem, 1fr))`;
  const todayKey = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes() - startHour * 60;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div style={{ minWidth: `${4 + days.length * 7.5}rem` }}>
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: columns }}>
          <div />
          {days.map((d) => {
            const isToday = toDateKey(d) === todayKey;
            return (
              <div key={d.toISOString()} className="border-l border-slate-100 px-2 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{WEEKDAYS_SHORT[d.getDay()]}</p>
                <p
                  className={cn(
                    'mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold tabular-nums',
                    isToday ? 'bg-brand-600 text-white' : 'text-slate-800',
                  )}
                >
                  {pad2(d.getDate())}
                </p>
                <span className="sr-only">
                  {formatDate(d)}
                  {isToday ? ' (hoje)' : ''}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid" style={{ gridTemplateColumns: columns }}>
          <div aria-hidden="true">
            {hours.map((h) => (
              <div key={h} className="h-16 pr-2 text-right text-xs tabular-nums text-slate-400">
                <span className="relative -top-2">{h === startHour ? '' : `${pad2(h)}:00`}</span>
              </div>
            ))}
          </div>

          {days.map((d) => {
            const key = toDateKey(d);
            const isToday = key === todayKey;
            const dayItems = appointments.filter((a) => a.start.startsWith(key));
            return (
              <div
                key={key}
                className={cn('relative border-l border-slate-100', isToday && 'bg-brand-50/30')}
                style={{ height: hours.length * HOUR_PX }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    aria-hidden="true"
                    title={`Agendar em ${formatDate(d)} às ${pad2(h)}:00`}
                    onClick={() => onSlot(key, `${pad2(h)}:00`)}
                    className="h-16 cursor-pointer border-t border-slate-100 transition-colors hover:bg-brand-50/70"
                  />
                ))}

                {isToday && nowMinutes >= 0 && nowMinutes <= hours.length * 60 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-400"
                    style={{ top: (nowMinutes / 60) * HOUR_PX }}
                  >
                    <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-400" />
                  </div>
                )}

                {dayItems.map((a) => {
                  const start = parseLocalDateTime(a.start);
                  const offset = start.getHours() * 60 + start.getMinutes() - startHour * 60;
                  if (offset < 0 || offset >= hours.length * 60) return null;
                  const height = Math.max((a.durationMin / 60) * HOUR_PX - 4, 30);
                  const patient = patientById.get(a.patientId);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a.id)}
                      aria-label={describeAppointment(a, patient)}
                      className={cn(
                        'absolute inset-x-1 z-20 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1',
                        APPOINTMENT_BLOCK_STYLE[a.status],
                      )}
                      style={{ top: (offset / 60) * HOUR_PX + 2, height }}
                    >
                      <span className="block truncate font-semibold">{patient?.name ?? 'Paciente'}</span>
                      <span className="block truncate tabular-nums opacity-80">{formatRange(a)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Quantos atendimentos ficam fora da faixa de horários exibida. */
export function countOutOfRange(appointments: Appointment[], startHour: number, endHour: number): number {
  return appointments.filter((a) => {
    const d = parseLocalDateTime(a.start);
    const minutes = d.getHours() * 60 + d.getMinutes();
    return minutes < startHour * 60 || minutes >= endHour * 60;
  }).length;
}
