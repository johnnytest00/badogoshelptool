# F9.72.1 — Dokumentációs kontextus és duplikáció ellenőrzése

**Állapot:** célzott dokumentációs konszolidáció kész; alkalmazáskód, adatbázis, külső konfiguráció és történeti tartalom nem változott.

## Betöltés: mi bizonyított

| Forrás | Megfigyelt viselkedés | Besorolás |
|---|---|---|
| Gyökér `AGENTS.md` | A fájl tartalma a jelenlegi Codex-munkamenetben projektutasításként szerepelt. Az [OpenAI Codex-útmutató](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide) szerint a Codex CLI a globális és az aktuális könyvtárig érvényes `AGENTS.md` fájlokat automatikusan összegyűjti és a kontextushoz adja. | Codex: automatikus, ebben a munkamenetben igazolt; a hivatkozott hivatalos leírás CLI-re vonatkozik. |
| `CLAUDE.md` | Projektutasításként és `@AGENTS.md` importként van kialakítva. A `.claude/launch.json` csak a fejlesztői szervert konfigurálja. Claude Code futtatására ebben a körben nem került sor. | Claude: repo-konfiguráció igazolt, automatikus betöltés és importfeloldás itt nem futásidejűleg igazolt. |
| `@/Users/bence/.codex/RTK.md` | Az `AGENTS.md` külső, felhasználói Codex-fájlra hivatkozik. A fájl 547 byte; nem repo-tartalom, ezért nem módosult. | Importcél létezik; ennek a környezetnek a feloldási mechanizmusa külön nem vizsgálható. |
| `docs/AI_TOOLING.md` | Az `AGENTS.md` hivatkozik rá. A 12 015 byte-os leltárt a jelen feladatban célzottan megnyitottuk; nem szerepelt automatikusan az induló útmutatóüzenetben. | Feladatszinten releváns referenciadokumentum, nem automatikus kontextus. |
| `docs/README.md`, `docs/PROGRESS.md`, `docs/PROJECT_MAP.md`, `docs/DATABASE.md`, auditok | A gyökérutasítások hivatkozásai és célzott olvasás útján érhetők el. A teljes `PROGRESS_HISTORY.md` 564 123 byte; csak az elejét és a szerkezetét ellenőriztük, nem tettük kötelező olvasmánnyá. | Fokozatos, feladathoz kötött olvasás; a link önmagában nem automatikus betöltés. |

Az aktuális munkamenetben a projekt `AGENTS.md` tartalma automatikusan rendelkezésre állt; a `docs/` fájlok tartalmát fájlolvasással kellett lekérni. A `CLAUDE.md` automatikus felvételét és az `@AGENTS.md` futásidejű feloldását Claude Code-ban ez a repo-audit nem bizonyítja.

## Megerősített duplikáció és változás

- A `CLAUDE.md` „EXECUTION EFFICIENCY” szakaszának több pontja az `@AGENTS.md`-ben már lévő célzott olvasást, tesztelést, ellenőrzést és rövid dokumentálást ismételte. A hosszú, általános lista helyett rövid, Claude-ra jellemző kiegészítés maradt. A példaként említett pluginlista kikerült; a tényleges leltár kanonikus helye az `AI_TOOLING.md`.
- A `CLAUDE.md` a `PROGRESS.md` elejének olvasását kérte, de nem mondta ki, hogy a teljes napló és az archívum kihagyható. Most a „Jelenlegi állapot” összefoglaló és a feladathoz releváns mérföldkő az olvasási cél; a teljes napló és archívum nem kötelező.
- Az `AGENTS.md` most egyértelműsíti, hogy az `AI_TOOLING.md`-ből csak a releváns részt kell olvasni, és a Markdown-hivatkozás nem automatikus betöltés.
- Nem vontuk össze a `PROJECT_MAP.md`, `PROGRESS.md`, `AI_TOOLING.md` és `CLAUDE_HANDOFF.md` fájlokat: eltérő feladatuk van (aktuális térkép, mérföldkő-bizonyíték, ellenőrzött eszközleltár, rövid átadás). A README és a PROGRESS összefoglalói navigációs értékűek. Auditokat és történeti bizonyítékot nem töröltünk.

## Kontextusmérés

| Metrika | F9.72.1 előtt | Utána | Megjegyzés |
|---|---:|---:|---|
| `AGENTS.md` + `CLAUDE.md` | 10 185 byte / 104 sor | 9 758 byte / 92 sor | −427 byte, −12 sor a repo két útmutatójában; nem tokenmérés. |
| `AGENTS.md` | 3 680 byte / 39 sor | 3 728 byte / 39 sor | A betöltés korlátját tisztázó mondat miatt nőtt. |
| `CLAUDE.md` | 6 505 byte / 65 sor | 6 030 byte / 53 sor | Ismétlődő általános szabályok rövidültek. |
| `docs/AI_TOOLING.md` | 12 015 byte / 83 sor | változatlan | Nem automatikus betöltés; csak releváns rész olvasandó. |
| Történeti archívum | 564 123 byte / 4 126 sor | változatlan | Nem kötelező olvasmány. |

`tiktoken` nincs telepítve; függőséget nem adtunk hozzá, ezért tokenizer-alapú számot vagy tokenmegtakarítást nem állítunk. Az automatikusan rendelkezésre álló kontextus teljes mérete és a Claude Code tényleges promptja ebből a futásból nem mérhető.

## Kanonikus olvasási útvonal

- Tartós projekt- és biztonsági szabályok: `AGENTS.md`; Claude-kiegészítések: `CLAUDE.md`.
- Friss státusz és releváns mérföldkő: `docs/PROGRESS.md`; archívum csak történeti kérdésnél.
- Funkció, útvonal/adatfolyam, séma és eszközleltár: `funkciok.md`, `docs/PROJECT_MAP.md`, `docs/DATABASE.md`, illetve `docs/AI_TOOLING.md` releváns része.
- Auditok és specifikációk: csak amikor a feladat érinti őket; az aktuális működéshez forráskód, alkalmazott migráció és futtatott bizonyíték kell.

## Ellenőrzés és nyitott bizonyíték

- A `docs/PROGRESS.md` megőrzi a korábbi F9.72/F9.71 bejegyzéseket és az F9.69 fotófeltöltési, F9.70 snapshot-kompatibilitási, valamint hostolt Supabase/Storage kockázatokra mutató hivatkozásokat; ezek nem lettek megoldottnak jelölve.
- A gyökér- és `docs/` Markdown-fájlok ellenőrzése: **55 fájl, 650 inline hivatkozás (ebből 430 helyi), 0 helyi útvonal-/anchorhiba**. A `git diff --check` PASS.
- Tokenizer хэмжés nincs. Claude Code automatikus betöltése és importfeloldása, illetve Codex CLI-től eltérő Codex desktop runtime külön indítással nem ellenőrzött.

**Javasolt Conventional Commit:** `docs(F9.72.1): reduce duplicated agent guidance`
