import { TransactionDTO, TransactionQueryResult } from "./types.js";

export function exportTransactionsToJson(
    transactions: TransactionDTO[]
): string {
    return JSON.stringify(transactions, null, 2);
}

export function exportTransactionQueryResultToJson(
    result: TransactionQueryResult
): string {
    return JSON.stringify(result, null, 2);
}

export function exportTransactionsToCsv(
    transactions: TransactionDTO[]
): string {
    const header = [
        "id",
        "accountId",
        "kind",
        "amountMinor",
        "currency",
        "date",
        "note",
        "categoryId",
        "tags",
        "counterpartyName",
        "transferGroupId",
        "createdAt",
        "updatedAt",
        "isDeleted"
    ];

    const escapeCsv = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        // Escape quotes by doubling them
        const escaped = str.replace(/"/g, '""');
        // Wrap in quotes if contains comma, quote, or newline
        if (/[",\n]/.test(escaped)) {
            return `"${escaped}"`;
        }
        return escaped;
    };

    const rows = transactions.map((tx) => {
        const tagsJoined = tx.tags?.join(" ") ?? "";
        const values: (string | number | boolean | undefined)[] = [
            tx.id,
            tx.accountId,
            tx.kind,
            tx.amountMinor,
            tx.currency,
            tx.date,
            tx.note,
            tx.categoryId,
            tagsJoined,
            tx.counterpartyName,
            tx.transferGroupId,
            tx.createdAt,
            tx.updatedAt,
            tx.isDeleted
        ];
        return values.map(escapeCsv).join(",");
    });

    return [header.join(","), ...rows].join("\n");
}

export function exportTransactionQueryResultToCsv(
    result: TransactionQueryResult
): string {
    return exportTransactionsToCsv(result.transactions);
}
