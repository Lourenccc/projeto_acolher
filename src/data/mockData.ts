import type {
  Appointment,
  AppointmentStatus,
  ClinicSettings,
  Patient,
  PatientInput,
  Receivable,
} from '@/types';
import { addDays, diffInDays, formatDate, startOfWeek, toDateKey, toLocalDateTime } from '@/lib/dates';

/*
 * DADOS FICTÍCIOS DE DEMONSTRAÇÃO.
 * Nomes, telefones e e-mails são inventados (domínio exemplo.com, reservado para testes).
 * Nenhuma informação clínica é armazenada.
 * As datas são geradas em relação à data atual para que a demonstração esteja sempre populada.
 */

export const DEFAULT_SETTINGS: ClinicSettings = {
  professionalName: 'Dra. Marina Exemplo',
  clinicName: 'Consultório Demonstração',
  profession: 'psicologia',
  workdayStartHour: 7,
  workdayEndHour: 21,
  defaultDurationMin: 50,
  workingDays: [1, 2, 3, 4, 5, 6],
};

const PATIENT_SEED: PatientInput[] = [
  { name: 'Ana Beatriz Moura', phone: '(11) 90000-0001', email: 'ana.moura@exemplo.com', sessionPrice: 18000, frequency: 'semanal', recurringWeekday: 1, recurringTime: '09:00', status: 'ativo' },
  { name: 'Bruno Carvalho Lima', phone: '(11) 90000-0002', email: 'bruno.lima@exemplo.com', sessionPrice: 15000, frequency: 'semanal', recurringWeekday: 1, recurringTime: '14:00', status: 'ativo' },
  { name: 'Carla Mendes Rocha', phone: '(21) 90000-0003', email: 'carla.rocha@exemplo.com', sessionPrice: 20000, frequency: 'quinzenal', recurringWeekday: 2, recurringTime: '10:00', status: 'ativo' },
  { name: 'Daniel Ferreira Souza', phone: '(11) 90000-0004', email: '', sessionPrice: 16000, frequency: 'semanal', recurringWeekday: 3, recurringTime: '16:00', status: 'ativo' },
  { name: 'Eduarda Pires Nogueira', phone: '(31) 90000-0005', email: 'eduarda.pires@exemplo.com', sessionPrice: 18000, frequency: 'semanal', recurringWeekday: 4, recurringTime: '08:00', status: 'ativo' },
  { name: 'Felipe Araújo Santos', phone: '(11) 90000-0006', email: 'felipe.santos@exemplo.com', sessionPrice: 22000, frequency: 'mensal', recurringWeekday: 5, recurringTime: '11:00', status: 'ativo' },
  { name: 'Gabriela Teixeira Dias', phone: '(41) 90000-0007', email: 'gabriela.dias@exemplo.com', sessionPrice: 15000, frequency: 'semanal', recurringWeekday: 2, recurringTime: '18:00', status: 'ativo' },
  { name: 'Henrique Barbosa Costa', phone: '(11) 3000-0008', email: 'henrique.costa@exemplo.com', sessionPrice: 17000, frequency: 'avulsa', recurringWeekday: null, recurringTime: null, status: 'inativo' },
];

export interface MockDataset {
  patients: Patient[];
  appointments: Appointment[];
  receivables: Receivable[];
  settings: ClinicSettings;
}

const DURATION = 50;

export function createMockData(now: Date): MockDataset {
  const patients: Patient[] = PATIENT_SEED.map((p, i) => ({
    ...p,
    id: `pac_${i + 1}`,
    createdAt: toDateKey(addDays(now, -150 + i * 9)),
  }));

  const appointments: Appointment[] = [];
  const receivables: Receivable[] = [];
  const currentWeek = startOfWeek(now);
  let seq = 0;

  const addAppointment = (patient: Patient, start: Date, forced?: AppointmentStatus) => {
    seq += 1;
    const isPast = start.getTime() + DURATION * 60_000 <= now.getTime();
    let status: AppointmentStatus = forced ?? 'agendado';
    if (!forced) {
      if (isPast) status = seq % 11 === 0 ? 'falta' : seq % 13 === 0 ? 'cancelado' : 'realizado';
      else if (seq % 17 === 0) status = 'cancelado';
    }

    const appointment: Appointment = {
      id: `atd_${seq}`,
      patientId: patient.id,
      start: toLocalDateTime(start),
      durationMin: DURATION,
      modality: seq % 3 === 0 ? 'online' : 'presencial',
      status,
      ...(status === 'cancelado' ? { cancellationReason: 'paciente' as const } : {}),
    };
    appointments.push(appointment);

    if (status === 'realizado') {
      const daysAgo = diffInDays(now, start);
      const paid = daysAgo > 7 ? seq % 5 !== 0 : seq % 3 === 0;
      receivables.push({
        id: `tit_${seq}`,
        patientId: patient.id,
        appointmentId: appointment.id,
        description: `Sessão de ${formatDate(start)}`,
        amount: patient.sessionPrice,
        dueDate: toDateKey(start),
        status: paid ? 'pago' : 'pendente',
        paidAt: paid ? toDateKey(addDays(start, seq % 2)) : null,
        method: paid ? (seq % 4 === 0 ? 'cartao_credito' : 'pix') : null,
      });
    }
  };

  for (let week = -5; week <= 3; week++) {
    const weekStart = addDays(currentWeek, week * 7);
    for (const patient of patients) {
      if (patient.status !== 'ativo' || patient.recurringWeekday === null || !patient.recurringTime) continue;
      if (patient.frequency === 'avulsa') continue;
      if (patient.frequency === 'quinzenal' && Math.abs(week) % 2 === 1) continue;
      if (patient.frequency === 'mensal' && Math.abs(week) % 4 !== 0) continue;

      const day = addDays(weekStart, (patient.recurringWeekday + 6) % 7);
      const [h, m] = patient.recurringTime.split(':').map(Number);
      addAppointment(patient, new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m));
    }
  }

  // Atendimentos extras para que o "dia de hoje" sempre tenha movimento.
  const extraDay = now.getDay() === 0 ? addDays(now, 1) : now;
  const at = (hour: number) => new Date(extraDay.getFullYear(), extraDay.getMonth(), extraDay.getDate(), hour, 0);
  addAppointment(patients[2], at(13));
  addAppointment(patients[5], at(19));

  // Títulos avulsos: um em atraso (paciente inativo) e um a vencer.
  receivables.push(
    {
      id: 'tit_avulso_1',
      patientId: patients[7].id,
      appointmentId: null,
      description: 'Sessão avulsa',
      amount: patients[7].sessionPrice,
      dueDate: toDateKey(addDays(now, -20)),
      status: 'pendente',
      paidAt: null,
      method: null,
    },
    {
      id: 'tit_avulso_2',
      patientId: patients[0].id,
      appointmentId: null,
      description: 'Relatório administrativo (declaração de comparecimento)',
      amount: 8000,
      dueDate: toDateKey(addDays(now, 5)),
      status: 'pendente',
      paidAt: null,
      method: null,
    },
  );

  return { patients, appointments, receivables, settings: { ...DEFAULT_SETTINGS } };
}
