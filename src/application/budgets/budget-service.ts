import { StoragePort } from "../../ports/storage-port.js";
import { Budget } from "../../domain/budgets/budget.js";
import { Category, getDescendantCategoryIds } from "../../domain/categories/category.js";
import { Transaction } from "../../domain/transactions/transaction.js";
import { BudgetId, CategoryId } from "../../shared/types.js";
import { NotFoundError } from "../../shared/errors.js";
import { SumByGroup } from "../../api/types.js";
import { getSignedAmountMinor } from "../transactions/transaction-service.js";

export interface BudgetStatus {
    budget: Budget;
    spentMinor: number;
    remainingMinor: number;
    percentUsed: number;
}

function getBudgetCategoryScope(
    budget: Budget,
    categories: Category[]
): CategoryId[] {
    const descendants = getDescendantCategoryIds(budget.categoryId, categories);
    return [budget.categoryId, ...descendants];
}

export function calculateBudgetStatus(
    budget: Budget,
    transactions: Transaction[],
    categories: Category[]
): BudgetStatus {
    const scopeCategoryIds = new Set(
        getBudgetCategoryScope(budget, categories)
    );

    let spent = 0;

    for (const tx of transactions) {
        if (tx.isDeleted) continue;
        if (tx.currency !== budget.currency) continue;

        if (tx.date < budget.startDate || tx.date > budget.endDate) continue;

        if (tx.kind !== "expense") continue;

        if (!tx.categoryId || !scopeCategoryIds.has(tx.categoryId)) continue;

        const signed = getSignedAmountMinor(tx);
        spent += Math.abs(signed);
    }

    const remaining = budget.amountMinor - spent;
    const percentUsed =
        budget.amountMinor === 0
            ? spent > 0
                ? 100
                : 0
            : Math.min(100, Math.max(0, (spent / budget.amountMinor) * 100));

    return {
        budget,
        spentMinor: spent,
        remainingMinor: remaining,
        percentUsed
    };
}

export async function evaluateAllBudgets(
    storage: StoragePort
): Promise<BudgetStatus[]> {
    const [budgets, transactions, categories] = await Promise.all([
        storage.loadAllBudgets(),
        storage.loadAllTransactions(),
        storage.loadAllCategories()
    ]);

    const activeBudgets = budgets.filter((b) => !b.isDeleted);

    return activeBudgets.map((budget) =>
        calculateBudgetStatus(budget, transactions, categories)
    );
}

export async function evaluateBudgetById(
    storage: StoragePort,
    budgetId: BudgetId
): Promise<BudgetStatus> {
    const budget = await storage.getBudgetById(budgetId);
    if (!budget || budget.isDeleted) {
        throw new NotFoundError("Budget not found.");
    }

    const [transactions, categories] = await Promise.all([
        storage.loadAllTransactions(),
        storage.loadAllCategories()
    ]);

    return calculateBudgetStatus(budget, transactions, categories);
}

export function summarizeBudgetStatuses(
    statuses: BudgetStatus[]
): SumByGroup<BudgetId>[] {
    return statuses.map((s) => ({
        key: s.budget.id,
        totalMinor: s.spentMinor
    }));
}
