# TetőPro — Codex szabályok

- A ténylegesen ellenőrzött Codex skill/plugin/MCP-leltár: [`docs/AI_TOOLING.md`](docs/AI_TOOLING.md). Csak az adott feladathoz releváns részt olvasd; a hivatkozás nem jelent automatikus betöltést. Eszközt kizárólag indokolt esetben használj; új telepítést vagy aktiválást ne kezdeményezz külön kérés nélkül.

- A `PROJECT_BLUEPRINT.md` a jóváhagyott termékcélokat és fázishatárokat írja le, nem bizonyíték a megvalósult működésre. A működést a jelenlegi forráskód, az alkalmazott adatbázis-migrációk és az ellenőrzött viselkedés bizonyítja; az újabb, explicit termékdöntést vedd figyelembe.
- Csak az explicit kérésben szereplő mérföldkövet és hatókört valósítsd meg. A szükséges meglévő modulokat módosíthatod, de nem kért üzleti funkciót vagy későbbi architekturális réteget ne építs előre.
- Minden feladat: állapotfelmérés → rövid terv → célzott implementáció → tesztek → bizonyíték és dokumentáció.
- Az alkalmazáskód TypeScriptben, a `src/` alatt maradjon; a rétegek függőségi iránya: UI → alkalmazás → domain, az infrastruktúra adapterként csatlakozik.
- DEMO-adat csak egyértelmű `DEMO` jelöléssel használható; szakmai, gyártói vagy áradatot ne találj ki.
- Nincs önkényes commit, push, deploy, éles Supabase-migráció vagy destruktív művelet.
- Minden mérföldkő végén javasolj rövid Conventional Commit üzenetet, amely tartalmazza a mérföldkő verzióját és fő funkcionalitását; commitot csak külön kérésre készíts.

## Evidence-Based Engineering Rules

- A specifikációt, a meglévő sémát és az aktuális kódmintákat ellenőrizd implementáció előtt; ne tölts ki hiányzó szakmai vagy üzleti adatot feltételezéssel.
- A dokumentációban és az átadásban különítsd el a bizonyított, nem futtatott és blokkolt állapotot; egy teszt csak tényleges futtatás után tekinthető sikeresnek.
- Minden tartós adatváltozásnál legyen egyértelmű jogosultsági, szervezeti és konkurencia-kezelési bizonyíték, a forrás-snapshotok pedig maradjanak visszakövethetők és módosíthatatlanok.

## Token-Efficient Development & Verification

- Célzottan vizsgáld a releváns fájlokat, minimális kontextust tölts be.
- Fókuszáltan fejlessz; ne telepíts indokolatlan függőséget és ne futtasd ismételten a teljes tesztkészletet.
- A böngészős ellenőrzést kockázathoz igazítsd: kisebb, nem vizuális változásnál általában nem kell vagy egy fókuszált smoke elég; jelentős UI-, navigációs, interakciós vagy magas kockázatú workflow-változásnál vizsgáld meg az érintett képernyőket, nézetméreteket és állapotokat kellő mélységben.
- Ne ismételj screenshot-loopokat vagy nem támogatott böngészős próbákat; a szükséges ellenőrzési minőséget ne csökkentsd pusztán a kontextus vagy idő megtakarításáért.
- A nem elérhető ellenőrzéseket őszintén jelentsd, a szükséges biztonsági és matematikai ellenőrzéseket ne hagyd el.

## Next.js fejlesztői folyamatok

- Ha aktív fejlesztői szerver használja a fő checkout `.next` könyvtárát, a buildet, `next typegen`-t és minden oda író folyamatot izolált környezetben futtasd. Ha nincs ütköző folyamat, az izolált build nem követelmény.
- Először létező, igazolt izolált workflow-t használj; ennek hiányában külön worktree-t vagy ideiglenes másolatot, saját generált kimenettel. Ne írj párhuzamosan megosztott `.next` kimenetre.
- Ne állítsd le vagy indítsd újra automatikusan a fejlesztői szervert, ne törölj cache-t, és ne módosíts közösen használt generált fájlokat konkurens fejlesztés közben.

## Dokumentációs belépési pontok

- A `docs/README.md` navigációs index; a `docs/PROGRESS.md` a rövid aktuális állapot és a legutóbbi fejlesztési bizonyítékok belépési pontja.
- A `docs/archive/PROGRESS_HISTORY.md` régebbi mérföldkövek története; csak releváns történeti kérdésnél olvasd.
- A `PROJECT_BLUEPRINT.md` cél- és termékspecifikáció. A tényleges implementáció megállapításához a jelenlegi kód, az alkalmazott migrációk és az ellenőrzött viselkedés az irányadó.

## Engineering Verification & Reporting

Minden mérföldkő riportja röviden tartalmazza a státuszt, a ténylegesen megvalósított funkciókat, az újrahasznosított architektúrát, az adatkonzisztencia- és jogosultsági bizonyítékokat, a pontosan futtatott célzott/teljes/adatbázis/böngészős ellenőrzéseket, valamint az ismert korlátokat és a nem ellenőrzött követelményeket. A célzott teszt nem tekinthető teljes regressziónak; COMPLETE csak akkor adható, ha a kritikus elfogadási feltételek bizonyítottak.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
