'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List, Plus } from 'lucide-react';
import type { DateKey, ID, Weekday } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useNow } from '@/hooks/useNow';
import { DataBoundary } from '@/components/layout/DataBoundary';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { CheckboxField } from '@/components/ui/Fields';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { WEEK_ORDER, addDays, formatDate, parseLocalDateTime, startOfWeek, toDateKey } from '@/lib/dates';
import { pluralize } from '@/lib/format';
import { byStart, cn, indexById } from '@/lib/utils';
import type { AgendaModal } from './shared';
import { WeekGrid, countOutOfRange } from './WeekGrid';
import { WeekList } from './WeekList';
import { AppointmentFormModal } from './AppointmentFormModal';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { RescheduleModal } from './RescheduleModal';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';
import { CompleteAppointmentModal } from './CompleteAppointmentModal';

type ViewMode = 'grade' | 'lista';

export function AgendaView() {
  const { status } = useAppData();
  const [modal, setModal] = useState<AgendaModal>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Visualize a semana, agende, reagende, cancele e registre atendimentos."
        actions={
          <Button
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setModal({ kind: 'new' })}
            disabled={status !== 'success'}
          >
            Novo agendamento
          </Button>
        }
      />
      <DataBoundary skeleton={<AgendaSkeleton />}>
        <AgendaContent modal={modal} setModal={setModal} />
      </DataBoundary>
    </div>
  );
}

function AgendaContent({ modal, setModal }: { modal: AgendaModal; setModal: (m: AgendaModal) => void }) {
  const { appointments, patients, settings } = useAppData();
  const now = useNow();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState<ViewMode>('grade');
  const [showCancelled, setShowCancelled] = useState(false);

  // Em telas pequenas, a lista é mais legível que a grade.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setView('lista');
  }, []);

  const patientById = useMemo(() => indexById(patients), [patients]);
  const weekAppointments = useMemo(() => {
    const from = weekStart.getTime();
    const to = addDays(weekStart, 7).getTime();
    return appointments
      .filter((a) => {
        const t = parseLocalDateTime(a.start).getTime();
        return t >= from && t < to && (showCancelled || a.status !== 'cancelado');
      })
      .sort(byStart);
  }, [appointments, weekStart, showCancelled]);

  // Dias de atendimento configurados + qualquer dia que tenha atendimento nesta semana.
  const days = useMemo(() => {
    const withItems = new Set(weekAppointments.map((a) => parseLocalDateTime(a.start).getDay() as Weekday));
    return WEEK_ORDER.filter((d) => settings.workingDays.includes(d) || withItems.has(d)).map((d) =>
      addDays(weekStart, (d + 6) % 7),
    );
  }, [weekAppointments, settings.workingDays, weekStart]);

  const outOfRange = countOutOfRange(weekAppointments, settings.workdayStartHour, settings.workdayEndHour);
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(startOfWeek(now));
  const activeCount = weekAppointments.filter((a) => a.status !== 'cancelado').length;

  const selectedId = modal && modal.kind !== 'new' ? modal.id : null;
  const selected = selectedId ? appointments.find((a) => a.id === selectedId) : undefined;
  const close = () => setModal(null);
  const openDetails = (id: ID) => setModal({ kind: 'details', id });
  const openSlot = (date: DateKey, time: string) => setModal({ kind: 'new', preset: { date, time } });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" aria-label="Semana anterior" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))} disabled={isCurrentWeek}>
            Semana atual
          </Button>
          <Button variant="secondary" size="sm" aria-label="Próxima semana" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h2 className="ml-1 text-sm font-semibold text-slate-900 sm:text-base" aria-live="polite">
            <span className="sr-only">Semana de </span>
            {formatDate(weekStart)} a {formatDate(addDays(weekStart, 6))}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-slate-500">{pluralize(activeCount, 'atendimento', 'atendimentos')}</p>
          <CheckboxField label="Mostrar cancelados" checked={showCancelled} onChange={setShowCancelled} />
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5" role="group" aria-label="Modo de visualização">
            {(
              [
                { mode: 'grade', label: 'Grade', Icon: LayoutGrid },
                { mode: 'lista', label: 'Lista', Icon: List },
              ] as const
            ).map(({ mode, label, Icon }) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  view === mode ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {outOfRange > 0 && view === 'grade' && (
        <p className="text-sm text-amber-800">
          {pluralize(outOfRange, 'atendimento está', 'atendimentos estão')} fora da faixa de horários exibida. Use a
          visualização em lista para vê-los.
        </p>
      )}

      {view === 'grade' ? (
        <>
          <WeekGrid
            days={days}
            appointments={weekAppointments}
            patientById={patientById}
            startHour={settings.workdayStartHour}
            endHour={settings.workdayEndHour}
            now={now}
            onSelect={openDetails}
            onSlot={openSlot}
          />
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <Legend className="border-brand-500 bg-brand-50" label="Agendado" />
            <Legend className="border-emerald-500 bg-emerald-50" label="Realizado" />
            <Legend className="border-amber-500 bg-amber-50" label="Falta" />
            <Legend className="border-slate-400 bg-slate-100" label="Cancelado" />
            <span className="text-slate-500">Dica: clique em um horário vazio para agendar.</span>
          </div>
        </>
      ) : weekAppointments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="Nenhum atendimento nesta semana"
            description="Use o botão abaixo para criar o primeiro agendamento da semana."
            action={
              <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setModal({ kind: 'new' })}>
                Novo agendamento
              </Button>
            }
          />
        </div>
      ) : (
        <WeekList days={days} appointments={weekAppointments} patientById={patientById} now={now} onSelect={openDetails} />
      )}

      <AppointmentFormModal
        open={modal?.kind === 'new'}
        preset={modal?.kind === 'new' ? modal.preset : undefined}
        onClose={close}
      />
      <AppointmentDetailsModal
        open={modal?.kind === 'details'}
        appointment={selected}
        onClose={close}
        onAction={(action) => selectedId && setModal({ kind: action, id: selectedId })}
      />
      <RescheduleModal open={modal?.kind === 'reschedule'} appointment={selected} onClose={close} />
      <CancelAppointmentDialog open={modal?.kind === 'cancel'} appointment={selected} onClose={close} />
      <CompleteAppointmentModal open={modal?.kind === 'complete'} appointment={selected} onClose={close} />
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded-sm border-l-4', className)} aria-hidden="true" />
      {label}
    </span>
  );
}

function AgendaSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 rounded-2xl" />
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  );
}
