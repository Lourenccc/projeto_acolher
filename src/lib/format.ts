import type { Cents } from '@/types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como moeda BRL (ex.: 15000 → "R$ 150,00"). */
export function formatCurrency(cents: Cents): string {
  return currencyFormatter.format(cents / 100);
}

/** Centavos → valor editável em campo de texto ("150,00"). */
export function centsToInput(cents: Cents): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Converte o texto digitado ("150", "150,5", "1.500,00", "R$ 150,00") em centavos.
 * Retorna `null` quando o valor não é um número válido.
 */
export function parseCurrencyInput(value: string): Cents | null {
  let v = value.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!v) return null;
  if (v.includes(',')) {
    v = v.replace(/\./g, '').replace(',', '.');
  } else if (!/^\d+\.\d{1,2}$/.test(v)) {
    v = v.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Máscara de telefone brasileiro: (11) 91234-5678 ou (11) 1234-5678. */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Remove acentos e caixa para buscas tolerantes. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function getInitials(name: string): string {
  const words = name
    .replace(/^(dra?|sra?|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
