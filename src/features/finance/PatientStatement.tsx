'use client';

import { useMemo } from 'react';
import type { Patient, ReceivableDisplayStatus, Receivable } from '@/types';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { table } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { sumBy } from '@/lib/utils';

export type EnrichedReceivable = Receivable & { displayStatus: ReceivableDisplayStatus };

interface Row {
  patientId: string;
  name: string;
  count: number;
  total: number;
  paid: number;
  open: number;
  overdue: number;
}

interface Props {
  items: EnrichedReceivable[];
  patientById: Map<string, Patient>;
  periodLabel: string;
}

/** Demonstrativo mensal (ou do período filtrado) agrupado por paciente. */
export function PatientStatement({ items, patientById, periodLabel }: Props) {
  const rows = useMemo<Row[]>(() => {
    const groups = new Map<string, EnrichedReceivable[]>();
    for (const r of items) {
      if (r.status === 'cancelado') continue;
      groups.set(r.patientId, [...(groups.get(r.patientId) ?? []), r]);
    }
    return Array.from(groups.entries())
      .map(([patientId, list]) => ({
        patientId,
        name: patientById.get(patientId)?.name ?? 'Paciente não encontrado',
        count: list.length,
        total: sumBy(list, (r) => r.amount),
        paid: sumBy(list.filter((r) => r.displayStatus === 'pago'), (r) => r.amount),
        open: sumBy(list.filter((r) => r.displayStatus === 'pendente'), (r) => r.amount),
        overdue: sumBy(list.filter((r) => r.displayStatus === 'atrasado'), (r) => r.amount),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [items, patientById]);

  const totals = {
    count: sumBy(rows, (r) => r.count),
    total: sumBy(rows, (r) => r.total),
    paid: sumBy(rows, (r) => r.paid),
    open: sumBy(rows, (r) => r.open),
    overdue: sumBy(rows, (r) => r.overdue),
  };

  return (
    <Card title="Demonstrativo por paciente" description={periodLabel} bodyClassName="p-0">
      {rows.length === 0 ? (
        <EmptyState title="Sem movimentação no período" description="Nenhum título encontrado para os filtros selecionados." />
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <caption className="sr-only">Demonstrativo financeiro por paciente — {periodLabel}</caption>
            <thead className={table.thead}>
              <tr>
                <th scope="col" className={table.th}>Paciente</th>
                <th scope="col" className={table.thRight}>Títulos</th>
                <th scope="col" className={table.thRight}>Total</th>
                <th scope="col" className={table.thRight}>Recebido</th>
                <th scope="col" className={table.thRight}>A receber</th>
                <th scope="col" className={table.thRight}>Em atraso</th>
              </tr>
            </thead>
            <tbody className={table.tbody}>
              {rows.map((r) => (
                <tr key={r.patientId}>
                  <th scope="row" className={`${table.td} text-left font-medium text-slate-900`}>
                    {r.name}
                  </th>
                  <td className={table.tdRight}>{r.count}</td>
                  <td className={table.tdRight}>{formatCurrency(r.total)}</td>
                  <td className={`${table.tdRight} text-emerald-700`}>{formatCurrency(r.paid)}</td>
                  <td className={table.tdRight}>{formatCurrency(r.open)}</td>
                  <td className={`${table.tdRight} ${r.overdue ? 'font-medium text-red-700' : ''}`}>
                    {formatCurrency(r.overdue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className={table.tfoot}>
              <tr>
                <th scope="row" className={`${table.td} text-left`}>
                  Total
                </th>
                <td className={table.tdRight}>{totals.count}</td>
                <td className={table.tdRight}>{formatCurrency(totals.total)}</td>
                <td className={table.tdRight}>{formatCurrency(totals.paid)}</td>
                <td className={table.tdRight}>{formatCurrency(totals.open)}</td>
                <td className={table.tdRight}>{formatCurrency(totals.overdue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
