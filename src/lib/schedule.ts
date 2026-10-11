import type { Appointment, DateKey, ID, LocalDateTime, RecurringFrequency, Weekday } from '@/types';
import { addDays, parseDateKey, parseLocalDateTime, toDateKey, toLocalDateTime } from './dates';

/*
 * Regras de agenda compartilhadas entre a camada de serviços (que grava) e a interface
 * (que pré-visualiza), garantindo que o usuário veja exatamente o que será feito.
 */

/** Verdadeiro se o intervalo [start, start + duração) colide com algum atendimento ativo. */
export function hasConflict(list: Appointment[], start: LocalDateTime, durationMin: number, ignoreId?: ID): boolean {
  const s = parseLocalDateTime(start).getTime();
  const e = s + durationMin * 60_000;
  return list.some((a) => {
    if (a.id === ignoreId || a.status === 'cancelado' || a.status === 'falta') return false;
    const as = parseLocalDateTime(a.start).getTime();
    const ae = as + a.durationMin * 60_000;
    return s < ae && as < e;
  });
}

/* ------------------------------ Recorrência ------------------------------ */

/** Intervalo entre sessões. "Mensal" = a cada 4 semanas, mantendo o mesmo dia da semana. */
export const RECURRENCE_STEP_DAYS: Record<RecurringFrequency, number> = {
  semanal: 7,
  quinzenal: 14,
  mensal: 28,
};

export const RECURRENCE_WEEKS_OPTIONS = [4, 8, 12, 26].map((w) => ({
  value: String(w),
  label: w === 26 ? '26 semanas (≈ 6 meses)' : `${w} semanas`,
}));

export const DEFAULT_RECURRENCE_WEEKS = 12;

export interface RecurrenceRule {
  weekday: Weekday;
  /** HH:mm */
  time: string;
  frequency: RecurringFrequency;
}

/**
 * Datas/horários das sessões: primeira ocorrência do dia da semana a partir de `from`
 * até `from + weeks` semanas. Horários já passados são ignorados.
 */
export function buildRecurrenceStarts(rule: RecurrenceRule, from: DateKey, weeks: number, now: Date): LocalDateTime[] {
  const start = parseDateKey(from);
  const limit = addDays(start, weeks * 7).getTime();
  const [h, m] = rule.time.split(':').map(Number);
  const step = RECURRENCE_STEP_DAYS[rule.frequency];
  const starts: LocalDateTime[] = [];

  let day = addDays(start, (rule.weekday - start.getDay() + 7) % 7);
  while (day.getTime() < limit) {
    const slot = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
    if (slot.getTime() > now.getTime()) starts.push(toLocalDateTime(slot));
    day = addDays(day, step);
  }
  return starts;
}

export interface RecurrencePlan {
  /** Atendimentos recorrentes futuros ainda "agendados" que serão substituídos. */
  toRemove: Appointment[];
  /** Horários que serão criados na agenda. */
  toCreate: LocalDateTime[];
  /** Horários pulados por conflito com outro atendimento. */
  conflicts: LocalDateTime[];
  /** Datas mantidas porque o paciente já tem atendimento no dia (manual, reagendado ou cancelado). */
  keptExisting: LocalDateTime[];
}

interface PlanParams {
  appointments: Appointment[];
  /** Ausente ao cadastrar um paciente novo. */
  patientId?: ID;
  /** `null` = sem recorrência (ou paciente inativo): só remove os recorrentes futuros. */
  rule: RecurrenceRule | null;
  from: DateKey;
  weeks: number;
  durationMin: number;
  now: Date;
}

/**
 * Calcula a sincronização da agenda com o horário recorrente do paciente:
 * remove os recorrentes futuros (a partir de `from`) e cria os novos até o horizonte.
 */
export function planRecurrence({ appointments, patientId, rule, from, weeks, durationMin, now }: PlanParams): RecurrencePlan {
  const todayKey = toDateKey(now);
  const fromKey = from > todayKey ? from : todayKey;

  const toRemove = patientId
    ? appointments.filter(
        (a) =>
          a.patientId === patientId &&
          a.recurring &&
          a.status === 'agendado' &&
          a.start.slice(0, 10) >= fromKey &&
          parseLocalDateTime(a.start).getTime() > now.getTime(),
      )
    : [];

  const plan: RecurrencePlan = { toRemove, toCreate: [], conflicts: [], keptExisting: [] };
  if (!rule) return plan;

  const removedIds = new Set(toRemove.map((a) => a.id));
  const remaining = appointments.filter((a) => !removedIds.has(a.id));

  for (const start of buildRecurrenceStarts(rule, fromKey, weeks, now)) {
    const day = start.slice(0, 10);
    if (patientId && remaining.some((a) => a.patientId === patientId && a.start.startsWith(day))) {
      plan.keptExisting.push(start);
    } else if (hasConflict(remaining, start, durationMin)) {
      plan.conflicts.push(start);
    } else {
      plan.toCreate.push(start);
    }
  }
  return plan;
}
