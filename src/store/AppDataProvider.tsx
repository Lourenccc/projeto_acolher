'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  Appointment,
  AppointmentInput,
  CancellationReason,
  ClinicSettings,
  CompleteAppointmentInput,
  CompleteAppointmentResult,
  ID,
  LoadStatus,
  MarkPaidInput,
  Patient,
  PatientInput,
  Receivable,
  ReceivableInput,
  RescheduleInput,
} from '@/types';
import {
  appointmentsService,
  demoService,
  patientsService,
  receivablesService,
  setSimulatedFailure,
  settingsService,
} from '@/services';
import { DEFAULT_SETTINGS } from '@/data/mockData';
import { getErrorMessage, upsert } from '@/lib/utils';

export interface AppActions {
  createPatient(input: PatientInput): Promise<Patient>;
  updatePatient(id: ID, input: PatientInput): Promise<Patient>;
  createAppointment(input: AppointmentInput): Promise<Appointment>;
  rescheduleAppointment(id: ID, input: RescheduleInput): Promise<Appointment>;
  cancelAppointment(id: ID, reason: CancellationReason): Promise<Appointment>;
  markNoShow(id: ID): Promise<Appointment>;
  completeAppointment(id: ID, input: CompleteAppointmentInput): Promise<CompleteAppointmentResult>;
  createReceivable(input: ReceivableInput): Promise<Receivable>;
  updateReceivable(id: ID, input: ReceivableInput): Promise<Receivable>;
  markReceivablePaid(id: ID, input: MarkPaidInput): Promise<Receivable>;
  cancelReceivable(id: ID): Promise<Receivable>;
  updateSettings(input: ClinicSettings): Promise<ClinicSettings>;
  resetDemoData(): Promise<void>;
}

interface AppDataContextValue {
  status: LoadStatus;
  error: string | null;
  patients: Patient[];
  appointments: Appointment[];
  receivables: Receivable[];
  settings: ClinicSettings;
  simulateFailure: boolean;
  setSimulateFailure(value: boolean): void;
  reload(): Promise<void>;
  actions: AppActions;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

/**
 * Estado local da aplicação. Os componentes só conversam com este provider;
 * o provider conversa com `src/services`, que hoje é mockado e no futuro chamará a API.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const [simulateFailure, setSimulateFailureState] = useState(false);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [p, a, r, s] = await Promise.all([
        patientsService.list(),
        appointmentsService.list(),
        receivablesService.list(),
        settingsService.get(),
      ]);
      setPatients(p);
      setAppointments(a);
      setReceivables(r);
      setSettings(s);
      setStatus('success');
    } catch (e) {
      setError(getErrorMessage(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setSimulateFailure = useCallback((value: boolean) => {
    setSimulatedFailure(value);
    setSimulateFailureState(value);
  }, []);

  const actions = useMemo<AppActions>(() => {
    const savePatient = (p: Patient) => {
      setPatients((list) => upsert(list, p));
      return p;
    };
    const saveAppointment = (a: Appointment) => {
      setAppointments((list) => upsert(list, a));
      return a;
    };
    const saveReceivable = (r: Receivable) => {
      setReceivables((list) => upsert(list, r));
      return r;
    };

    return {
      createPatient: async (input) => savePatient(await patientsService.create(input)),
      updatePatient: async (id, input) => savePatient(await patientsService.update(id, input)),
      createAppointment: async (input) => saveAppointment(await appointmentsService.create(input)),
      rescheduleAppointment: async (id, input) => saveAppointment(await appointmentsService.reschedule(id, input)),
      cancelAppointment: async (id, reason) => saveAppointment(await appointmentsService.cancel(id, reason)),
      markNoShow: async (id) => saveAppointment(await appointmentsService.markNoShow(id)),
      completeAppointment: async (id, input) => {
        const result = await appointmentsService.complete(id, input);
        saveAppointment(result.appointment);
        if (result.receivable) saveReceivable(result.receivable);
        return result;
      },
      createReceivable: async (input) => saveReceivable(await receivablesService.create(input)),
      updateReceivable: async (id, input) => saveReceivable(await receivablesService.update(id, input)),
      markReceivablePaid: async (id, input) => saveReceivable(await receivablesService.markPaid(id, input)),
      cancelReceivable: async (id) => saveReceivable(await receivablesService.cancel(id)),
      updateSettings: async (input) => {
        const saved = await settingsService.update(input);
        setSettings(saved);
        return saved;
      },
      resetDemoData: async () => {
        await demoService.reset();
        await reload();
      },
    };
  }, [reload]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      status,
      error,
      patients,
      appointments,
      receivables,
      settings,
      simulateFailure,
      setSimulateFailure,
      reload,
      actions,
    }),
    [status, error, patients, appointments, receivables, settings, simulateFailure, setSimulateFailure, reload, actions],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData deve ser usado dentro de <AppDataProvider>.');
  return ctx;
}
