'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { PaymentMethod, Receivable } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalBody, ModalFooter, modalFormClass } from '@/components/ui/Modal';
import { DateField, SelectField } from '@/components/ui/Fields';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { formatDate, parseBRDate, toDateKey } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { PAYMENT_METHOD_LABEL } from '@/lib/labels';
import { focusFirstInvalid, getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  receivable: Receivable | undefined;
  onClose: () => void;
}

const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({
  value: m,
  label: PAYMENT_METHOD_LABEL[m],
}));

export function MarkPaidModal({ open, receivable, onClose }: Props) {
  return (
    <Modal open={open && !!receivable} onClose={onClose} title="Registrar pagamento" size="sm">
      {receivable && <MarkPaidForm receivable={receivable} onDone={onClose} />}
    </Modal>
  );
}

function MarkPaidForm({ receivable, onDone }: { receivable: Receivable; onDone: () => void }) {
  const { patients, actions } = useAppData();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const patient = patients.find((p) => p.id === receivable.patientId);

  const [paidAt, setPaidAt] = useState(formatDate(new Date()));
  const [method, setMethod] = useState<PaymentMethod | ''>('pix');
  const [errors, setErrors] = useState<{ paidAt?: string; method?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const e: { paidAt?: string; method?: string } = {};
    const date = parseBRDate(paidAt);
    if (!date) e.paidAt = 'Informe uma data válida no formato DD/MM/AAAA.';
    else if (date > toDateKey(new Date())) e.paidAt = 'A data de pagamento não pode estar no futuro.';
    if (!method) e.method = 'Selecione a forma de pagamento.';
    setErrors(e);
    if (!date || !method || Object.keys(e).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }

    setSubmitting(true);
    try {
      await actions.markReceivablePaid(receivable.id, { paidAt: date, method });
      toast.success('Pagamento registrado', `${formatCurrency(receivable.amount)} — ${patient?.name ?? 'Paciente'}.`);
      onDone();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className={modalFormClass}>
      <ModalBody>
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-900">{patient?.name ?? 'Paciente'}</p>
          <p className="text-slate-600">{receivable.description}</p>
          <p className="mt-1 text-slate-600">
            <span className="font-semibold text-slate-900">{formatCurrency(receivable.amount)}</span> · vencimento{' '}
            {formatDate(receivable.dueDate)}
          </p>
        </div>
        {formError && <Alert tone="error">{formError}</Alert>}
        <DateField
          label="Data do pagamento"
          required
          autoFocusOnOpen
          value={paidAt}
          onValueChange={(v) => {
            setPaidAt(v);
            setErrors((x) => ({ ...x, paidAt: undefined }));
          }}
          error={errors.paidAt}
        />
        <SelectField
          label="Forma de pagamento"
          required
          value={method}
          onChange={(ev) => {
            setMethod(ev.target.value as PaymentMethod | '');
            setErrors((x) => ({ ...x, method: undefined }));
          }}
          placeholder="Selecione…"
          options={METHOD_OPTIONS}
          error={errors.method}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onDone} disabled={submitting}>
          Voltar
        </Button>
        <Button type="submit" loading={submitting}>
          Confirmar pagamento
        </Button>
      </ModalFooter>
    </form>
  );
}
