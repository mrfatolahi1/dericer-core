import {
    AccountId,
    CategoryId,
    ISODateString,
    ISODateTimeString,
    TransactionId,
    TransferGroupId,
    CurrencyCode
} from "../../shared/types.js";
import { ValidationError } from "../../shared/errors.js";

export type TransactionKind = "income" | "expense" | "debt" | "receivable";

export interface Transaction {
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
    isDeleted: boolean;
    createdAt: ISODateTimeString;
    updatedAt: ISODateTimeString;
}

export function validateTransactionBasic(tx: Transaction): void {
    if (!Number.isSafeInteger(tx.amountMinor)) {
        throw new ValidationError("Transaction amountMinor must be a safe integer.");
    }

    if (tx.amountMinor <= 0) {
        throw new ValidationError("Transaction amount must be strictly positive.");
    }

    if (!tx.date) {
        throw new ValidationError("Transaction date is required.");
    }
}
