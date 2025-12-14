import {
    AccountId,
    BudgetId,
    CategoryId,
    CurrencyCode,
    GoalId,
    ISODateString,
    ISODateTimeString,
    TransactionId,
    TransferGroupId
} from "../shared/types.js";

export interface AccountDTO {
    id: AccountId;
    name: string;
    currency: CurrencyCode;
    initialBalanceMinor: number;
    isArchived: boolean;
    isDeleted: boolean;
    createdAt: ISODateTimeString;
    updatedAt: ISODateTimeString;
}

export interface CategoryDTO {
    id: CategoryId;
    name: string;
    parentId: CategoryId | null;
    isDeleted: boolean;
}

export type TransactionKindDTO = "income" | "expense" | "debt" | "receivable";

export interface TransactionDTO {
    id: TransactionId;
    accountId: AccountId;
    kind: TransactionKindDTO;
    amountMinor: number;
    currency: CurrencyCode;
    date: ISODateString;
    note?: string;
    categoryId?: CategoryId;
    tags?: string[];
    counterpartyName?: string;
    transferGroupId?: TransferGroupId;
    isDeleted: boolean;
    createdAt: ISODateTimeString;
    updatedAt: ISODateTimeString;
}

export interface BudgetDTO {
    id: BudgetId;
    categoryId: CategoryId;
    currency: CurrencyCode;
    amountMinor: number;
    startDate: ISODateString;
    endDate: ISODateString;
    name?: string;
    isDeleted: boolean;
}

export interface GoalDTO {
    id: GoalId;
    name: string;
    targetAmountMinor: number;
    currency: CurrencyCode;
    targetDate?: ISODateString;
    note?: string;
    createdAt: ISODateTimeString;
    updatedAt: ISODateTimeString;
    isDeleted: boolean;
}

export interface TransactionFilter {
    accountIds?: AccountId[];
    categoryIds?: CategoryId[];
    kinds?: TransactionKindDTO[];
    dateFrom?: ISODateString;
    dateTo?: ISODateString;
    minAmountMinor?: number;
    maxAmountMinor?: number;
    tags?: string[];
    counterpartyNameContains?: string;
    textSearch?: string; // search in note, tags, counterparty
}

export type TransactionSortField = "date" | "amountMinor" | "createdAt";

export type SortDirection = "asc" | "desc";

export interface TransactionSort {
    field: TransactionSortField;
    direction: SortDirection;
}

export interface SumByGroup<TKey> {
    key: TKey;
    totalMinor: number;
}

export interface TransactionQueryResult {
    transactions: TransactionDTO[];
    totalCount: number;
    totalAmountMinor?: number;
}

export interface BudgetStatusDTO {
    budget: BudgetDTO;
    spentMinor: number;
    remainingMinor: number;
    percentUsed: number;
}