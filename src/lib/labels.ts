import type {
  AppointmentModality,
  AppointmentStatus,
  CancellationReason,
  PatientStatus,
  PaymentMethod,
  ProfessionType,
  ReceivableDisplayStatus,
  SessionFrequency,
  Tone,
} from '@/types';

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
  falta: 'Falta',
};

export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, Tone> = {
  agendado: 'brand',
  realizado: 'success',
  cancelado: 'neutral',
  falta: 'warning',
};

export const MODALITY_LABEL: Record<AppointmentModality, string> = {
  presencial: 'Presencial',
  online: 'Online',
};

export const FREQUENCY_LABEL: Record<SessionFrequency, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  avulsa: 'Avulsa',
};

export const PATIENT_STATUS_LABEL: Record<PatientStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
};

export const RECEIVABLE_STATUS_LABEL: Record<ReceivableDisplayStatus, string> = {
  pendente: 'Pendente',
  atrasado: 'Em atraso',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

export const RECEIVABLE_STATUS_TONE: Record<ReceivableDisplayStatus, Tone> = {
  pendente: 'info',
  atrasado: 'danger',
  pago: 'success',
  cancelado: 'neutral',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  boleto: 'Boleto',
};

export const CANCELLATION_REASON_LABEL: Record<CancellationReason, string> = {
  paciente: 'Solicitado pelo paciente',
  profissional: 'Solicitado pelo profissional',
  outro: 'Outro motivo',
};

export const PROFESSION_OPTIONS: Array<{ value: ProfessionType; label: string; available: boolean }> = [
  { value: 'psicologia', label: 'Psicologia', available: true },
  { value: 'nutricao', label: 'Nutrição (em breve)', available: false },
  { value: 'fonoaudiologia', label: 'Fonoaudiologia (em breve)', available: false },
  { value: 'fisioterapia', label: 'Fisioterapia (em breve)', available: false },
  { value: 'terapia_ocupacional', label: 'Terapia ocupacional (em breve)', available: false },
];

export const DURATION_OPTIONS = [30, 40, 45, 50, 60, 90].map((m) => ({
  value: String(m),
  label: `${m} minutos`,
}));
