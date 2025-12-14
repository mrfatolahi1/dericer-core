import {
    BudgetId,
    CategoryId,
    CurrencyCode,
    ISODateString
} from "../../shared/types.js";

export interface Budget {
    id: BudgetId;
    categoryId: CategoryId;
    currency: CurrencyCode;
    amountMinor: number;
    startDate: ISODateString;
    endDate: ISODateString;
    name?: string;
    isDeleted: boolean;
}
