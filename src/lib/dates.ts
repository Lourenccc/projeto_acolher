import type { DateKey, LocalDateTime, Weekday } from '@/types';

/*
 * Utilitários de data sem dependências externas.
 * Todas as datas são tratadas no fuso local e exibidas como DD/MM/AAAA e HH:mm (24h).
 */

export const WEEKDAYS_LONG = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

/** Ordem de exibição da semana: segunda a domingo. */
export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toLocalDateTime(d: Date): LocalDateTime {
  return `${toDateKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function parseLocalDateTime(value: LocalDateTime): Date {
  const [date, time = '00:00'] = value.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}

function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return value.length <= 10 ? parseDateKey(value) : parseLocalDateTime(value);
}

/** DD/MM/AAAA */
export function formatDate(value: Date | string): string {
  const d = toDate(value);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** HH:mm (24h) */
export function formatTime(value: Date | string): string {
  const d = toDate(value);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDateTime(value: Date | string): string {
  return `${formatDate(value)} às ${formatTime(value)}`;
}

export function formatMonthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes());
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

/** Segunda-feira da semana de `d`. */
export function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  return addDays(day, -((day.getDay() + 6) % 7));
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function diffInDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);
}

export function monthRange(year: number, monthIndex: number): { start: DateKey; end: DateKey } {
  return {
    start: toDateKey(new Date(year, monthIndex, 1)),
    end: toDateKey(new Date(year, monthIndex + 1, 0)),
  };
}

/** Aplica a máscara DD/MM/AAAA durante a digitação. */
export function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte "DD/MM/AAAA" em DateKey, ou `null` se a data for inválida. */
export function parseBRDate(value: string): DateKey | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || year > 2100) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return toDateKey(d);
}

/** Lista de horários HH:mm entre `startHour` (inclusive) e `endHour` (exclusive). */
export function buildTimeOptions(startHour: number, endHour: number, stepMin = 30): string[] {
  const options: string[] = [];
  for (let m = startHour * 60; m < endHour * 60; m += stepMin) {
    options.push(`${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
  }
  return options;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
