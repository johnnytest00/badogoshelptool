import { z } from "zod";

const positiveMm = z.number().int().positive().max(1_000_000);
const overlapMm = z.number().int().nonnegative().max(100_000);

/** Normalized user/product specification shared by roll and sheet covering work. */
export const roofCoveringProductParametersSchema = z.object({
  form: z.enum(["roll", "sheet"]),
  nominalWidthMm: positiveMm.optional(),
  effectiveCoveringWidthMm: positiveMm.optional(),
  physicalLengthMm: positiveMm.optional(),
  usableCoveringLengthMm: positiveMm.optional(),
  sideOverlapMm: overlapMm.optional(),
  endOverlapMm: overlapMm.optional(),
  installationDirection: z.enum(["eave-to-ridge", "ridge-to-eave", "left-to-right", "right-to-left"]).optional(),
  minimumPhysicalLengthMm: positiveMm.optional(),
  maximumPhysicalLengthMm: positiveMm.optional(),
  canCutAcrossWidth: z.boolean().optional(),
  canCutAlongLength: z.boolean().optional(),
  manufacturerConstraintReference: z.string().trim().min(1).max(200).optional(),
}).strict().superRefine((parameters, context) => {
  if (parameters.nominalWidthMm !== undefined && parameters.effectiveCoveringWidthMm !== undefined
    && parameters.effectiveCoveringWidthMm > parameters.nominalWidthMm) {
    context.addIssue({ code: "custom", path: ["effectiveCoveringWidthMm"], message: "A hasznos fedési szélesség nem lehet nagyobb a névleges szélességnél." });
  }
  if (parameters.physicalLengthMm !== undefined && parameters.usableCoveringLengthMm !== undefined
    && parameters.usableCoveringLengthMm > parameters.physicalLengthMm) {
    context.addIssue({ code: "custom", path: ["usableCoveringLengthMm"], message: "A használható fedési hossz nem lehet nagyobb a fizikai hossznál." });
  }
  if (parameters.physicalLengthMm !== undefined && parameters.endOverlapMm !== undefined
    && parameters.endOverlapMm >= parameters.physicalLengthMm) {
    context.addIssue({ code: "custom", path: ["endOverlapMm"], message: "A végtoldásnak kisebbnek kell lennie a fizikai hossznál." });
  }
  if (parameters.nominalWidthMm !== undefined && parameters.sideOverlapMm !== undefined
    && parameters.sideOverlapMm >= parameters.nominalWidthMm) {
    context.addIssue({ code: "custom", path: ["sideOverlapMm"], message: "Az oldalátfedésnek kisebbnek kell lennie a névleges szélességnél." });
  }
  if (parameters.minimumPhysicalLengthMm !== undefined && parameters.maximumPhysicalLengthMm !== undefined
    && parameters.minimumPhysicalLengthMm > parameters.maximumPhysicalLengthMm) {
    context.addIssue({ code: "custom", path: ["minimumPhysicalLengthMm"], message: "A minimum fizikai hossz nem lehet nagyobb a maximumnál." });
  }
  if (parameters.physicalLengthMm !== undefined
    && ((parameters.minimumPhysicalLengthMm !== undefined && parameters.physicalLengthMm < parameters.minimumPhysicalLengthMm)
      || (parameters.maximumPhysicalLengthMm !== undefined && parameters.physicalLengthMm > parameters.maximumPhysicalLengthMm))) {
    context.addIssue({ code: "custom", path: ["physicalLengthMm"], message: "A fizikai hossz kívül esik a megadott terméktartományon." });
  }
});

export type RoofCoveringProductParameters = z.infer<typeof roofCoveringProductParametersSchema>;
