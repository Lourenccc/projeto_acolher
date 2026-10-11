'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { Appointment } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalBody, ModalFooter, modalFormClass } from '@/components/ui/Modal';
import { DateField, SelectField } from '@/components/ui/Fields';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { buildTimeOptions, formatDate, formatDateTime, formatTime, parseBRDate, toDateKey } from '@/lib/dates';
import { DURATION_OPTIONS } from '@/lib/labels';
import { focusFirstInvalid, getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  appointment: Appointment | undefined;
  onClose: () => void;
}

export function RescheduleModal({ open, appointment, onClose }: Props) {
  return (
    <Modal open={open && !!appointment} onClose={onClose} title="Reagendar atendimento">
      {appointment && <RescheduleForm appointment={appointment} onDone={onClose} />}
    </Modal>
  );
}

function RescheduleForm({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const { patients, settings, actions } = useAppData();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const patient = patients.find((p) => p.id === appointment.patientId);

  const timeOptions = useMemo(() => {
    const base = buildTimeOptions(settings.workdayStartHour, settings.workdayEndHour);
    const current = formatTime(appointment.start);
    return (base.includes(current) ? base : [current, ...base].sort()).map((t) => ({ value: t, label: t }));
  }, [settings.workdayStartHour, settings.workdayEndHour, appointment.start]);

  const [date, setDate] = useState(formatDate(appointment.start));
  const [time, setTime] = useState(formatTime(appointment.start));
  const [duration, setDuration] = useState(String(appointment.durationMin));
  const [errors, setErrors] = useState<{ date?: string; time?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const now = new Date();
    const e: { date?: string; time?: string } = {};
    const dateKey = parseBRDate(date);
    if (!dateKey) e.date = 'Informe uma data válida no formato DD/MM/AAAA.';
    else if (dateKey < toDateKey(now)) e.date = 'A nova data não pode estar no passado.';
    if (!time) e.time = 'Selecione um horário.';
    else if (dateKey === toDateKey(now) && time < formatTime(now)) e.time = 'Este horário já passou.';
    const start = `${dateKey}T${time}`;
    if (!e.date && !e.time && start === appointment.start && Number(duration) === appointment.durationMin) {
      e.time = 'Escolha uma data ou horário diferente do atual.';
    }
    setErrors(e);
    if (e.date || e.time || !dateKey) {
      focusFirstInvalid(formRef.current);
      return;
    }

    setSubmitting(true);
    try {
      await actions.rescheduleAppointment(appointment.id, { start, durationMin: Number(duration) });
      toast.success('Atendimento reagendado', `${patient?.name ?? 'Paciente'} — ${formatDateTime(start)}.`);
      onDone();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className={modalFormClass}>
      <ModalBody>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">{patient?.name}</span> — horário atual:{' '}
          {formatDateTime(appointment.start)}
        </p>
        {formError && <Alert tone="error">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField
            label="Nova data"
            required
            autoFocusOnOpen
            value={date}
            onValueChange={(v) => {
              setDate(v);
              setErrors((x) => ({ ...x, date: undefined }));
            }}
            error={errors.date}
          />
          <SelectField
            label="Novo horário"
            required
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setErrors((x) => ({ ...x, time: undefined }));
            }}
            options={timeOptions}
            error={errors.time}
            hint="Formato 24 horas"
          />
        </div>
        <SelectField label="Duração" value={duration} onChange={(e) => setDuration(e.target.value)} options={DURATION_OPTIONS} />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onDone} disabled={submitting}>
          Voltar
        </Button>
        <Button type="submit" loading={submitting}>
          Confirmar reagendamento
        </Button>
      </ModalFooter>
    </form>
  );
}
