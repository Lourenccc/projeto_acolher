import type { ClinicSettings } from '@/types';
import { mockRequest } from './client';
import { getDb, resetDb } from './mockDb';

// Futuro: `${API_URL}/settings`
export const settingsService = {
  get(): Promise<ClinicSettings> {
    return mockRequest(() => getDb().settings);
  },

  update(input: ClinicSettings): Promise<ClinicSettings> {
    return mockRequest(() => {
      const db = getDb();
      db.settings = { ...input };
      return db.settings;
    });
  },
};

/** Ferramentas exclusivas do modo demonstração. */
export const demoService = {
  reset(): Promise<true> {
    return mockRequest(() => {
      resetDb();
      return true as const;
    });
  },
};
