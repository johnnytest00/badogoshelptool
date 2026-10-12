export const calculationErrorCodes = [
  "INVALID_DIMENSION",
  "MISSING_REQUIRED_INPUT",
  "INVALID_GEOMETRY",
  "NUMERIC_OVERFLOW",
  "UNSUPPORTED_OPERATION",
  "VALIDATION_ERROR",
  "CALCULATION_ERROR",
] as const;

export type CalculationErrorCode = (typeof calculationErrorCodes)[number];

export type CalculationError = {
  code: CalculationErrorCode;
  message: string;
  path?: string[];
  details?: Record<string, unknown>;
};

export class DomainCalculationError extends Error {
  readonly issue: CalculationError;

  constructor(issue: CalculationError) {
    super(issue.message);
    this.name = "DomainCalculationError";
    this.issue = issue;
  }
}

export function calculationError(
  code: CalculationErrorCode,
  message: string,
  path?: string[],
  details?: Record<string, unknown>,
): DomainCalculationError {
  return new DomainCalculationError({ code, message, path, details });
}
