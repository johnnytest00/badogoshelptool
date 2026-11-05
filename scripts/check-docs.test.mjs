import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  collectHeadingAnchors,
  matchCoveragePattern,
  validateMarkdownLinks,
} from "./check-docs.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

test("a magyar GitHub-anchor megtartja az ékezetet és sorszámozza az ismétlődő címsort", () => {
  const anchors = collectHeadingAnchors([
    "# F9.38.6 — Zhitov-referenciaszellemű 2.5D bélyegképek",
    "## Ár",
    "## Ár",
  ].join("\n"));

  assert.deepEqual([...anchors], [
    "f9386--zhitov-referenciaszellemű-25d-bélyegképek",
    "ár",
    "ár-1",
  ]);
});

test("a coverage-minta csak a saját részfáját fedi le", () => {
  assert.equal(
    matchCoveragePattern(
      "src/features/quotations/**",
      "src/features/quotations/quotation-editor.tsx",
    ),
    true,
  );
  assert.equal(
    matchCoveragePattern(
      "src/features/quotations/**",
      "src/features/calculations/standalone-actions.ts",
    ),
    false,
  );
});

test("a linkellenőrző megkülönbözteti a létező és a hibás magyar anchort", () => {
  const files = new Map([
    ["docs/target.md", "# Műszaki állapot\n"],
    [
      "docs/source.md",
      [
        "[jó](target.md#műszaki-állapot)",
        "[hibás](target.md#muszaki-allapot)",
      ].join("\n"),
    ],
  ]);

  assert.deepEqual(validateMarkdownLinks(files, ["docs/source.md"]), [
    {
      file: "docs/source.md",
      line: 2,
      target: "target.md#muszaki-allapot",
      type: "anchor",
    },
  ]);
});

test("navigáció: tetőanyag-kigyűjtési hiba → dokumentáció → kód → teszt", () => {
  assert.match(read("docs/README.md"), /LIBRARY\.md/);
  assert.match(read("docs/LIBRARY.md"), /ROOF-TAKEOFF[\s\S]*SOURCE_INDEX\.md#roof-takeoff/);
  assert.match(read("docs/maps/SOURCE_INDEX.md"), /ROOF-TAKEOFF[\s\S]*roof-material-takeoff/);
  assert.equal(exists("src/domain/calculations/roof-material-takeoff.ts"), true);
  assert.equal(exists("src/domain/calculations/roof-material-takeoff.test.ts"), true);
});

test("navigáció: tervrajzkalibráció és mérési adatátvitel → komponens → szabály → teszt", () => {
  assert.match(read("docs/README.md"), /LIBRARY\.md/);
  assert.match(read("docs/LIBRARY.md"), /DRAW-INTERPRET[\s\S]*SOURCE_INDEX\.md#draw-interpret/);
  const source = read("docs/maps/SOURCE_INDEX.md");
  assert.match(source, /DRAW-INTERPRET[\s\S]*drawing-calibration[\s\S]*drawing-field-transfer[\s\S]*plan-field-transfer/);
  assert.equal(exists("src/features/calculators/plan-field-transfer.tsx"), true);
  assert.equal(exists("src/features/calculators/drawing-calibration.ts"), true);
  assert.equal(exists("src/features/calculators/drawing-calibration.test.ts"), true);
  assert.equal(exists("src/features/calculators/drawing-field-transfer.test.ts"), true);
});

test("navigáció: kalkulációmentés és RLS → RPC/migráció → negatív DB-teszt", () => {
  assert.match(read("docs/README.md"), /SCHEMA_INDEX\.md/);
  assert.match(read("docs/LIBRARY.md"), /CALC-PERSIST[\s\S]*SCHEMA_INDEX\.md#calc-persist/);
  assert.match(read("docs/maps/SCHEMA_INDEX.md"), /CALC-PERSIST[\s\S]*save_standalone_construction_calculation[\s\S]*RLS/);
  assert.equal(exists("supabase/migrations/20261025100000_standalone_construction_calculations.sql"), true);
  assert.equal(exists("supabase/tests/database/060_calculation_rpc_trust_boundary.sql"), true);
  assert.equal(exists("supabase/tests/database/061_construction_field_transfer_attestation.sql"), true);
});
