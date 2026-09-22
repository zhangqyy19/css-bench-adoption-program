import { z } from "zod";
import { isValidDate } from "./dates";
import type { BenchQuery, StatusFilter } from "./types";

// Shared by the adopt form (instant feedback) and the API (the real check).

export const MAX_TERM_MONTHS = 120;
export const DEFAULT_TERM_MONTHS = 120; // the program's standard ten-year term
// The plaque holds up to seven lines of text
export const MAX_DEDICATION_LINES = 7;
export const MAX_DEDICATION_LENGTH = 280;
export const ANONYMOUS_NAME = "Anonymous";

export const adoptionInputSchema = z
  .object({
    donorName: z.string().trim().min(1, "Enter your name").max(100, "Name is too long"),
    donorEmail: z.email("Enter a valid email address").max(254, "Email is too long"),
    anonymous: z.boolean(),
    displayName: z.string().trim().max(60, "Display name is too long"),
    dedication: z
      .string()
      .trim()
      .max(MAX_DEDICATION_LENGTH, `Keep the inscription under ${MAX_DEDICATION_LENGTH} characters`)
      .refine(
        (text) => text.split(/\r?\n/).length <= MAX_DEDICATION_LINES,
        `The plaque holds up to ${MAX_DEDICATION_LINES} lines`,
      ),
    startDate: z.string().refine(isValidDate, "Choose a start date"),
    termMonths: z
      .number("Enter a length")
      .int("Use whole months")
      .min(1, "The minimum term is 1 month")
      .max(MAX_TERM_MONTHS, `The maximum term is ${MAX_TERM_MONTHS / 12} years`),
  })
  .refine((input) => input.anonymous || input.displayName.length > 0, {
    path: ["displayName"],
    message: "Enter the name to show publicly, or adopt anonymously",
  });

export type AdoptionInput = z.infer<typeof adoptionInputSchema>;

export type FieldErrors = Partial<Record<keyof AdoptionInput, string>>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof AdoptionInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

const STATUS_FILTERS: StatusFilter[] = ["all", "available", "adopted", "expiring"];

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Browsing never errors on a bad query string; unknown values fall back to defaults.
export function parseBenchQuery(params: RawParams): BenchQuery {
  const status = first(params.status) as StatusFilter;
  const page = Number.parseInt(first(params.page), 10);
  return {
    status: STATUS_FILTERS.includes(status) ? status : "all",
    area: first(params.area).slice(0, 100),
    q: first(params.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}
