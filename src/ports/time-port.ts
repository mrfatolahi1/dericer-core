import { ISODateTimeString } from "../shared/types.js";

/**
 * Port for accessing current time.
 * This is abstracted so that:
 * - UIs can inject their own clock (e.g. for testing or offline scenarios)
 * - The core does not depend on Date.now() directly.
 */
export interface TimePort {
    now(): ISODateTimeString;
}
