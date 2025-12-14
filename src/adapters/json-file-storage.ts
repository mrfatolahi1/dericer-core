import { promises as fs } from "fs";
import * as path from "path";
import { StoragePort } from "../ports/storage-port.js";
import { Account } from "../domain/accounts/account.js";
import { Transaction } from "../domain/transactions/transaction.js";
import { Category } from "../domain/categories/category.js";
import { Budget } from "../domain/budgets/budget.js";
import { Goal } from "../domain/goals/goal.js";
import { CurrencyConfig } from "../shared/money.js";
import {
    AccountId,
    BudgetId,
    CategoryId,
    GoalId,
    TransactionId
} from "../shared/types.js";

const FILE_ACCOUNTS = "accounts.json";
const FILE_TRANSACTIONS = "transactions.json";
const FILE_CATEGORIES = "categories.json";
const FILE_BUDGETS = "budgets.json";
const FILE_GOALS = "goals.json";
const FILE_CURRENCY_CONFIGS = "currency-configs.json";

export class JsonFileStorage implements StoragePort {
    private readonly rootDir: string;

    constructor(rootDir: string) {
        this.rootDir = rootDir;
    }

    private getPath(fileName: string): string {
        return path.join(this.rootDir, fileName);
    }

    private async readJsonArray<T>(fileName: string): Promise<T[]> {
        const fullPath = this.getPath(fileName);
        try {
            const data = await fs.readFile(fullPath, "utf-8");
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                return parsed as T[];
            }
            return [];
        } catch (err: any) {
            if (err && err.code === "ENOENT") {
                return [];
            }
            throw err;
        }
    }

    private async writeJsonArray<T>(
        fileName: string,
        value: T[]
    ): Promise<void> {
        await fs.mkdir(this.rootDir, { recursive: true });
        const fullPath = this.getPath(fileName);
        const json = JSON.stringify(value, null, 2);
        await fs.writeFile(fullPath, json, "utf-8");
    }

    private static upsertById<T extends { id: string }>(
        items: T[],
        updated: T
    ): T[] {
        const index = items.findIndex((i) => i.id === updated.id);
        if (index >= 0) {
            const copy = items.slice();
            copy[index] = updated;
            return copy;
        }
        return [...items, updated];
    }

    private static findById<T extends { id: string }>(
        items: T[],
        id: string
    ): T | undefined {
        return items.find((i) => i.id === id);
    }

    async loadAllAccounts(): Promise<Account[]> {
        return this.readJsonArray<Account>(FILE_ACCOUNTS);
    }

    async saveAccount(account: Account): Promise<void> {
        const all = await this.loadAllAccounts();
        const updated = JsonFileStorage.upsertById(all, account);
        await this.writeJsonArray(FILE_ACCOUNTS, updated);
    }

    async getAccountById(id: AccountId): Promise<Account | undefined> {
        const all = await this.loadAllAccounts();
        return JsonFileStorage.findById(all, id as unknown as string);
    }

    async loadAllTransactions(): Promise<Transaction[]> {
        return this.readJsonArray<Transaction>(FILE_TRANSACTIONS);
    }

    async saveTransaction(transaction: Transaction): Promise<void> {
        const all = await this.loadAllTransactions();
        const updated = JsonFileStorage.upsertById(all, transaction);
        await this.writeJsonArray(FILE_TRANSACTIONS, updated);
    }

    async getTransactionById(
        id: TransactionId
    ): Promise<Transaction | undefined> {
        const all = await this.loadAllTransactions();
        return JsonFileStorage.findById(all, id as unknown as string);
    }

    async loadAllCategories(): Promise<Category[]> {
        return this.readJsonArray<Category>(FILE_CATEGORIES);
    }

    async saveCategory(category: Category): Promise<void> {
        const all = await this.loadAllCategories();
        const updated = JsonFileStorage.upsertById(all, category);
        await this.writeJsonArray(FILE_CATEGORIES, updated);
    }

    async getCategoryById(
        id: CategoryId
    ): Promise<Category | undefined> {
        const all = await this.loadAllCategories();
        return JsonFileStorage.findById(all, id as unknown as string);
    }

    async loadAllBudgets(): Promise<Budget[]> {
        return this.readJsonArray<Budget>(FILE_BUDGETS);
    }

    async saveBudget(budget: Budget): Promise<void> {
        const all = await this.loadAllBudgets();
        const updated = JsonFileStorage.upsertById(all, budget);
        await this.writeJsonArray(FILE_BUDGETS, updated);
    }

    async getBudgetById(id: BudgetId): Promise<Budget | undefined> {
        const all = await this.loadAllBudgets();
        return JsonFileStorage.findById(all, id as unknown as string);
    }

    async loadAllGoals(): Promise<Goal[]> {
        return this.readJsonArray<Goal>(FILE_GOALS);
    }

    async saveGoal(goal: Goal): Promise<void> {
        const all = await this.loadAllGoals();
        const updated = JsonFileStorage.upsertById(all, goal);
        await this.writeJsonArray(FILE_GOALS, updated);
    }

    async getGoalById(id: GoalId): Promise<Goal | undefined> {
        const all = await this.loadAllGoals();
        return JsonFileStorage.findById(all, id as unknown as string);
    }

    async loadCurrencyConfigs(): Promise<CurrencyConfig[]> {
        return this.readJsonArray<CurrencyConfig>(FILE_CURRENCY_CONFIGS);
    }

    async saveCurrencyConfigs(configs: CurrencyConfig[]): Promise<void> {
        await this.writeJsonArray(FILE_CURRENCY_CONFIGS, configs);
    }
}

export function createJsonFileStorage(rootDir: string): StoragePort {
    return new JsonFileStorage(rootDir);
}
