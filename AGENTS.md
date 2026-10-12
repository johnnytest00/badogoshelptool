# TetőPro — Codex szabályok

- A `PROJECT_BLUEPRINT.md` az irányadó specifikáció; a fázishatárokat tartsd be.
- Minden feladat: állapotfelmérés → rövid terv → célzott implementáció → tesztek → bizonyíték és dokumentáció.
- Az alkalmazáskód TypeScriptben, a `src/` alatt maradjon; a rétegek függőségi iránya: UI → alkalmazás → domain, az infrastruktúra adapterként csatlakozik.
- DEMO-adat csak egyértelmű `DEMO` jelöléssel használható; szakmai, gyártói vagy áradatot ne találj ki.
- Nincs önkényes commit, push, deploy, éles Supabase-migráció vagy destruktív művelet.
- Tartsd be az aktuális fázishatárt: ne készíts későbbi üzleti funkciót, hitelesítést, Supabase-réteget vagy kalkulációs motort előre.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
