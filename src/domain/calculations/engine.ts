import { z } from "zod";
import { CalculationError, calculationError, DomainCalculationError } from "@/domain/calculations/errors";

export type CalculationWarning = {
  code: string;
  message: string;
  path?: string[];
};

export type CalculationMetadata = {
  calculatorId: string;
  calculatorVersion: string;
  inputSchemaVersion: string;
  resultSchemaVersion: string;
};

export type CalculationSuccess<TOutput> = {
  ok: true;
  status: "success";
  output: TOutput;
  warnings: CalculationWarning[];
  metadata: CalculationMetadata;
};

export type CalculationFailure = {
  ok: false;
  status: "failure";
  errors: CalculationError[];
  warnings: CalculationWarning[];
  metadata: CalculationMetadata;
};

export type CalculationResult<TOutput> = CalculationSuccess<TOutput> | CalculationFailure;

export type CalculatorDefinition<TInput, TOutput> = {
  id: string;
  implementationVersion: string;
  inputSchemaVersion: string;
  resultSchemaVersion: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  calculate: (input: TInput) => TOutput;
};

function metadataFor<TInput, TOutput>(calculator: CalculatorDefinition<TInput, TOutput>): CalculationMetadata {
  return {
    calculatorId: calculator.id,
    calculatorVersion: calculator.implementationVersion,
    inputSchemaVersion: calculator.inputSchemaVersion,
    resultSchemaVersion: calculator.resultSchemaVersion,
  };
}

function zodErrors(error: z.ZodError): CalculationError[] {
  return error.issues.map((issue) => ({
    code: issue.code === "invalid_type" && "input" in issue && issue.input === undefined ? "MISSING_REQUIRED_INPUT" : "VALIDATION_ERROR",
    message: issue.message,
    path: issue.path.map(String),
  }));
}

export function executeCalculator<TInput, TOutput>(
  calculator: CalculatorDefinition<TInput, TOutput>,
  rawInput: unknown,
): CalculationResult<TOutput> {
  const metadata = metadataFor(calculator);
  const input = calculator.inputSchema.safeParse(rawInput);
  if (!input.success) {
    return { ok: false, status: "failure", errors: zodErrors(input.error), warnings: [], metadata };
  }

  try {
    const output = calculator.calculate(input.data);
    const verifiedOutput = calculator.outputSchema.safeParse(output);
    if (!verifiedOutput.success) {
      return { ok: false, status: "failure", errors: zodErrors(verifiedOutput.error), warnings: [], metadata };
    }
    return { ok: true, status: "success", output: verifiedOutput.data, warnings: [], metadata };
  } catch (error) {
    const issue = error instanceof DomainCalculationError
      ? error.issue
      : calculationError("CALCULATION_ERROR", "The calculator could not complete safely.").issue;
    return { ok: false, status: "failure", errors: [issue], warnings: [], metadata };
  }
}

export class CalculatorRegistry {
  private readonly calculators: ReadonlyMap<string, CalculatorDefinition<unknown, unknown>>;

  constructor(definitions: readonly CalculatorDefinition<unknown, unknown>[] = []) {
    const map = new Map<string, CalculatorDefinition<unknown, unknown>>();
    for (const definition of definitions) {
      this.registerInto(map, definition);
    }
    this.calculators = map;
  }

  private registerInto(map: Map<string, CalculatorDefinition<unknown, unknown>>, definition: CalculatorDefinition<unknown, unknown>): void {
    if (!definition.id.trim() || !definition.implementationVersion.trim() || !definition.inputSchemaVersion.trim() || !definition.resultSchemaVersion.trim()) {
      throw calculationError("VALIDATION_ERROR", "Calculator metadata must be non-empty.");
    }
    if (map.has(definition.id)) {
      throw calculationError("VALIDATION_ERROR", `Calculator '${definition.id}' is already registered.`);
    }
    map.set(definition.id, definition);
  }

  register<TInput, TOutput>(definition: CalculatorDefinition<TInput, TOutput>): CalculatorRegistry {
    const next = new Map(this.calculators);
    this.registerInto(next, definition as CalculatorDefinition<unknown, unknown>);
    return new CalculatorRegistry([...next.values()]);
  }

  resolve(id: string): CalculatorDefinition<unknown, unknown> {
    const definition = this.calculators.get(id);
    if (!definition) throw calculationError("UNSUPPORTED_OPERATION", `Unknown calculator '${id}'.`);
    return definition;
  }

  execute(id: string, rawInput: unknown): CalculationResult<unknown> {
    return executeCalculator(this.resolve(id), rawInput);
  }

  metadata(): CalculationMetadata[] {
    return [...this.calculators.values()].map(metadataFor);
  }
}

export function emptyCalculatorRegistry(): CalculatorRegistry {
  return new CalculatorRegistry();
}
