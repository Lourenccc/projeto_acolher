'use client';

import { useRef, useState, type FormEvent } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import type { ClinicSettings, ProfessionType, Weekday } from '@/types';
import { useAppData } from '@/store/AppDataProvider';
import { useToast } from '@/components/ui/Toast';
import { DataBoundary } from '@/components/layout/DataBoundary';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Switch } from '@/components/ui/Switch';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CheckboxField, SelectField, TextField } from '@/components/ui/Fields';
import { Skeleton } from '@/components/ui/States';
import { WEEKDAYS_LONG, WEEK_ORDER, pad2 } from '@/lib/dates';
import { DURATION_OPTIONS, PROFESSION_OPTIONS } from '@/lib/labels';
import { focusFirstInvalid, getErrorMessage } from '@/lib/utils';

export function SettingsView() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Dados do consultório, horários de atendimento e ferramentas da demonstração." />
      <DataBoundary skeleton={<Skeleton className="h-96 rounded-2xl" />}>
        <SettingsForm />
      </DataBoundary>
      {/* Fica fora do DataBoundary para continuar acessível mesmo em estado de erro. */}
      <DemoTools />
    </div>
  );
}

type Errors = Partial<Record<'professionalName' | 'clinicName' | 'workdayEndHour' | 'workingDays', string>>;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${pad2(h)}:00` }));

function SettingsForm() {
  const { settings, actions } = useAppData();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<ClinicSettings>(settings);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function toggleDay(day: Weekday, checked: boolean) {
    set('workingDays', checked ? [...values.workingDays, day] : values.workingDays.filter((d) => d !== day));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const e: Errors = {};
    if (values.professionalName.trim().length < 3) e.professionalName = 'Informe o nome de exibição (mínimo de 3 caracteres).';
    if (values.clinicName.trim().length < 3) e.clinicName = 'Informe o nome do consultório (mínimo de 3 caracteres).';
    if (values.workdayEndHour <= values.workdayStartHour) e.workdayEndHour = 'O término deve ser posterior ao início.';
    if (values.workingDays.length === 0) e.workingDays = 'Selecione ao menos um dia de atendimento.';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setSaving(true);
    try {
      await actions.updateSettings({
        ...values,
        professionalName: values.professionalName.trim(),
        clinicName: values.clinicName.trim(),
      });
      toast.success('Configurações salvas', 'As alterações já valem para a agenda.');
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-6">
      {formError && <Alert tone="error">{formError}</Alert>}

      <Card title="Consultório" description="Informações exibidas no topo do sistema.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Nome de exibição do profissional"
            required
            value={values.professionalName}
            onChange={(e) => set('professionalName', e.target.value)}
            error={errors.professionalName}
          />
          <TextField
            label="Nome do consultório"
            required
            value={values.clinicName}
            onChange={(e) => set('clinicName', e.target.value)}
            error={errors.clinicName}
          />
          <SelectField
            label="Área de atuação"
            value={values.profession}
            onChange={(e) => set('profession', e.target.value as ProfessionType)}
            options={PROFESSION_OPTIONS.map((o) => ({ value: o.value, label: o.label, disabled: !o.available }))}
            hint="Outras profissões da saúde serão suportadas em versões futuras."
          />
        </div>
      </Card>

      <Card title="Agenda" description="Faixa de horários exibida e duração padrão dos atendimentos.">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Início do expediente"
            value={String(values.workdayStartHour)}
            onChange={(e) => {
              set('workdayStartHour', Number(e.target.value));
              setErrors((x) => ({ ...x, workdayEndHour: undefined }));
            }}
            options={HOUR_OPTIONS}
          />
          <SelectField
            label="Término do expediente"
            value={String(values.workdayEndHour)}
            onChange={(e) => set('workdayEndHour', Number(e.target.value))}
            options={[...HOUR_OPTIONS.slice(1), { value: '24', label: '24:00' }]}
            error={errors.workdayEndHour}
          />
          <SelectField
            label="Duração padrão"
            value={String(values.defaultDurationMin)}
            onChange={(e) => set('defaultDurationMin', Number(e.target.value))}
            options={DURATION_OPTIONS}
          />
        </div>

        <fieldset className="mt-5" aria-describedby={errors.workingDays ? 'working-days-error' : undefined}>
          <legend className="mb-2 text-sm font-medium text-slate-700">Dias de atendimento</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WEEK_ORDER.map((d) => (
              <CheckboxField
                key={d}
                label={WEEKDAYS_LONG[d]}
                checked={values.workingDays.includes(d)}
                onChange={(checked) => toggleDay(d, checked)}
              />
            ))}
          </div>
          {errors.workingDays && (
            <p id="working-days-error" role="alert" className="mt-2 text-xs font-medium text-red-700">
              {errors.workingDays}
            </p>
          )}
        </fieldset>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" aria-hidden="true" />}>
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}

function DemoTools() {
  const { simulateFailure, setSimulateFailure, reload, actions } = useAppData();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function handleReset() {
    setResetting(true);
    setResetError(null);
    try {
      await actions.resetDemoData();
      setConfirmOpen(false);
      toast.success('Dados de demonstração restaurados');
    } catch (err) {
      setResetError(getErrorMessage(err));
    } finally {
      setResetting(false);
    }
  }

  return (
    <Card title="Ferramentas da demonstração" description="Recursos para explorar os estados da interface.">
      <div className="space-y-5">
        <Alert tone="info" title="Sobre esta versão">
          Esta é uma interface de demonstração: não há login, banco de dados nem segurança real. Os dados ficam apenas na
          memória do navegador e são recriados ao recarregar a página.
        </Alert>
        <Switch
          checked={simulateFailure}
          onChange={setSimulateFailure}
          label="Simular falha de comunicação com o servidor"
          description="Quando ativado, todas as operações retornam erro — útil para visualizar os estados de erro."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void reload()}>
            Recarregar dados
          </Button>
          <Button
            variant="danger-outline"
            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setResetError(null);
              setConfirmOpen(true);
            }}
          >
            Restaurar dados de demonstração
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleReset}
        title="Restaurar dados de demonstração?"
        description="Pacientes, agendamentos e títulos voltarão ao estado inicial."
        warning="Todas as alterações feitas nesta sessão serão perdidas."
        confirmLabel="Sim, restaurar"
        loading={resetting}
        error={resetError}
      />
    </Card>
  );
}
