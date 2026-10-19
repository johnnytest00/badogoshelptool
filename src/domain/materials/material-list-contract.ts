import { z } from "zod";
import { materialCategories, materialPriceKinds, materialPurchasingUnits } from "./contracts";

const uuid = z.string().uuid();

const itemSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["manual", "catalog"]),
  description: z.string().trim().min(1, "A tétel neve kötelező.").max(240),
  materialCategory: z.enum(materialCategories),
  categoryId: z.string().uuid().nullable().optional().default(null),
  quantity: z.string().trim().regex(/^\d{1,12}(?:[.,]\d{1,6})?$/, "Adj meg nullánál nagyobb mennyiséget, legfeljebb 6 tizedesjeggyel.").transform((value) => value.replace(",", ".")),
  unit: z.enum(materialPurchasingUnits),
  variantId: z.string().uuid().nullable(),
  priceId: z.string().uuid().nullable(),
  manualPriceAmount: z.string().trim().regex(/^(?:\d{1,12}(?:[.,]\d{1,2})?)?$/, "Az ár HUF-ban, legfeljebb két tizedesjeggyel adható meg.").transform((value) => value.replace(",", ".")),
  manualPriceKind: z.enum(materialPriceKinds).nullable(),
  sourceRef: z.discriminatedUnion("type", [
    z.object({ type: z.literal("measurement"), sectionId: uuid, measurementId: uuid }),
    z.object({ type: z.literal("calculation"), sectionId: uuid, calculationId: uuid, calculationRevisionId: uuid }),
    z.object({ type: z.literal("surveyGeometry"), sectionId: uuid, geometrySourceId: uuid }),
  ]).optional(),
}).superRefine((item, context) => {
  if (Number(item.quantity) <= 0) context.addIssue({ code: "custom", path: ["quantity"], message: "Adj meg nullánál nagyobb mennyiséget." });
  if (item.kind === "catalog" && (!item.variantId || !item.categoryId)) context.addIssue({ code: "custom", path: ["variantId"], message: "Válassz kategóriát és katalógusterméket." });
  if (item.kind === "manual" && (item.variantId || item.priceId || item.categoryId)) context.addIssue({ code: "custom", path: ["variantId"], message: "A kézi tételhez ne adj katalógus-hivatkozást." });
  if (item.sourceRef?.type === "measurement" && item.unit !== "linear_meter") context.addIssue({ code: "custom", path: ["unit"], message: "A szakaszhossz mértékegysége méter; darabra nem váltható." });
  if ((item.sourceRef?.type === "calculation" || item.sourceRef?.type === "surveyGeometry") && item.unit !== "square_meter") context.addIssue({ code: "custom", path: ["unit"], message: "A számított tetőfelület m²; más egységre nem váltható." });
  if (item.priceId && item.kind !== "catalog") context.addIssue({ code: "custom", path: ["priceId"], message: "Árat csak katalógustételhez lehet kapcsolni." });
  if (item.kind === "catalog" && item.priceId && item.manualPriceAmount) context.addIssue({ code: "custom", path: ["manualPriceAmount"], message: "A tételnek vagy katalógusára, vagy kézi ára lehet." });
  if (Boolean(item.manualPriceAmount) !== Boolean(item.manualPriceKind)) context.addIssue({ code: "custom", path: ["manualPriceAmount"], message: "Ár megadásakor válaszd ki, hogy nettó vagy bruttó." });
});

export const workflowMaterialListInputSchema = z.object({
  organizationId: z.string().uuid(),
  listId: z.string().uuid().nullable(),
  executionPlanId: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  expectedVersion: z.number().int().nonnegative(),
  requestKey: z.string().uuid(),
  items: z.array(itemSchema).max(200),
  surveySource: z.object({
    surveyId: uuid,
    surveyRevisionId: uuid,
    surveyVersion: z.number().int().positive(),
    allowStaleSource: z.boolean(),
  }).optional(),
}).superRefine((input, context) => {
  if (input.listId === null && input.expectedVersion !== 0) context.addIssue({ code: "custom", path: ["expectedVersion"], message: "Új lista verziója csak nulla lehet." });
  if (new Set(input.items.map((item) => item.id)).size !== input.items.length) context.addIssue({ code: "custom", path: ["items"], message: "Ismétlődő listaelem." });
  if (input.items.some((item) => item.sourceRef) && !input.surveySource) context.addIssue({ code: "custom", path: ["surveySource"], message: "A felmérés eredetű tételekhez pontos forrásrevízió szükséges." });
  if (input.surveySource && input.items.length === 0) context.addIssue({ code: "custom", path: ["items"], message: "Felmérésből legalább egy ellenőrzött mennyiséget vagy kézi tételt vegyél át." });
  if (input.surveySource && (input.listId !== null || input.executionPlanId !== null || input.expectedVersion !== 0)) context.addIssue({ code: "custom", path: ["surveySource"], message: "Felmérésből új, önálló anyaglista hozható létre." });
});

export type WorkflowMaterialListInput = z.infer<typeof workflowMaterialListInputSchema>;
