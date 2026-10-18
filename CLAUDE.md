# Claude Code — TetőPro projektutasítások

Ez a fájl a Claude Code állandó projektmemóriája. A forráskód, a ténylegesen alkalmazott migrációk és a futtatott ellenőrzések bizonyítják a jelenlegi működést; a `PROJECT_BLUEPRINT.md` jóváhagyott célterv, nem megvalósult funkciólista.

@AGENTS.md

## Munkakezdés és hatókör

- A felhasználóval magyarul kommunikálj.
- Minden feladat előtt nézd meg a `git status`-t, majd csak a feladat szempontjából releváns forrásokat és dokumentációt olvasd el.
- A legutóbbi állapothoz olvasd el a `docs/PROGRESS.md` elejét; a funkciókhoz használd a `funkciok.md` megfelelő szakaszát, az adatbázishoz a `docs/DATABASE.md` releváns részét.
- Üzleti vagy számítási változtatásnál ellenőrizd a vonatkozó specifikációt, domain-szerződést, aktuális kódot és adatbázis-migrációt. A tervekből ne következtess működésre.
- Ne implementálj nem kért funkciót, ne változtass üzleti vagy szakmai szabályt jóváhagyás és ellenőrzött forrás nélkül.
- Ne olvass be vagy írj dokumentációba `.env.local`-t, titkot, jelszót, kulcsot vagy személyes adatot. Változónevet dokumentálhatsz, értéket soha.
EXECUTION EFFICIENCY

Minimize token usage without sacrificing correctness.

- Read only relevant files and code sections.
- Use RTK where appropriate.
- Avoid redundant tool calls and screenshots.
- Use at most one relevant skill unless justified.
- Batch independent inspections where practical.
- Implement before performing browser verification.
- Test only affected components and critical workflows.
- Run full regression/build only when risk justifies it.
- Keep documentation and final reports concise.
- Do not repeat completed audits or project onboarding.
- Activate plugins, skills és opcionális eszközök csak akkor, ha egyértelmű értéket adnak az adott feladathoz; elérhető pluginok pl. typescript-native-lsp, Engineering, Design — használat előtt ellenőrizd az elérhetőséget.
- Kódkereséshez LSP szimbólumkeresést és célzott keresést részesíts előnyben teljes projekt-újraátvizsgálás helyett.
- Soha ne áldozd fel a helyességet token-megtakarításért.
## A tényleges rendszer röviden

- Next.js App Router, React és TypeScript; a kód a `src/` alatt van.
- A `src/app/` útvonalakat és vékony route-összeállítást ad. A `src/features/` szervezi a felhasználói munkafolyamatokat és szerverműveleteket. A `src/domain/` tartalmazza a keretrendszertől független számításokat és szerződéseket. A `src/infrastructure/` Supabase- és fájladaptereket tartalmaz.
- Supabase Auth, PostgreSQL, RLS, Server Action/API határok, immutable revíziók és adatbázis-RPC-k vannak használatban. Írás előtt vizsgáld meg az adott actiont, RPC-t és migrációt; egyes kritikus írók csak korlátozott szerveroldali adatbázis-szereppel működnek.
- A jelenlegi fő munkafolyamat a választható felmérés. Projektek, tetőmodellek, kalkulációk, anyaglisták, ajánlatok és kivitelezési naplók külön is elérhetők, de több átadás csak támogatott forrásokhoz működik.
- A részletes útvonal-, adatfolyam- és korláttérkép: `docs/PROJECT_MAP.md`. Az új fejlesztői átadás: `docs/CLAUDE_HANDOFF.md`.

## Üzleti és számítási korlátok

- Ne találj ki gyártói adatot, árat, anyagnormát, veszteségi arányt, hidraulikai vagy statikai megfelelőséget. DEMO-adat csak feltűnő `DEMO` jelöléssel szerepelhet.
- Kalkulációs darabszámot vagy beszerzési mennyiséget ne vezess le pusztán területből, ha a termék kiosztási és vágási szabályai nincsenek megadva.
- Őrizd meg az input eredetét, a pontos forrás-revíziót, a verzióellenőrzést, az idempotenciát és a történeti snapshotot. Ne írj át korábbi üzleti revíziót.
- Felméréshez, ajánlathoz vagy egyszerű kalkulációhoz ne követelj projektet, tetőmodellt vagy más előkészítő adatot, ha az aktuális szerződés ezt nem követeli.
- Projekt- és szervezetazonosítót kliensbemenetből önmagában ne tekints jogosultságnak. Szerveren és adatbázisban is tartsd meg az actor-, szervezet- és forrásellenőrzést.

## UI/UX

- A felület magyar, mobilra optimalizált, kevés ismételt adatbevitellel és fokozatosan megjelenő részletekkel.
- Használd a meglévő témát, design tokeneket és közös komponenseket a `src/components/`, `src/features/preferences/` és `src/app/globals.css` alatt.
- Ne rejts el figyelmeztetést vagy adatforrást. Mentési hiba, elavult forrás, becslés és DEMO állapot legyen egyértelmű.

## Ellenőrzés és dokumentáció

- A `package.json` parancsait használd: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; adatbázis-parancsok a csomagban és `docs/DATABASE.md`-ben vannak.
- Csak a változtatáshoz szükséges célzott ellenőrzéseket futtasd; célzott teszt nem teljes regresszió. Adatbázis- és böngészőellenőrzést csak releváns változtatáskor végezz, az eredményt pontosan nevezd meg.
- Next.js kód módosítása előtt olvasd el a telepített verzió megfelelő útmutatóját a `node_modules/next/dist/docs/` alatt. Ez a repó Next.js 16.4-et használ, és az API-k eltérhetnek a korábbról ismert Next.js-től.
- Dokumentációs hatékonyság:
  - A `docs/PROGRESS.md` az elsődleges fejlesztési történet; mérföldkő leírása itt él, máshol csak rövid hivatkozás legyen rá.
  - Más dokumentumot csak akkor frissíts, ha annak konkrét tartalma vagy állapota érdemben megváltozott: `funkciok.md` (új/módosított funkció), `docs/PROJECT_MAP.md` és/vagy `docs/DATABASE.md` (architektúra- vagy sémaváltozás), `docs/CLAUDE_HANDOFF.md` (jelentős állapotváltozás vagy munkamenet-lezárás). Soha ne frissítsd automatikusan az összeset.
  - A `docs/CLAUDE_HANDOFF.md` rövid maradjon: jelenlegi állapot, megoldatlan kockázatok, következő lépések.
  - Csak a releváns dokumentumszakaszt olvasd és szerkeszd; nagy dokumentumot ne tölts be egészében, hacsak valóban nem szükséges. Ismétlődő szerkesztéshez célzott patch vagy script is jó, ha biztonságosabb és hatékonyabb.
  - Ne írd újra a teljes leltárt egy kisebb változásért, és ne hozz létre dokumentumot triviális implementációs részletek rögzítésére.
  - Őrizd meg a pontosságot és a nyomon követhetőséget; a bizonyított, nem futtatott és blokkolt állapotot külön jelöld.
