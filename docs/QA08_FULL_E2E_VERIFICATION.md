# QA-08 — Teljes end-to-end és integrációs ellenőrzés

## Státusz és hatókör

**Státusz: PASS WITH LIMITATIONS — a helyi alkalmazás-, adatbázis- és build-kapu zöld, de a teljes tartós E2E nem minősíthető COMPLETE-nek.**

Ez a dokumentum a 2026-10-25-i helyi ellenőrzést rögzíti. A QA-08 audit nem módosított alkalmazáskódot, adatbázis-sémát, RLS-policy-t, számítási motort, mentési szerződést vagy történeti snapshotot. A munkafa korábbi QA-módosításai érintetlenek maradtak.

### QA08-RPC-01 follow-up — 2026-10-25

A QA-08-ban nyitott P2 trust-boundary finding a helyi forrásban és eldobható adatbázis-klónon **COMPLETE**. A [részletes follow-up](QA08_RPC01_TRUST_BOUNDARY.md) bizonyította, hogy a konstrukciós writer már eleve csak a `tetopro_covering_writer` szerepkörből volt hívható; a rés a downstream `authenticated` RPC-k eredetellenőrzése volt. Az új migráció privát, atomikus revízió-attesztációt hoz létre a restricted writerben, és triggerrel tiltja a nem attesztált revízió új munkanapló- vagy ajánlatforrás-kapcsolatát.

Eldobható helyi klónon a célzott pgTAP **63/63**, a teljes pgTAP **62 fájl / 1318 PASS**; közvetlen `authenticated` negatív esetek, legitim szerverírás, cross-org, idempotencia és kétkapcsolatos konkurencia-próba is sikeres. Az eredeti snapshotok nem változtak. A `20261025154642_qa08_rpc_trust_boundary.sql` migráció megosztott helyi vagy hostolt adatbázisra **nincs alkalmazva**, ezért ezeken a környezeteken a finding státusza az alkalmazásig **NOT VERIFIED / NOT ACTIVE**.

## Környezet és bizonyíték

- Next.js 16.4.2, React 19, TypeScript, Vitest 5.0.3.
- Helyi Supabase core szolgáltatások: API és PostgreSQL elérhető; az opcionális helyi szolgáltatások (például Storage/Analytics) nem voltak a QA-08 elfogadási feltételeihez szükséges állapotban.
- Hitelesített helyi Brave DEMO-munkamenet, `DEMO TetőPro Kft.` szervezeti kontextusban. A böngészős ellenőrzés olvasási célú volt; mentés, feltöltés, törlés és kapcsolás nem történt.
- A tartós írási E2E-hez nem volt igazoltan elkülönített, eldobható felhasználó/szervezet/fixture. A közös DEMO-adatot nem használtam tesztadatként.
- A közvetlen RPC-próba helyi PostgreSQL-tranzakcióban futott: üres `lines` kimenetű konstrukciós revíziót hozott létre, az authenticated szerepkörrel sikeres linket adott vissza, majd `ROLLBACK` történt. Utóellenőrzés: a próbarevízió és link darabszáma **0/0**.

## Kalkulátorleltár és mátrix

| Csoport | Darab | Azonosított kalkulátorok | QA-08 bizonyíték | Állapot |
|---|---:|---|---|---|
| Tető | 4 | `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`, `roof.truss-members` | A kalkulátor UI-ban 4 selector látható; a négy menthető tetőkalkulátorhoz meglévő revízió- és mentési tesztek futottak; egyik sem módosult | PASS — olvasási/automata, tartós újraírás nélkül |
| Lépcső | 17 | `stair.*` katalógusbejegyzések | A UI-ban 17 selector látható; katalógus- és konstrukciós tesztek futottak | PASS — smoke + automata |
| Beton/segéd | 10 | 9 `concrete.*` + `aux.diagonal` | A UI-ban 10 selector látható; katalógus- és konstrukciós tesztek futottak | PASS — smoke + automata |
| **Összesen** | **31** | A katalógus futáskor 31-re assertál | 4 + 17 + 10 = 31 látható selector; a teljes Vitest is zöld | **PASS a leltárra** |

A 31 elem mindegyikére nem készült külön, tartós böngészős számítási és mentési forgatókönyv. A 27 nem menthető kalkulátor eredménye helyi előnézet; a négy tetőkalkulátor mélyebb mentési útvonala az előző mérföldkövek célzott tesztjeivel és a QA-08 olvasási ellenőrzéssel bizonyított.

## Workflow A–F

| Workflow | Ellenőrzött út | Eredmény |
|---|---|---|
| A — Kalkulátor → mentés → újranyitás → revízió | Mentett `roof.rafter-cut` V1 és több mentett listaelem újranyitása; revíziócímke, eredmény és kalkulátor-CTA látható | **PASS read-only**; új tartós V2/V3 mentés **NOT VERIFIED** elkülönített fixture hiányában |
| B — Munkanapló | Munkanapló-lista, meglévő napló megnyitása, bejegyzés/feladat/fotó-szekció/linkek olvasása, újratöltés | **PASS read-only**; új bejegyzés, esemény, fotó és PDF-írás **NOT VERIFIED** |
| C — Munkanapló → ajánlat | Meglévő ajánlatlista és kalkulációs forrás-CTA-k olvasása; önálló ajánlatok draft-státusza látható | **PASS read-only + automata**; új ajánlat mentése/újranyitása **NOT VERIFIED** |
| D — Kalkuláció → downstream | Mentett revízióból ajánlat- és munkanapló-CTA célútvonala, munkanaplón kapcsolt kalkuláció olvasása | **PASS az alkalmazásútra**; direkt RPC teljességi korlátja **FINDING** |
| E — Hiányos kalkuláció | Hiányos kalkulátorban mentés tiltása; alkalmazás/action tesztek hiányos downstream-jelöltet elutasítanak | **PASS az app-útra**, de az authenticated közvetlen link-RPC üres kimenetet elfogadott: **P2 integritási finding** |
| F — Nagy adatmennyiség | QA-01/02/06 lapozási és PDF/JSON tesztek; jelenlegi helyi fixture-listák olvasása | **PASS automata**, 101/201/525/51/125 tartós, böngészős újraírás **NOT VERIFIED** |

## Revízió, PDF és katalógus

- A mentett kalkulációs listában 5 helyi DEMO/standalone elem látható; a megnyitott `roof.rafter-cut` revízió teljes eredményblokkot, rajzot, `Mentve · V1` állapotot és helyes downstream CTA-queryt mutatott.
- A fő DEMO szervezetben nincs projekt-linked execution plan, ezért az élő PDF-előkészítő útvonal nem volt elérhető. A PDF-renderer és a dokumentációs API route célzott tesztjei **5 fájl / 28 teszt PASS**.
- A fő DEMO-katalógusban a jelenlegi lista- és anyagkezelő nézetek elérhetők; a 201/525-ös éles adatmennyiségű böngészős teszt nem futott. A korábbi QA-02 szintetikus lapozási bizonyítéka nem production-terhelési mérés.
- A revíziószámok és snapshotok olvasása szervezetre és kalkulációra szűrt; történeti felmérések olvasási útvonala nem került kikapcsolásra.

## Közvetlen RPC/RLS-integritás

Az alkalmazási réteg hiányos konstrukciós revíziót nem enged tovább: az `isCompleteCalculationRevision` guard és a hozzá tartozó action/tesztek ezt bizonyítják. A `public.link_execution_plan_document` SQL-függvény kalkulációs ágának forrása viszont az ownership-, szervezet-, létrehozó- és `construction.%` feltételeket ellenőrzi, **de nem ellenőrzi az `output_snapshot` teljességét**.

QA-08-ban egy authenticated szerepkörű, helyi tranzakciós hívás üres `lines` kimenetű konstrukciós revízióra `{created: true}` linket adott vissza. A tranzakció visszagörgetése után a próbarevízió és link nem maradt meg. Ez nem alkalmazási böngészős exploit, hanem a DB trust boundary bizonyított hiánya; a közvetlen RPC-hívás így megkerülheti a QA-04-ben elvárt downstream-teljességi kaput.

**Az eredeti QA-08 auditban nyitott ticket: `QA08-RPC-01` — P2.** A fenti follow-up ezt a helyi forrásban és izolált adatbázisban lezárta: a restricted writer strukturális kaput és atomikus attesztációt ad, a munkanapló- és ajánlatforrás pedig csak attesztált revíziót fogad. A hostolt/megosztott környezet külön migrációalkalmazásig nem tekinthető javítottnak.

## Böngészős és UI-ellenőrzés

- Desktop authenticated Brave smoke: dashboard/nav, munkanapló-lista, meglévő munkanapló, kalkulátor-kategóriák, mentett kalkulációk, ajánlatlista, anyaglista és anyagkezelő megnyitása; a meglévő munkanapló frissítése után a tartalom megmaradt.
- A négy kategória-selector száma 4/17/10 volt; a hiányos kalkulátor mentése tiltott állapotot mutatott. A munkanapló és ajánlat CTA-k létező helyi útvonalakra mutattak.
- Mobil viewportok (375×667, 812×375, 768×1024), production-szerű touch input és böngészőkonzol-log export QA-08-ban **NOT VERIFIED**: a Browser plugin és Playwright konfiguráció nem volt elérhető; a CUA natív Brave csak a hitelesített desktop olvasási smoke-ot biztosította.
- Nem történt teljes accessibility/overflow/fókusz-mérés. A képernyőkön nem jelent meg framework-hiba overlay, de ez nem konzol- és eszközmátrix-regresszió.

## Automatizált kapuk

| Ellenőrzés | Tényleges eredmény |
|---|---|
| `npm test` | **183 fájl PASS / 8 SKIP; 1101 PASS / 19 SKIP teszt** |
| `SUPABASE_TELEMETRY_DISABLED=1 npm run db:test` | **61 fájl / 1292 PASS; PASS** |
| `npm run lint` | **PASS — nincs ESLint hiba** |
| `npm run typecheck` | **PASS — Next typegen + TypeScript** |
| izolált `npm run build` | **PASS — Next 16.4.2 webpack, 32/32 statikus oldal**; külön `/private/tmp` másolaton, a közös `.next` érintése nélkül |
| célzott PDF/kalkulátor suite | **5 fájl / 28 teszt PASS** |
| `git diff --check` | **PASS** a QA-08 dokumentáció hozzáadása után |

## Teljesítmény, kockázat és nem minősített állapotok

Nincs production latency-, bundle-, memória- vagy valódi 101/201/525 rekordos végpontmérés. A build és a lokális renderelés csak build-integritási bizonyíték; teljesítmény-SLO-ra nem bizonyíték. A tartós E2E, PDF-képi paritás, Storage/fotó-upload, többtagú hosted-RLS, mobil viewportok és konzol-log audit nyitott.

QA-08 ezért a lokális automatizált regressziós kaput **PASS**, a teljes termék-szintű E2E-t **PASS WITH LIMITATIONS** státuszban adta át. A közvetlen downstream trust boundary azóta a QA08-RPC-01 follow-upban helyi forrásra és izolált DB-re **lezárult**; hostolt/megosztott migráció nélkül ott továbbra sem igazolt. QA-07 lezárása változatlan.

## Felhasznált skillek és következő lépés

Felhasznált skillek: `systematic-debugging`, `build-web-apps:frontend-testing-debugging`, `build-web-apps:react-best-practices`, `supabase:supabase`, `supabase:supabase-postgres-best-practices`, `web-design-guidelines`, `verification-before-completion`, `ponytail:ponytail-audit`.

Következő környezetlépés: a `QA08-RPC-01` migráció jóváhagyott alkalmazása és hostolt jogosultsági/PostgREST smoke; az A–F teljes tartós E2E, minden kért viewport és PDF-útvonal külön QA-08 korlát marad.

Javasolt Conventional Commit: `docs(QA-08): record full end-to-end integration verification`.
