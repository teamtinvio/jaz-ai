import type { JazClient } from './client.js';
import type { JournalEntry, CurrencyExchangeRate } from './types.js';

export async function createTransferTrialBalance(
  client: JazClient,
  data: {
    valueDate: string;
    journalEntries: JournalEntry[]; // TTB uses journalEntries (NOT lines — this is a journal type)
    currency?: CurrencyExchangeRate;
    taxCurrency?: CurrencyExchangeRate;
  },
): Promise<{ data: { resourceId: string; reference: string } }> {
  return client.post('/api/v1/transfer-trial-balance', data);
}
