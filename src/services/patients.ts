import type {
  Appointment,
  ID,
  Patient,
  PatientInput,
  PatientSaveResult,
  RecurrenceOptions,
} from '@/types';
import type { MockDataset } from '@/data/mockData';
import { toDateKey } from '@/lib/dates';
import { normalizeText } from '@/lib/format';
import { planRecurrence } from '@/lib/schedule';
import { createId } from '@/lib/utils';
import { ApiError, mockRequest } from './client';
import { getDb } from './mockDb';

/**
 * Sincroniza a agenda com o horário recorrente do paciente (regra em `planRecurrence`):
 * remove os recorrentes futuros ainda "agendados" e cria os novos até o horizonte escolhido.
 */
function syncRecurringAppointments(
  db: MockDataset,
  patient: Patient,
  options: RecurrenceOptions | null,
): Omit<PatientSaveResult, 'patient'> {
  const now = new Date();
  const rule =
    options && patient.status === 'ativo' && patient.frequency !== 'avulsa' && patient.recurringWeekday !== null && patient.recurringTime
      ? { weekday: patient.recurringWeekday, time: patient.recurringTime, frequency: patient.frequency }
      : null;

  const plan = planRecurrence({
    appointments: db.appointments,
    patientId: patient.id,
    rule,
    from: options?.from ?? toDateKey(now),
    weeks: options?.weeks ?? 0,
    durationMin: db.settings.defaultDurationMin,
    now,
  });

  const removedIds = plan.toRemove.map((a) => a.id);
  db.appointments = db.appointments.filter((a) => !removedIds.includes(a.id));

  const created: Appointment[] = plan.toCreate.map((start) => ({
    id: createId('atd'),
    patientId: patient.id,
    start,
    durationMin: db.settings.defaultDurationMin,
    modality: options?.modality ?? 'presencial',
    status: 'agendado',
    recurring: true,
  }));
  db.appointments.push(...created);

  return { created, removedIds, skipped: plan.conflicts };
}

// Futuro: GET/POST/PUT `${API_URL}/patients` (a sincronização da agenda deve ocorrer no backend).
export const patientsService = {
  list(): Promise<Patient[]> {
    return mockRequest(() => getDb().patients);
  },

  create(input: PatientInput, recurrence: RecurrenceOptions | null): Promise<PatientSaveResult> {
    return mockRequest(() => {
      const db = getDb();
      const name = normalizeText(input.name);
      if (db.patients.some((p) => normalizeText(p.name) === name)) {
        throw new ApiError('Já existe um paciente cadastrado com este nome.', 'CONFLICT');
      }
      const patient: Patient = { ...input, id: createId('pac'), createdAt: toDateKey(new Date()) };
      db.patients.push(patient);
      return { patient, ...syncRecurringAppointments(db, patient, recurrence) };
    });
  },

  update(id: ID, input: PatientInput, recurrence: RecurrenceOptions | null): Promise<PatientSaveResult> {
    return mockRequest(() => {
      const db = getDb();
      const index = db.patients.findIndex((p) => p.id === id);
      if (index < 0) throw new ApiError('Paciente não encontrado.', 'NOT_FOUND');
      const name = normalizeText(input.name);
      if (db.patients.some((p) => p.id !== id && normalizeText(p.name) === name)) {
        throw new ApiError('Já existe outro paciente cadastrado com este nome.', 'CONFLICT');
      }
      const patient: Patient = { ...db.patients[index], ...input };
      db.patients[index] = patient;
      return { patient, ...syncRecurringAppointments(db, patient, recurrence) };
    });
  },
};
