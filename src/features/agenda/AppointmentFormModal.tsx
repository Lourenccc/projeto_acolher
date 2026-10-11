'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { AppointmentModality, DateKey } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalBody, ModalFooter, modalFormClass } from '@/components/ui/Modal';
import { DateField, RadioGroup, SelectField } from '@/components/ui/Fields';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/States';
import { buildTimeOptions, formatDate, formatTime, parseBRDate, toDateKey } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { DURATION_OPTIONS } from '@/lib/labels';
import { byName, focusFirstInvalid, getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  preset?: { date: DateKey; time: string };
  onClose: () => void;
}

export function AppointmentFormModal({ open, preset, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Novo agendamento" description="Agende um atendimento para um paciente cadastrado.">
      <AppointmentForm preset={preset} onDone={onClose} />
    </Modal>
  );
}

type Values = {
  patientId: string;
  date: string;
  time: string;
  durationMin: string;
  modality: AppointmentModality;
};
type Errors = Partial<Record<keyof Values, string>>;

function AppointmentForm({ preset, onDone }: { preset?: { date: DateKey; time: string }; onDone: () => void }) {
  const { patients, settings, actions } = useAppData();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const activePatients = useMemo(() => patients.filter((p) => p.status === 'ativo').sort(byName), [patients]);
  const timeOptions = useMemo(
    () => buildTimeOptions(settings.workdayStartHour, settings.workdayEndHour).map((t) => ({ value: t, label: t })),
    [settings.workdayStartHour, settings.workdayEndHour],
  );

  const [values, setValues] = useState<Values>({
    patientId: '',
    date: formatDate(preset?.date ?? new Date()),
    time: preset?.time ?? '',
    durationMin: String(settings.defaultDurationMin),
    modality: 'presencial',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const selectedPatient = activePatients.find((p) => p.id === values.patientId);

  function handlePatientChange(id: string) {
    const patient = activePatients.find((p) => p.id === id);
    setValues((v) => ({ ...v, patientId: id, time: v.time || patient?.recurringTime || '' }));
    setErrors((e) => ({ ...e, patientId: undefined }));
  }

  function validate(): { errors: Errors; dateKey: DateKey | null } {
    const e: Errors = {};
    const now = new Date();
    if (!values.patientId) e.patientId = 'Selecione um paciente.';
    const dateKey = parseBRDate(values.date);
    if (!dateKey) e.date = 'Informe uma data válida no formato DD/MM/AAAA.';
    else if (dateKey < toDateKey(now)) e.date = 'A data não pode estar no passado.';
    if (!values.time) e.time = 'Selecione um horário.';
    else if (dateKey === toDateKey(now) && values.time < formatTime(now)) e.time = 'Este horário já passou.';
    return { errors: e, dateKey };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const { errors: e, dateKey } = validate();
    setErrors(e);
    if (Object.keys(e).length > 0 || !dateKey) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setSubmitting(true);
    try {
      await actions.createAppointment({
        patientId: values.patientId,
        start: `${dateKey}T${values.time}`,
        durationMin: Number(values.durationMin),
        modality: values.modality,
      });
      toast.success('Agendamento criado', `${selectedPatient?.name} em ${values.date} às ${values.time}.`);
      onDone();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (activePatients.length === 0) {
    return (
      <ModalBody>
        <EmptyState
          title="Nenhum paciente ativo"
          description="Cadastre ou reative um paciente antes de criar um agendamento."
          action={
            <Link href="/pacientes" className="text-sm font-medium text-brand-700 underline underline-offset-2">
              Ir para Pacientes
            </Link>
          }
        />
      </ModalBody>
    );
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className={modalFormClass}>
      <ModalBody>
        {formError && <Alert tone="error">{formError}</Alert>}
        <SelectField
          label="Paciente"
          required
          autoFocusOnOpen
          value={values.patientId}
          onChange={(e) => handlePatientChange(e.target.value)}
          placeholder="Selecione…"
          options={activePatients.map((p) => ({ value: p.id, label: p.name }))}
          error={errors.patientId}
          hint={selectedPatient ? `Valor da sessão: ${formatCurrency(selectedPatient.sessionPrice)}` : undefined}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField label="Data" required value={values.date} onValueChange={(v) => set('date', v)} error={errors.date} />
          <SelectField
            label="Horário"
            required
            value={values.time}
            onChange={(e) => set('time', e.target.value)}
            placeholder="Selecione…"
            options={timeOptions}
            error={errors.time}
            hint="Formato 24 horas"
          />
        </div>
        <SelectField
          label="Duração"
          value={values.durationMin}
          onChange={(e) => set('durationMin', e.target.value)}
          options={DURATION_OPTIONS}
        />
        <RadioGroup
          legend="Modalidade"
          name="modality"
          inline
          value={values.modality}
          onChange={(v) => set('modality', v)}
          options={[
            { value: 'presencial', label: 'Presencial' },
            { value: 'online', label: 'Online' },
          ]}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onDone} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          Agendar
        </Button>
      </ModalFooter>
    </form>
  );
}
