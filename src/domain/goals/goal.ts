import {
    CurrencyCode,
    GoalId,
    ISODateString,
    ISODateTimeString
} from "../../shared/types.js";

export interface Goal {
    id: GoalId;
    name: string;
    targetAmountMinor: number;
    currency: CurrencyCode;
    targetDate?: ISODateString;
    note?: string;
    createdAt: ISODateTimeString;
    updatedAt: ISODateTimeString;
    isDeleted: boolean;
}
