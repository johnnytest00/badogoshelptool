# Claude Code — TetőPro projektutasítások

Ez a fájl a Claude Code projektmemóriája; a közös projekt- és mérnöki szabályokat az `AGENTS.md` tartalmazza.

@AGENTS.md

## Munkakezdés és hatókör

- A felhasználóval magyarul kommunikálj.
- Minden feladat előtt nézd meg a `git status`-t, majd csak a feladat szempontjából releváns forrásokat és dokumentációt olvasd el.
- A feladat funkcióját a [`docs/LIBRARY.md`](docs/LIBRARY.md) alapján azonosítsd, majd kövesd a célzott dokumentációt és a [`SOURCE_INDEX`](docs/maps/SOURCE_INDEX.md) forrás-/tesztútvonalát. Adatbázis-feladatnál használd a [`SCHEMA_INDEX`](docs/maps/SCHEMA_INDEX.md) migráció-, RPC-, RLS- és pgTAP-hivatkozásait. A legutóbbi állapothoz csak a `docs/PROGRESS.md` releváns összefoglalóját olvasd; történeti naplót csak indokolt esetben. Az indexek navigációs segédletek, nem megvalósítási vagy tesztbizonyítékok.
- Üzleti vagy számítási változtatásnál ellenőrizd a vonatkozó specifikációt, domain-szerződést, aktuális kódot és adatbázis-migrációt. A tervekből ne következtess működésre.
- Ne implementálj nem kért funkciót, ne változtass üzleti vagy szakmai szabályt jóváhagyás és ellenőrzött forrás nélkül.
- Ne olvass be vagy írj dokumentációba `.env.local`-t, titkot, jelszót, kulcsot vagy személyes adatot. Változónevet dokumentálhatsz, értéket soha.
## Claude-specifikus munkafolyamat

- Az általános célzott olvasási, módosítási és ellenőrzési szabályokat az `AGENTS.md` tartalmazza.
- RTK-t és célzott/LSP-alapú kódkeresést használj, ahol elérhető.
- Egyszerű feladatnál dolgozz skill nélkül vagy egy releváns skillel; több területet érintő munkánál több, egymást kiegészítő skill is indokolt lehet. Csak ellenőrzött, elérhető és releváns skilleket használj; kerüld az átfedő meghívásokat, ismételt telepítést és szükségtelen kontextust. Az eszközleltár: [`docs/AI_TOOLING.md`](docs/AI_TOOLING.md).
- Opcionális pluginokat vagy eszközöket csak igazolt elérhetőség és feladatszintű haszon esetén aktiválj.
- Modell-/tokenoptimalizálás: a főmodell mindig a felhasználó által aktuálisan kiválasztott modell marad (jellemzően Sonnet 5 Medium); ezt automatikusan ne váltsd. Rutin munkát delegáld a `.claude/agents/` alatti, rögzített modellű subagentekre: meglévő teszt/lint/typecheck/build parancsok futtatása és rövid hibajelentés → `test-runner` (Haiku); célzott regressziós teszt, böngészős/mobilviewport QA és kisebb fejlesztési/javítási feladat → `qa-regression` (Sonnet). A subagent kapjon szűk, önálló feladatot (ne olvassa újra a teljes projektet vagy a hosszú mérföldkő-dokumentációt), és a teljes tesztcsomagot ne futtasd ismételten változtatás nélkül. Opus használatát csak akkor javasold, ha a feladat valóban indokolja (komplex architekturális, biztonsági vagy geometriai döntés, bizonyított nehéz hiba értelmezése); a tényleges váltásról a felhasználó dönt külön. Ha a böngészős eszköz subagentből nem elérhető, jelezd, és válts a fő munkamenetben kisebb modellre a rutin QA-hoz.
## A tényleges rendszer röviden

- Next.js App Router, React és TypeScript; a kód a `src/` alatt van.
- A `src/app/` útvonalakat és vékony route-összeállítást ad. A `src/features/` szervezi a felhasználói munkafolyamatokat és szerverműveleteket. A `src/domain/` tartalmazza a keretrendszertől független számításokat és szerződéseket. A `src/infrastructure/` Supabase- és fájladaptereket tartalmaz.
- Supabase Auth, PostgreSQL, RLS, Server Action/API határok, immutable revíziók és adatbázis-RPC-k vannak használatban. Írás előtt vizsgáld meg az adott actiont, RPC-t és migrációt; egyes kritikus írók csak korlátozott szerveroldali adatbázis-szereppel működnek.
- A jelenlegi fő munkafolyamat a választható felmérés. Projektek, tetőmodellek, kalkulációk, anyaglisták, ajánlatok és kivitelezési naplók külön is elérhetők, de több átadás csak támogatott forrásokhoz működik.
- A `docs/PROJECT_MAP.md` 2026-10-17-i, M12-ben hiányos történeti rendszerkép. Aktuális feladathoz a `docs/LIBRARY.md` → `docs/maps/SOURCE_INDEX.md`, tartós adatnál pedig a `docs/maps/SCHEMA_INDEX.md` útvonalat használd. Az új fejlesztői átadás: `docs/CLAUDE_HANDOFF.md`.

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
  - Más dokumentumot csak akkor frissíts, ha annak konkrét tartalma vagy állapota érdemben megváltozott: funkciónavigációnál `docs/LIBRARY.md` és `docs/maps/SOURCE_INDEX.md`, adatbázisnál `docs/DATABASE.md` és `docs/maps/SCHEMA_INDEX.md`, jelentős állapotváltozásnál vagy munkamenet-lezárásnál `docs/CLAUDE_HANDOFF.md`. A történeti `funkciok.md` és `docs/PROJECT_MAP.md` ne legyen automatikus második leltár.
  - A `docs/CLAUDE_HANDOFF.md` rövid maradjon: jelenlegi állapot, megoldatlan kockázatok, következő lépések.
  - Csak a releváns dokumentumszakaszt olvasd és szerkeszd; nagy dokumentumot ne tölts be egészében, hacsak valóban nem szükséges. Ismétlődő szerkesztéshez célzott patch vagy script is jó, ha biztonságosabb és hatékonyabb.
  - Ne írd újra a teljes leltárt egy kisebb változásért, és ne hozz létre dokumentumot triviális implementációs részletek rögzítésére.
  - Őrizd meg a pontosságot és a nyomon követhetőséget; a bizonyított, nem futtatott és blokkolt állapotot külön jelöld.
