import { TimePort } from "../ports/time-port";
import { ISODateTimeString } from "../shared/types";

export class SystemTimePort implements TimePort {
    now(): ISODateTimeString {
        return new Date().toISOString();
    }
}

export function createSystemTimePort(): TimePort {
    return new SystemTimePort();
}
