import type { ISODateTimeString } from "../../domain";

export interface ClockPort {
  now(): ISODateTimeString;
}

