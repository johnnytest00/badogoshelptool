# DOCS.4 archiválási manifest

**Állapot:** EXECUTED WITH LIMITATIONS (2026-10-31). Mind a 23 dokumentum ellenőrzött: 9 aktív maradt, 4 felhasználói/tulajdonosi döntésre vár, 5 történeti dokumentum archívumba került, 1 már eleve archívumban volt, 4 párhuzamosan létrehozott és Gitben még nem követett fájl mozgatása blokkolt.

## Biztonsági kapu eredménye

Minden jelöltnél rögzítésre került az eredeti útvonal és SHA-256, a történeti jelölteknél a címsor-/anchorszám, a bejövő Markdown-hivatkozás és az agent/scriptfüggőség. A checker, teszt vagy automatizmus közvetlenül egyik mozgatott dokumentum útvonalától sem függött; a `CLAUDE.md` csak azt rögzíti, hogy a történeti leltár nem aktív belépési pont. Aktív tulajdonos nélküli Auth/org/RLS-, snapshot-, fotó-adatvédelmi, hosted/staging- vagy pilotkorlát nem került archívumba.

A mozgatás 26 bejövő linket frissített 11 fájlban. Az öt régi útvonalon rövid `HISTORICAL REDIRECT` maradt. A mozgatott dokumentumok törzstartalma változatlan; csak a működő kimenő relatív linkekhez szükséges célútvonalak módosultak.

## Dokumentumdöntések

| Dokumentum | Ellenőrzött státusz | Megőrzendő döntés / javasolt tulajdonos | DOCS.4 eredmény |
|---|---|---|---|
| [`README.md`](README.md) | ACTIVE — VERIFIED | hivatalos emberi belépési pont | helyben maradt; aktív céljai érvényesek |
| [`LIBRARY.md`](LIBRARY.md) | ACTIVE — VERIFIED | funkcióalapú navigáció és kockázati szerződések | helyben maradt; 31/31 funkció |
| [`maps/SOURCE_INDEX.md`](maps/SOURCE_INDEX.md) | ACTIVE — VERIFIED | forrás-, szimbólum-, teszt- és coverage-térkép | helyben maradt; 862/862 fájl lefedett |
| [`maps/SCHEMA_INDEX.md`](maps/SCHEMA_INDEX.md) | ACTIVE — VERIFIED | tábla/RPC/RLS/migráció/pgTAP térkép | helyben maradt; sémaszámok egyeznek |
| [`PROGRESS.md`](PROGRESS.md) | ACTIVE — VERIFIED | rövid aktuális állapot és legutóbbi futtatási bizonyíték | helyben maradt; a teljes történet külön archív |
| [`DATABASE.md`](DATABASE.md) | ACTIVE — VERIFIED | Auth/org/RLS/RPC/immutabilitás | helyben maradt; aktív biztonsági tulajdonos |
| [`AI_DRAWING_EXTRACTION_RULES.md`](AI_DRAWING_EXTRACTION_RULES.md) | ACTIVE — VERIFIED | OCR/PDF határ, jóváhagyás, M12.2 BLOCKED | helyben maradt; DRAW-* elsődleges szabálydokumentum |
| [`AI_DRAWING_TEST_MATRIX.md`](AI_DRAWING_TEST_MATRIX.md) | ACTIVE — VERIFIED | M12 kapuk, BLOCKED/NOT TESTED állapotok | helyben maradt; DRAW-* QA-tulajdonos |
| [`CALCULATOR_MATH_VERIFICATION.md`](CALCULATOR_MATH_VERIFICATION.md) | ACTIVE — VERIFIED | független matematikai fixture-ök és képlethatárok | helyben maradt; számítási QA-tulajdonos |
| [`AI_DRAWING_IMPLEMENTATION_PLAN.md`](AI_DRAWING_IMPLEMENTATION_PLAN.md) | REVIEW REQUIRED — KEEP | javasolt tulajdonos: DRAW-* feature maintainer + QA | döntés kell: M12 lezárásáig maradjon aktív; utána csak a nyitott kapuk Rules/Test Matrix dokumentumba kivonása után archiválható |
| [`PROJECT_MAP.md`](PROJECT_MAP.md) | REVIEW REQUIRED — KEEP | javasolt tulajdonos: repository/architecture maintainer | döntés kell: archiválható-e a 2026-10-17 snapshot, vagy szükséges egy rövid current architektúra-tulajdonos; automatikusan nem mozdult |
| [`CALCULATOR_COVERAGE_MATRIX.md`](CALCULATOR_COVERAGE_MATRIX.md) | REVIEW REQUIRED — KEEP | javasolt tulajdonos: calculator domain + QA | várhatóan aktív; csak a jelenlegi kalkulátorkatalógus és tesztlista teljes újraellenőrzése után minősíthető át |
| [`SHEET_METAL_PROFILE_DESIGN.md`](SHEET_METAL_PROFILE_DESIGN.md) | REVIEW REQUIRED — KEEP | javasolt tulajdonos: sheet-profile feature + database maintainer | aktív Library-hivatkozás miatt helyben marad; kód/migráció/paritás-döntés szükséges |
| [`archive/reference/funkciok-2026-10-17.md`](archive/reference/funkciok-2026-10-17.md) | HISTORICAL — ARCHIVED | 2026-10-17-i fájl- és funkcióleltár | `funkciok.md` helyéről mozgatva; redirect maradt |
| [`archive/audits/F9_29_SIMPLIFICATION_AUDIT.md`](archive/audits/F9_29_SIMPLIFICATION_AUDIT.md) | HISTORICAL — ARCHIVED | F9.29 egyszerűsítési audit | eredeti docs-útvonalról mozgatva; redirect maradt |
| [`archive/audits/F9_30_SIMPLIFICATION_AUDIT.md`](archive/audits/F9_30_SIMPLIFICATION_AUDIT.md) | HISTORICAL — ARCHIVED | F9.30 unused-fájl döntési bizonyíték | eredeti docs-útvonalról mozgatva; redirect maradt |
| [`archive/milestones/F9_38_CALCULATOR_COMPLETION_REPORT.md`](archive/milestones/F9_38_CALCULATOR_COMPLETION_REPORT.md) | HISTORICAL — ARCHIVED | kalkulátor-beviteli és ikonmérföldkövek | eredeti docs-útvonalról mozgatva; redirect maradt |
| [`archive/audits/PRODUCT_UX_WORKFLOW_AUDIT.md`](archive/audits/PRODUCT_UX_WORKFLOW_AUDIT.md) | HISTORICAL — ARCHIVED | korabeli termék- és workflow-audit | eredeti docs-útvonalról mozgatva; redirect maradt |
| [`archive/PROGRESS_HISTORY.md`](archive/PROGRESS_HISTORY.md) | HISTORICAL — ALREADY ARCHIVED | régi mérföldkő- és futtatási bizonyíték | helyben maradt; 240 címsor / 457 egyedi anchor |
| [`DOCUMENTATION_ARCHITECTURE_AUDIT.md`](DOCUMENTATION_ARCHITECTURE_AUDIT.md) | HISTORICAL — BLOCKED | DOCS.0 diagnózis; javasolt cél `docs/archive/audits/` | Gitben még nem követett, párhuzamos eredete nem bizonyítható; nem mozdult |
| [`M12_CLAUDE_AUDIT.md`](M12_CLAUDE_AUDIT.md) | HISTORICAL — BLOCKED | független M12 audit; javasolt cél `docs/archive/audits/` | Gitben még nem követett, párhuzamos eredete nem bizonyítható; nem mozdult |
| [`M12_CLAUDE_REVIEW_HANDOFF.md`](M12_CLAUDE_REVIEW_HANDOFF.md) | HISTORICAL — BLOCKED | M12 review-átadás; javasolt cél `docs/archive/handoffs/` | Gitben még nem követett, párhuzamos eredete nem bizonyítható; nem mozdult |
| [`TETOPRO_OPEN_SOURCE_TECH_RESEARCH.md`](TETOPRO_OPEN_SOURCE_TECH_RESEARCH.md) | HISTORICAL — BLOCKED | PDF/OCR kutatás és licencforrások; javasolt cél `docs/archive/research/` | Gitben még nem követett, párhuzamos eredete nem bizonyítható; nem mozdult |

## Mozgatási és tartalommegőrzési bizonyíték

| Eredeti → új útvonal | Címsor / anchor | Bejövő link | SHA-256 bizonyíték |
|---|---:|---:|---|
| `funkciok.md` → `docs/archive/reference/funkciok-2026-10-17.md` | 99 / 99 | 7 link, 7 forrás | eredeti `b1a6478c…`, archív `8e080c86…`; linkútvonal-visszanormalizálás után az eredeti hash egyezik |
| `docs/F9_29_SIMPLIFICATION_AUDIT.md` → `docs/archive/audits/F9_29_SIMPLIFICATION_AUDIT.md` | 9 / 9 | 6 link, 6 forrás | `1766a17b…` változatlan |
| `docs/F9_30_SIMPLIFICATION_AUDIT.md` → `docs/archive/audits/F9_30_SIMPLIFICATION_AUDIT.md` | 7 / 7 | 5 link, 5 forrás | `b92f7956…` változatlan |
| `docs/F9_38_CALCULATOR_COMPLETION_REPORT.md` → `docs/archive/milestones/F9_38_CALCULATOR_COMPLETION_REPORT.md` | 13 / 13 | 15 link, 7 forrás | eredeti `edc54379…`, archív `4b40d18e…`; linkútvonal-visszanormalizálás után az eredeti hash egyezik |
| `docs/PRODUCT_UX_WORKFLOW_AUDIT.md` → `docs/archive/audits/PRODUCT_UX_WORKFLOW_AUDIT.md` | 9 / 9 | 3 link, 3 forrás | eredeti `ceeb96d4…`, archív `614b6525…`; linkútvonal-visszanormalizálás után az eredeti hash egyezik |

Az archív példányokban kizárólag a mozgatás miatt szükséges relatív linkcélok változtak. A régi útvonalak redirectjei miatt a fájlszintű külső hivatkozások továbbra is használhatók; tetszőleges, repositoryn kívüli régi anchorhivatkozás automatikus átirányítása nem igazolható.

## Archiválás előtti SHA-256 nyilvántartás a 23 ellenőrzött dokumentumhoz

Az alábbi értékek a biztonsági kapu idején, minden DOCS.4 mozgatás és linkjavítás előtt készültek.

```text
cd73401571bddaa5fee84257459bdf1734c1618c9924617b2147bd03fb3940aa  docs/README.md
27966a6c50525b54a26acfda453334c3922de31f842d9e1bec33f34839d8f360  docs/LIBRARY.md
896c1fad41a66bcc9954f06068364d3cbd041be612787a346e138c9259615b60  docs/maps/SOURCE_INDEX.md
a87ca041dc03db73111badd50feec5830b4b0b366b1b8324f498662f54f95649  docs/maps/SCHEMA_INDEX.md
53a9839943210671a45733cea30530acf02dd6e8d71e0a0002bf77b452ddb597  docs/PROGRESS.md
eb327d661a9ae97a7cbe3506a500cf168f0c63ae4f6768feaeaffcdb18ad3a9e  docs/DATABASE.md
37c0674118ebe8b484a92b10ee312544253b6eb35183b7d4462ec10bf588b1d8  docs/AI_DRAWING_EXTRACTION_RULES.md
4117106c901fb5577838367aea46cfad5a87a27be3901115ddfb226cb9eabd1b  docs/AI_DRAWING_TEST_MATRIX.md
2c2f16370a03493d846b64df8c375af66143830a07365127d4e973454fefae3a  docs/CALCULATOR_MATH_VERIFICATION.md
662ee8d244810977452e48d701d69ef0a0163641e32983701d10e83669529526  docs/AI_DRAWING_IMPLEMENTATION_PLAN.md
dbf3c08df64cae3080a167e812da079125e40c416c95e0b1d545c2a6bbeac993  docs/PROJECT_MAP.md
04defb5b70e972a6e035a7b1cbb9cf0706b6252e097349fb4d37ad8f1f00552e  docs/CALCULATOR_COVERAGE_MATRIX.md
56bef0f2575694499a7e7f8fdac6d41c92dffc187a3586adfc1d5c64da31c8fa  docs/SHEET_METAL_PROFILE_DESIGN.md
b1a6478c62dfb36c1d0e998266cf25f5513fc54caf4c744cf4f694bba1ee0e8d  funkciok.md (archiválás előtti)
1766a17bc0d9bb0c1e88a2ffefea5d0c71020e39d087c82e5d54f3d9c2a55763  docs/F9_29_SIMPLIFICATION_AUDIT.md (archiválás előtti)
b92f7956a2f4ee726a77596c72d930e1a703a6d086d4124b53ff2696f8f0b42f  docs/F9_30_SIMPLIFICATION_AUDIT.md (archiválás előtti)
edc543792dce48d854df386c0626632f3dd0735d0e86e6ab1e33ff8305901cff  docs/F9_38_CALCULATOR_COMPLETION_REPORT.md (archiválás előtti)
ceeb96d4311a6d37eb429caddc7e012fd1475eeb95b4024bca4c172fbef74d73  docs/PRODUCT_UX_WORKFLOW_AUDIT.md (archiválás előtti)
e06287e90b0275cde49768cb5e1cec5e36274220fcbc05493290e57e4537fd57  docs/archive/PROGRESS_HISTORY.md
d60e9a3892f386f52369ec42fb999fda64ffcb323388cb4df7e99877c88cfdbe  docs/DOCUMENTATION_ARCHITECTURE_AUDIT.md
7d3fb05a02ce630294a80ab308e2e2de1b72bb13ca8721708bbe69eae1abe0d9  docs/M12_CLAUDE_AUDIT.md
0e3124befc709c4f170030bd45a21cf0ae417a909595365c994d12f3d53cdf8b  docs/M12_CLAUDE_REVIEW_HANDOFF.md
2ddb7b6bda6371d4b5e5c49a9260fad558662db2278de3f53494a158f0adffd7  docs/TETOPRO_OPEN_SOURCE_TECH_RESEARCH.md
```

## DOCS.4 döntési összesítő

- 9 `ACTIVE — VERIFIED`: helyben maradt.
- 4 `REVIEW REQUIRED — KEEP`: konkrét tulajdonos és felhasználói döntés szükséges; nem minősültek át.
- 5 `HISTORICAL — ARCHIVED`: ténylegesen mozgatva, redirecttel és linkjavítással.
- 1 `HISTORICAL — ALREADY ARCHIVED`: helyben maradt.
- 4 `HISTORICAL — BLOCKED`: Gitben még nem követett párhuzamos állapot miatt helyben maradt.
