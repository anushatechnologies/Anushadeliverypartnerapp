import { apiClient } from './apiClient';

export interface BankOption {
  id: number;
  name: string;
  shortCode: string;
  ifscPrefix: string;
}

export const bankService = {
  /** GET /api/banks/search?q=state → returns matching banks (max 10) */
  search: async (q: string): Promise<BankOption[]> => {
    const res = await apiClient.get('/api/banks/search', { params: { q } });
    return (res.data?.banks ?? []) as BankOption[];
  },

  /** GET /api/banks → returns all banks */
  getAll: async (): Promise<BankOption[]> => {
    const res = await apiClient.get('/api/banks');
    return (res.data?.banks ?? []) as BankOption[];
  },
};
