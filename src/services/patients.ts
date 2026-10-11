import type { ID, Patient, PatientInput } from '@/types';
import { toDateKey } from '@/lib/dates';
import { normalizeText } from '@/lib/format';
import { createId } from '@/lib/utils';
import { ApiError, mockRequest } from './client';
import { getDb } from './mockDb';

// Futuro: GET/POST/PUT `${API_URL}/patients`
export const patientsService = {
  list(): Promise<Patient[]> {
    return mockRequest(() => getDb().patients);
  },

  create(input: PatientInput): Promise<Patient> {
    return mockRequest(() => {
      const db = getDb();
      const name = normalizeText(input.name);
      if (db.patients.some((p) => normalizeText(p.name) === name)) {
        throw new ApiError('Já existe um paciente cadastrado com este nome.', 'CONFLICT');
      }
      const patient: Patient = { ...input, id: createId('pac'), createdAt: toDateKey(new Date()) };
      db.patients.push(patient);
      return patient;
    });
  },

  update(id: ID, input: PatientInput): Promise<Patient> {
    return mockRequest(() => {
      const db = getDb();
      const index = db.patients.findIndex((p) => p.id === id);
      if (index < 0) throw new ApiError('Paciente não encontrado.', 'NOT_FOUND');
      const name = normalizeText(input.name);
      if (db.patients.some((p) => p.id !== id && normalizeText(p.name) === name)) {
        throw new ApiError('Já existe outro paciente cadastrado com este nome.', 'CONFLICT');
      }
      const updated: Patient = { ...db.patients[index], ...input };
      db.patients[index] = updated;
      return updated;
    });
  },
};
