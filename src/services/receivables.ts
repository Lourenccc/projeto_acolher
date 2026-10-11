import type { ID, MarkPaidInput, Receivable, ReceivableInput } from '@/types';
import { createId } from '@/lib/utils';
import { ApiError, mockRequest } from './client';
import { getDb } from './mockDb';

function find(id: ID): Receivable {
  const receivable = getDb().receivables.find((r) => r.id === id);
  if (!receivable) throw new ApiError('Título não encontrado.', 'NOT_FOUND');
  return receivable;
}

function assertPending(r: Receivable) {
  if (r.status !== 'pendente') {
    throw new ApiError('Somente títulos pendentes podem ser alterados.', 'VALIDATION');
  }
}

// Futuro: `${API_URL}/receivables`
export const receivablesService = {
  list(): Promise<Receivable[]> {
    return mockRequest(() => getDb().receivables);
  },

  create(input: ReceivableInput): Promise<Receivable> {
    return mockRequest(() => {
      const receivable: Receivable = {
        ...input,
        id: createId('tit'),
        appointmentId: null,
        status: 'pendente',
        paidAt: null,
        method: null,
      };
      getDb().receivables.push(receivable);
      return receivable;
    });
  },

  update(id: ID, input: ReceivableInput): Promise<Receivable> {
    return mockRequest(() => {
      const receivable = find(id);
      assertPending(receivable);
      Object.assign(receivable, input);
      return receivable;
    });
  },

  markPaid(id: ID, input: MarkPaidInput): Promise<Receivable> {
    return mockRequest(() => {
      const receivable = find(id);
      assertPending(receivable);
      receivable.status = 'pago';
      receivable.paidAt = input.paidAt;
      receivable.method = input.method;
      return receivable;
    });
  },

  cancel(id: ID): Promise<Receivable> {
    return mockRequest(() => {
      const receivable = find(id);
      assertPending(receivable);
      receivable.status = 'cancelado';
      return receivable;
    });
  },
};
