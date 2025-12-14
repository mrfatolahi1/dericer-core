import { CurrencyCode } from "../../shared/types.js";
import { CurrencyConfig } from "../../shared/money.js";
import { ValidationError } from "../../shared/errors.js";

export function createCurrencyConfig(params: {
    currency: CurrencyCode;
    decimals?: number;
    zeroMinorValue?: number;
}): CurrencyConfig {
    const decimals = params.decimals ?? 2;

    if (decimals < 0 || decimals > 6) {
        throw new ValidationError("Currency decimals must be between 0 and 6.");
    }

    const zeroMinorValue =
        params.zeroMinorValue !== undefined ? params.zeroMinorValue : 0;

    if (zeroMinorValue < 0) {
        throw new ValidationError("zeroMinorValue cannot be negative.");
    }

    return {
        currency: params.currency,
        decimals,
        zeroMinorValue
    };
}

export function getCurrencyConfigOrThrow(
    configs: CurrencyConfig[],
    currency: CurrencyCode
): CurrencyConfig {
    const cfg = configs.find((c) => c.currency === currency);
    if (!cfg) {
        throw new ValidationError(
            `No currency configuration found for currency "${currency}".`
        );
    }
    return cfg;
}

export function isEffectivelyZero(
    minorUnits: number,
    config: CurrencyConfig
): boolean {
    return Math.abs(minorUnits) < config.zeroMinorValue;
}
