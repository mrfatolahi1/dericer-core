import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

import { createCore } from "../src/api/core.js";
import { createJsonFileStorage } from "../src/adapters/json-file-storage.js";
import type { StoragePort } from "../src/ports/storage-port.js";
import type { TimePort } from "../src/ports/time-port.js";
import type {
  ISODateTimeString,
  AccountId,
  CategoryId,
  BudgetId
} from "../src/shared/types.js";
import { Id } from "../src/shared/types.js";
import type { Account } from "../src/domain/accounts/account.js";
import type { Category } from "../src/domain/categories/category.js";
import type { Budget } from "../src/domain/budgets/budget.js";
import type { CurrencyCode } from "../src/shared/types.js";

class FixedTimePort implements TimePort {
  private readonly fixed: ISODateTimeString;

  constructor(fixed: ISODateTimeString) {
    this.fixed = fixed;
  }

  now(): ISODateTimeString {
    return this.fixed;
  }
}

describe("Dericer core - budgets integration", () => {
  let tempDir: string;
  let storage: StoragePort;
  let core: ReturnType<typeof createCore>;
  const FIXED_TIME: ISODateTimeString = "2025-01-01T00:00:00.000Z";

  let accountId: AccountId;
  let foodCategoryId: CategoryId;
  let restaurantCategoryId: CategoryId;
  let budgetId: BudgetId;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dericer-budgets-"));

    storage = createJsonFileStorage(tempDir);
    const time = new FixedTimePort(FIXED_TIME);
    core = createCore({ storage, time });

    // Seed account
    const account: Account = {
      id: Id.account("acc-main") as AccountId,
      name: "Main Wallet",
      currency: "IRR" as CurrencyCode,
      initialBalanceMinor: 0,
      isArchived: false,
      isDeleted: false,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME
    };
    await storage.saveAccount(account);
    accountId = account.id;

    // Seed categories: Food (parent) -> Restaurant (child)
    const food: Category = {
      id: Id.category("cat-food") as CategoryId,
      name: "Food",
      parentId: null,
      isDeleted: false
    };
    const restaurant: Category = {
      id: Id.category("cat-restaurant") as CategoryId,
      name: "Restaurant",
      parentId: food.id,
      isDeleted: false
    };
    await storage.saveCategory(food);
    await storage.saveCategory(restaurant);
    foodCategoryId = food.id;
    restaurantCategoryId = restaurant.id;

    // Seed a budget for Food category
    const budget: Budget = {
      id: Id.budget("budget-food-jan") as BudgetId,
      categoryId: food.id,
      currency: "IRR" as CurrencyCode,
      amountMinor: 10000,
      startDate: "2025-01-01",
      endDate: "2025-01-31",
      name: "January Food Budget",
      isDeleted: false
    };
    await storage.saveBudget(budget);
    budgetId = budget.id;
  });

  it("aggregates expenses in parent and child categories into budget status", async () => {
    // Expense in Restaurant (child of Food): 5,000
    await core.transactions.create({
      accountId,
      kind: "expense",
      amountMinor: 5000,
      currency: "IRR",
      date: "2025-01-10",
      note: "Dinner out",
      categoryId: restaurantCategoryId
    });

    // Expense directly in Food category: 3,000
    await core.transactions.create({
      accountId,
      kind: "expense",
      amountMinor: 3000,
      currency: "IRR",
      date: "2025-01-12",
      note: "Groceries",
      categoryId: foodCategoryId
    });

    // Expense in another category or without category - should not count
    await core.transactions.create({
      accountId,
      kind: "expense",
      amountMinor: 2000,
      currency: "IRR",
      date: "2025-01-15",
      note: "Other stuff without category"
    });

    // Evaluate single budget
    const status = await core.budgets.evaluateOne(budgetId);

    // Spent = 5000 + 3000 = 8000
    expect(status.spentMinor).toBe(8000);
    expect(status.remainingMinor).toBe(10000 - 8000);
    expect(Math.round(status.percentUsed)).toBe(80);

    // Also check evaluateAll returns the same info
    const allStatuses = await core.budgets.evaluateAll();
    expect(allStatuses.length).toBe(1);
    expect(allStatuses[0].spentMinor).toBe(8000);
  });
});
