import { StoragePort } from "../../ports/storage-port.js";
import { Category, buildCategoryIndex, getAncestorCategoryIds } from "../../domain/categories/category.js";
import { Transaction } from "../../domain/transactions/transaction.js";
import {
    SumByGroup,
    TransactionFilter,
    TransactionSort,
    TransactionQueryResult
} from "../../api/types.js";
import { computeTotalSignedAmount, filterTransactions, sortTransactions, getSignedAmountMinor } from "../transactions/transaction-service.js";
import { AccountId, CategoryId, CurrencyCode } from "../../shared/types.js";


export function sumByAccount(
    transactions: Transaction[]
): SumByGroup<AccountId>[] {
    const map = new Map<AccountId, number>();

    for (const tx of transactions) {
        if (tx.isDeleted) continue;
        const prev = map.get(tx.accountId) ?? 0;
        map.set(tx.accountId, prev + getSignedAmountMinor(tx));
    }

    return Array.from(map.entries()).map(([key, totalMinor]) => ({
        key,
        totalMinor
    }));
}

export function sumByCategoryHierarchy(
    transactions: Transaction[],
    categories: Category[]
): SumByGroup<CategoryId>[] {
    const index = buildCategoryIndex(categories);
    const map = new Map<CategoryId, number>();

    for (const tx of transactions) {
        if (tx.isDeleted) continue;
        if (!tx.categoryId) continue;

        const signed = getSignedAmountMinor(tx);
        const categoryId = tx.categoryId;

        // Add to the category itself
        map.set(categoryId, (map.get(categoryId) ?? 0) + signed);

        // Add to all ancestors
        const ancestors = getAncestorCategoryIds(categoryId, index);
        for (const ancestorId of ancestors) {
            map.set(ancestorId, (map.get(ancestorId) ?? 0) + signed);
        }
    }

    return Array.from(map.entries()).map(([key, totalMinor]) => ({
        key,
        totalMinor
    }));
}

export async function queryAndSumByCategory(
    storage: StoragePort,
    filter?: TransactionFilter,
    sort?: TransactionSort
): Promise<{
    result: TransactionQueryResult;
    byCategory: SumByGroup<CategoryId>[];
}> {
    const [allTx, categories] = await Promise.all([
        storage.loadAllTransactions(),
        storage.loadAllCategories()
    ]);

    const filtered = filterTransactions(allTx, filter);
    const sorted = sortTransactions(filtered, sort);
    const totalAmountMinor = computeTotalSignedAmount(filtered);
    const byCategory = sumByCategoryHierarchy(filtered, categories);

    return {
        result: {
            transactions: sorted.map((tx) => ({
                id: tx.id,
                accountId: tx.accountId,
                kind: tx.kind,
                amountMinor: tx.amountMinor,
                currency: tx.currency,
                date: tx.date,
                note: tx.note,
                categoryId: tx.categoryId,
                tags: tx.tags,
                counterpartyName: tx.counterpartyName,
                transferGroupId: tx.transferGroupId,
                isDeleted: tx.isDeleted,
                createdAt: tx.createdAt,
                updatedAt: tx.updatedAt
            })),
            totalCount: filtered.length,
            totalAmountMinor
        },
        byCategory
    };
}


export function sumByCurrency(
    transactions: Transaction[]
): SumByGroup<CurrencyCode>[] {
    const map = new Map<CurrencyCode, number>();

    for (const tx of transactions) {
        if (tx.isDeleted) continue;
        const signed = getSignedAmountMinor(tx);
        const prev = map.get(tx.currency) ?? 0;
        map.set(tx.currency, prev + signed);
    }

    return Array.from(map.entries()).map(([key, totalMinor]) => ({
        key,
        totalMinor
    }));
}
