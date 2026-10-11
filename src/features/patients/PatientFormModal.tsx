'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { Patient, PatientInput, PatientStatus, SessionFrequency, Weekday } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalBody, ModalFooter, modalFormClass } from '@/components/ui/Modal';
import { RadioGroup, SelectField, TextField } from '@/components/ui/Fields';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { WEEKDAYS_LONG, WEEK_ORDER, buildTimeOptions } from '@/lib/dates';
import { centsToInput, formatPhone, onlyDigits, parseCurrencyInput } from '@/lib/format';
import { FREQUENCY_LABEL } from '@/lib/labels';
import { focusFirstInvalid, getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  /** Paciente em edição; ausente = cadastro. */
  patient?: Patient;
  onClose: () => void;
}

export function PatientFormModal({ open, patient, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={patient ? 'Editar paciente' : 'Cadastrar paciente'}
      description="Apenas dados administrativos. Não informe dados clínicos."
    >
      <PatientForm patient={patient} onDone={onClose} />
    </Modal>
  );
}

type Values = {
  name: string;
  phone: string;
  email: string;
  sessionPrice: string;
  frequency: SessionFrequency;
  recurringWeekday: string;
  recurringTime: string;
  status: PatientStatus;
};
type Errors = Partial<Record<keyof Values, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function toValues(p?: Patient): Values {
  return {
    name: p?.name ?? '',
    phone: p?.phone ?? '',
    email: p?.email ?? '',
    sessionPrice: p ? centsToInput(p.sessionPrice) : '',
    frequency: p?.frequency ?? 'semanal',
    recurringWeekday: p?.recurringWeekday != null ? String(p.recurringWeekday) : '',
    recurringTime: p?.recurringTime ?? '',
    status: p?.status ?? 'ativo',
  };
}

export function validatePatient(v: Values): { errors: Errors; input: PatientInput | null } {
  const errors: Errors = {};
  const name = v.name.trim().replace(/\s+/g, ' ');
  if (name.length < 3) errors.name = 'Informe o nome completo (mínimo de 3 caracteres).';
  else if (name.length > 120) errors.name = 'O nome deve ter no máximo 120 caracteres.';

  const phoneDigits = onlyDigits(v.phone);
  if (phoneDigits.length < 10 || phoneDigits.length > 11) errors.phone = 'Informe um telefone com DDD, ex.: (11) 91234-5678.';

  const email = v.email.trim();
  if (email && !EMAIL_RE.test(email)) errors.email = 'Informe um e-mail válido ou deixe em branco.';

  const price = parseCurrencyInput(v.sessionPrice);
  if (price === null || price <= 0) errors.sessionPrice = 'Informe um valor maior que zero (ex.: 150,00).';
  else if (price > 1_000_000) errors.sessionPrice = 'O valor máximo por sessão é R$ 10.000,00.';

  const recurring = v.frequency !== 'avulsa';
  if (recurring && v.recurringWeekday === '') errors.recurringWeekday = 'Selecione o dia da semana.';
  if (recurring && !v.recurringTime) errors.recurringTime = 'Selecione o horário.';

  if (Object.keys(errors).length > 0 || price === null) return { errors, input: null };

  return {
    errors,
    input: {
      name,
      phone: formatPhone(phoneDigits),
      email,
      sessionPrice: price,
      frequency: v.frequency,
      recurringWeekday: recurring ? (Number(v.recurringWeekday) as Weekday) : null,
      recurringTime: recurring ? v.recurringTime : null,
      status: v.status,
    },
  };
}

function PatientForm({ patient, onDone }: { patient?: Patient; onDone: () => void }) {
  const { settings, actions } = useAppData();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(() => toValues(patient));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const timeOptions = useMemo(
    () => buildTimeOptions(settings.workdayStartHour, settings.workdayEndHour).map((t) => ({ value: t, label: t })),
    [settings.workdayStartHour, settings.workdayEndHour],
  );
  const weekdayOptions = WEEK_ORDER.map((d) => ({ value: String(d), label: WEEKDAYS_LONG[d] }));
  const recurring = values.frequency !== 'avulsa';

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const { errors: e, input } = validatePatient(values);
    setErrors(e);
    if (!input) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setSubmitting(true);
    try {
      if (patient) {
        await actions.updatePatient(patient.id, input);
        toast.success('Paciente atualizado', input.name);
      } else {
        await actions.createPatient(input);
        toast.success('Paciente cadastrado', input.name);
      }
      onDone();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className={modalFormClass}>
      <ModalBody>
        <Alert tone="warning">
          Use somente dados fictícios. Este cadastro não deve conter diagnósticos, queixas ou qualquer informação clínica.
        </Alert>
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField
          label="Nome completo"
          required
          autoFocusOnOpen
          autoComplete="off"
          maxLength={120}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Telefone"
            required
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="(00) 00000-0000"
            value={values.phone}
            onChange={(e) => set('phone', formatPhone(e.target.value))}
            error={errors.phone}
          />
          <TextField
            label="E-mail"
            type="email"
            autoComplete="off"
            placeholder="nome@exemplo.com"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            error={errors.email}
            hint="Opcional"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Valor por sessão (R$)"
            required
            inputMode="decimal"
            placeholder="150,00"
            value={values.sessionPrice}
            onChange={(e) => set('sessionPrice', e.target.value)}
            error={errors.sessionPrice}
          />
          <SelectField
            label="Frequência"
            value={values.frequency}
            onChange={(e) => set('frequency', e.target.value as SessionFrequency)}
            options={(Object.keys(FREQUENCY_LABEL) as SessionFrequency[]).map((f) => ({
              value: f,
              label: FREQUENCY_LABEL[f],
            }))}
          />
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-4" disabled={!recurring}>
          <legend className="px-1 text-sm font-medium text-slate-700">Horário recorrente</legend>
          {recurring ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Dia da semana"
                required
                value={values.recurringWeekday}
                onChange={(e) => set('recurringWeekday', e.target.value)}
                placeholder="Selecione…"
                options={weekdayOptions}
                error={errors.recurringWeekday}
              />
              <SelectField
                label="Horário"
                required
                value={values.recurringTime}
                onChange={(e) => set('recurringTime', e.target.value)}
                placeholder="Selecione…"
                options={timeOptions}
                error={errors.recurringTime}
                hint="Formato 24 horas"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Atendimentos avulsos não possuem horário fixo.</p>
          )}
        </fieldset>

        <RadioGroup
          legend="Situação"
          name="patient-status"
          inline
          value={values.status}
          onChange={(v) => set('status', v)}
          options={[
            { value: 'ativo', label: 'Ativo' },
            { value: 'inativo', label: 'Inativo' },
          ]}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onDone} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {patient ? 'Salvar alterações' : 'Cadastrar paciente'}
        </Button>
      </ModalFooter>
    </form>
  );
}
