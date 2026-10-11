import type { Appointment, AppointmentStatus, DateKey, ID, Patient } from '@/types';
import { WEEKDAYS_LONG, addMinutes, formatDate, formatTime, parseLocalDateTime } from '@/lib/dates';
import { APPOINTMENT_STATUS_LABEL, MODALITY_LABEL } from '@/lib/labels';

export type AgendaModal =
  | { kind: 'new'; preset?: { date: DateKey; time: string } }
  | { kind: 'details'; id: ID }
  | { kind: 'reschedule'; id: ID }
  | { kind: 'cancel'; id: ID }
  | { kind: 'complete'; id: ID }
  | null;

export type AppointmentAction = 'reschedule' | 'cancel' | 'complete';

export const APPOINTMENT_BLOCK_STYLE: Record<AppointmentStatus, string> = {
  agendado: 'border-brand-500 bg-brand-50 text-brand-900 hover:bg-brand-100',
  realizado: 'border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
  falta: 'border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100',
  cancelado: 'border-slate-400 bg-slate-100 text-slate-500 line-through hover:bg-slate-200',
};

export function getEnd(a: Appointment): Date {
  return addMinutes(parseLocalDateTime(a.start), a.durationMin);
}

export function formatRange(a: Appointment): string {
  return `${formatTime(a.start)}–${formatTime(getEnd(a))}`;
}

/** Rótulo completo para leitores de tela. */
export function describeAppointment(a: Appointment, patient: Patient | undefined): string {
  const start = parseLocalDateTime(a.start);
  return [
    patient?.name ?? 'Paciente não encontrado',
    `${WEEKDAYS_LONG[start.getDay()]}, ${formatDate(start)}`,
    `das ${formatTime(start)} às ${formatTime(getEnd(a))}`,
    MODALITY_LABEL[a.modality],
    APPOINTMENT_STATUS_LABEL[a.status],
  ].join(', ');
}
