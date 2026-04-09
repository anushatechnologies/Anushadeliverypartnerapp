import { seededBanks } from '@/constants/banks';
import { apiClient } from './apiClient';

export interface BankOption {
  id: number;
  name: string;
  shortCode: string;
  ifscPrefix: string;
}

const sortBanks = (banks: BankOption[]) =>
  [...banks].sort((a, b) => a.name.localeCompare(b.name));

const searchLocalBanks = (query: string): BankOption[] => {
  const trimmed = query.trim().toLowerCase();
  const banks = sortBanks(seededBanks as BankOption[]);

  if (!trimmed) {
    return banks.slice(0, 10);
  }

  return banks
    .filter((bank) =>
      bank.name.toLowerCase().includes(trimmed) ||
      bank.shortCode.toLowerCase().includes(trimmed) ||
      bank.ifscPrefix.toLowerCase().includes(trimmed),
    )
    .slice(0, 10);
};

export const bankService = {
  /** GET /api/banks/search?q=state → returns matching banks (max 10) */
  search: async (q: string): Promise<BankOption[]> => {
    try {
      const res = await apiClient.get('/api/banks/search', { params: { q } });
      const banks = (res.data?.banks ?? []) as BankOption[];
      return banks.length > 0 ? banks : searchLocalBanks(q);
    } catch {
      return searchLocalBanks(q);
    }
  },

  /** GET /api/banks → returns all banks */
  getAll: async (): Promise<BankOption[]> => {
    try {
      const res = await apiClient.get('/api/banks');
      const banks = (res.data?.banks ?? []) as BankOption[];
      return banks.length > 0 ? sortBanks(banks) : sortBanks(seededBanks as BankOption[]);
    } catch {
      return sortBanks(seededBanks as BankOption[]);
    }
  },
};
