import type { DateString } from "./types";
import type { FieldErrors } from "./validation";

export class NotFoundError extends Error {
  constructor(message = "Bench not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class InvalidInputError extends Error {
  constructor(public fieldErrors: FieldErrors) {
    super("Invalid input");
    this.name = "InvalidInputError";
  }
}

export class ConflictError extends Error {
  constructor(public nextAvailableDate: DateString) {
    super("Those dates overlap an existing adoption");
    this.name = "ConflictError";
  }
}

// The JSON body the API sends for any failure, and the form reads.
export type ApiErrorBody = {
  error: {
    code: "invalid_input" | "not_found" | "conflict" | "server_error";
    message: string;
    fieldErrors?: FieldErrors;
    nextAvailableDate?: DateString;
  };
};
