# DOCS.3 prioritásos javítási terv

**Állapot:** IMPLEMENTED (2026-10-31) a DOCS.3 hatókörében. A végrehajtás nem archivált, nem törölt és nem írt át történeti bizonyítékot; a DOCS.4 döntéseit a [külön manifest](DOCS4_ARCHIVE_MANIFEST.md) készíti elő.

## P0: egymásnak ellentmondó aktuális állítás

- [AI_DRAWING_EXTRACTION_RULES.md](AI_DRAWING_EXTRACTION_RULES.md): az aktuális M12-szakasz a helyi Tesseract.js 7.0.0 implementációt írja le, a későbbi M12.1 történeti rész viszont még azt állítja, hogy nincs telepítve. A javítás az utóbbit egyértelműen dátumozott történeti döntéssé minősíti, az eredeti bizonyíték megtartásával.
- Megőrzendő biztonsági korlátok: M12.2 OCR műszaki pontosság `BLOCKED`; confidence nem műszaki pontosság; OCR-ből nincs automatikus numerikus mezőkitöltés; a kliensoldali fájl-, oldal-, pixel- és memóriahatárok nem jelentenek fizikai mobilgaranciát.

## P1: aktív navigációból kivezetendő elavult leltárak

- [funkciok.md](archive/reference/funkciok-2026-10-17.md): a 2026-10-17-i részletes fájlexport történeti snapshot maradjon. Az aktuális funkciónavigáció tulajdonosa a [LIBRARY.md](LIBRARY.md) és a [SOURCE_INDEX.md](maps/SOURCE_INDEX.md); a még érvényes üzleti és biztonsági összefoglalókat csak ellenőrzött forrás alapján szabad kivonni.
- [PROJECT_MAP.md](PROJECT_MAP.md): a 2026-10-17-i rendszerkép továbbra is használható történeti architektúra-bizonyítékként, de az M12 PDF/OCR/kalibráció/szakasz/munkamenet lefedettsége hiányos. Frissítéskor a mai kód, tesztek és migrációk az irányadók.
- Megőrzendő műszaki döntések: UI → alkalmazás → domain rétegirány, adapteres infrastruktúra, actor/org/RLS határ, immutable forrás- és üzleti revízió, idempotencia és konkurenciavédelem.

## P1: 26 történeti anchorhiba — JAVÍTVA

- A `node scripts/check-docs.mjs` által felsorolt 26 hivatkozás mindegyike ugyanazon meglévő címsor ékezet nélküli, ezért hibás GitHub-slugjára mutatott. Mind a 26 link célzottan a tényleges Unicode-slugra módosult; nincs általános kivétel, címsor-átírás vagy checker-lazítás.
- Érintett hivatkozó dokumentumok: `CALCULATOR_COVERAGE_MATRIX.md`, `CALCULATOR_MATH_VERIFICATION.md`, `F9_30_SIMPLIFICATION_AUDIT.md`, `F9_38_CALCULATOR_COMPLETION_REPORT.md`, `PRODUCT_UX_WORKFLOW_AUDIT.md`, `PROJECT_MAP.md`, `SHEET_METAL_PROFILE_DESIGN.md`, `archive/PROGRESS_HISTORY.md` és `funkciok.md`.
- Minden link célcíme külön ellenőrzött; megszűnt vagy szemantikailag bizonytalan cél nem volt. A célként szolgáló történeti szöveg változatlan maradt.
- Kapu eredménye: 0 új és 0 történeti anchorhiba; a dokumentációellenőrzés PASS.

## P2: történeti besorolás és későbbi archiválás

- A mérföldkő-riportok, auditok, QA-átadások és kutatások maradjanak dátumozott bizonyítékok. Régi dokumentum csak akkor elavult, ha aktuális igazságként hivatkozik megváltozott működésre.
- Fájlmozgatás előtt külön manifest kell útvonallal, hash-sel, címsorokkal és bejövő linkekkel. Az Auth/org/RLS, snapshot-integritás, fotó-adatvédelem, hosted/staging és pilotkorlátok current tulajdonos nélkül nem archiválhatók.
- A [DOCS.4 archiválás-előkészítő manifest](DOCS4_ARCHIVE_MANIFEST.md) 23 dokumentum státuszát, megőrzendő döntéseit, javasolt útvonalát és előfeltételeit rögzíti. Mozgatás nem történt.

## Elfogadási sorrend

1. **Kész:** P0 Tesseract-ellentmondás pontosítása.
2. **Kész:** a 26 anchor javítása kis, célzott csomagban.
3. **Kész:** `funkciok.md` és `PROJECT_MAP.md` aktív szerepének kivezetése a Library/maps javára.
4. **Nincs végrehajtva:** current dokumentumok kivonása és tematikus archiválás; ehhez a DOCS.4 manifest szerinti külön döntés kell.
