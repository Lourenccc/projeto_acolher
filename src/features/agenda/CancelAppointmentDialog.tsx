'use client';

import { useEffect, useState } from 'react';
import type { Appointment, CancellationReason } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RadioGroup } from '@/components/ui/Fields';
import { formatDateTime } from '@/lib/dates';
import { CANCELLATION_REASON_LABEL } from '@/lib/labels';
import { getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  appointment: Appointment | undefined;
  onClose: () => void;
}

const REASONS = (Object.keys(CANCELLATION_REASON_LABEL) as CancellationReason[]).map((value) => ({
  value,
  label: CANCELLATION_REASON_LABEL[value],
}));

/** Confirmação obrigatória antes de cancelar um atendimento. */
export function CancelAppointmentDialog({ open, appointment, onClose }: Props) {
  const { patients, actions } = useAppData();
  const toast = useToast();
  const [reason, setReason] = useState<CancellationReason>('paciente');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('paciente');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const patient = appointment ? patients.find((p) => p.id === appointment.patientId) : undefined;

  async function handleConfirm() {
    if (!appointment) return;
    setLoading(true);
    setError(null);
    try {
      await actions.cancelAppointment(appointment.id, reason);
      toast.success('Atendimento cancelado', `${patient?.name ?? 'Paciente'} — ${formatDateTime(appointment.start)}.`);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConfirmDialog
      open={open && !!appointment}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Cancelar atendimento?"
      description={
        appointment && (
          <>
            {patient?.name ?? 'Paciente'} — {formatDateTime(appointment.start)}
          </>
        )
      }
      warning="O horário será liberado na agenda. Esta ação não pode ser desfeita; para atender o paciente novamente, crie um novo agendamento."
      confirmLabel="Sim, cancelar atendimento"
      cancelLabel="Voltar"
      loading={loading}
      error={error}
    >
      <RadioGroup legend="Motivo do cancelamento" name="cancel-reason" value={reason} onChange={setReason} options={REASONS} />
    </ConfirmDialog>
  );
}
