import { AccountId, CurrencyCode, ISODateTimeString } from "../../shared/types.js";

export interface Account {
    id: AccountId;
    name: string;
    currency: CurrencyCode;
    initialBalanceMinor: number;
    isArchived: boolean;
    isDeleted: boolean;
    createdAt: ISODateTimeString;
    updatedAt: ISODateTimeString;
}
