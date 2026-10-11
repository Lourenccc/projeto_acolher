import type {
  Appointment,
  AppointmentInput,
  CancellationReason,
  CompleteAppointmentInput,
  CompleteAppointmentResult,
  ID,
  LocalDateTime,
  Receivable,
  RescheduleInput,
} from '@/types';
import { formatDate, parseLocalDateTime, toDateKey } from '@/lib/dates';
import { createId } from '@/lib/utils';
import { ApiError, mockRequest } from './client';
import { getDb } from './mockDb';

function hasConflict(list: Appointment[], start: LocalDateTime, durationMin: number, ignoreId?: ID) {
  const s = parseLocalDateTime(start).getTime();
  const e = s + durationMin * 60_000;
  return list.some((a) => {
    if (a.id === ignoreId || a.status === 'cancelado' || a.status === 'falta') return false;
    const as = parseLocalDateTime(a.start).getTime();
    const ae = as + a.durationMin * 60_000;
    return s < ae && as < e;
  });
}

function findScheduled(id: ID): Appointment {
  const appointment = getDb().appointments.find((a) => a.id === id);
  if (!appointment) throw new ApiError('Atendimento não encontrado.', 'NOT_FOUND');
  if (appointment.status !== 'agendado') {
    throw new ApiError('Esta ação só é permitida para atendimentos com status "Agendado".', 'VALIDATION');
  }
  return appointment;
}

const CONFLICT_MESSAGE = 'Já existe um atendimento neste horário. Escolha outro horário.';

// Futuro: `${API_URL}/appointments`
export const appointmentsService = {
  list(): Promise<Appointment[]> {
    return mockRequest(() => getDb().appointments);
  },

  create(input: AppointmentInput): Promise<Appointment> {
    return mockRequest(() => {
      const db = getDb();
      if (!db.patients.some((p) => p.id === input.patientId)) {
        throw new ApiError('Paciente não encontrado.', 'NOT_FOUND');
      }
      if (hasConflict(db.appointments, input.start, input.durationMin)) {
        throw new ApiError(CONFLICT_MESSAGE, 'CONFLICT');
      }
      const appointment: Appointment = { ...input, id: createId('atd'), status: 'agendado' };
      db.appointments.push(appointment);
      return appointment;
    });
  },

  reschedule(id: ID, input: RescheduleInput): Promise<Appointment> {
    return mockRequest(() => {
      const appointment = findScheduled(id);
      if (hasConflict(getDb().appointments, input.start, input.durationMin, id)) {
        throw new ApiError(CONFLICT_MESSAGE, 'CONFLICT');
      }
      appointment.start = input.start;
      appointment.durationMin = input.durationMin;
      return appointment;
    });
  },

  cancel(id: ID, reason: CancellationReason): Promise<Appointment> {
    return mockRequest(() => {
      const appointment = findScheduled(id);
      appointment.status = 'cancelado';
      appointment.cancellationReason = reason;
      return appointment;
    });
  },

  markNoShow(id: ID): Promise<Appointment> {
    return mockRequest(() => {
      const appointment = findScheduled(id);
      appointment.status = 'falta';
      return appointment;
    });
  },

  complete(id: ID, input: CompleteAppointmentInput): Promise<CompleteAppointmentResult> {
    return mockRequest(() => {
      const db = getDb();
      const appointment = findScheduled(id);
      if (appointment.start.slice(0, 10) > toDateKey(new Date())) {
        throw new ApiError('Não é possível registrar como realizado um atendimento de data futura.', 'VALIDATION');
      }
      appointment.status = 'realizado';

      let receivable: Receivable | null = null;
      if (input.charge) {
        const { amount, dueDate, payment } = input.charge;
        receivable = {
          id: createId('tit'),
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          description: `Sessão de ${formatDate(appointment.start)}`,
          amount,
          dueDate,
          status: payment ? 'pago' : 'pendente',
          paidAt: payment?.paidAt ?? null,
          method: payment?.method ?? null,
        };
        db.receivables.push(receivable);
      }
      return { appointment, receivable };
    });
  },
};
