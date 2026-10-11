'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, UserPlus, Users } from 'lucide-react';
import type { Patient, PatientStatus } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { DataBoundary } from '@/components/layout/DataBoundary';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SelectField, TextField } from '@/components/ui/Fields';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { table } from '@/components/ui/table';
import { formatCurrency, normalizeText, onlyDigits, pluralize } from '@/lib/format';
import { FREQUENCY_LABEL, PATIENT_STATUS_LABEL } from '@/lib/labels';
import { byName, describeRecurrence } from '@/lib/utils';
import { PatientFormModal } from './PatientFormModal';

type ModalState = { kind: 'create' } | { kind: 'edit'; patient: Patient } | null;

export function PatientsView() {
  const { status } = useAppData();
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Cadastro administrativo, valores, frequência e horários recorrentes."
        actions={
          <Button
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setModal({ kind: 'create' })}
            disabled={status !== 'success'}
          >
            Novo paciente
          </Button>
        }
      />
      <DataBoundary skeleton={<PatientsSkeleton />}>
        <PatientsContent onCreate={() => setModal({ kind: 'create' })} onEdit={(patient) => setModal({ kind: 'edit', patient })} />
      </DataBoundary>
      <PatientFormModal
        open={modal !== null}
        patient={modal?.kind === 'edit' ? modal.patient : undefined}
        onClose={() => setModal(null)}
      />
    </div>
  );
}

function PatientsContent({ onCreate, onEdit }: { onCreate: () => void; onEdit: (p: Patient) => void }) {
  const { patients } = useAppData();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'todos'>('todos');

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    const qDigits = onlyDigits(query);
    return patients
      .filter((p) => statusFilter === 'todos' || p.status === statusFilter)
      .filter((p) => {
        if (!q) return true;
        return (
          normalizeText(p.name).includes(q) ||
          normalizeText(p.email).includes(q) ||
          (qDigits.length >= 3 && onlyDigits(p.phone).includes(qDigits))
        );
      })
      .sort(byName);
  }, [patients, query, statusFilter]);

  if (patients.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          icon={<UserPlus className="h-6 w-6" />}
          title="Nenhum paciente cadastrado"
          description="Cadastre o primeiro paciente para começar a organizar sua agenda."
          action={
            <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={onCreate}>
              Cadastrar paciente
            </Button>
          }
        />
      </div>
    );
  }

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('todos');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <TextField
            label="Buscar paciente"
            type="search"
            placeholder="Nome, e-mail ou telefone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
        </div>
        <SelectField
          label="Situação"
          containerClassName="sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PatientStatus | 'todos')}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'ativo', label: 'Ativos' },
            { value: 'inativo', label: 'Inativos' },
          ]}
        />
      </div>

      <p className="px-4 pt-3 text-sm text-slate-500" role="status" aria-live="polite">
        {pluralize(filtered.length, 'paciente encontrado', 'pacientes encontrados')}
        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">dados fictícios</span>
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Nenhum paciente corresponde à busca"
          description="Revise o termo pesquisado ou limpe os filtros."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className={`${table.wrapper} mt-3 hidden md:block`}>
            <table className={table.table}>
              <caption className="sr-only">Lista de pacientes (dados fictícios de demonstração)</caption>
              <thead className={table.thead}>
                <tr>
                  <th scope="col" className={table.th}>Paciente</th>
                  <th scope="col" className={table.th}>Telefone</th>
                  <th scope="col" className={table.thRight}>Valor/sessão</th>
                  <th scope="col" className={table.th}>Frequência</th>
                  <th scope="col" className={table.th}>Horário recorrente</th>
                  <th scope="col" className={table.th}>Situação</th>
                  <th scope="col" className={table.thRight}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <th scope="row" className={`${table.td} text-left font-normal`}>
                      <span className="block font-medium text-slate-900">{p.name}</span>
                      <span className="block text-xs text-slate-500">{p.email || 'Sem e-mail'}</span>
                    </th>
                    <td className={`${table.td} whitespace-nowrap tabular-nums`}>{p.phone}</td>
                    <td className={table.tdRight}>{formatCurrency(p.sessionPrice)}</td>
                    <td className={table.td}>{FREQUENCY_LABEL[p.frequency]}</td>
                    <td className={table.td}>{describeRecurrence(p)}</td>
                    <td className={table.td}>
                      <Badge tone={p.status === 'ativo' ? 'success' : 'neutral'}>{PATIENT_STATUS_LABEL[p.status]}</Badge>
                    </td>
                    <td className={table.tdRight}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => onEdit(p)}
                        aria-label={`Editar ${p.name}`}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cartões */}
          <ul className="mt-3 divide-y divide-slate-100 md:hidden">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="tabular-nums text-slate-600">{p.phone}</p>
                  <p className="text-slate-600">
                    {formatCurrency(p.sessionPrice)} · {FREQUENCY_LABEL[p.frequency]}
                  </p>
                  <p className="text-slate-500">{describeRecurrence(p)}</p>
                  <Badge tone={p.status === 'ativo' ? 'success' : 'neutral'}>{PATIENT_STATUS_LABEL[p.status]}</Badge>
                </div>
                <Button variant="secondary" size="sm" onClick={() => onEdit(p)} aria-label={`Editar ${p.name}`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PatientsSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-10" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}
