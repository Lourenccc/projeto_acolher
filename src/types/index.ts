/**
 * Tipos de domínio do sistema. Estes contratos espelham o formato esperado da
 * futura API: os serviços em `src/services` devem retornar exatamente estes tipos.
 */

export type ID = string;

/** Data local no formato AAAA-MM-DD (sem fuso horário). Exibida como DD/MM/AAAA. */
export type DateKey = string;

/** Data e hora local no formato AAAA-MM-DDTHH:mm (sem fuso horário, 24h). */
export type LocalDateTime = string;

/** Valores monetários em centavos de BRL, evitando erros de ponto flutuante. */
export type Cents = number;

/** 0 = domingo … 6 = sábado (mesmo padrão de `Date#getDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export type LoadStatus = 'loading' | 'success' | 'error';

/* ----------------------------- Profissional ----------------------------- */

/** Preparado para outras profissões da saúde no futuro. */
export type ProfessionType =
  | 'psicologia'
  | 'nutricao'
  | 'fonoaudiologia'
  | 'fisioterapia'
  | 'terapia_ocupacional';

export interface ClinicSettings {
  professionalName: string;
  clinicName: string;
  profession: ProfessionType;
  workdayStartHour: number;
  workdayEndHour: number;
  defaultDurationMin: number;
  workingDays: Weekday[];
}

/* ------------------------------- Pacientes ------------------------------ */

export type PatientStatus = 'ativo' | 'inativo';
export type SessionFrequency = 'semanal' | 'quinzenal' | 'mensal' | 'avulsa';

/**
 * Cadastro administrativo do paciente. Intencionalmente NÃO contém dados
 * clínicos (diagnósticos, anotações de sessão, prontuário).
 */
export interface Patient {
  id: ID;
  name: string;
  phone: string;
  email: string;
  sessionPrice: Cents;
  frequency: SessionFrequency;
  recurringWeekday: Weekday | null;
  /** HH:mm (24h) */
  recurringTime: string | null;
  status: PatientStatus;
  createdAt: DateKey;
}

export type PatientInput = Omit<Patient, 'id' | 'createdAt'>;

/* ----------------------------- Atendimentos ----------------------------- */

export type AppointmentStatus = 'agendado' | 'realizado' | 'cancelado' | 'falta';
export type AppointmentModality = 'presencial' | 'online';
export type CancellationReason = 'paciente' | 'profissional' | 'outro';

export interface Appointment {
  id: ID;
  patientId: ID;
  start: LocalDateTime;
  durationMin: number;
  modality: AppointmentModality;
  status: AppointmentStatus;
  cancellationReason?: CancellationReason;
}

export interface AppointmentInput {
  patientId: ID;
  start: LocalDateTime;
  durationMin: number;
  modality: AppointmentModality;
}

export interface RescheduleInput {
  start: LocalDateTime;
  durationMin: number;
}

/* ------------------------------ Financeiro ------------------------------ */

export type PaymentMethod =
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'dinheiro'
  | 'transferencia'
  | 'boleto';

/** Status persistido. "atrasado" é derivado (pendente + vencimento passado). */
export type ReceivableStatus = 'pendente' | 'pago' | 'cancelado';
export type ReceivableDisplayStatus = ReceivableStatus | 'atrasado';

export interface Receivable {
  id: ID;
  patientId: ID;
  appointmentId: ID | null;
  description: string;
  amount: Cents;
  dueDate: DateKey;
  status: ReceivableStatus;
  paidAt: DateKey | null;
  method: PaymentMethod | null;
}

export interface ReceivableInput {
  patientId: ID;
  description: string;
  amount: Cents;
  dueDate: DateKey;
}

export interface MarkPaidInput {
  paidAt: DateKey;
  method: PaymentMethod;
}

export interface CompleteAppointmentInput {
  /** `null` = registrar sem gerar cobrança. */
  charge: null | {
    amount: Cents;
    dueDate: DateKey;
    /** `null` = cobrança fica pendente. */
    payment: MarkPaidInput | null;
  };
}

export interface CompleteAppointmentResult {
  appointment: Appointment;
  receivable: Receivable | null;
}
