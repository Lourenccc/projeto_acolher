import type { Metadata } from 'next';
import { PatientsView } from '@/features/patients/PatientsView';

export const metadata: Metadata = { title: 'Pacientes' };

export default function PacientesPage() {
  return <PatientsView />;
}
