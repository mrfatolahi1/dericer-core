export type ISODateTimeString = string;

export type ISODateString = string;

type Brand<K, T extends string> = K & { readonly __brand: T };

export type AccountId = Brand<string, "AccountId">;

export type TransactionId = Brand<string, "TransactionId">;

export type CategoryId = Brand<string, "CategoryId">;

export type BudgetId = Brand<string, "BudgetId">;

export type GoalId = Brand<string, "GoalId">;

export type TransferGroupId = Brand<string, "TransferGroupId">;

export type CurrencyCode = string;

export const Id = {
    account: (raw: string): AccountId => raw as AccountId,
    transaction: (raw: string): TransactionId => raw as TransactionId,
    category: (raw: string): CategoryId => raw as CategoryId,
    budget: (raw: string): BudgetId => raw as BudgetId,
    goal: (raw: string): GoalId => raw as GoalId,
    transferGroup: (raw: string): TransferGroupId => raw as TransferGroupId
};
