'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { Appointment, CompleteAppointmentInput, PaymentMethod } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalBody, ModalFooter, modalFormClass } from '@/components/ui/Modal';
import { CheckboxField, DateField, RadioGroup, SelectField, TextField } from '@/components/ui/Fields';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { formatDate, formatDateTime, parseBRDate, toDateKey } from '@/lib/dates';
import { centsToInput, formatCurrency, parseCurrencyInput } from '@/lib/format';
import { PAYMENT_METHOD_LABEL } from '@/lib/labels';
import { focusFirstInvalid, getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  appointment: Appointment | undefined;
  onClose: () => void;
}

export function CompleteAppointmentModal({ open, appointment, onClose }: Props) {
  return (
    <Modal
      open={open && !!appointment}
      onClose={onClose}
      title="Registrar atendimento realizado"
      description="Confirme a realização da sessão e, se desejar, gere a cobrança."
    >
      {appointment && <CompleteForm appointment={appointment} onDone={onClose} />}
    </Modal>
  );
}

const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({
  value: m,
  label: PAYMENT_METHOD_LABEL[m],
}));

type Errors = { amount?: string; dueDate?: string; paidAt?: string; method?: string };

function CompleteForm({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const { patients, receivables, actions } = useAppData();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const patient = patients.find((p) => p.id === appointment.patientId);
  const alreadyCharged = receivables.some((r) => r.appointmentId === appointment.id && r.status !== 'cancelado');

  const [charge, setCharge] = useState(!alreadyCharged);
  const [amount, setAmount] = useState(centsToInput(patient?.sessionPrice ?? 0));
  const [dueDate, setDueDate] = useState(formatDate(appointment.start));
  const [paymentStatus, setPaymentStatus] = useState<'pendente' | 'pago'>('pendente');
  const [method, setMethod] = useState<PaymentMethod | ''>('pix');
  const [paidAt, setPaidAt] = useState(formatDate(new Date()));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const e: Errors = {};
    let input: CompleteAppointmentInput = { charge: null };

    if (charge) {
      const cents = parseCurrencyInput(amount);
      const due = parseBRDate(dueDate);
      const paid = parseBRDate(paidAt);
      if (cents === null || cents <= 0) e.amount = 'Informe um valor maior que zero (ex.: 150,00).';
      if (!due) e.dueDate = 'Informe uma data válida no formato DD/MM/AAAA.';
      if (paymentStatus === 'pago') {
        if (!method) e.method = 'Selecione a forma de pagamento.';
        if (!paid) e.paidAt = 'Informe uma data válida no formato DD/MM/AAAA.';
        else if (paid > toDateKey(new Date())) e.paidAt = 'A data de pagamento não pode estar no futuro.';
      }
      if (cents !== null && due && Object.keys(e).length === 0) {
        input = {
          charge: {
            amount: cents,
            dueDate: due,
            payment: paymentStatus === 'pago' && paid && method ? { paidAt: paid, method } : null,
          },
        };
      }
    }

    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }

    setSubmitting(true);
    try {
      const result = await actions.completeAppointment(appointment.id, input);
      toast.success(
        'Atendimento registrado como realizado',
        result.receivable
          ? `Cobrança de ${formatCurrency(result.receivable.amount)} ${result.receivable.status === 'pago' ? 'quitada' : 'gerada como pendente'}.`
          : 'Nenhuma cobrança foi gerada.',
      );
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
          <span className="font-medium text-slate-800">{patient?.name ?? 'Paciente'}</span> —{' '}
          {formatDateTime(appointment.start)}
        </p>
        <Alert tone="warning">
          Não registre informações clínicas aqui. Esta versão de demonstração não armazena prontuários nem anotações de
          sessão.
        </Alert>
        {formError && <Alert tone="error">{formError}</Alert>}

        <CheckboxField
          label="Gerar cobrança para este atendimento"
          description={
            alreadyCharged
              ? 'Já existe uma cobrança vinculada a este atendimento.'
              : 'Cria um título a receber no Financeiro.'
          }
          checked={charge}
          onChange={setCharge}
        />

        {charge && (
          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Valor (R$)"
                required
                inputMode="decimal"
                value={amount}
                onChange={(ev) => {
                  setAmount(ev.target.value);
                  setErrors((x) => ({ ...x, amount: undefined }));
                }}
                error={errors.amount}
                autoFocusOnOpen
              />
              <DateField
                label="Vencimento"
                required
                value={dueDate}
                onValueChange={(v) => {
                  setDueDate(v);
                  setErrors((x) => ({ ...x, dueDate: undefined }));
                }}
                error={errors.dueDate}
              />
            </div>
            <RadioGroup
              legend="Situação do pagamento"
              name="payment-status"
              inline
              value={paymentStatus}
              onChange={setPaymentStatus}
              options={[
                { value: 'pendente', label: 'A receber' },
                { value: 'pago', label: 'Já foi pago' },
              ]}
            />
            {paymentStatus === 'pago' && (
              <div className="grid gap-4 sm:grid-cols-2">
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
                <DateField
                  label="Data do pagamento"
                  required
                  value={paidAt}
                  onValueChange={(v) => {
                    setPaidAt(v);
                    setErrors((x) => ({ ...x, paidAt: undefined }));
                  }}
                  error={errors.paidAt}
                />
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onDone} disabled={submitting}>
          Voltar
        </Button>
        <Button type="submit" loading={submitting}>
          Confirmar realização
        </Button>
      </ModalFooter>
    </form>
  );
}
