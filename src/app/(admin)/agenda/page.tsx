import type { Metadata } from 'next';
import { AgendaView } from '@/features/agenda/AgendaView';

export const metadata: Metadata = { title: 'Agenda' };

export default function AgendaPage() {
  return <AgendaView />;
}
