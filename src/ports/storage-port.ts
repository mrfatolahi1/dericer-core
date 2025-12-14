import {
    AccountId,
    BudgetId,
    CategoryId,
    GoalId,
    TransactionId
} from "../shared/types.js";
import { Account } from "../domain/accounts/account.js";
import { Transaction } from "../domain/transactions/transaction.js";
import { Category } from "../domain/categories/category.js";
import { Budget } from "../domain/budgets/budget.js";
import { Goal } from "../domain/goals/goal.js";
import { CurrencyConfig } from "../shared/money.js";

export interface StoragePort {
    loadAllAccounts(): Promise<Account[]>;

    saveAccount(account: Account): Promise<void>;

    getAccountById(id: AccountId): Promise<Account | undefined>;

    loadAllTransactions(): Promise<Transaction[]>;

    saveTransaction(transaction: Transaction): Promise<void>;

    getTransactionById(id: TransactionId): Promise<Transaction | undefined>;

    loadAllCategories(): Promise<Category[]>;

    saveCategory(category: Category): Promise<void>;

    getCategoryById(id: CategoryId): Promise<Category | undefined>;

    loadAllBudgets(): Promise<Budget[]>;

    saveBudget(budget: Budget): Promise<void>;

    getBudgetById(id: BudgetId): Promise<Budget | undefined>;

    loadAllGoals(): Promise<Goal[]>;

    saveGoal(goal: Goal): Promise<void>;

    getGoalById(id: GoalId): Promise<Goal | undefined>;

    loadCurrencyConfigs(): Promise<CurrencyConfig[]>;

    saveCurrencyConfigs(configs: CurrencyConfig[]): Promise<void>;
}

export type TransactionTypeFilter =
    | "income"
    | "expense"
    | "debt"
    | "receivable";
