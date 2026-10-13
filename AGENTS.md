# TetőPro — Codex szabályok

- A `PROJECT_BLUEPRINT.md` az irányadó specifikáció; a fázishatárokat tartsd be.
- Minden feladat: állapotfelmérés → rövid terv → célzott implementáció → tesztek → bizonyíték és dokumentáció.
- Az alkalmazáskód TypeScriptben, a `src/` alatt maradjon; a rétegek függőségi iránya: UI → alkalmazás → domain, az infrastruktúra adapterként csatlakozik.
- DEMO-adat csak egyértelmű `DEMO` jelöléssel használható; szakmai, gyártói vagy áradatot ne találj ki.
- Nincs önkényes commit, push, deploy, éles Supabase-migráció vagy destruktív művelet.
- Tartsd be az aktuális fázishatárt: ne készíts későbbi üzleti funkciót, hitelesítést, Supabase-réteget vagy kalkulációs motort előre.
- Minden mérföldkő végén javasolj rövid Conventional Commit üzenetet, amely tartalmazza a mérföldkő verzióját és fő funkcionalitását; commitot csak külön kérésre készíts.

## Evidence-Based Engineering Rules

- A specifikációt, a meglévő sémát és az aktuális kódmintákat ellenőrizd implementáció előtt; ne tölts ki hiányzó szakmai vagy üzleti adatot feltételezéssel.
- A dokumentációban és az átadásban különítsd el a bizonyított, nem futtatott és blokkolt állapotot; egy teszt csak tényleges futtatás után tekinthető sikeresnek.
- Minden tartós adatváltozásnál legyen egyértelmű jogosultsági, szervezeti és konkurencia-kezelési bizonyíték, a forrás-snapshotok pedig maradjanak visszakövethetők és módosíthatatlanok.

## Token-Efficient Development & Verification

- Célzottan vizsgáld a releváns fájlokat, minimális kontextust tölts be.
- Fókuszáltan fejlessz; ne telepíts indokolatlan függőséget és ne futtasd ismételten a teljes tesztkészletet.
- Böngészős ellenőrzést csak a végén végezz, legfeljebb egy fókuszált smoke workflow-val.
- Ne készíts ismételt screenshot-loopokat és ne próbáld újra indokolatlanul a nem támogatott böngészős képességeket.
- A nem elérhető ellenőrzéseket őszintén jelentsd, a szükséges biztonsági és matematikai ellenőrzéseket ne hagyd el.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
