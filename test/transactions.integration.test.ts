import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

import { createCore } from "../src/api/core.js";
import { createJsonFileStorage } from "../src/adapters/json-file-storage.js";
import type { StoragePort } from "../src/ports/storage-port.js";
import type { TimePort } from "../src/ports/time-port.js";
import type { ISODateTimeString, AccountId } from "../src/shared/types.js";
import { Id } from "../src/shared/types.js";
import type { Account } from "../src/domain/accounts/account.js";
import type { CurrencyCode } from "../src/shared/types.js";

/**
 * Simple fixed TimePort implementation for deterministic tests.
 */
class FixedTimePort implements TimePort {
  private readonly fixed: ISODateTimeString;

  constructor(fixed: ISODateTimeString) {
    this.fixed = fixed;
  }

  now(): ISODateTimeString {
    return this.fixed;
  }
}

describe("Dericer core - transactions integration", () => {
  let tempDir: string;
  let storage: StoragePort;
  let core: ReturnType<typeof createCore>;
  const FIXED_TIME: ISODateTimeString = "2025-01-01T00:00:00.000Z";

  beforeEach(async () => {
    // Create a fresh temporary directory for every test run
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dericer-transactions-"));

    // Create storage + time + core
    storage = createJsonFileStorage(tempDir);
    const time = new FixedTimePort(FIXED_TIME);
    core = createCore({ storage, time });

    // Seed a single IRR account
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
  });

  it("creates, queries and soft-deletes transactions correctly", async () => {
    const accounts = await core.accounts.listAll();
    expect(accounts.length).toBe(1);

    const accountId = accounts[0].id;

    // Create an expense transaction: -1000 IRR
    const expense = await core.transactions.create({
      accountId,
      kind: "expense",
      amountMinor: 1000,
      currency: "IRR",
      date: "2025-01-10",
      note: "Coffee",
      tags: ["food"]
    });

    // Create an income transaction: +2500 IRR
    const income = await core.transactions.create({
      accountId,
      kind: "income",
      amountMinor: 2500,
      currency: "IRR",
      date: "2025-01-11",
      note: "Salary",
      tags: ["job"]
    });

    expect(expense.id).toBeDefined();
    expect(income.id).toBeDefined();

    // Query all non-deleted transactions, sorted by date
    const result1 = await core.transactions.query(
      undefined,
      { field: "date", direction: "asc" }
    );

    expect(result1.totalCount).toBe(2);
    expect(result1.transactions[0].date <= result1.transactions[1].date).toBe(true);

    // Signed total: income (2500) + expense (-1000) = 1500
    expect(result1.totalAmountMinor).toBe(1500);

    // Soft-delete the expense
    await core.transactions.softDelete(expense.id);

    const result2 = await core.transactions.query(
      undefined,
      { field: "date", direction: "asc" }
    );

    // Only the income transaction should remain
    expect(result2.totalCount).toBe(1);
    expect(result2.transactions[0].id).toBe(income.id);
    expect(result2.totalAmountMinor).toBe(2500);
  });
});
