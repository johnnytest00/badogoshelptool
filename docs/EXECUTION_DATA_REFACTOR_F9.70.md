# F9.70 — Execution data-layer types and mapping

## Eredmény

Az F9.68 F68-01 finding a `src/features/execution/execution-data.ts` fájlszintű `no-explicit-any` tiltása és a `LooseClient` cast volt. Emiatt a táblák, oszlopok, nullable mezők és a lekérdezésekből érkező adatok nem voltak a generált Supabase sémához kötve. A tervenkénti `filter()` és kapcsolati `find()` hívások a már letöltött sorokat ismételten bejárták.

A szerveroldali `createClient()` már `SupabaseClient<Database>` típust ad; a laza adapterre nem volt szükség. A lekérdezések közvetlenül ezt használják, a loader projekcióit pedig a meglévő `Database` táblatípusokból vett `Pick` típusok rögzítik. A munkanapló fotók `category` mezője a DB-ben `string`; leképezéskor a meglévő domain enum validálja. A survey JSON snapshot szakaszai a meglévő section sémán keresztül kapnak alkalmazási típust. A generált DB fájl nem változott.

## Implementáció és viselkedés

- A `tasksByPlan`, `photosByPlan`, `journalByPlan` és `eventsByPlan` csoportosítás egyetlen sorbejárással készül; a `taskById` és `journalById` a régi `find()` első egyezését őrzi. Quote/revision indexnél az eredeti `Map` utolsó egyezése marad meg. Az adatbázis elsődleges kulcsai egyediek, a tesztelt ismétlődő kapcsolati sorok külön azonosítójúak.
- Az áttekintő továbbra is legfeljebb 200 tervet kér. A workspace terv-lekérdezésének korlátja változatlan; a journal/event/photo limit 100 maradt, task-sorrend és teljes kapcsolati sorrend is megmaradt. Az oszlopprojekciók és Supabase kérések száma nem bővült.
- Minden eredeti explicit `organization_id` szűrő, az SSR hitelesített kliens, a meglévő RLS-út, a privát bucketek és az 5 perces aláírt URL-ek megmaradtak. A profiles lekérdezés scoped viselkedése sem változott.
- Üres eredmény, nullable feladat/journal kapcsolat, hiányzó related row, orphan kapcsolat, csatolt survey-revízió/snapshot, forrás-ajánlat/revízió/subtotal és PDF export kimenete karakterizációs tesztet kapott. Az export route-on a `workspace.plans` és `plan.photos` típuscastjai eltűntek.
- A revízió subtotal értéke a generált adatbázis-típusban `number | null`, miközben az előző alkalmazási típus stringet állított. A futásidejű lekérő már korábban is a számot adta vissza; a rekordtípus és a PDF formázó most a tényleges számot írja le, a megjelenített összeg nem változik.

## Karakterizáció és mérés

A `execution-data.test.ts` először a régi implementáción futott; a refaktor utáni ugyanazon tesztkimenetek változatlanok. Tartalmaz üres állapotot, két tervet vegyes kapcsolatokkal, hiányzó/nulllázható linkeket, más tervhez és más szervezethez tartozó sorokat, snapshot fotókat, ismételt kapcsolati sorokat, eseményrendezést és PDF-et használó tervrekord-kimenetet. Azonos deterministic workspace fixture 1/50/200 tervvel 7-szer futott; a medián a teljes loader mock ideje:

| Terv | Kapcsolt sorok: task/journal/event/photo | Mock adatbázis-kérések | Régi mapping medián | Új mapping medián |
|---:|---:|---:|---:|---:|
| 1 | 2 / 2 / 1 / 3 | 7 | 0.020 ms | 0.019 ms |
| 50 | 100 / 100 / 50 / 150 | 7 | 0.392 ms | 0.154 ms |
| 200 | 400 / 400 / 200 / 600 | 7 | 4.349 ms | 0.737 ms |

A profilkérés egy sort ad vissza, a source quote/revision kérés ezekben a fixture-ökben nem fut, mert nincs tervhez kötve ilyen forrás. A 3N signed URL hívás megmarad; a táblázat 7 DB-kérése ezt nem számolja. Mindkét változat mediánja 21 azonos, egymás után végrehajtott mock-futásból származik. Az új mapping a tervenkénti 4 kollekciószűrést és a fotó/timeline elemeken belüli `find()` bejárásokat egy sorindexelési menetre cseréli. A mért idő mock klienssel, aláírt URL mockkal készült; hálózati, Postgres, memória- vagy production-gyorsulást nem bizonyít.

## Ellenőrzés és korlátok

- Refaktor előtti baseline karakterizáció: 4/4 teszt PASS. Refaktor után: 5/5 célzott teszt PASS; a teszt a 1/50/200 kimenetszámokat és kérdésszámot is ellenőrzi.
- Izolált munkamásolaton: `npm run typecheck` PASS, `npm run lint` PASS, teljes `npm test` **160 fájl / 938 PASS / 8 fájl és 19 teszt SKIP**, `npm run build` PASS (Next.js 16.4.2 Webpack, 32 statikus oldal). A build és typegen nem a fő munkafa `.next` könyvtárát használta.
- Nincs adatbázis-, migration-, RLS-, auth-, RPC-, történeti snapshot- vagy írási változás; nincs adatátírás. `git diff --check` a dokumentálás után következik.
- Élő Supabase/pgTAP, hosted RLS/Storage és browser teszt nem futott; a kihagyott 19 teszt környezetfüggő opt-in teszt. A JSON snapshotot a meglévő domain séma validálja; hibás vagy korábbi, eltérő shape-ű szakasz esetén a lekérő most hibát dobhat ott, ahol a korábbi laza cast a hibás értéket továbbadta. Ez a nem valid snapshotokra vonatkozó kompatibilitási korlát.

## Érintett fájlok

- `src/features/execution/execution-data.ts`
- `src/features/execution/execution-data.test.ts`
- `src/features/execution/execution-report-document.tsx`
- `src/app/api/projektek/[projectId]/kivitelezesi-dokumentacio/route.ts`
- `docs/PROGRESS.md`
