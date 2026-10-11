'use client';

import { useState, type ReactNode } from 'react';
import { CalendarClock, CheckCircle2, UserX, XCircle } from 'lucide-react';
import type { Appointment } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { WEEKDAYS_LONG, formatDate, parseLocalDateTime, toDateKey } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  CANCELLATION_REASON_LABEL,
  MODALITY_LABEL,
  RECEIVABLE_STATUS_LABEL,
  RECEIVABLE_STATUS_TONE,
} from '@/lib/labels';
import { getErrorMessage, getReceivableDisplayStatus } from '@/lib/utils';
import { formatRange, type AppointmentAction } from './shared';

interface Props {
  open: boolean;
  appointment: Appointment | undefined;
  onClose: () => void;
  onAction: (action: AppointmentAction) => void;
}

export function AppointmentDetailsModal({ open, appointment, onClose, onAction }: Props) {
  return (
    <Modal open={open && !!appointment} onClose={onClose} title="Detalhes do atendimento">
      {appointment && <Details appointment={appointment} onClose={onClose} onAction={onAction} />}
    </Modal>
  );
}

function Details({
  appointment: a,
  onClose,
  onAction,
}: {
  appointment: Appointment;
  onClose: () => void;
  onAction: (action: AppointmentAction) => void;
}) {
  const { patients, receivables, actions } = useAppData();
  const toast = useToast();
  const [markingNoShow, setMarkingNoShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patient = patients.find((p) => p.id === a.patientId);
  const receivable = receivables.find((r) => r.appointmentId === a.id && r.status !== 'cancelado');
  const start = parseLocalDateTime(a.start);
  const todayKey = toDateKey(new Date());
  const isFuture = a.start.slice(0, 10) > todayKey;
  const isScheduled = a.status === 'agendado';

  async function handleNoShow() {
    setError(null);
    setMarkingNoShow(true);
    try {
      await actions.markNoShow(a.id);
      toast.info('Falta registrada', `${patient?.name ?? 'Paciente'} — ${formatDate(a.start)}.`);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setMarkingNoShow(false);
    }
  }

  const rows: Array<[string, ReactNode]> = [
    ['Paciente', patient?.name ?? 'Paciente não encontrado'],
    ['Data', `${WEEKDAYS_LONG[start.getDay()]}, ${formatDate(start)}`],
    ['Horário', `${formatRange(a)} (${a.durationMin} min)`],
    ['Modalidade', MODALITY_LABEL[a.modality]],
    ['Status', <Badge key="s" tone={APPOINTMENT_STATUS_TONE[a.status]}>{APPOINTMENT_STATUS_LABEL[a.status]}</Badge>],
    ['Valor da sessão', patient ? formatCurrency(patient.sessionPrice) : '—'],
  ];
  if (a.status === 'cancelado' && a.cancellationReason) {
    rows.push(['Motivo do cancelamento', CANCELLATION_REASON_LABEL[a.cancellationReason]]);
  }
  if (receivable) {
    const status = getReceivableDisplayStatus(receivable, todayKey);
    rows.push([
      'Cobrança',
      <span key="c" className="inline-flex items-center gap-2">
        {formatCurrency(receivable.amount)}
        <Badge tone={RECEIVABLE_STATUS_TONE[status]}>{RECEIVABLE_STATUS_LABEL[status]}</Badge>
      </span>,
    ]);
  }

  return (
    <>
      <ModalBody>
        {error && <Alert tone="error">{error}</Alert>}
        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="col-span-2 font-medium text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
        {isScheduled && isFuture && (
          <p className="text-xs text-slate-500">
            O registro de atendimento realizado fica disponível a partir do dia da sessão.
          </p>
        )}
      </ModalBody>
      <ModalFooter className="sm:flex-wrap">
        {isScheduled ? (
          <>
            <Button
              variant="danger-outline"
              icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
              onClick={() => onAction('cancel')}
              disabled={markingNoShow}
            >
              Cancelar atendimento
            </Button>
            <Button
              variant="secondary"
              icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
              onClick={() => onAction('reschedule')}
              disabled={markingNoShow}
            >
              Reagendar
            </Button>
            {!isFuture && (
              <Button
                variant="secondary"
                icon={<UserX className="h-4 w-4" aria-hidden="true" />}
                onClick={handleNoShow}
                loading={markingNoShow}
              >
                Registrar falta
              </Button>
            )}
            <Button
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              onClick={() => onAction('complete')}
              disabled={isFuture || markingNoShow}
            >
              Registrar realizado
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        )}
      </ModalFooter>
    </>
  );
}
