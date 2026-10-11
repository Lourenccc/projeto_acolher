'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { Receivable } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalBody, ModalFooter, modalFormClass } from '@/components/ui/Modal';
import { DateField, SelectField, TextField } from '@/components/ui/Fields';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { formatDate, parseBRDate } from '@/lib/dates';
import { centsToInput, formatCurrency, parseCurrencyInput } from '@/lib/format';
import { byName, focusFirstInvalid, getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  receivable?: Receivable;
  onClose: () => void;
}

export function ReceivableFormModal({ open, receivable, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={receivable ? 'Editar título a receber' : 'Novo título a receber'}
      description="Registre cobranças avulsas ou ajuste valores e vencimentos."
    >
      <ReceivableForm receivable={receivable} onDone={onClose} />
    </Modal>
  );
}

type Values = { patientId: string; description: string; amount: string; dueDate: string };
type Errors = Partial<Record<keyof Values, string>>;

function ReceivableForm({ receivable, onDone }: { receivable?: Receivable; onDone: () => void }) {
  const { patients, actions } = useAppData();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const patientOptions = useMemo(
    () =>
      [...patients].sort(byName).map((p) => ({
        value: p.id,
        label: p.status === 'inativo' ? `${p.name} (inativo)` : p.name,
      })),
    [patients],
  );

  const [values, setValues] = useState<Values>({
    patientId: receivable?.patientId ?? '',
    description: receivable?.description ?? '',
    amount: receivable ? centsToInput(receivable.amount) : '',
    dueDate: formatDate(receivable?.dueDate ?? new Date()),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function handlePatientChange(id: string) {
    const patient = patients.find((p) => p.id === id);
    setValues((v) => ({
      ...v,
      patientId: id,
      amount: v.amount || (patient ? centsToInput(patient.sessionPrice) : ''),
    }));
    setErrors((e) => ({ ...e, patientId: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const e: Errors = {};
    const amount = parseCurrencyInput(values.amount);
    const dueDate = parseBRDate(values.dueDate);
    const description = values.description.trim();
    if (!values.patientId) e.patientId = 'Selecione um paciente.';
    if (description.length < 3) e.description = 'Descreva a cobrança (mínimo de 3 caracteres).';
    if (amount === null || amount <= 0) e.amount = 'Informe um valor maior que zero (ex.: 150,00).';
    if (!dueDate) e.dueDate = 'Informe uma data válida no formato DD/MM/AAAA.';
    setErrors(e);
    if (Object.keys(e).length > 0 || amount === null || !dueDate) {
      focusFirstInvalid(formRef.current);
      return;
    }

    setSubmitting(true);
    try {
      const input = { patientId: values.patientId, description, amount, dueDate };
      if (receivable) {
        await actions.updateReceivable(receivable.id, input);
        toast.success('Título atualizado', `${formatCurrency(amount)} com vencimento em ${formatDate(dueDate)}.`);
      } else {
        await actions.createReceivable(input);
        toast.success('Título criado', `${formatCurrency(amount)} com vencimento em ${formatDate(dueDate)}.`);
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
        {formError && <Alert tone="error">{formError}</Alert>}
        <SelectField
          label="Paciente"
          required
          autoFocusOnOpen
          value={values.patientId}
          onChange={(e) => handlePatientChange(e.target.value)}
          placeholder="Selecione…"
          options={patientOptions}
          error={errors.patientId}
        />
        <TextField
          label="Descrição"
          required
          maxLength={120}
          placeholder="Ex.: Sessão avulsa"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          hint="Não inclua informações clínicas na descrição."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Valor (R$)"
            required
            inputMode="decimal"
            placeholder="150,00"
            value={values.amount}
            onChange={(e) => set('amount', e.target.value)}
            error={errors.amount}
          />
          <DateField
            label="Vencimento"
            required
            value={values.dueDate}
            onValueChange={(v) => set('dueDate', v)}
            error={errors.dueDate}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onDone} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {receivable ? 'Salvar alterações' : 'Criar título'}
        </Button>
      </ModalFooter>
    </form>
  );
}
