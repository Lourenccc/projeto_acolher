import type { Metadata } from 'next';
import { SettingsView } from '@/features/settings/SettingsView';

export const metadata: Metadata = { title: 'Configurações' };

export default function ConfiguracoesPage() {
  return <SettingsView />;
}
