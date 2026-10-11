'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, CalendarCheck, CalendarClock, CircleDollarSign, Wallet } from 'lucide-react';
import type { Appointment, Patient } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useNow } from '@/hooks/useNow';
import { DataBoundary } from '@/components/layout/DataBoundary';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, Skeleton } from '@/components/ui/States';
import {
  WEEKDAYS_SHORT,
  addDays,
  formatDate,
  formatTime,
  parseLocalDateTime,
  startOfWeek,
  toDateKey,
} from '@/lib/dates';
import { formatCurrency, pluralize } from '@/lib/format';
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  MODALITY_LABEL,
  RECEIVABLE_STATUS_LABEL,
  RECEIVABLE_STATUS_TONE,
} from '@/lib/labels';
import { byStart, cn, getReceivableDisplayStatus, indexById, sumBy } from '@/lib/utils';

export function DashboardView() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral dos atendimentos, compromissos e finanças do consultório." />
      <DataBoundary skeleton={<DashboardSkeleton />}>
        <DashboardContent />
      </DataBoundary>
    </div>
  );
}

function DashboardContent() {
  const { patients, appointments, receivables } = useAppData();
  const now = useNow();
  const todayKey = toDateKey(now);
  const patientById = useMemo(() => indexById(patients), [patients]);

  const todays = useMemo(
    () => appointments.filter((a) => a.start.startsWith(todayKey) && a.status !== 'cancelado').sort(byStart),
    [appointments, todayKey],
  );
  const doneToday = todays.filter((a) => a.status === 'realizado').length;
  const nextToday = todays.find((a) => a.status === 'agendado' && parseLocalDateTime(a.start).getTime() >= now.getTime());

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.status === 'agendado' && a.start.slice(0, 10) > todayKey)
        .sort(byStart)
        .slice(0, 5),
    [appointments, todayKey],
  );

  const open = receivables.filter((r) => r.status === 'pendente');
  const overdue = open.filter((r) => r.dueDate < todayKey);
  const pendingTotal = sumBy(open, (r) => r.amount);
  const overdueTotal = sumBy(overdue, (r) => r.amount);
  const monthPrefix = todayKey.slice(0, 7);
  const receivedMonth = sumBy(
    receivables.filter((r) => r.status === 'pago' && r.paidAt?.startsWith(monthPrefix)),
    (r) => r.amount,
  );
  const pendingList = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Atendimentos hoje"
          value={todays.length}
          hint={`${pluralize(doneToday, 'realizado', 'realizados')} até agora`}
          icon={<CalendarCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Próximo atendimento"
          value={nextToday ? formatTime(nextToday.start) : '—'}
          hint={nextToday ? patientById.get(nextToday.patientId)?.name : 'Nenhum outro atendimento hoje'}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Pendências financeiras"
          value={formatCurrency(pendingTotal)}
          hint={overdue.length ? `${formatCurrency(overdueTotal)} em atraso` : 'Nenhum título em atraso'}
          icon={<Wallet className="h-5 w-5" />}
          tone={overdue.length ? 'danger' : 'warning'}
        />
        <StatCard
          label="Recebido no mês"
          value={formatCurrency(receivedMonth)}
          hint="Pagamentos registrados neste mês"
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Atendimentos de hoje"
          description={formatDate(now)}
          actions={<ViewAllLink href="/agenda" label="Abrir agenda" />}
          bodyClassName="p-0"
        >
          {todays.length === 0 ? (
            <EmptyState title="Nenhum atendimento hoje" description="Aproveite para organizar a semana na Agenda." />
          ) : (
            <AppointmentList items={todays} patientById={patientById} showDate={false} />
          )}
        </Card>

        <Card title="Próximos compromissos" description="A partir de amanhã" bodyClassName="p-0">
          {upcoming.length === 0 ? (
            <EmptyState title="Sem compromissos futuros" description="Nenhum atendimento agendado para os próximos dias." />
          ) : (
            <AppointmentList items={upcoming} patientById={patientById} showDate />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-2"
          title="Pendências financeiras"
          description={`${pluralize(open.length, 'título em aberto', 'títulos em aberto')}`}
          actions={<ViewAllLink href="/financeiro" label="Ver financeiro" />}
          bodyClassName="p-0"
        >
          {pendingList.length === 0 ? (
            <EmptyState title="Tudo em dia" description="Não há títulos pendentes de recebimento." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingList.map((r) => {
                const status = getReceivableDisplayStatus(r, todayKey);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {patientById.get(r.patientId)?.name ?? 'Paciente não encontrado'}
                      </p>
                      <p className="text-xs text-slate-500">Vencimento {formatDate(r.dueDate)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(r.amount)}</span>
                      <Badge tone={RECEIVABLE_STATUS_TONE[status]}>{RECEIVABLE_STATUS_LABEL[status]}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <WeeklySummary className="lg:col-span-3" appointments={appointments} patientById={patientById} now={now} />
      </div>
    </div>
  );
}

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded text-sm font-medium text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function AppointmentList({
  items,
  patientById,
  showDate,
}: {
  items: Appointment[];
  patientById: Map<string, Patient>;
  showDate: boolean;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-4 px-5 py-3">
          <div className="w-20 shrink-0 text-sm">
            <p className="font-semibold tabular-nums text-slate-900">{formatTime(a.start)}</p>
            {showDate && <p className="text-xs tabular-nums text-slate-500">{formatDate(a.start)}</p>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {patientById.get(a.patientId)?.name ?? 'Paciente não encontrado'}
            </p>
            <p className="text-xs text-slate-500">
              {MODALITY_LABEL[a.modality]} · {a.durationMin} min
            </p>
          </div>
          <Badge tone={APPOINTMENT_STATUS_TONE[a.status]}>{APPOINTMENT_STATUS_LABEL[a.status]}</Badge>
        </li>
      ))}
    </ul>
  );
}

function WeeklySummary({
  appointments,
  patientById,
  now,
  className,
}: {
  appointments: Appointment[];
  patientById: Map<string, Patient>;
  now: Date;
  className?: string;
}) {
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 6);
  const todayKey = toDateKey(now);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = toDateKey(date);
    const items = appointments.filter((a) => a.start.startsWith(key));
    return {
      date,
      key,
      realizado: items.filter((a) => a.status === 'realizado').length,
      agendado: items.filter((a) => a.status === 'agendado').length,
      falta: items.filter((a) => a.status === 'falta').length,
      cancelado: items.filter((a) => a.status === 'cancelado').length,
      items,
    };
  });

  const weekItems = days.flatMap((d) => d.items);
  const totals = {
    realizado: sumBy(days, (d) => d.realizado),
    agendado: sumBy(days, (d) => d.agendado),
    falta: sumBy(days, (d) => d.falta),
    cancelado: sumBy(days, (d) => d.cancelado),
  };
  const expected = sumBy(
    weekItems.filter((a) => a.status === 'realizado' || a.status === 'agendado'),
    (a) => patientById.get(a.patientId)?.sessionPrice ?? 0,
  );
  const max = Math.max(1, ...days.map((d) => d.realizado + d.agendado + d.falta));

  return (
    <Card className={className} title="Resumo semanal" description={`${formatDate(weekStart)} a ${formatDate(weekEnd)}`}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Realizados', value: totals.realizado },
          { label: 'Agendados', value: totals.agendado },
          { label: 'Faltas', value: totals.falta },
          { label: 'Cancelados', value: totals.cancelado },
          { label: 'Faturamento previsto', value: formatCurrency(expected) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-xs text-slate-500">{item.label}</dt>
            <dd className="text-lg font-semibold tabular-nums text-slate-900">{item.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-5 space-y-2.5" aria-label="Atendimentos por dia da semana">
        {days.map((d) => {
          const total = d.realizado + d.agendado + d.falta;
          const isToday = d.key === todayKey;
          return (
            <li key={d.key} className="flex items-center gap-3 text-sm">
              <span className={cn('w-20 shrink-0 tabular-nums', isToday ? 'font-semibold text-brand-800' : 'text-slate-600')}>
                {WEEKDAYS_SHORT[d.date.getDay()]} {formatDate(d.date).slice(0, 5)}
              </span>
              <span className="flex h-3 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <span className="h-full bg-brand-600" style={{ width: `${(d.realizado / max) * 100}%` }} />
                <span className="h-full bg-brand-300" style={{ width: `${(d.agendado / max) * 100}%` }} />
                <span className="h-full bg-amber-400" style={{ width: `${(d.falta / max) * 100}%` }} />
              </span>
              <span className="w-28 shrink-0 text-right text-xs text-slate-600">
                {total === 0 ? (
                  'Sem atendimentos'
                ) : (
                  <>
                    <span className="font-semibold text-slate-900">{total}</span>
                    <span className="sr-only">
                      {' '}
                      atendimentos: {d.realizado} realizados, {d.agendado} agendados, {d.falta} faltas
                    </span>
                    <span aria-hidden="true"> no dia</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600" aria-hidden="true">
        <LegendDot className="bg-brand-600" label="Realizados" />
        <LegendDot className="bg-brand-300" label="Agendados" />
        <LegendDot className="bg-amber-400" label="Faltas" />
      </div>
    </Card>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-full', className)} />
      {label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
