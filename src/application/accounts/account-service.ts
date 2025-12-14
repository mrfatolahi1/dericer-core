import { StoragePort } from "../../ports/storage-port.js";
import { Account } from "../../domain/accounts/account.js";
import { Transaction } from "../../domain/transactions/transaction.js";
import { AccountId, CurrencyCode } from "../../shared/types.js";
import { CurrencyConfig } from "../../shared/money.js";
import { SumByGroup } from "../../api/types.js";
import {
    getCurrencyConfigOrThrow,
    isEffectivelyZero
} from "../../domain/currency/currency.js";
import { getSignedAmountMinor } from "../transactions/transaction-service.js";

export interface AccountBalance {
    accountId: AccountId;
    currency: CurrencyCode;
    balanceMinor: number;
}

export async function computeAccountBalances(
    storage: StoragePort
): Promise<AccountBalance[]> {
    const [accounts, transactions] = await Promise.all([
        storage.loadAllAccounts(),
        storage.loadAllTransactions()
    ]);

    const txByAccount = new Map<AccountId, number>();

    for (const tx of transactions) {
        if (tx.isDeleted) continue;
        const prev = txByAccount.get(tx.accountId) ?? 0;
        txByAccount.set(tx.accountId, prev + getSignedAmountMinor(tx));
    }

    const balances: AccountBalance[] = accounts.map((acc: Account) => {
        const txSum = txByAccount.get(acc.id) ?? 0;
        const balanceMinor = acc.initialBalanceMinor + txSum;
        return {
            accountId: acc.id,
            currency: acc.currency,
            balanceMinor
        };
    });

    return balances;
}

export async function computeCurrencyTotalsFromAccounts(
    storage: StoragePort
): Promise<SumByGroup<CurrencyCode>[]> {
    const balances = await computeAccountBalances(storage);

    const map = new Map<CurrencyCode, number>();

    for (const bal of balances) {
        const prev = map.get(bal.currency) ?? 0;
        map.set(bal.currency, prev + bal.balanceMinor);
    }

    return Array.from(map.entries()).map(([key, totalMinor]) => ({
        key,
        totalMinor
    }));
}

export async function computeVisibleCurrencyTotals(
    storage: StoragePort
): Promise<SumByGroup<CurrencyCode>[]> {
    const [totals, currencyConfigs] = await Promise.all([
        computeCurrencyTotalsFromAccounts(storage),
        storage.loadCurrencyConfigs()
    ]);

    const result: SumByGroup<CurrencyCode>[] = [];

    for (const item of totals) {
        const cfg: CurrencyConfig = getCurrencyConfigOrThrow(
            currencyConfigs,
            item.key
        );
        if (!isEffectivelyZero(item.totalMinor, cfg)) {
            result.push(item);
        }
    }

    return result;
}
