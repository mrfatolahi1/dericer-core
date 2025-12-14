import { TimePort } from "./time-port.js";
import { ISODateTimeString } from "../shared/types.js";

export class SystemTimePort implements TimePort {
    now(): ISODateTimeString {
        return new Date().toISOString();
    }
}

export function createSystemTimePort(): TimePort {
    return new SystemTimePort();
}
