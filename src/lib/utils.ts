import type { Appointment, DateKey, Patient, Receivable, ReceivableDisplayStatus } from '@/types';
import { WEEKDAYS_LONG } from './dates';
import { FREQUENCY_LABEL } from './labels';

/** Concatena classes condicionalmente. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Substitui o item com mesmo id ou o adiciona ao final. */
export function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((i) => i.id === item.id)
    ? list.map((i) => (i.id === item.id ? item : i))
    : [...list, item];
}

export function indexById<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((item) => [item.id, item]));
}

export function sumBy<T>(list: T[], pick: (item: T) => number): number {
  return list.reduce((total, item) => total + pick(item), 0);
}

export const byStart = (a: Appointment, b: Appointment) => a.start.localeCompare(b.start);
export const byName = (a: Patient, b: Patient) => a.name.localeCompare(b.name, 'pt-BR');

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export function getReceivableDisplayStatus(r: Receivable, todayKey: DateKey): ReceivableDisplayStatus {
  if (r.status === 'pendente' && r.dueDate < todayKey) return 'atrasado';
  return r.status;
}

export function describeRecurrence(
  p: Pick<Patient, 'frequency' | 'recurringWeekday' | 'recurringTime'>,
  withFrequency = false,
): string {
  if (p.frequency === 'avulsa' || p.recurringWeekday === null || !p.recurringTime) {
    return 'Sem horário fixo';
  }
  const base = `${WEEKDAYS_LONG[p.recurringWeekday]} às ${p.recurringTime}`;
  return withFrequency ? `${base} (${FREQUENCY_LABEL[p.frequency].toLowerCase()})` : base;
}

/** Move o foco para o primeiro campo inválido do formulário (após renderização). */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
