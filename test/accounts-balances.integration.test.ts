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
  AccountId
} from "../src/shared/types.js";
import { Id } from "../src/shared/types.js";
import type { Account } from "../src/domain/accounts/account.js";
import type { CurrencyConfig } from "../src/shared/money.js";
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

describe("Dericer core - account balances & currency totals", () => {
  let tempDir: string;
  let storage: StoragePort;
  let core: ReturnType<typeof createCore>;
  const FIXED_TIME: ISODateTimeString = "2025-01-01T00:00:00.000Z";

  let accIrrId: AccountId;
  let accUsdId: AccountId;
  let accEurId: AccountId;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dericer-accounts-"));

    storage = createJsonFileStorage(tempDir);
    const time = new FixedTimePort(FIXED_TIME);
    core = createCore({ storage, time });

    // Seed currency configs (with zeroMinorValue thresholds)
    const currencyConfigs: CurrencyConfig[] = [
      { currency: "IRR" as CurrencyCode, decimals: 2, zeroMinorValue: 1 },
      { currency: "USD" as CurrencyCode, decimals: 2, zeroMinorValue: 1 },
      { currency: "EUR" as CurrencyCode, decimals: 2, zeroMinorValue: 100 }
    ];
    await storage.saveCurrencyConfigs(currencyConfigs);

    // Seed three accounts
    const accIrr: Account = {
      id: Id.account("acc-irr") as AccountId,
      name: "IRR Account",
      currency: "IRR" as CurrencyCode,
      initialBalanceMinor: 1000,
      isArchived: false,
      isDeleted: false,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME
    };

    const accUsd: Account = {
      id: Id.account("acc-usd") as AccountId,
      name: "USD Account",
      currency: "USD" as CurrencyCode,
      initialBalanceMinor: 0,
      isArchived: false,
      isDeleted: false,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME
    };

    const accEur: Account = {
      id: Id.account("acc-eur") as AccountId,
      name: "EUR Account (small balance)",
      currency: "EUR" as CurrencyCode,
      initialBalanceMinor: 50, // below zeroMinorValue = 100
      isArchived: false,
      isDeleted: false,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME
    };

    await storage.saveAccount(accIrr);
    await storage.saveAccount(accUsd);
    await storage.saveAccount(accEur);

    accIrrId = accIrr.id;
    accUsdId = accUsd.id;
    accEurId = accEur.id;
  });

  it("computes account balances and filters small currency totals", async () => {
    // Transactions for IRR account:
    // +2000 (income), -500 (expense)
    await core.transactions.create({
      accountId: accIrrId,
      kind: "income",
      amountMinor: 2000,
      currency: "IRR",
      date: "2025-01-10",
      note: "Income IRR"
    });

    await core.transactions.create({
      accountId: accIrrId,
      kind: "expense",
      amountMinor: 500,
      currency: "IRR",
      date: "2025-01-11",
      note: "Expense IRR"
    });

    // Transactions for USD account:
    // +10000 (income)
    await core.transactions.create({
      accountId: accUsdId,
      kind: "income",
      amountMinor: 10000,
      currency: "USD",
      date: "2025-01-12",
      note: "Income USD"
    });

    // No transactions for EUR; balance stays 50 (below zeroMinorValue)

    const balances = await core.accounts.getBalances();
    expect(balances.length).toBe(3);

    const irrBalance = balances.find((b) => b.accountId === accIrrId);
    const usdBalance = balances.find((b) => b.accountId === accUsdId);
    const eurBalance = balances.find((b) => b.accountId === accEurId);

    expect(irrBalance).toBeDefined();
    expect(usdBalance).toBeDefined();
    expect(eurBalance).toBeDefined();

    // IRR: initial 1000 + 2000 - 500 = 2500
    expect(irrBalance!.balanceMinor).toBe(2500);

    // USD: initial 0 + 10000 = 10000
    expect(usdBalance!.balanceMinor).toBe(10000);

    // EUR: initial 50, no transactions
    expect(eurBalance!.balanceMinor).toBe(50);

    // Currency totals with zeroMinorValue filtering:
    const currencyTotals = await core.accounts.getCurrencyTotals();

    const currencies = currencyTotals.map((c) => c.key);
    expect(currencies).toContain("IRR");
    expect(currencies).toContain("USD");
    expect(currencies).not.toContain("EUR");

    const irrTotal = currencyTotals.find((c) => c.key === "IRR");
    const usdTotal = currencyTotals.find((c) => c.key === "USD");

    expect(irrTotal!.totalMinor).toBe(2500);
    expect(usdTotal!.totalMinor).toBe(10000);
  });
});
