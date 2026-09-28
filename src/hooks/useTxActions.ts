import { useMemo } from 'react';
import { Mutation } from '../services/transactionService';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';
import { TransactionType } from '../types/transaction';

const FAILED = 'Something went wrong. Please try again.';

export const TYPE_NAMES: Record<TransactionType, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  unknown: 'Unknown',
};

/** User edits with confirmation toasts and undo. UI components call these, never the DB. */
export function useTxActions() {
  return useMemo(() => {
    const store = () => useTransactionStore.getState();
    const ui = () => useUiStore.getState();

    async function run(op: () => Promise<Mutation | null>, message: string) {
      try {
        const m = await op();
        if (!m || !m.after.length) return;
        ui().showToast(message, () => {
          store()
            .undo(m)
            .catch(() => ui().showToast(FAILED));
        });
      } catch {
        ui().showToast(FAILED);
      }
    }

    return {
      setCategory(id: string, category: string) {
        const remember = ui().rememberRule;
        ui().closeSheet();
        return run(() => store().setCategory(id, category, remember), `Categorized as ${category}${remember ? ' · rule saved' : ''}`);
      },
      rename(id: string, name: string) {
        ui().closeSheet();
        return run(() => store().renameMerchant(id, name), 'Merchant renamed');
      },
      setType(id: string, type: TransactionType) {
        ui().closeSheet();
        return run(() => store().setType(id, type), `Marked as ${TYPE_NAMES[type].toLowerCase()}`);
      },
      markTransfer(id: string) {
        return run(() => store().markTransfer(id), 'Marked as transfer');
      },
      ignore(id: string) {
        return run(() => store().setExcluded(id, true), 'Excluded from totals');
      },
      toggleExcluded(id: string, excluded: boolean) {
        return run(() => store().setExcluded(id, excluded), excluded ? 'Excluded from totals' : 'Included in totals');
      },
    };
  }, []);
}
