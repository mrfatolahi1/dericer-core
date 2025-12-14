import { StoragePort } from "../ports/storage-port.js";
import { TimePort } from "../ports/time-port.js";

import { Account } from "../domain/accounts/account.js";
import { Category } from "../domain/categories/category.js";
import { Budget } from "../domain/budgets/budget.js";
import { Goal } from "../domain/goals/goal.js";

import {
    txToDTO,
    createTransaction as svcCreateTx,
    updateTransaction as svcUpdateTx,
    softDeleteTransaction as svcSoftDeleteTx,
    createTransfer as svcCreateTransfer,
    queryTransactions as svcQueryTx,
    filterTransactions
} from "../application/transactions/transaction-service.js";

import {
    sumByAccount,
    sumByCategoryHierarchy,
    sumByCurrency
} from "../application/reports/report-service.js";

import {
    evaluateAllBudgets,
    evaluateBudgetById
} from "../application/budgets/budget-service.js";

import {
    createGoal as svcCreateGoal,
    updateGoal as svcUpdateGoal,
    listActiveGoals as svcListGoals
} from "../application/goals/goal-service.js";

import {
    computeAccountBalances,
    computeVisibleCurrencyTotals
} from "../application/accounts/account-service.js";

import {
    AccountDTO,
    AccountBalanceDTO,
    BudgetDTO,
    BudgetStatusDTO,
    CategoryDTO,
    GoalDTO,
    TransactionDTO,
    TransactionFilter,
    TransactionQueryResult,
    TransactionSort,
    TransactionKindDTO,
    SumByGroup
} from "./types.js";

import {
    AccountId,
    BudgetId,
    CategoryId,
    CurrencyCode,
    GoalId,
    TransactionId
} from "../shared/types.js";

export interface CoreDependencies {
    storage: StoragePort;
    time: TimePort;
}

export interface AccountsApi {
    listAll(): Promise<AccountDTO[]>;
    getById(id: AccountId): Promise<AccountDTO | undefined>;

    getBalances(): Promise<AccountBalanceDTO[]>;

    getCurrencyTotals(): Promise<SumByGroup<CurrencyCode>[]>;
}

export interface CategoriesApi {
    listAll(): Promise<CategoryDTO[]>;
}

export interface TransactionsApi {
    create(cmd: {
        accountId: AccountId;
        kind: TransactionKindDTO;
        amountMinor: number;
        currency: CurrencyCode;
        date: string;
        note?: string;
        categoryId?: CategoryId;
        tags?: string[];
        counterpartyName?: string;
    }): Promise<TransactionDTO>;

    createTransfer(cmd: {
        sourceAccountId: AccountId;
        targetAccountId: AccountId;
        currency: CurrencyCode;
        amountMinor: number;
        date: string;
        note?: string;
        tags?: string[];
        counterpartyName?: string;
    }): Promise<TransactionDTO[]>;

    update(
        id: TransactionId,
        changes: {
            kind?: TransactionKindDTO;
            amountMinor?: number;
            currency?: CurrencyCode;
            date?: string;
            note?: string;
            categoryId?: CategoryId | null;
            tags?: string[];
            counterpartyName?: string | null;
        }
    ): Promise<TransactionDTO>;

    softDelete(id: TransactionId): Promise<void>;

    query(
        filter?: TransactionFilter,
        sort?: TransactionSort
    ): Promise<TransactionQueryResult>;
}

export interface ReportsApi {
    queryTransactions(
        filter?: TransactionFilter,
        sort?: TransactionSort
    ): Promise<TransactionQueryResult>;

    sumByAccount(
        filter?: TransactionFilter
    ): Promise<SumByGroup<AccountId>[]>;

    sumByCategory(
        filter?: TransactionFilter
    ): Promise<SumByGroup<CategoryId>[]>;

    sumByCurrency(
        filter?: TransactionFilter
    ): Promise<SumByGroup<CurrencyCode>[]>;
}

export interface BudgetsApi {
    listAll(): Promise<BudgetDTO[]>;
    evaluateAll(): Promise<BudgetStatusDTO[]>;
    evaluateOne(id: BudgetId): Promise<BudgetStatusDTO>;
}

export interface GoalsApi {
    list(): Promise<GoalDTO[]>;
    create(cmd: {
        name: string;
        targetAmountMinor: number;
        currency: CurrencyCode;
        targetDate?: string;
        note?: string;
    }): Promise<GoalDTO>;
    update(
        id: GoalId,
        changes: {
            name?: string;
            targetAmountMinor?: number;
            currency?: CurrencyCode;
            targetDate?: string | null;
            note?: string | null;
            isDeleted?: boolean;
        }
    ): Promise<GoalDTO>;
}

export interface CoreApi {
    accounts: AccountsApi;
    categories: CategoriesApi;
    transactions: TransactionsApi;
    reports: ReportsApi;
    budgets: BudgetsApi;
    goals: GoalsApi;
}

function accountToDTO(acc: Account): AccountDTO {
    return {
        id: acc.id,
        name: acc.name,
        currency: acc.currency,
        initialBalanceMinor: acc.initialBalanceMinor,
        isArchived: acc.isArchived,
        isDeleted: acc.isDeleted,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt
    };
}

function categoryToDTO(cat: Category): CategoryDTO {
    return {
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId,
        isDeleted: cat.isDeleted
    };
}

function budgetToDTO(b: Budget): BudgetDTO {
    return {
        id: b.id,
        categoryId: b.categoryId,
        currency: b.currency,
        amountMinor: b.amountMinor,
        startDate: b.startDate,
        endDate: b.endDate,
        name: b.name,
        isDeleted: b.isDeleted
    };
}

function goalToDTO(g: Goal): GoalDTO {
    return {
        id: g.id,
        name: g.name,
        targetAmountMinor: g.targetAmountMinor,
        currency: g.currency,
        targetDate: g.targetDate,
        note: g.note,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        isDeleted: g.isDeleted
    };
}

export function createCore(deps: CoreDependencies): CoreApi {
    const { storage, time } = deps;

    const accountsApi: AccountsApi = {
        async listAll(): Promise<AccountDTO[]> {
            const all = await storage.loadAllAccounts();
            return all.filter((a) => !a.isDeleted).map(accountToDTO);
        },
        async getById(id: AccountId): Promise<AccountDTO | undefined> {
            const acc = await storage.getAccountById(id);
            return acc && !acc.isDeleted ? accountToDTO(acc) : undefined;
        },
        async getBalances(): Promise<AccountBalanceDTO[]> {
            const balances = await computeAccountBalances(storage);
            // AccountBalance has the same shape as AccountBalanceDTO
            return balances;
        },
        async getCurrencyTotals(): Promise<SumByGroup<CurrencyCode>[]> {
            return computeVisibleCurrencyTotals(storage);
        }
    };

    const categoriesApi: CategoriesApi = {
        async listAll(): Promise<CategoryDTO[]> {
            const all = await storage.loadAllCategories();
            return all.filter((c) => !c.isDeleted).map(categoryToDTO);
        }
    };

    const transactionsApi: TransactionsApi = {
        async create(cmd) {
            const tx = await svcCreateTx(storage, time, {
                accountId: cmd.accountId,
                kind: cmd.kind,
                amountMinor: cmd.amountMinor,
                currency: cmd.currency,
                date: cmd.date,
                note: cmd.note,
                categoryId: cmd.categoryId,
                tags: cmd.tags,
                counterpartyName: cmd.counterpartyName
            });
            return txToDTO(tx);
        },

        async createTransfer(cmd) {
            const [fromTx, toTx] = await svcCreateTransfer(storage, time, {
                sourceAccountId: cmd.sourceAccountId,
                targetAccountId: cmd.targetAccountId,
                currency: cmd.currency,
                amountMinor: cmd.amountMinor,
                date: cmd.date,
                note: cmd.note,
                tags: cmd.tags,
                counterpartyName: cmd.counterpartyName
            });
            return [txToDTO(fromTx), txToDTO(toTx)];
        },

        async update(id, changes) {
            const tx = await svcUpdateTx(storage, time, id, changes);
            return txToDTO(tx);
        },

        async softDelete(id) {
            await svcSoftDeleteTx(storage, time, id);
        },

        async query(filter, sort) {
            return svcQueryTx(storage, filter, sort);
        }
    };

    const reportsApi: ReportsApi = {
        async queryTransactions(filter, sort) {
            return svcQueryTx(storage, filter, sort);
        },

        async sumByAccount(filter) {
            const all = await storage.loadAllTransactions();
            const filtered = filterTransactions(all, filter);
            return sumByAccount(filtered);
        },

        async sumByCategory(filter) {
            const [allTx, categories] = await Promise.all([
                storage.loadAllTransactions(),
                storage.loadAllCategories()
            ]);
            const filtered = filterTransactions(allTx, filter);
            return sumByCategoryHierarchy(filtered, categories);
        },

        async sumByCurrency(filter) {
            const all = await storage.loadAllTransactions();
            const filtered = filterTransactions(all, filter);
            return sumByCurrency(filtered);
        }
    };

    const budgetsApi: BudgetsApi = {
        async listAll() {
            const all = await storage.loadAllBudgets();
            return all.filter((b) => !b.isDeleted).map(budgetToDTO);
        },

        async evaluateAll() {
            const statuses = await evaluateAllBudgets(storage);
            return statuses.map((s): BudgetStatusDTO => ({
                budget: budgetToDTO(s.budget),
                spentMinor: s.spentMinor,
                remainingMinor: s.remainingMinor,
                percentUsed: s.percentUsed
            }));
        },

        async evaluateOne(id: BudgetId) {
            const s = await evaluateBudgetById(storage, id);
            return {
                budget: budgetToDTO(s.budget),
                spentMinor: s.spentMinor,
                remainingMinor: s.remainingMinor,
                percentUsed: s.percentUsed
            };
        }
    };

    const goalsApi: GoalsApi = {
        async list() {
            const goals = await svcListGoals(storage);
            return goals.map(goalToDTO);
        },

        async create(cmd) {
            const g = await svcCreateGoal(storage, time, {
                name: cmd.name,
                targetAmountMinor: cmd.targetAmountMinor,
                currency: cmd.currency,
                targetDate: cmd.targetDate,
                note: cmd.note
            });
            return goalToDTO(g);
        },

        async update(id, changes) {
            const g = await svcUpdateGoal(storage, time, id, changes);
            return goalToDTO(g);
        }
    };

    return {
        accounts: accountsApi,
        categories: categoriesApi,
        transactions: transactionsApi,
        reports: reportsApi,
        budgets: budgetsApi,
        goals: goalsApi
    };
}
