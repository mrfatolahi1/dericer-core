import { Account } from "../domain/account.js";
import { Transaction } from "../domain/transaction.js";
import { Category } from "../domain/category.js";
import { Budget } from "../domain/budget.js";
import { Goal } from "../domain/goal.js";
import { CurrencyConfig } from "../shared/money.js";

/**
 * StoragePort defines the persistence operations that the core needs.
 * Core code will never depend on the implementation details.
 */
export interface StoragePort {
    loadAllAccounts(): Promise<Account[]>;

    saveAccount(account: Account): Promise<void>;

    loadAllTransactions(): Promise<Transaction[]>;

    saveTransaction(transaction: Transaction): Promise<void>;

    loadAllCategories(): Promise<Category[]>;

    saveCategory(category: Category): Promise<void>;

    loadAllBudgets(): Promise<Budget[]>;

    saveBudget(budget: Budget): Promise<void>;

    loadAllGoals(): Promise<Goal[]>;

    saveGoal(goal: Goal): Promise<void>;

    loadCurrencyConfigs(): Promise<CurrencyConfig[]>;

    saveCurrencyConfigs(configs: CurrencyConfig[]): Promise<void>;
}

export type TransactionTypeFilter =
    | "income"
    | "expense"
    | "debt"
    | "receivable";
