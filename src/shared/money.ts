import { CurrencyCode } from "./types.js";
import { ValidationError } from "./errors.js";

export interface Money {
    currency: CurrencyCode;
    minorUnits: number;
}

export interface CurrencyConfig {
    currency: CurrencyCode;
    decimals: number;
    /**
     * Threshold below which a balance is considered zero for display.
     * Stored in minor units, e.g. 1 = 0.01 if decimals = 2.
     */
    zeroMinorValue: number;
}

export const MAX_AMOUNT_DIGITS = 15;

export function createMoney(
    currency: CurrencyCode,
    amount: number | string,
    decimals = 2
): Money {
    const minorUnits = toMinorUnits(amount, decimals);
    validateAmountDigits(minorUnits, decimals);
    return { currency, minorUnits };
}

export function toMinorUnits(amount: number | string, decimals: number): number {
    const factor = Math.pow(10, decimals);
    const numeric =
        typeof amount === "number" ? amount : parseFloat(amount.replace(",", "."));

    if (!Number.isFinite(numeric)) {
        throw new ValidationError(`Invalid amount: "${amount}"`);
    }

    const minorUnits = Math.round(numeric * factor);

    if (!Number.isSafeInteger(minorUnits)) {
        throw new ValidationError(
            `Amount is too large for safe integer representation: "${amount}"`
        );
    }

    return minorUnits;
}

export function fromMinorUnits(minorUnits: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return minorUnits / factor;
}

function validateAmountDigits(minorUnits: number, decimals: number): void {
    const absMinor = Math.abs(minorUnits);

    const wholePart = Math.floor(absMinor / Math.pow(10, decimals)).toString();
    const fractionalPart = (absMinor % Math.pow(10, decimals))
        .toString()
        .padStart(decimals, "0");

    const digits = wholePart + fractionalPart;
    if (digits.length > MAX_AMOUNT_DIGITS) {
        throw new ValidationError(
            `Amount exceeds maximum allowed ${MAX_AMOUNT_DIGITS} digits (including decimals).`
        );
    }
}
