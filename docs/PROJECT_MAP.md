# Projekt- és rendszerkép

**Állapotfelmérés dátuma:** 2026-10-17  
**Forrás:** jelenlegi route-ok és TypeScript-források, `package.json`/lock, Supabase-migrációk, a kapcsolódó projektleírások. Ez a fájl a megvalósult szerkezetet írja le; a termékterv a [`PROJECT_BLUEPRINT.md`](../PROJECT_BLUEPRINT.md).

## Rövid áttekintés

A Bádogos HelpTool (a repóban TetőPro munkanévvel) Next.js App Router alapú, magyar nyelvű webalkalmazás. A fő adatútvonal a helyszíni felmérésből indulhat, és felhasználói döntéssel kapcsolódhat projekthez, számításhoz, anyaglistához, ajánlathoz vagy kivitelezési naplóhoz. Ezek nem egyetlen kötelező varázsló lépései: több munkafolyamat önállóan is használható.

Az alkalmazás és a helyi Supabase-re épülő adatmodell létezik. A kódban található funkciók nem jelentik azt, hogy staging/production környezet, üzleti pilot, szakmai megfelelőség vagy minden lehetséges adatátadás igazolt lenne. Pilot blokkolók: [`PILOT_READINESS.md`](PILOT_READINESS.md).

## Stack és fejlesztői eszközök

| Terület | Ténylegesen használt megoldás |
|---|---|
| Web / routing | Next.js **16.4.0**, App Router, webpack build |
| UI | React **19.3.0**, TypeScript **5.9.3**, Tailwind CSS **4.3.3**, Lucide |
| Űrlap/adatvalidáció | Zod **4.6.6**, kézi TypeScript domain-szerződések és validátorok |
| Adatbázis / Auth | Supabase CLI **2.120.0**, `@supabase/supabase-js` **2.117.3**, `@supabase/ssr` |
| Dokumentum | `@react-pdf/renderer` **4.9.0**; CSV végpont a beszerzéshez |
| Teszt | Vitest **5.0.3**; kliens/domain tesztek `src/**/*.test.ts(x)` alatt; adatbázis pgTAP tesztek |
| Kép | `sharp`; felmérési fotó normalizálás `src/infrastructure/images/` alatt |

A fenti verziók a jelenlegi lockolt/telepített környezet verziói. Függőséget csak a `package.json` és `package-lock.json` egyező módosításával szabad felvenni.

## Könyvtárszerkezet

| Útvonal | Felelősség |
|---|---|
| `src/app/` | App Router oldalak, layout, loading/error UI és API route-ok; route-összeállítás |
| `src/components/` | Közös témázás, navigáció, akadálymentesség, visszajelzés és UI primitívek |
| `src/features/` | Alkalmazási munkafolyamatok, szerveroldali adatbetöltők/Server Actionök, kliens UI és orchestration |
| `src/domain/` | Geometria, mértékegységek, kalkulációs és adat-szerződések, anyag/ajánlat/napló szabályok |
| `src/infrastructure/supabase/` | Browser/server kliens, session/proxy támogatás, DB-típusok és korlátozott writer adapterek |
| `src/infrastructure/images/` | Feltöltött felmérési képek előkészítése |
| `src/lib/` | Megosztott UI és futásidejű segédek |
| `supabase/migrations/` | Additív PostgreSQL-sémaváltozások és RPC/policy-k |
| `supabase/tests/database/` | Helyi adatbázis pgTAP regressziók |
| `scripts/` | Helyi Auth bootstrap és opt-in, helyi integrációs ellenőrzések |
| `docs/` | Adatbázis, számítás, biztonság, UX, teszt és mérföldkő-dokumentáció |

**Import-irány:** UI/route → feature-alkalmazási folyamat → domain; infrastruktúra tárolási/keretadapterként csatlakozik. A valós feature modulok a szerveroldali Supabase-műveleteket is tartalmazzák, tehát a struktúra nem teljesen különálló ports/adapters réteg. Ne helyezz üzleti képletet `src/app/` route-ba vagy React komponensbe.

## Oldalak és útvonalak

| Útvonal | Jelenlegi szerep / állapot |
|---|---|
| `/` | Bejelentkezés és explicit szervezetválasztás után műhely-dashboard; funkciók, felmérés-indítás és munkák áttekintése |
| `/bejelentkezes` | Supabase Auth belépés |
| `/felmeresek`, `/felmeresek/uj`, `/felmeresek/[surveyId]` | Felméréslista, új felmérés, mentett munkafelület és előzmény |
| `/felmeresek/[surveyId]/kalkulator/[calculator]` | Kompatibilitási útvonal, a felmérésre irányít; nem beágyazott kalkulátor |
| `/kalkulatorok` | Építési/kalkulátor-katalógus és közvetlen tetőmunkafelületek |
| `/kalkulatorok/mentett` | Saját, önálló mentett kalkulációk és támogatott revíziók |
| `/kalkulatorok/nyeregteto`, `/cserepeslemez`, `/ereszcsatorna`, `/lemezprofilok`, `/epitesi` | Közvetlen tető-, fedés-, csatorna-, profil- és építési kalkulátor-útvonalak; az egyes mentési képesség kalkulátoronként eltér |
| `/kalkulatorok/szegelyek` | Örökölt standalone route: mentett rekordot csak read-only mutat, új rekord létrehozásakor a kalkulátor-gyűjtőre irányít |
| `/projektek/[projectId]/**` | Meglévő projekt munkafelületei: áttekintés, tetőmodellek, számítás, anyagkimutatás/beszerzés, ajánlat |
| `/projektek`, `/projektek/uj`, `/ugyfelek/**` | A régi lista/űrlap belépők jelenleg a dashboardra irányítanak; ez nem bizonyít ügyfél- vagy projekt CRUD kezdőképernyőt |
| `/anyagok/**`, `/anyagkezelo` | Szervezeti anyagkezelő; termék, változat, kategória és verziózott ár műveletei |
| `/anyaglistak`, `/anyaglistak/uj`, `/anyaglistak/[listId]` | Önálló és workflow-hoz kötött anyaglisták |
| `/ajanlatok/**` | Projektajánlatok áttekintése és önálló ajánlattervezet szerkesztése/előnézete |
| `/kivitelezes/**` | Kivitelezési terv/munkanapló, feladatok, napi bejegyzések, fotók és export |
| `/demo/meretezes` | Kifejezetten DEMO célú skálázási bemutató |

Az API route-ok: felmérési fotók (`src/app/api/felmeresek/[surveyId]/photos/route.ts`); önálló és projekt-ajánlat PDF; projekthez tartozó beszerzési CSV; kivitelezési dokumentáció export. Az API route-ok hitelesített szerveroldali ellenőrzéseit az adott route-ban ellenőrizd.

## Jelentős funkciók és adatfolyamok

| Funkció | Fő forrás | Állapot és korlát |
|---|---|---|
| Dashboard, hitelesítés, szervezetválasztás | `src/app/page.tsx`, `src/features/auth/`, `src/features/dashboard/` | Megvalósított helyi alkalmazásfolyam. Több szervezet esetén nincs csendes automatikus választás. Hosted onboarding/meghívás/pilot-szerepkör nincs igazolva. |
| Felmérés | `src/features/field-surveys/`, `src/domain/field-surveys/`, `supabase/migrations/20261015070000_field_surveys.sql` és későbbi survey migrációk | Munkaszakaszos, verziózott felmérés, mérések, megjegyzés és privát fotó. Lehet projekt nélküli; részleges adat menthető. Közös geometria-összesítő és opcionális faanyag/alátét inputok vannak. Fizikai mobil/gyenge hálózati pilot nem igazolt. |
| Ügyfelek és projektek | `src/features/projects/`, `src/app/projektek/[projectId]/` | DB-szerződések és részletes projektoldali munkafelületek léteznek. A régi globális lista/létrehozó és ügyfél útvonalak redirectelnek; ne dokumentáld működő általános CRUD felületként. Felmérésből projekt utókövetés indítható. |
| Tetőmodellek / geometria | `src/features/roof-models/`, `src/domain/calculations/roof-geometry.ts`, `src/domain/drawings/` | Projekt tetőmodell és felmérés-geometria megvalósított. Hét forma szerepel a közös Survey geometriában; a standalone közös geometria-summary jelenleg a nyeregtető/félnyereg/konty kalkulátorban van. A teljes aszimmetrikus/L/T szerkesztő nem következik ebből. |
| Számítások | `src/features/calculators/`, `src/features/calculations/`, `src/domain/calculations/` | Önálló kalkulátor-katalógus és menthető, típusos kalkulációk vannak. A `construction-suite.tsx` tető, lépcső, beton/alapozás területeket kezel. Egyes régi URL-ek csak redirect/read-only kompatibilitást adnak. |
| Tető-faanyag és alátét | `src/domain/calculations/roof-timber-layout.ts`, `roof-underlay.ts`; `src/features/field-surveys/`, `src/features/roof-models/` | F9.35.1: mennyiségi motor, explicit kiosztás és opcionális keresztmetszet. F9.36.1: geometriai tekercs-/csíkozási számítás. Az alátét 1D hosszmenti darabolási minimuma feltételezett bemeneti szabályok mellett matematikai minimum; nem beszerzési terv. Alátét UI integráció támogatott formája gable/shed/hip; többi forma expliciten nem támogatott. |
| Csatorna, szegély, lemezkiosztás és profil | `src/features/gutters/`, `flashings/`, `roof-models/`, `sheet-metal/` | Több projektforrású és standalone folyamat létezik. Anyagkimutatásba átadás csak megvalósított és pontos forrásrevíziót ellenőrző ágakon. A gyártói vágás, veszteség vagy alkalmasság nem feltételezhető. F9.31 korlátozott writer-szerződéseit lásd a DB és audit dokumentumban. |
| Anyagkatalógus és anyagkezelő | `src/features/materials/`, `src/domain/materials/` | Szervezeti kategória, termék, változat és árverzió kezelése. Árforrás/provenance és korábbi snapshot megőrzése lényeges. Gyártói katalógusadat csak ellenőrzött forrásból vihető be. |
| Anyaglista, anyagkimutatás, beszerzés | `src/features/material-takeoffs/`, `/anyaglistak/**`, `/projektek/[projectId]/beszerzes/**` | Önálló/workflow-lista, támogatott számítási/felmérési források, felhasználói szerkesztés és ahol elérhető jóváhagyás, CSV export. Nem minden kalkulátorból van átadás; a becsült geometria önmagában nem termékmennyiség. |
| Ajánlat | `src/features/quotations/`, `src/domain/quotations/` | Projektajánlat életciklus és revíziózott PDF folyamat, valamint standalone DRAFT és mentett snapshotból PDF-előnézet. Standalone véglegesítés/kiállítás nem elérhető; VAT/áfa, bruttó/netto automatikus átváltás és hivatalos számkiosztás nincs. |
| Kivitelezés / munkanapló | `src/features/execution/`, `src/domain/execution/` | Projekt- vagy önálló terv, feladat, napi bejegyzés, fotó és belső dokumentáció/export. Ez nem hivatalos e-építési napló és nem bizonyít szerződéses/hatósági teljesítést. |
| Megjelenés és hozzáférhetőség | `src/components/`, `src/features/preferences/`, `src/app/globals.css` | Téma, skálázás, Liquid Glass komponensek, CSS pontmintás háttér és mozgásbeállítás megvalósított. F9.37.3 desktop Safari/Brave ellenőrzés dokumentált; teljes mobil, screen reader és OS reduced-motion runtime mátrix nincs igazolva. |

Részletes funkció-/fájlleltár: [`funkciok.md`](../funkciok.md). A funkcióállapot bizonyítékainak és tesztjeinek naplója: [`docs/PROGRESS.md`](PROGRESS.md), [`docs/TEST_MATRIX.md`](TEST_MATRIX.md).

## Adatbázis, jogosultság és adatbiztonság

- A séma a `supabase/migrations/` időbélyeges, előre haladó migrációkból épül fel; generated TypeScript típus: `src/infrastructure/supabase/database.types.ts`. Ne szerkeszd kézzel.
- Fő entitáscsoportok: `profiles`, `organizations`, `organization_members`; ügyfél/projekt/tetőmodell; `calculations` és immutable `calculation_revisions`/`calculation_dependencies`; anyagkategória/termék/változat/ár; takeoff és material-preparation lista/revízió; quotation/revízió/állapotesemény; survey/revízió/fotó/kapcsolat; execution plan/napló/fotó.
- A szerver oldali identity és szervezet-ellenőrzés az `src/features/auth/` és `src/infrastructure/supabase/` útvonalakon fut. A böngészőből érkező szervezetazonosító önmagában nem jogosultság.
- RLS, összetett FK-k, ellenőrzött RPC-k, expected version, idempotency key és snapshot immutabilitás együtt védik az üzleti írást. Néhány kritikus írásnál az authenticated közvetlen RPC-jog visszavont; a szerveradapter korlátozott `tetopro_covering_writer` szereppel hív. Az éppen érintett migráció és action az irányadó.
- A felmérési fotók privát Supabase Storage-ban vannak; hozzáféréshez szerveroldali/signed URL út szükséges. EXIF/GPS-strippelés nincs igazolva.
- Dokumentált helyi munkafolyamat van, de staging/production kapcsolat, szervezetek közötti teljes hosted teszt, backup/restore, RPO/RTO és monitorozás nincs bizonyítva. Részletek: [`DATABASE.md`](DATABASE.md), [`PILOT_READINESS.md`](PILOT_READINESS.md).

### Perzisztálás és konzisztencia

1. A route/action ellenőrzi a bejelentkezést, szervezeti tagságot, hozzáférést és inputot.
2. A domain számítás az alkalmazásban vagy a szerveren történik; a mentési RPC a várt verziót, actor/org/source kapcsolatot ismét ellenőrzi.
3. Sikeres mentés immutable revíziót és – ahol a munkafolyamat igényli – pontos source snapshot/dependency kapcsolatot ad.
4. Retry az adott operation ID-n idempotens; elavult verzió vagy eltérő payload konfliktust kap, nem írhatja át némán az előzményt.
5. Történeti nézetnek a kiválasztott revision saját input/output/source snapshotját kell olvasnia, nem a mai katalógust vagy projektállapotot.

Az új tartós adatfolyamhoz ezeket a tulajdonságokat az action, migration/RPC és pgTAP vagy helyi integrációs bizonyíték útján kell igazolni. Részletes séma: [`DATABASE.md`](DATABASE.md).

## Számítási határok

- A domain számítások TypeScript modulok; geometriai summary és műszaki SVG ugyanazt a geometriai outputot használja, a rajz zoom/pan állapota nem változtatja meg a fizikai méreteket.
- Geometriai eredmény nem statikai méretezés. Szarufa/léc mennyiség explicit kiosztási paramétertől függ; faanyag fajta, szerkezeti megfelelőség és csomópont nincs automatikusan igazolva.
- Alátét számítás nem tartalmaz univerzális fizikai lemezkiosztást vagy beszerzési tervet. A 2D sheet-layout terv a [`ROOF_CALCULATION_SPECIFICATION.md`](ROOF_CALCULATION_SPECIFICATION.md) végén található; F9.36.2 tervezési átadás, nem kész funkció.
- Anyagkalkulációhoz pontos termékparaméter, egység és forrás kell. Árat, átfedést, anyagveszteséget, rögzítési kiosztást vagy hidraulikai megfelelőséget ne találj ki.
- Matematikai bizonyítékok: [`CALCULATOR_MATH_VERIFICATION.md`](CALCULATOR_MATH_VERIFICATION.md), [`CALCULATION_VERIFICATION_MATRIX.md`](CALCULATION_VERIFICATION_MATRIX.md), [`CALCULATOR_COVERAGE_MATRIX.md`](CALCULATOR_COVERAGE_MATRIX.md) és a tesztmátrix releváns fejezetei.

## Validáció, hibák és UI

- A bemeneteket domain-szerződések és feature oldali szervervalidáció védi; az új route-nál ellenőrizd a konkrét parserét. Mentési hiba nem jelenhet meg sikeresként.
- A route-ok Next.js server/client komponenseket és Server Actionöket vegyesen használnak. A feature adatbetöltő ne kerüljön kliensbundle-be titkos hozzáféréssel.
- Közös UI primitívek: `GlassPageHeader`, `GlassSectionHeader`, `GlassToolbar`, `GlassDisclosure`, `GuardedLink`; téma és skálázás a root layout providereiben. Stílusok és tokenek: `src/app/globals.css`.
- Elavult forrás, kézi felülírás, DEMO/becslés, mentési státusz és hiányzó mérés legyen felhasználó számára látható. Régi route redirectje önmagában nem jelenti az adattábla vagy feature törlését.

## Fejlesztés és ellenőrzés

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test -- <érintett tesztútvonal>
npm run build
```

A `package.json`-ban szereplő Supabase parancsok: `npm run db:start`, `db:stop`, `db:reset`, `db:test`, `db:types`, `db:local-env`, `db:local-auth`. A `db:reset` törli/újraépíti a lokális DB-t; csak a lokális adatállapot ellenőrzése és megfelelő felhatalmazás után, eldobható DB-n használható. Ne adj hozzá `supabase link`, `db push` vagy távoli migrációt a rutinba.

`.env.example` változóneveket tartalmaz. Értékek személyes lokális `.env.local`-ban maradnak. A kódban használt neveket a `rg 'process.env' src scripts` listázza; `COVERING_WRITER_DATABASE_URL` csak szerveroldali restricted writer számára való.

## Architektúrát sértő gyakori változtatások

- üzleti képlet route-ba/komponensbe helyezése a domain helyett;
- író RPC- vagy RLS-korlát megkerülése közvetlen kliensírással;
- korábbi revízió vagy árforrás snapshotjának módosítása;
- csak kliensoldali szervezetazonosítóra épített jogosultság;
- anyagmennyiség vagy ár levezetése nem igazolt szabályból;
- projekt/tetőmodell előfeltétellé tétele olyan standalone munkánál, ahol a szerződés megengedi az önálló használatot;
- route fájlba számítási/SQL logika, titok kliensoldali importja, illetve migration helyi/távoli alkalmazásának dokumentált bizonyíték nélküli állítása.
