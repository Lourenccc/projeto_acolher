import { createMockData, type MockDataset } from '@/data/mockData';

/** "Banco" em memória do navegador. É recriado ao recarregar a página. */
let db: MockDataset | null = null;

export function getDb(): MockDataset {
  if (!db) db = createMockData(new Date());
  return db;
}

export function resetDb() {
  db = createMockData(new Date());
}
