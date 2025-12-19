# Dericer

![Dericer Logo](./logo.png)

> **Dericer** is a local-first, open-source personal finance **core** library.  
> It focuses on **clean domain logic**, **hexagonal architecture**, and **JSON-based storage**, so you can build desktop, mobile, or web apps around the same engine.

---

## ✨ Features (Core)

- **Local-first, single user**
    - No backend required. All data is stored locally (via pluggable storage, e.g. JSON files).
- **Multi-account support**
    - Each account has a fixed currency, initial balance, archive & soft-delete flags.
- **Multiple transaction types**
    - `income`, `expense`, `debt`, `receivable`
    - Transfers between accounts are represented as two linked transactions.
- **Hierarchical categories**
    - Parent / child categories (e.g. `Food > Supermarket`, `Food > Restaurant`)
    - Reports can roll up child categories into their parents.
- **Tags & counterparty**
    - Free-form tags (string list)
    - Simple `counterpartyName` field (no extra entity).
- **Multi-currency**
    - Each account has a `currency`.
    - Per-currency config (decimals, zero threshold).
    - Currency totals can hide “near zero” balances based on `zeroMinorValue`.
- **Budgets**
    - Budgets over a time range for a **single category** (including its subtree).
    - Used for **informational warnings** & analysis (no hard blocking of spending).
- **Goals**
    - Simple goals with `targetAmount`, `currency`, optional `targetDate` and notes.
- **Soft delete**
    - Transactions and accounts are soft-deleted (`isDeleted` flag).
- **Query & reporting**
    - Filter transactions by date, type, account, category, tags, counterparty, free text, amount…
    - Sort by date, createdAt, or amount.
    - Aggregate sums by account, category hierarchy, or currency.
- **Export**
    - Export transaction lists / query results as **JSON** or **CSV**.

---

## 🧱 Architecture Overview

Dericer is designed as a core library with **hexagonal architecture**:

- **Domain layer (`src/domain/`)**
    - Pure TypeScript models and business rules.
    - No knowledge of files, JSON, databases, UI, or HTTP.
- **Application layer (`src/application/`)**
    - Use-cases / services:
        - Transactions (create / update / soft-delete / query)
        - Reports (aggregations)
        - Budgets (evaluate status)
        - Goals (create / update / list)
        - Account balances
- **Ports (`src/ports/`)**
    - Interfaces for infrastructure:
        - `StoragePort` (persistence)
        - `TimePort` (clock)
- **API layer (`src/api/`)**
    - `createCore()` builds a `CoreApi` by injecting `StoragePort` + `TimePort`.
    - DTO types for use by UI / other apps.
- **Adapters (`src/adapters/`)**
    - Optional implementations for specific environments:
        - `JsonFileStorage` – a JSON file–based `StoragePort` (Node / desktop).
        - `SystemTimePort` – a `TimePort` based on system clock.

You can build a web app, desktop app (Tauri/Electron), or mobile app (React Native, etc.) that **all** talk to the same `CoreApi`.

---

## 📁 Folder Structure

```text
src/
  shared/
    types.ts          # Shared nominal types (IDs, ISO date strings, etc.)
    errors.ts         # Domain / validation / not-found errors
    money.ts          # Money & currency helpers (minor units, validation)

  domain/
    account.ts        # Account model
    transaction.ts    # Transaction model + basic validation
    category.ts       # Category model + tree helpers
    budget.ts         # Budget model
    goal.ts           # Goal model
    currency.ts       # CurrencyConfig + zero-value helpers

  ports/
    storage-port.ts   # StoragePort interface (accounts, transactions, etc.)
    time-port.ts      # TimePort interface

  application/
    transactions/
      transaction-service.ts   # Transaction commands + queries
    reports/
      report-service.ts        # Aggregations (by account/category/currency)
    budgets/
      budget-service.ts        # Budget evaluation
    goals/
      goal-service.ts          # Goal CRUD
    accounts/
      account-service.ts       # Account balance & currency totals

  api/
    types.ts          # Public DTOs & filter types for consumers
    core.ts           # CoreApi + createCore(...)
    export.ts         # Helpers to export reports to JSON / CSV

  adapters/
    json-file-storage.ts   # JSON file implementation of StoragePort (Node)
    system-time-port.ts    # SystemTimePort implementation of TimePort

  index.ts             # Main public exports
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 2. Build the library

```bash
npm run build
# outputs compiled JS + d.ts to dist/
```

---

## 🧩 Using Dericer Core in a Node / desktop app

A minimal example for using Dericer core in a Node-based environment (or a desktop app with a Node backend):

```ts
// example.ts
import {
  createCore,
  createJsonFileStorage,
  createSystemTimePort,
  CurrencyCode,
  AccountId,
  TransactionKindDTO
} from "dericer-core"; // or relative path if not yet published

async function main() {
  // 1. Create ports (storage + time)
  const dataDir = "./dericer-data"; // this directory will store JSON files
  const storage = createJsonFileStorage(dataDir);
  const time = createSystemTimePort();

  // 2. Create core
  const core = createCore({ storage, time });

  // 3. Suppose you already created an account and have its ID.
  //    For demo: pretend we have an existing AccountId string.
  const accountId = "my-account-id" as AccountId;
  const currency: CurrencyCode = "IRR";

  // 4. Create a transaction (expense)
  const tx = await core.transactions.create({
    accountId,
    kind: "expense" as TransactionKindDTO,
    amountMinor: 150000, // e.g. 150,000 rials (1,500.00 with 2 decimals)
    currency,
    date: "2025-01-15",
    note: "Groceries",
    tags: ["market", "food"]
  });

  console.log("Created transaction:", tx);

  // 5. Query transactions for this account
  const result = await core.transactions.query(
    { accountIds: [accountId] },
    { field: "date", direction: "asc" }
  );

  console.log("Found transactions:", result.transactions.length);

  // 6. Get account balances
  const balances = await core.accounts.getBalances();
  console.log("Account balances:", balances);

  // 7. Get currency totals (with zero-value filter)
  const currencyTotals = await core.accounts.getCurrencyTotals();
  console.log("Currency totals:", currencyTotals);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## 💾 JSON File Storage Layout

`JsonFileStorage` uses a **directory** as a simple local “database”.  
Each entity type is stored in a separate JSON file:

```text
dericer-data/
  accounts.json         # Array<Account>
  transactions.json     # Array<Transaction>
  categories.json       # Array<Category>
  budgets.json          # Array<Budget>
  goals.json            # Array<Goal>
  currency-configs.json # Array<CurrencyConfig>
```

Each file is a simple JSON array of the corresponding entities.  
The core only talks to these files via `StoragePort`;  
you are free to backup / sync / edit them externally if you like.

---

## 📊 Exporting Reports (JSON / CSV)

Dericer core can export transaction data and query results as JSON or CSV.  
Example:

```ts
import {
  createCore,
  createJsonFileStorage,
  createSystemTimePort,
  exportTransactionQueryResultToJson,
  exportTransactionQueryResultToCsv
} from "dericer-core";

async function exportExample() {
  const core = createCore({
    storage: createJsonFileStorage("./dericer-data"),
    time: createSystemTimePort()
  });

  const result = await core.transactions.query(
    { /* any filters you want */ },
    { field: "date", direction: "asc" }
  );

  const json = exportTransactionQueryResultToJson(result);
  const csv = exportTransactionQueryResultToCsv(result);

  // In your app, you can now write these strings to files:
  //   transactions.json, transactions.csv, etc.
  console.log(json);
  console.log(csv);
}
```

---

## 🧪 Testing

A typical test setup for Dericer might use:

- **Vitest** or **Jest** for unit tests
- Tests organized alongside layers, e.g.:

```text
test/
  domain/
    transaction.test.ts
    category.test.ts
  application/
    transaction-service.test.ts
    budget-service.test.ts
    account-service.test.ts
  api/
    core.test.ts
```

The exact setup is up to you, but the architecture is designed so that:

- **Domain** can be tested in isolation (pure functions / models).
- **Application services** can be tested with in-memory or fake storage/time ports.
- **API layer** can be tested end-to-end with a simple JSON storage adapter.

---

## ⚠️ Limitations / Notes

- Designed for **single-user, local-first** scenarios.
    - No guarantees for concurrent writes from multiple processes.
- Sync between devices is **not** handled by the core:
    - You can use Git, Syncthing, cloud drives, or your own tooling to sync the data directory.
- ID generation uses simple UUID-like strings based on `Math.random()`:
    - Perfectly fine for personal use.
    - You can swap this out for a stronger strategy if needed.

---

## 💬 Contributing / Ideas

- Add more advanced reports (cashflow, monthly charts, etc.).
- Implement different storage adapters (SQLite, IndexedDB, etc.).
- Extend the plugin API when UI layers (desktop/web/mobile) are ready.

Enjoy hacking on **Dericer** 🌱
