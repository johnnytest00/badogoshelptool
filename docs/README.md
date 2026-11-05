# TetőPro dokumentáció

Az implementált működéshez a kód, az adatbázis-migrációk és a tényleges futtatási bizonyíték az irányadó. A [`PROJECT_BLUEPRINT.md`](../PROJECT_BLUEPRINT.md) célterv, a történeti audit pedig csak az adott időpontot bizonyítja.

## Gyors indulás

1. Válaszd ki a funkciót a [projektismereti könyvtárból](LIBRARY.md).
2. Nyisd meg a funkció [forrás-, szimbólum- és teszttérképét](maps/SOURCE_INDEX.md).
3. Adatbázis-feladatnál kövesd a [séma-, RPC-, RLS-, migráció- és pgTAP-térképet](maps/SCHEMA_INDEX.md).
4. Aktuális állapothoz olvasd a [fejlesztési állapot](PROGRESS.md) releváns szakaszát; történeti anyaghoz csak indokolt esetben nyúlj.

Az indexek navigációs segédletek, nem helyettesítik a jelenlegi kód, az alkalmazott migrációk és a ténylegesen futtatott tesztek ellenőrzését. Ellenőrzés: `node scripts/check-docs.mjs` a projekt gyökeréből.

## Aktuális témák és állapot

- [Fejlesztési állapot és legutóbbi bizonyíték](PROGRESS.md)
- [Tervrajz-kinyerési szabályok (M12)](AI_DRAWING_EXTRACTION_RULES.md)
- [Tervrajz-feldolgozás megvalósítási terv (M12)](AI_DRAWING_IMPLEMENTATION_PLAN.md)
- [Tervrajz-feldolgozás tesztmátrix (M12)](AI_DRAWING_TEST_MATRIX.md)
- Az M12.9 explicit tetőmunka export/import, forráshash-védelem és újraellenőrzési követelmények a [fejlesztési naplóban](PROGRESS.md) és az [M12 tesztmátrixban](AI_DRAWING_TEST_MATRIX.md) találhatók.
- Az M12.8.1 többszakaszos végső QA, adatvesztési figyelmeztetései és a böngészős ellenőrzés korlátai a [fejlesztési naplóban](PROGRESS.md) és az [M12 tesztmátrixban](AI_DRAWING_TEST_MATRIX.md) szerepelnek.
- Az M12.7 vizuális tetőszakasz-kijelölés és az egy szakaszra korlátozott anyagkigyűjtés állapotát a [fejlesztési napló](PROGRESS.md) és az [M12 tesztmátrix](AI_DRAWING_TEST_MATRIX.md) rögzíti.
- M12.6 guided roof-section takeoff and verification limits are recorded in [development progress](PROGRESS.md) and the [M12 test matrix](AI_DRAWING_TEST_MATRIX.md).
- [Projekt- és adatfolyam-térkép](PROJECT_MAP.md) (2026-10-17-i állapot, az M12-lefedettsége hiányos)
- [Fejlesztői átadás](CLAUDE_HANDOFF.md)
- [Codex-eszközleltár](AI_TOOLING.md)

## Részletes, aktív referenciák

- Adatbázis, RLS és migrációk: [DATABASE.md](DATABASE.md)
- QA-10 staging release preflight: [QA10_STAGING_RELEASE_VALIDATION.md](QA10_STAGING_RELEASE_VALIDATION.md)
- QA-09 migrációintegráció és release readiness: [QA09_MIGRATION_INTEGRATION_READINESS.md](QA09_MIGRATION_INTEGRATION_READINESS.md)
- Konstrukciós RPC trust boundary: [QA08_RPC01_TRUST_BOUNDARY.md](QA08_RPC01_TRUST_BOUNDARY.md)
- Számítási alapok: [CALCULATION_ENGINE.md](CALCULATION_ENGINE.md), [ROOF_CALCULATION_SPECIFICATION.md](ROOF_CALCULATION_SPECIFICATION.md)
- Kalkulátor lefedettség és matematika: [CALCULATOR_COVERAGE_MATRIX.md](CALCULATOR_COVERAGE_MATRIX.md), [CALCULATOR_MATH_VERIFICATION.md](CALCULATOR_MATH_VERIFICATION.md), [CALCULATOR_INPUT_OUTPUT_AUDIT.md](CALCULATOR_INPUT_OUTPUT_AUDIT.md)
- Felmérés/pilot: [PILOT_READINESS.md](PILOT_READINESS.md), [PILOT_TEST_PLAN.md](PILOT_TEST_PLAN.md), [PILOT_FEEDBACK_TEMPLATE.md](PILOT_FEEDBACK_TEMPLATE.md)
- Vercel Production DEMO előkészítés: [VERCEL_DEMO_PREFLIGHT.md](VERCEL_DEMO_PREFLIGHT.md)
- Ajánlat és önálló workflow: [STANDALONE_WORKFLOWS.md](STANDALONE_WORKFLOWS.md), [QUOTATION_FINALIZATION_DESIGN.md](QUOTATION_FINALIZATION_DESIGN.md)
- Tesztbizonyíték: [TEST_MATRIX.md](TEST_MATRIX.md), [CALCULATION_VERIFICATION_MATRIX.md](CALCULATION_VERIFICATION_MATRIX.md)

## Történeti anyagok

A korábbi mérföldkövek és auditok időponthoz kötött bizonyítékok; jelenlegi viselkedéshez ellenőrizd a kódot és a friss `PROGRESS.md` bejegyzést.

- [Korábbi előrehaladási részletek](archive/PROGRESS_HISTORY.md)
- [M10.1.10 végső numerikus QA és lezárási döntés](M10_PHASE1_FINAL_SIGNOFF.md)
- [M9.15 Karmi workflow UI/UX riport](M915_KARMI_WORKFLOW_UX.md)
- [Dokumentációs rendbetétel, F9.72](DOCUMENTATION_CLEANUP_F9.72.md)
- [DOCS.3 prioritásos javítási terv](DOCS3_REMEDIATION_PLAN.md)
- [DOCS.4 archiválás-előkészítő manifest](DOCS4_ARCHIVE_MANIFEST.md) — döntési lista, tényleges mozgatás nélkül
