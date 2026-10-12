import { z } from "zod";

export const roofTypeSchema = z.enum(["gable", "shed", "hip", "other"]);
export type RoofType = z.infer<typeof roofTypeSchema>;

export const calculationStatusSchema = z.enum(["current", "stale", "invalid"]);
export type CalculationStatus = z.infer<typeof calculationStatusSchema>;

export const dataProvenanceSchema = z.enum([
  "verified",
  "user_provided",
  "estimated",
  "demo",
  "missing",
]);
export type DataProvenance = z.infer<typeof dataProvenanceSchema>;

export const resultIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["warning", "error"]),
  path: z.array(z.string()).default([]),
});
export type ResultIssue = z.infer<typeof resultIssueSchema>;

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const roofModelRevisionInputSchema = z.object({
  schemaVersion: z.string().min(1),
  dataOrigin: dataProvenanceSchema,
  payload: jsonObjectSchema,
});
export type RoofModelRevisionInput = z.infer<typeof roofModelRevisionInputSchema>;

export const calculationRevisionSnapshotSchema = z.object({
  schemaVersion: z.string().min(1),
  rawUserInputs: jsonObjectSchema,
  derivedResults: jsonObjectSchema,
  manualOverrides: jsonObjectSchema,
  dataSources: jsonObjectSchema,
  issues: z.array(resultIssueSchema),
});
export type CalculationRevisionSnapshot = z.infer<typeof calculationRevisionSnapshotSchema>;

export const calculationRevisionContractSchema = z.object({
  calculatorType: z.string().min(1),
  calculatorImplementationVersion: z.string().min(1),
  input: calculationRevisionSnapshotSchema,
  output: calculationRevisionSnapshotSchema,
  provenance: dataProvenanceSchema,
});
export type CalculationRevisionContract = z.infer<typeof calculationRevisionContractSchema>;
