import {StoragePort} from "../../ports/storage-port.js";
import {TimePort} from "../../ports/time-port.js";
import {Transaction, TransactionKind, validateTransactionBasic} from "../../domain/transactions/transaction.js";
import {NotFoundError, ValidationError} from "../../shared/errors.js";
import {
    TransactionFilter,
    TransactionKindDTO,
    TransactionQueryResult,
    TransactionSort,
    TransactionSortField
} from "../../api/types.js";
import {
    AccountId,
    CategoryId,
    CurrencyCode,
    ISODateString,
    TransactionId,
    TransferGroupId
} from "../../shared/types.js";

function toDomainKind(kind: TransactionKindDTO): TransactionKind {
    return kind;
}

export function getSignedAmountMinor(tx: Transaction): number {
    switch (tx.kind) {
        case "income":
        case "receivable":
            return tx.amountMinor;
        case "expense":
        case "debt":
            return -tx.amountMinor;
        default: {
            return tx.kind;
        }
    }
}

export function filterTransactions(
    transactions: Transaction[],
    filter?: TransactionFilter
): Transaction[] {
    if (!filter) {
        return transactions.filter((tx) => !tx.isDeleted);
    }

    return transactions.filter((tx) => {
        if (tx.isDeleted) return false;

        if (filter.accountIds && filter.accountIds.length > 0) {
            if (!filter.accountIds.includes(tx.accountId)) return false;
        }

        if (filter.categoryIds && filter.categoryIds.length > 0) {
            if (!tx.categoryId || !filter.categoryIds.includes(tx.categoryId)) {
                return false;
            }
        }

        if (filter.kinds && filter.kinds.length > 0) {
            if (!filter.kinds.includes(tx.kind)) return false;
        }

        if (filter.dateFrom && tx.date < filter.dateFrom) {
            return false;
        }

        if (filter.dateTo && tx.date > filter.dateTo) {
            return false;
        }

        if (
            filter.minAmountMinor !== undefined &&
            getSignedAmountMinor(tx) < filter.minAmountMinor
        ) {
            return false;
        }

        if (
            filter.maxAmountMinor !== undefined &&
            getSignedAmountMinor(tx) > filter.maxAmountMinor
        ) {
            return false;
        }

        if (filter.tags && filter.tags.length > 0) {
            const txTags = tx.tags ?? [];
            const hasAllTags = filter.tags.every((tag) => txTags.includes(tag));
            if (!hasAllTags) return false;
        }

        if (filter.counterpartyNameContains) {
            const needle = filter.counterpartyNameContains.toLowerCase();
            const hay = (tx.counterpartyName ?? "").toLowerCase();
            if (!hay.includes(needle)) return false;
        }

        if (filter.textSearch) {
            const needle = filter.textSearch.toLowerCase();
            const note = (tx.note ?? "").toLowerCase();
            const counterparty = (tx.counterpartyName ?? "").toLowerCase();
            const tags = (tx.tags ?? []).join(" ").toLowerCase();

            if (
                !note.includes(needle) &&
                !counterparty.includes(needle) &&
                !tags.includes(needle)
            ) {
                return false;
            }
        }

        return true;
    });
}

export function sortTransactions(
    transactions: Transaction[],
    sort?: TransactionSort
): Transaction[] {
    if (!sort) {
        return [...transactions].sort((a, b) => {
            if (a.date === b.date) {
                return a.createdAt.localeCompare(b.createdAt);
            }
            return a.date.localeCompare(b.date);
        });
    }

    const direction = sort.direction === "desc" ? -1 : 1;

    const getFieldValue = (tx: Transaction): string | number => {
        switch (sort.field as TransactionSortField) {
            case "date":
                return tx.date;
            case "createdAt":
                return tx.createdAt;
            case "amountMinor":
                return getSignedAmountMinor(tx);
            default: {
                return sort.field;
            }
        }
    };

    return [...transactions].sort((a, b) => {
        const av = getFieldValue(a);
        const bv = getFieldValue(b);

        if (typeof av === "number" && typeof bv === "number") {
            if (av === bv) return 0;
            return av < bv ? -1 * direction : 1 * direction;
        }

        // Compare as strings (date and createdAt)
        const as = String(av);
        const bs = String(bv);
        if (as === bs) return 0;
        return as < bs ? -1 * direction : 1 * direction;
    });
}

export function computeTotalSignedAmount(
    transactions: Transaction[]
): number {
    return transactions.reduce(
        (sum, tx) => sum + getSignedAmountMinor(tx),
        0
    );
}

export async function queryTransactions(
    storage: StoragePort,
    filter?: TransactionFilter,
    sort?: TransactionSort
): Promise<TransactionQueryResult> {
    const all = await storage.loadAllTransactions();
    const filtered = filterTransactions(all, filter);
    const sorted = sortTransactions(filtered, sort);
    const totalAmountMinor = computeTotalSignedAmount(filtered);

    return {
        transactions: sorted.map(txToDTO),
        totalCount: filtered.length,
        totalAmountMinor
    };
}

export interface CreateTransactionCommand {
    accountId: AccountId;
    kind: TransactionKindDTO;
    amountMinor: number;
    currency: CurrencyCode;
    date: ISODateString;
    note?: string;
    categoryId?: CategoryId;
    tags?: string[];
    counterpartyName?: string;
}

export interface UpdateTransactionCommand {
    kind?: TransactionKindDTO;
    amountMinor?: number;
    currency?: CurrencyCode;
    date?: ISODateString;
    note?: string;
    categoryId?: CategoryId | null;
    tags?: string[];
    counterpartyName?: string | null;
}

export interface CreateTransferCommand {
    sourceAccountId: AccountId;
    targetAccountId: AccountId;
    currency: CurrencyCode;
    amountMinor: number;
    date: ISODateString;
    note?: string;
    tags?: string[];
    counterpartyName?: string;
}

function buildTransaction(params: {
    id: TransactionId;
    accountId: AccountId;
    kind: TransactionKind;
    amountMinor: number;
    currency: CurrencyCode;
    date: ISODateString;
    note?: string;
    categoryId?: CategoryId;
    tags?: string[];
    counterpartyName?: string;
    transferGroupId?: TransferGroupId;
    createdAt: string;
    updatedAt: string;
}): Transaction {
    const tx: Transaction = {
        id: params.id,
        accountId: params.accountId,
        kind: params.kind,
        amountMinor: params.amountMinor,
        currency: params.currency,
        date: params.date,
        note: params.note,
        categoryId: params.categoryId,
        tags: params.tags,
        counterpartyName: params.counterpartyName,
        transferGroupId: params.transferGroupId,
        isDeleted: false,
        createdAt: params.createdAt,
        updatedAt: params.updatedAt
    };

    validateTransactionBasic(tx);
    return tx;
}

function generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export async function createTransaction(
    storage: StoragePort,
    time: TimePort,
    cmd: CreateTransactionCommand
): Promise<Transaction> {
    if (cmd.amountMinor <= 0) {
        throw new ValidationError("Transaction amount must be positive.");
    }

    const now = time.now();
    const id = generateId() as TransactionId;

    const tx = buildTransaction({
        id,
        accountId: cmd.accountId,
        kind: toDomainKind(cmd.kind),
        amountMinor: cmd.amountMinor,
        currency: cmd.currency,
        date: cmd.date,
        note: cmd.note,
        categoryId: cmd.categoryId,
        tags: cmd.tags,
        counterpartyName: cmd.counterpartyName,
        transferGroupId: undefined,
        createdAt: now,
        updatedAt: now
    });

    await storage.saveTransaction(tx);
    return tx;
}

export async function createTransfer(
    storage: StoragePort,
    time: TimePort,
    cmd: CreateTransferCommand
): Promise<[Transaction, Transaction]> {
    if (cmd.amountMinor <= 0) {
        throw new ValidationError("Transfer amount must be positive.");
    }

    const now = time.now();
    const groupId = generateId() as TransferGroupId;

    const debitId = generateId() as TransactionId;
    const creditId = generateId() as TransactionId;

    const base = {
        currency: cmd.currency,
        date: cmd.date,
        note: cmd.note,
        tags: cmd.tags,
        counterpartyName: cmd.counterpartyName,
        transferGroupId: groupId,
        createdAt: now,
        updatedAt: now
    };

    const fromTx = buildTransaction({
        id: debitId,
        accountId: cmd.sourceAccountId,
        kind: "expense",
        amountMinor: cmd.amountMinor,
        ...base
    });

    const toTx = buildTransaction({
        id: creditId,
        accountId: cmd.targetAccountId,
        kind: "income",
        amountMinor: cmd.amountMinor,
        ...base
    });

    await storage.saveTransaction(fromTx);
    await storage.saveTransaction(toTx);

    return [fromTx, toTx];
}

export async function updateTransaction(
    storage: StoragePort,
    time: TimePort,
    id: TransactionId,
    changes: UpdateTransactionCommand
): Promise<Transaction> {
    const existing = await storage.getTransactionById(id);
    if (!existing || existing.isDeleted) {
        throw new NotFoundError("Transaction not found.");
    }

    const updated: Transaction = {
        ...existing,
        kind: changes.kind ? toDomainKind(changes.kind) : existing.kind,
        amountMinor:
            changes.amountMinor !== undefined
                ? changes.amountMinor
                : existing.amountMinor,
        currency: changes.currency ?? existing.currency,
        date: changes.date ?? existing.date,
        note: changes.note ?? existing.note,
        categoryId:
            changes.categoryId === null ? undefined : changes.categoryId ?? existing.categoryId,
        tags: changes.tags ?? existing.tags,
        counterpartyName:
            changes.counterpartyName === null
                ? undefined
                : changes.counterpartyName ?? existing.counterpartyName,
        updatedAt: time.now()
    };

    validateTransactionBasic(updated);
    await storage.saveTransaction(updated);
    return updated;
}

export async function softDeleteTransaction(
    storage: StoragePort,
    time: TimePort,
    id: TransactionId
): Promise<void> {
    const existing = await storage.getTransactionById(id);
    if (!existing || existing.isDeleted) {
        // Idempotent: deleting an already deleted or missing transaction is a no-op.
        return;
    }

    const updated: Transaction = {
        ...existing,
        isDeleted: true,
        updatedAt: time.now()
    };

    await storage.saveTransaction(updated);
}

/**
 * Basic mapping from domain Transaction to public DTO.
 * For now they are almost identical.
 */
export function txToDTO(tx: Transaction) {
    return {
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
    };
}
