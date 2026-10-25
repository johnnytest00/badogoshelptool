# QA08-RPC-01 — Calculation RPC trust boundary

## Státusz

**COMPLETE a helyi forrásra és az izolált adatbázis-bizonyítékra.** A javító migráció elkészült és eldobható helyi adatbázis-klónon ellenőrzött. Megosztott helyi vagy hostolt adatbázisra nem alkalmaztam; ott a védelem a migráció jóváhagyott alkalmazásáig nem tekinthető aktívnak.

## Bizonyított eredeti megkerülési útvonal

A konstrukciós revíziót író `save_standalone_construction_calculation` RPC már a vizsgálat előtt is csak a `tetopro_covering_writer` szerepkör számára volt végrehajtható. Az `authenticated` szerepkör nem tudta közvetlenül meghívni, és a konstrukciós táblák közvetlen kliensírását az RLS megakadályozta.

A tényleges rés a downstream bizalomban volt: a közvetlenül `authenticated` szerepkörnek engedélyezett `link_execution_plan_document` és `save_standalone_quotation_from_calculation` az ownership-, szervezet- és típusfeltételeket ellenőrizte, de nem tudta bizonyítani, hogy a hivatkozott immutable revízió valóban a korlátozott, szerveroldali újraszámítást végző útvonalon keletkezett. Egy privilegizált fixture-rel létrehozott, üres `lines` mezőjű konstrukciós revíziót a link RPC korábban `{created: true}` eredménnyel elfogadott. A reprodukció tranzakcióban futott és visszagörgetődött.

Ez jogosultsági és integritási szempontból külön probléma: egy felhasználó lehet jogosult a saját szervezetében kapcsolni, de ettől a hivatkozott output még nem válik megbízható számítási eredménnyé.

## Tényleges hívási gráf

```text
böngésző (authenticated)
  └─ saveConstructionCalculationAction(input-only)
       ├─ auth + szervezeti tagság
       ├─ ismert mezők és material-szerződés
       ├─ TypeScript szerveroldali újraszámítás
       ├─ isSaveableComputation == complete
       └─ COVERING_WRITER_DATABASE_URL / tetopro_covering_writer
            └─ save_standalone_construction_calculation
                 ├─ actor + szervezeti tagság
                 ├─ payload/idempotencia + advisory lock + expected revision
                 ├─ strukturális input/output-kapu
                 ├─ immutable calculation_revision
                 └─ ugyanabban a tranzakcióban private attesztáció

böngésző (authenticated)
  ├─ link_execution_plan_document
  └─ save_standalone_quotation_from_calculation
       └─ trigger: csak azonos org/calculation/revision attesztációval folytatható
```

## Régi és új bizalmi határ

Korábban a TypeScript Server Action volt a matematikai igazság forrása, de a downstream SQL-függvények a revízió létezését és tulajdonjogát összekeverték annak eredetével. Az új határ a korlátozott író RPC tranzakciója:

- a böngésző továbbra is csak inputot ad a Server Actionnek;
- a szerver a meglévő TypeScript motorral újraszámít és teljességet ellenőriz;
- kizárólag a `tetopro_covering_writer` hívhatja a revízióírót;
- az író csak támogatott, szerkezetileg teljes snapshotot fogad el;
- a revízióval atomikusan, privát táblában keletkezik az eredetigazolás;
- munkanapló- és ajánlatforrás csak ilyen attesztált revízióra mutathat.

A `private.construction_revision_attestations` nem kliensadat: `public`, `anon`, `authenticated`, `service_role` és maga az alkalmazási writer sem kap közvetlen tábla-hozzáférést. A `SECURITY DEFINER` író és guard függvény rögzített üres `search_path`-ot használ.

## Választott és elvetett megoldások

Választott megoldás: a meglévő privilegizált szerveríró megtartása, szerkezeti teljességi kapuval és atomikus, downstream által kötelezően ellenőrzött attesztációval. Ez a legkisebb módosítás, amely egyszerre őrzi meg a TypeScript számítási motort, az optimistic concurrency-t, az idempotenciát és az immutable revíziókat.

Elvetett megoldások:

- Kizárólag üres JSON vagy kliens `complete` jelző tiltása: hamisítható, és nem bizonyítja az eredetét.
- A teljes geometriai motor újraírása SQL-ben: két eltérő igazságforrást és nagy regressziós felületet hozna létre.
- Általános `service_role` írás: indokolatlanul széles jogosultság lenne.
- RLS lazítása vagy csak UI-gomb tiltása: nem védene közvetlen RPC ellen.
- Régi snapshotok újraszámítása/átírása: megsértené a történeti immutabilitást.

## Adatintegritási és kompatibilitási garanciák

- Üres, kötelező mezőt nélkülöző, hamis `complete` jelzős, `INCOMPLETE` vagy `UNSUPPORTED` anyageredmény nem menthető az íróval.
- Egy szintaktikailag hihető, de inputtal ellentmondó outputot az `authenticated` szerepkör nem küldhet be az író RPC-nek; a matematikai helyességet a szerveroldali TypeScript újraszámítás biztosítja, nem a strukturális SQL-predikátum.
- Elutasított link vagy ajánlatforrás egy tranzakcióban bukik, ezért nem hagy árva downstream rekordot.
- Az attesztáció három kulcsot egyeztet: szervezet, kalkuláció és pontos immutable revízió.
- A meglévő kapcsolatok olvashatók és leválaszthatók maradnak; a guard csak beszúráskor, illetve a hivatkozási kulcsok módosításakor fut.
- A migráció a régi snapshotokat nem módosítja. A QA-09 integrációs hardening óta csak a strukturálisan teljes, `output=server_recomputed` jelölésű és a korábbi restricted-writer operation ledgerrel szervezet/revízió/létrehozó/input/output szinten pontosan egyező konstrukciós revíziókat attesztálja visszamenőleg; a metaadat önmagában nem bizonyíték.
- Az idempotens ismétlés csak már attesztált előző műveletet használhat újra. A revízió- és operációs advisory lock, az expected-version ellenőrzés és az immutable trigger változatlan marad.
- A QA-03/03.1 draft/dirty state és a QA-06 kurzorozott olvasás alkalmazáskódja nem változott.

## Bizonyítékok

TDD red állapot a javítás nélküli helyi sémán, visszagörgetve: **26 állításból 10 bukott**. Az üres/hiányos/hamis státuszú/unsupported output elfogadása, az attesztáció hiánya, valamint a hamisított revízió munkanapló- és ajánlatforrásként való elfogadása reprodukálódott.

A végleges migrációt egy eldobható helyi adatbázis-klónon alkalmaztam. A célzott `057`, `058`, `060` pgTAP **63/63**, a teljes suite **62 fájl / 1318 teszt PASS**. A `060` lefedi:

- `authenticated` író-RPC tiltás és kizárólagos writer jogosultság;
- üres, hiányzó mezős, hiányos, hamis `complete` jelzős és nem támogatott output;
- érvényes szerverírás és atomikus attesztáció;
- ismételt művelet, hibás expected-version és történeti immutabilitás;
- lejárt/hiányzó auth-kontekstus és cross-organization próbálkozás;
- nem attesztált, de formailag teljes revízió munkanapló- és ajánlatforrásként történő elutasítása, árva rekord nélkül;
- attesztált revízió kapcsolása, idempotens újrahívása és pontos visszaolvasása.

Külön kétkapcsolatos integrációs próba ugyanarra a V1-re két párhuzamos V2 mentést indított: **1 siker, 1 `40001`, 2 revízió, 2 attesztáció, max revízió 2**.

Alkalmazásregresszió: célzott Vitest **24/24**, teljes Vitest **183 fájl PASS / 8 SKIP; 1101 PASS / 19 SKIP**, ESLint PASS, Next route typegen + TypeScript PASS. Alkalmazáskód nem változott, ezért production build nem futott. A Supabase DB lint nem jelzett új hibát; a repository korábbi, más függvényekhez tartozó warningjai megmaradtak.

## Migráció és környezet

- Új migráció: `supabase/migrations/20261025154642_qa08_rpc_trust_boundary.sql`.
- Új regresszió: `supabase/tests/database/060_calculation_rpc_trust_boundary.sql`.
- A `057` és `058` pozitív fixture-ei a most kikényszerített teljes snapshot-szerződéshez igazodtak; üzleti viselkedésük nem változott.
- A migráció csak az eldobható helyi klónra került alkalmazásra. A megosztott helyi adatbázis migrációlistája és adatai nem módosultak; hostolt környezetet nem érintettem.

## Fennmaradó kockázatok

Az SQL-predikátum szándékosan strukturális, nem matematikai verifikátor. A helyesség azon a bizonyított határon nyugszik, hogy a writer hitelesítő adata csak a szerverfolyamatban érhető el, és a Server Action a TypeScript motorral újraszámít. A DB-owner/szuperuser adminisztratív hozzáférése továbbra is trusted operations határ; az ilyen szerepkör bármely adatbázis-garanciát felülírhat.

A hostolt migráció, hostolt PostgREST-próba, secret-konfiguráció és többtagú staging E2E nem futott. A migráció jóváhagyott alkalmazásakor a backfill darabszámát és a writer credentialt külön ellenőrizni kell.

Javasolt Conventional Commit: `fix(QA08-RPC-01): attest trusted calculation revisions`.
