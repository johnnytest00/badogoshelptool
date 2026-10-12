# TetőPro — Codex szabályok

- A `PROJECT_BLUEPRINT.md` az irányadó specifikáció; a fázishatárokat tartsd be.
- Minden feladat: állapotfelmérés → rövid terv → célzott implementáció → tesztek → bizonyíték és dokumentáció.
- Az alkalmazáskód TypeScriptben, a `src/` alatt maradjon; a rétegek függőségi iránya: UI → alkalmazás → domain, az infrastruktúra adapterként csatlakozik.
- DEMO-adat csak egyértelmű `DEMO` jelöléssel használható; szakmai, gyártói vagy áradatot ne találj ki.
- Nincs önkényes commit, push, deploy, éles Supabase-migráció vagy destruktív művelet.
- F0-ban ne készíts üzleti funkciót, hitelesítést, dashboardot vagy kalkulációs motort; ezek későbbi fázisok.
