'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, Clock, Pencil, Plus, Receipt, XCircle } from 'lucide-react';
import type { ID, ReceivableDisplayStatus } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useNow } from '@/hooks/useNow';
import { useToast } from '@/components/ui/Toast';
import { DataBoundary } from '@/components/layout/DataBoundary';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DateField, SelectField } from '@/components/ui/Fields';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { table } from '@/components/ui/table';
import { formatDate, formatMonthYear, monthRange, parseBRDate, toDateKey } from '@/lib/dates';
import { formatCurrency, pluralize } from '@/lib/format';
import { PAYMENT_METHOD_LABEL, RECEIVABLE_STATUS_LABEL, RECEIVABLE_STATUS_TONE } from '@/lib/labels';
import { byName, getErrorMessage, getReceivableDisplayStatus, indexById, sumBy } from '@/lib/utils';
import { PatientStatement, type EnrichedReceivable } from './PatientStatement';
import { ReceivableFormModal } from './ReceivableFormModal';
import { MarkPaidModal } from './MarkPaidModal';

type PeriodPreset = 'mes_atual' | 'mes_anterior' | 'proximo_mes' | 'personalizado';
type StatusFilter = ReceivableDisplayStatus | 'todos';
type ModalState =
  | { kind: 'create' }
  | { kind: 'edit'; id: ID }
  | { kind: 'pay'; id: ID }
  | { kind: 'cancel'; id: ID }
  | null;

const PRESET_OFFSET: Record<Exclude<PeriodPreset, 'personalizado'>, number> = {
  mes_anterior: -1,
  mes_atual: 0,
  proximo_mes: 1,
};

export function FinanceView() {
  const { status } = useAppData();
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Títulos a receber, status de pagamento e demonstrativo por paciente."
        actions={
          <Button
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setModal({ kind: 'create' })}
            disabled={status !== 'success'}
          >
            Novo título
          </Button>
        }
      />
      <DataBoundary skeleton={<FinanceSkeleton />}>
        <FinanceContent modal={modal} setModal={setModal} />
      </DataBoundary>
    </div>
  );
}

function FinanceContent({ modal, setModal }: { modal: ModalState; setModal: (m: ModalState) => void }) {
  const { receivables, patients, actions } = useAppData();
  const toast = useToast();
  const now = useNow();
  const todayKey = toDateKey(now);
  const patientById = useMemo(() => indexById(patients), [patients]);

  const currentMonth = monthRange(now.getFullYear(), now.getMonth());
  const [preset, setPreset] = useState<PeriodPreset>('mes_atual');
  const [customStart, setCustomStart] = useState(formatDate(currentMonth.start));
  const [customEnd, setCustomEnd] = useState(formatDate(currentMonth.end));
  const [patientFilter, setPatientFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const startKey = parseBRDate(customStart);
  const endKey = parseBRDate(customEnd);
  const customErrors = {
    start: customStart && !startKey ? 'Data inválida (DD/MM/AAAA).' : undefined,
    end:
      customEnd && !endKey
        ? 'Data inválida (DD/MM/AAAA).'
        : startKey && endKey && endKey < startKey
          ? 'A data final deve ser igual ou posterior à inicial.'
          : undefined,
  };

  const { range, periodLabel } = useMemo(() => {
    if (preset === 'personalizado') {
      if (!startKey || !endKey || endKey < startKey) return { range: null, periodLabel: 'Período inválido' };
      return { range: { start: startKey, end: endKey }, periodLabel: `${formatDate(startKey)} a ${formatDate(endKey)}` };
    }
    const offset = PRESET_OFFSET[preset];
    const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { range: monthRange(ref.getFullYear(), ref.getMonth()), periodLabel: formatMonthYear(ref) };
  }, [preset, startKey, endKey, now]);

  const inPeriod: EnrichedReceivable[] = useMemo(() => {
    if (!range) return [];
    return receivables
      .filter((r) => r.dueDate >= range.start && r.dueDate <= range.end)
      .filter((r) => patientFilter === 'todos' || r.patientId === patientFilter)
      .map((r) => ({ ...r, displayStatus: getReceivableDisplayStatus(r, todayKey) }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [receivables, range, patientFilter, todayKey]);

  const rows = statusFilter === 'todos' ? inPeriod : inPeriod.filter((r) => r.displayStatus === statusFilter);

  const summary = {
    received: sumBy(inPeriod.filter((r) => r.displayStatus === 'pago'), (r) => r.amount),
    open: sumBy(inPeriod.filter((r) => r.displayStatus === 'pendente'), (r) => r.amount),
    overdue: sumBy(inPeriod.filter((r) => r.displayStatus === 'atrasado'), (r) => r.amount),
    overdueCount: inPeriod.filter((r) => r.displayStatus === 'atrasado').length,
    total: sumBy(inPeriod.filter((r) => r.status !== 'cancelado'), (r) => r.amount),
  };

  const selectedId = modal && modal.kind !== 'create' ? modal.id : null;
  const selected = selectedId ? receivables.find((r) => r.id === selectedId) : undefined;
  const close = () => setModal(null);

  const hasFilters = preset !== 'mes_atual' || patientFilter !== 'todos' || statusFilter !== 'todos';
  const clearFilters = () => {
    setPreset('mes_atual');
    setPatientFilter('todos');
    setStatusFilter('todos');
  };

  async function confirmCancel() {
    if (!selected) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      await actions.cancelReceivable(selected.id);
      toast.success('Título cancelado', `${selected.description} — ${formatCurrency(selected.amount)}.`);
      close();
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Filtros" bodyClassName="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Período"
            value={preset}
            onChange={(e) => setPreset(e.target.value as PeriodPreset)}
            options={[
              { value: 'mes_anterior', label: 'Mês anterior' },
              { value: 'mes_atual', label: 'Mês atual' },
              { value: 'proximo_mes', label: 'Próximo mês' },
              { value: 'personalizado', label: 'Personalizado' },
            ]}
          />
          {preset === 'personalizado' && (
            <>
              <DateField label="De" value={customStart} onValueChange={setCustomStart} error={customErrors.start} />
              <DateField label="Até" value={customEnd} onValueChange={setCustomEnd} error={customErrors.end} />
            </>
          )}
          <SelectField
            label="Paciente"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            options={[
              { value: 'todos', label: 'Todos os pacientes' },
              ...[...patients].sort(byName).map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'pendente', label: 'Pendente' },
              { value: 'atrasado', label: 'Em atraso' },
              { value: 'pago', label: 'Pago' },
              { value: 'cancelado', label: 'Cancelado' },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500" aria-live="polite">
            {range ? (
              <>
                Vencimentos de <strong className="font-medium text-slate-700">{formatDate(range.start)}</strong> a{' '}
                <strong className="font-medium text-slate-700">{formatDate(range.end)}</strong>
              </>
            ) : (
              'Informe um período válido para ver os resultados.'
            )}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recebido" value={formatCurrency(summary.received)} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" hint={periodLabel} />
        <StatCard label="A receber" value={formatCurrency(summary.open)} icon={<Clock className="h-5 w-5" />} tone="info" hint="Dentro do prazo" />
        <StatCard
          label="Em atraso"
          value={formatCurrency(summary.overdue)}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={summary.overdue ? 'danger' : 'neutral'}
          hint={pluralize(summary.overdueCount, 'título vencido', 'títulos vencidos')}
        />
        <StatCard label="Total do período" value={formatCurrency(summary.total)} icon={<CircleDollarSign className="h-5 w-5" />} hint="Exceto cancelados" />
      </div>

      <Card
        title="Títulos a receber"
        description={`${pluralize(rows.length, 'título', 'títulos')} · ${periodLabel}`}
        bodyClassName="p-0"
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="Nenhum título encontrado"
            description={range ? 'Não há títulos para os filtros selecionados.' : 'Corrija o período personalizado.'}
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={table.wrapper}>
            <table className={table.table}>
              <caption className="sr-only">Títulos a receber — {periodLabel}</caption>
              <thead className={table.thead}>
                <tr>
                  <th scope="col" className={table.th}>Vencimento</th>
                  <th scope="col" className={table.th}>Paciente</th>
                  <th scope="col" className={table.th}>Descrição</th>
                  <th scope="col" className={table.thRight}>Valor</th>
                  <th scope="col" className={table.th}>Status</th>
                  <th scope="col" className={table.th}>Pagamento</th>
                  <th scope="col" className={table.thRight}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {rows.map((r) => {
                  const patientName = patientById.get(r.patientId)?.name ?? 'Paciente não encontrado';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className={`${table.td} whitespace-nowrap tabular-nums`}>{formatDate(r.dueDate)}</td>
                      <th scope="row" className={`${table.td} whitespace-nowrap text-left font-medium text-slate-900`}>
                        {patientName}
                      </th>
                      <td className={`${table.td} min-w-[12rem]`}>{r.description}</td>
                      <td className={`${table.tdRight} whitespace-nowrap font-medium text-slate-900`}>{formatCurrency(r.amount)}</td>
                      <td className={table.td}>
                        <Badge tone={RECEIVABLE_STATUS_TONE[r.displayStatus]}>{RECEIVABLE_STATUS_LABEL[r.displayStatus]}</Badge>
                      </td>
                      <td className={`${table.td} whitespace-nowrap text-xs text-slate-500`}>
                        {r.paidAt && r.method ? `${formatDate(r.paidAt)} · ${PAYMENT_METHOD_LABEL[r.method]}` : '—'}
                      </td>
                      <td className={`${table.tdRight} whitespace-nowrap`}>
                        {r.status === 'pendente' ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => setModal({ kind: 'pay', id: r.id })} aria-label={`Registrar pagamento de ${patientName}, ${formatCurrency(r.amount)}`}>
                              Receber
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setModal({ kind: 'edit', id: r.id })}
                              aria-label={`Editar título de ${patientName}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-700 hover:bg-red-50 hover:text-red-800"
                              onClick={() => {
                                setCancelError(null);
                                setModal({ kind: 'cancel', id: r.id });
                              }}
                              aria-label={`Cancelar título de ${patientName}`}
                            >
                              <XCircle className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PatientStatement items={inPeriod} patientById={patientById} periodLabel={periodLabel} />

      <ReceivableFormModal
        open={modal?.kind === 'create' || (modal?.kind === 'edit' && !!selected)}
        receivable={modal?.kind === 'edit' ? selected : undefined}
        onClose={close}
      />
      <MarkPaidModal open={modal?.kind === 'pay'} receivable={selected} onClose={close} />
      <ConfirmDialog
        open={modal?.kind === 'cancel' && !!selected}
        onClose={close}
        onConfirm={confirmCancel}
        title="Cancelar título?"
        description={
          selected && (
            <>
              {patientById.get(selected.patientId)?.name} — {selected.description} ({formatCurrency(selected.amount)})
            </>
          )
        }
        warning="O título deixará de ser cobrado e não poderá ser reativado."
        confirmLabel="Sim, cancelar título"
        loading={cancelLoading}
        error={cancelError}
      />
    </div>
  );
}

function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
