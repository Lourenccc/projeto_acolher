'use client';

import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarCheck, CalendarX, Repeat } from 'lucide-react';
import type {
  AppointmentModality,
  LocalDateTime,
  Patient,
  PatientInput,
  PatientSaveResult,
  PatientStatus,
  RecurrenceOptions,
  RecurringFrequency,
  Weekday,
} from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalBody, ModalFooter, modalFormClass } from '@/components/ui/Modal';
import { DateField, RadioGroup, SelectField, TextField } from '@/components/ui/Fields';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { WEEKDAYS_LONG, WEEKDAYS_SHORT, WEEK_ORDER, buildTimeOptions, formatDate, formatTime, parseBRDate, parseLocalDateTime, toDateKey } from '@/lib/dates';
import { centsToInput, formatPhone, onlyDigits, parseCurrencyInput, pluralize } from '@/lib/format';
import { DEFAULT_RECURRENCE_WEEKS, RECURRENCE_WEEKS_OPTIONS, planRecurrence, type RecurrenceRule } from '@/lib/schedule';
import { byStart, focusFirstInvalid, getErrorMessage } from '@/lib/utils';

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
  status: PatientStatus;
  hasRecurrence: boolean;
  frequency: RecurringFrequency;
  recurringWeekday: string;
  recurringTime: string;
  /** DD/MM/AAAA — a partir de quando preencher a agenda. */
  fillFrom: string;
  fillWeeks: string;
  modality: AppointmentModality;
};
type Errors = Partial<Record<keyof Values, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FREQUENCY_OPTIONS: Array<{ value: RecurringFrequency; label: string }> = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal (a cada 4 semanas)' },
];

const MODALITY_OPTIONS = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
];

function toValues(p: Patient | undefined, modality: AppointmentModality): Values {
  return {
    name: p?.name ?? '',
    phone: p?.phone ?? '',
    email: p?.email ?? '',
    sessionPrice: p ? centsToInput(p.sessionPrice) : '',
    status: p?.status ?? 'ativo',
    hasRecurrence: !!p && p.frequency !== 'avulsa',
    frequency: p && p.frequency !== 'avulsa' ? p.frequency : 'semanal',
    recurringWeekday: p?.recurringWeekday != null ? String(p.recurringWeekday) : '',
    recurringTime: p?.recurringTime ?? '',
    fillFrom: formatDate(new Date()),
    fillWeeks: String(DEFAULT_RECURRENCE_WEEKS),
    modality,
  };
}

/** Regra de recorrência a partir do formulário, ou `null` se incompleta/desmarcada. */
function ruleFrom(v: Values): RecurrenceRule | null {
  if (!v.hasRecurrence || v.recurringWeekday === '' || !v.recurringTime) return null;
  return { weekday: Number(v.recurringWeekday) as Weekday, time: v.recurringTime, frequency: v.frequency };
}

function validatePatient(v: Values): { errors: Errors; input: PatientInput | null; recurrence: RecurrenceOptions | null } {
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

  const fillFrom = parseBRDate(v.fillFrom);
  if (v.hasRecurrence) {
    if (v.recurringWeekday === '') errors.recurringWeekday = 'Selecione o dia da semana.';
    if (!v.recurringTime) errors.recurringTime = 'Selecione o horário.';
    if (!fillFrom) errors.fillFrom = 'Informe uma data válida no formato DD/MM/AAAA.';
    else if (fillFrom < toDateKey(new Date())) errors.fillFrom = 'A data inicial não pode estar no passado.';
  }

  if (Object.keys(errors).length > 0 || price === null) return { errors, input: null, recurrence: null };

  const rule = ruleFrom(v);
  return {
    errors,
    input: {
      name,
      phone: formatPhone(phoneDigits),
      email,
      sessionPrice: price,
      frequency: rule ? rule.frequency : 'avulsa',
      recurringWeekday: rule ? rule.weekday : null,
      recurringTime: rule ? rule.time : null,
      status: v.status,
    },
    recurrence:
      rule && fillFrom && v.status === 'ativo'
        ? { from: fillFrom, weeks: Number(v.fillWeeks), modality: v.modality }
        : null,
  };
}

const formatSlot = (s: LocalDateTime) => {
  const d = parseLocalDateTime(s);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${formatDate(d).slice(0, 5)} · ${formatTime(d)}`;
};

function describeResult(r: PatientSaveResult): string {
  const parts: string[] = [];
  if (r.created.length) {
    const replaced = r.removedIds.length ? ` (${pluralize(r.removedIds.length, 'anterior substituída', 'anteriores substituídas')})` : '';
    parts.push(`${pluralize(r.created.length, 'sessão adicionada', 'sessões adicionadas')} à agenda${replaced}`);
  }
  if (r.removedIds.length && !r.created.length) {
    parts.push(`${pluralize(r.removedIds.length, 'agendamento recorrente futuro removido', 'agendamentos recorrentes futuros removidos')}`);
  }
  if (r.skipped.length) {
    parts.push(`${pluralize(r.skipped.length, 'horário pulado', 'horários pulados')} por conflito (${r.skipped.map((s) => formatDate(s).slice(0, 5)).join(', ')})`);
  }
  return parts.length ? `${parts.join('; ')}.` : 'Nenhuma alteração na agenda.';
}

function PatientForm({ patient, onDone }: { patient?: Patient; onDone: () => void }) {
  const { settings, appointments, actions } = useAppData();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const recurrenceCheckboxId = useId();

  // Modalidade sugerida: a do próximo atendimento recorrente do paciente, se houver.
  const [values, setValues] = useState<Values>(() => {
    const next = patient
      ? appointments.filter((a) => a.patientId === patient.id && a.recurring && a.status === 'agendado').sort(byStart)[0]
      : undefined;
    return toValues(patient, next?.modality ?? 'presencial');
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const timeOptions = useMemo(
    () => buildTimeOptions(settings.workdayStartHour, settings.workdayEndHour).map((t) => ({ value: t, label: t })),
    [settings.workdayStartHour, settings.workdayEndHour],
  );
  const weekdayOptions = WEEK_ORDER.map((d) => ({ value: String(d), label: WEEKDAYS_LONG[d] }));

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Pré-visualização: mesma regra usada pelo serviço ao salvar.
  const plan = useMemo(() => {
    const from = parseBRDate(values.fillFrom) ?? toDateKey(new Date());
    const rule = values.status === 'ativo' ? ruleFrom(values) : null;
    return planRecurrence({
      appointments,
      patientId: patient?.id,
      rule,
      from: values.hasRecurrence ? from : toDateKey(new Date()),
      weeks: Number(values.fillWeeks),
      durationMin: settings.defaultDurationMin,
      now: new Date(),
    });
  }, [values, appointments, patient?.id, settings.defaultDurationMin]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const { errors: e, input, recurrence } = validatePatient(values);
    setErrors(e);
    if (!input) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setSubmitting(true);
    try {
      const result = patient
        ? await actions.updatePatient(patient.id, input, recurrence)
        : await actions.createPatient(input, recurrence);
      toast.success(patient ? 'Paciente atualizado' : 'Paciente cadastrado', `${input.name}: ${describeResult(result)}`);
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
        </div>

        <fieldset
          className={
            values.hasRecurrence
              ? 'space-y-4 rounded-xl border border-brand-300 bg-brand-50/30 p-4'
              : 'rounded-xl border border-slate-200 p-4'
          }
        >
          <legend className="px-1">
            <span className="flex items-center gap-2">
              <input
                id={recurrenceCheckboxId}
                type="checkbox"
                checked={values.hasRecurrence}
                onChange={(e) => set('hasRecurrence', e.target.checked)}
                aria-describedby={`${recurrenceCheckboxId}-desc`}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              />
              <label htmlFor={recurrenceCheckboxId} className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-slate-700">
                Horário recorrente
              </label>
            </span>
          </legend>
          <p id={`${recurrenceCheckboxId}-desc`} className="text-sm text-slate-500">
            {values.hasRecurrence
              ? 'As sessões serão preenchidas automaticamente na agenda ao salvar.'
              : 'Marque se o paciente tem dia e horário fixos — as sessões serão preenchidas automaticamente na agenda.'}
          </p>

          {values.hasRecurrence && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField
                  label="Frequência"
                  value={values.frequency}
                  onChange={(e) => set('frequency', e.target.value as RecurringFrequency)}
                  options={FREQUENCY_OPTIONS}
                />
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
              <div className="grid gap-4 sm:grid-cols-3">
                <DateField
                  label="Preencher a partir de"
                  required
                  value={values.fillFrom}
                  onValueChange={(v) => set('fillFrom', v)}
                  error={errors.fillFrom}
                />
                <SelectField
                  label="Preencher por"
                  value={values.fillWeeks}
                  onChange={(e) => set('fillWeeks', e.target.value)}
                  options={RECURRENCE_WEEKS_OPTIONS}
                />
                <SelectField
                  label="Modalidade"
                  value={values.modality}
                  onChange={(e) => set('modality', e.target.value as AppointmentModality)}
                  options={MODALITY_OPTIONS}
                />
              </div>
            </>
          )}

          <RecurrencePreview
            plan={plan}
            hasRecurrence={values.hasRecurrence}
            ruleComplete={!!ruleFrom(values)}
            inactive={values.status === 'inativo'}
            durationMin={settings.defaultDurationMin}
          />
        </fieldset>
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

interface PreviewProps {
  plan: ReturnType<typeof planRecurrence>;
  hasRecurrence: boolean;
  ruleComplete: boolean;
  inactive: boolean;
  durationMin: number;
}

/** Resumo, ao vivo, do que acontecerá na agenda ao salvar. */
function RecurrencePreview({ plan, hasRecurrence, ruleComplete, inactive, durationMin }: PreviewProps) {
  const removed = plan.toRemove.length;
  const MAX_CHIPS = 8;

  let content: ReactNode = null;

  if (!hasRecurrence || inactive) {
    if (removed > 0) {
      content = (
        <Alert tone="warning">
          {inactive && hasRecurrence ? 'Pacientes inativos não recebem agendamentos automáticos. ' : ''}
          Ao salvar, {pluralize(removed, 'agendamento recorrente futuro será removido', 'agendamentos recorrentes futuros serão removidos')}{' '}
          da agenda. Atendimentos já realizados e ajustes manuais são mantidos.
        </Alert>
      );
    } else if (inactive && hasRecurrence) {
      content = <Alert tone="info">Pacientes inativos não recebem agendamentos automáticos.</Alert>;
    }
  } else if (ruleComplete) {
    const created = plan.toCreate;
    content = (
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <p className="flex items-start gap-2 font-medium text-slate-800">
          <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
          {created.length > 0
            ? `${pluralize(created.length, 'sessão será adicionada', 'sessões serão adicionadas')} à agenda (${durationMin} min cada), de ${formatDate(created[0])} a ${formatDate(created[created.length - 1])}.`
            : 'Nenhuma sessão nova será criada neste período.'}
        </p>
        {created.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Sessões que serão criadas">
            {created.slice(0, MAX_CHIPS).map((s) => (
              <li key={s} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs tabular-nums text-brand-900 ring-1 ring-inset ring-brand-200">
                {formatSlot(s)}
              </li>
            ))}
            {created.length > MAX_CHIPS && (
              <li className="px-1 py-0.5 text-xs text-slate-500">e mais {created.length - MAX_CHIPS}</li>
            )}
          </ul>
        )}
        {removed > 0 && (
          <p className="flex items-start gap-2 text-slate-600">
            <Repeat className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {pluralize(removed, 'agendamento recorrente futuro será substituído', 'agendamentos recorrentes futuros serão substituídos')}{' '}
            pelos novos horários.
          </p>
        )}
        {plan.keptExisting.length > 0 && (
          <p className="text-slate-600">
            {pluralize(plan.keptExisting.length, 'data já tem', 'datas já têm')} atendimento deste paciente e{' '}
            {plan.keptExisting.length === 1 ? 'foi mantida' : 'foram mantidas'} como está.
          </p>
        )}
        {plan.conflicts.length > 0 && (
          <p className="flex items-start gap-2 text-amber-800">
            <CalendarX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {pluralize(plan.conflicts.length, 'horário já está ocupado', 'horários já estão ocupados')} por outro atendimento e{' '}
              {plan.conflicts.length === 1 ? 'será pulado' : 'serão pulados'}: {plan.conflicts.map(formatSlot).join('; ')}.
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div aria-live="polite" className={content ? undefined : 'sr-only'}>
      {content}
    </div>
  );
}
