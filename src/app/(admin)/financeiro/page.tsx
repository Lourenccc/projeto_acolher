import type { Metadata } from 'next';
import { FinanceView } from '@/features/finance/FinanceView';

export const metadata: Metadata = { title: 'Financeiro' };

export default function FinanceiroPage() {
  return <FinanceView />;
}
