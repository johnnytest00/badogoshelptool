# QA-09 — RPC migration integration, Auth E2E és release readiness

## Státusz

**COMPLETE az elkülönített helyi migrációs, Auth-, Server Action- és downstream integrációs hatókörre. HOSTED / fő helyi DB: NOT APPLIED.**

A `20261025154642_qa08_rpc_trust_boundary.sql` migráció a teljes 119 fájlos előzménysoron, PostgreSQL 17.11 alatt végrehajtható. A tényleges Next.js alkalmazás valódi helyi Auth-munkamenetből a korlátozott szerver-writerrel mentett, majd munkanapló- és ajánlatforrás-workflow-t hajtott végre. A vizsgálat közben a korábbi backfill feltétele bizonyítottan túl tág volt; ezt TDD-vel az immutable revízió és a korábbi restricted-writer operation ledger pontos egyezésére szűkítettem.

Hostolt bevezetés nem történt. Az ottani readiness feltétele a jóváhagyott mentés/helyreállítás, a writer credential szerveroldali megléte, a backfill-előnézet kézi jóváhagyása és a migráció utáni authenticated smoke.

## Környezet és izoláció

- Forrás: Git `1b73163`, megőrzött, már eleve nem tiszta munkafa; commit, push és deploy nem történt.
- Alkalmazás: Next.js 16.4.2, Node.js 26.8.1, npm 11.19.0, Vitest 5.0.3.
- Adatbázis: Supabase CLI 2.121.0, PostgreSQL 17.11.
- Eldobható projekt: `/private/tmp/tetopro-qa09.uJakWS`, külön Supabase project ID és portok (`55320`–`55324`), külön Next dev port (`3309`). A `node_modules` a meglévő telepítésből lett újrahasznosítva; új függőség nem került telepítésre.
- `.env` fájl nem változott. A writer és Auth ideiglenes credential csak a tesztfolyamat memóriájában/környezetében szerepelt; értéke nem került naplóba vagy dokumentációba, a vágólap a teszt után törölve lett.
- A QA09 Next folyamat a böngészős teszt után leállt. A már futó fő fejlesztői szerver (`:3000`) végig futva maradt.
- A fő helyi adatbázis végállapota továbbra is `20261025140000`; a `private.construction_revision_attestations` ott nem létezik. Hostolt adatbázist nem érintettem.

## Migráció és backfill

### Teljes lánc

Az elkülönített adatbázis tiszta resetje mind a 119 migrációt sorrendben alkalmazta, utolsóként a QA08-RPC-01 migrációt, majd a seedet. A célzott és teljes pgTAP ezen a friss sémán futott.

### A feltárt RED eset

A fő helyi adatbázis olvasási snapshotjában 4 történeti konstrukciós revízió volt. Mind a 4-hez létezett pontos `standalone_construction_save_operations` rekord. Egy ötödik, privilegizált tesztfixture szerkezetileg teljes outputot és `data_provenance.output = server_recomputed` metaadatot kapott, de writer-ledger bejegyzést nem.

A korábbi migráció ezen az upgrade-klónon **5/5** revíziót attesztált, a ledger nélküli hamisított sort is. Ez bizonyította, hogy a metaadat és a struktúra önmagában nem elégséges bizalmi bizonyíték.

### Javított GREEN feltétel

A backfill most csak akkor hoz létre attesztációt, ha az immutable revízióhoz létezik pontos korábbi restricted-writer ledger egyezés:

- azonos szervezet, kalkuláció, revízió-ID és revíziószám;
- azonos létrehozó;
- az operation payload azonos kalkuláció-ID-t, előző expected revíziószámot és kalkulátortípust tartalmaz;
- az input- és output-snapshot byte-logikai JSONB-egyezése pontos.

Az ismételt upgrade-próba eredménye: **4 legitim attesztáció, 0 hamisított attesztáció, 0 attesztáció pontos ledger nélkül**. Történeti snapshot nem változott. A ledgerrel nem bizonyítható rekord olvasható maradhat, de új downstream kapcsolatot nem kaphat; kivételét külön, ember által ellenőrzött adatjavítási folyamatban kell kezelni, nem automatikus metaadat-bizalommal.

Az új pgTAP állítás globálisan ellenőrzi, hogy minden attesztációhoz pontos korábbi writer-ledger bizonyíték tartozik. A terv 26-ról 27 állításra nőtt.

## Jogosultsági és RPC-bizonyíték

Az elkülönített végső sémán:

- `save_standalone_construction_calculation(...)`: `SECURITY DEFINER = true`, `search_path = ''`;
- `authenticated = EXECUTE false`, `anon = false` a pgTAP szerint, `service_role = EXECUTE false`, kizárólag `tetopro_covering_writer = EXECUTE true`;
- a writer szerepkör: `LOGIN`, de nem superuser, nem örököl, nem hozhat létre szerepkört/adatbázist, és nem `BYPASSRLS`;
- az attesztációs tábla RLS-e aktív; `authenticated`, `service_role` és a writer sem kap közvetlen olvasási vagy DML-jogot;
- a writer ugyanabban a tranzakcióban ír immutable revíziót, operation ledgert és privát attesztációt;
- a munkanapló- és ajánlatforrás-trigger a pontos szervezet/kalkuláció/revízió attesztációt kéri.

A `060` regresszió bizonyítja az `authenticated`/`anon` writer-tiltást, a hiányos/üres/hamis `complete`/unsupported output elutasítását, a nem attesztált downstream elutasítást árva rekord nélkül, cross-organization tiltást, legitim pozitív használatot, idempotens ismétlést, stale/konkurens revízióvédelmet és immutable történeti revíziót. A teljes `057/058/060` és az összes korábbi M2–M8 szerződés a teljes pgTAP-ban együtt futott.

## Valódi Auth és alkalmazási E2E

Az elkülönített alkalmazás a valódi helyi Supabase Auth szolgáltatással, a DEMO-jelölt seed tulajdonossal és a szerverfolyamatba injektált restricted-writer kapcsolattal futott. A böngésző nem kapott writer credentialt és csak inputot küldött a Server Actionnek.

| Workflow | Tényleges eredmény |
|---|---|
| A — teljes kalkuláció | `roof.rafter-cut`: hiányos állapotban a mentés gomb tiltott; érvényes bemenetből V1 mentés és URL-es újranyitás; módosított V2; V1 történeti megnyitás; V1-ből új V3. Mindhárom revízió attesztált és ledgerelt. |
| B — munkanapló | Új `DEMO QA09 munkanapló`; a kalkuláció pontos V3 revíziójának kapcsolása; napló megnyitása; `Kapcsolt kalkulációk · 1`, V3 rögzített revízió látható. DB: pontosan 1 link. |
| C — ajánlat | `roof.timber-cutlist` V1 valódi szervermentés; a `Szarufa · 4883 mm / 28 db` vágáslista-sor forráskulccsal ajánlati tétellé alakítva, kézi DEMO árral mentve; újranyitáskor a kalkulációs forrás, V1, a felvett forrássor és 28 000 Ft nettó részösszeg látható. DB: pontosan 1 `quotation_calculation_sources` rekord. |
| D — tiltott állapot | Hiányos kalkuláció böngészőben nem menthető. A közvetlen nem attesztált munkanapló- és ajánlatforrás-RPC elutasítása, hamis `complete`, árva rekord hiánya és cross-org tiltás pgTAP-ban futott. |
| E — történeti kompatibilitás | A pre-migrációs snapshot 4/4 pontos writer-ledgerrel rendelkező régi revíziója attesztálódott. Egy régi V1 authenticated szerepkörből olvasható és rollbackelt tranzakcióban sikeresen munkanaplóhoz kapcsolható volt; egy meglévő aktív régi kapcsolat olvasható és rollbackelt tranzakcióban leválasztható volt. Böngészős upgrade-adatbázis megnyitás nem futott. |
| F — nagy adatmennyiség | Tartós 101/201/51+ böngészős fixture nem állt rendelkezésre, ezért nem E2E-igazolt. A teljes Vitestben lefutottak a 101 napló/PDF, 201 katalógustermék és 51/125 kalkulációs revízió automatizált regressziói. |

Az E2E adat csak az eldobható QA09 adatbázisban jött létre, egyértelmű `DEMO QA09` jelöléssel.

## Régi és új séma kompatibilitása

- A jelenlegi alkalmazáskód a régi, `20261025140000` sémával már működik: a QA09 előtti fő helyi alkalmazás ugyanazt a writer RPC-aláírást használja.
- Az új migráció nem változtatja az RPC-aláírást; a jelenlegi alkalmazáskód az új sémán valódi V1/V2/V3 és timber V1 mentést hajtott végre. Alkalmazáskód-módosítás nem szükséges.
- Biztonságos sorrend: writer credential/config preflight → mentés és restore-próba → backfill dry-run számlálás → adatbázis-migráció → authenticated pozitív/negatív smoke → forgalom visszaengedése. Külön app deploy nem feltétel, de az alkalmazott buildet és a migráció commitját együtt kell azonosítani.
- Átmeneti mentési hiba akkor várható, ha a writer credential hiányzik/hibás, vagy az alkalmazás a migráció alatt ír. Bevezetéskor rövid konstrukciós mentési/downstream write-pause indokolt.
- A pontos ledger nélküli történeti rekord szándékosan nem attesztálódik és új munkanapló-/ajánlatforrásként fail-closed marad.

## Rollout-terv — nem végrehajtott

1. Ellenőrizd a cél DB-t, a migrációs headet, az aktív alkalmazásverziót, a writer szerepkört és azt, hogy a credential csak szerveroldalon érhető el.
2. Futtass csak olvasható backfill-előnézetet: konstrukciós revíziók, strukturálisan teljes `server_recomputed` jelöltek, pontos ledger-egyezések és kivételek darabszáma/azonosítólistája. Minden kivétel kézi döntést igényel.
3. Készíts célkörnyezethez illő teljes mentést/PITR-pontot, és külön restore-próbával igazold a helyreállíthatóságot.
4. Állítsd meg röviden a konstrukciós mentést és az új kalkulációs downstream kapcsolásokat; olvasás maradhat, ha a környezet ezt biztonságosan támogatja.
5. Alkalmazd kizárólag a jóváhagyott migrációt. Ellenőrizd a migrációs sort, a backfill darabszámát, a trigger/funkció definíciót, a grantokat, RLS-t és a writer szerepkör flagjeit.
6. Smoke: jogosult Auth + Server Action mentés; pontos revízió/ledger/attesztáció; authenticated/anon/service-role writer-tiltás; hamis/nem attesztált link és ajánlat tiltása árva rekord nélkül.
7. Smoke: attesztált revízió munkanaplóhoz kapcsolása/megnyitása, valamint vágáslista-forrású ajánlat mentése/újranyitása.
8. Engedd vissza az írást, és figyeld a writer, `22023`, `40001`, `42501`, trigger- és connection-hibákat.

## Recovery-terv

- Migráció előtti vagy végrehajtás közbeni hiba: az írás maradjon tiltva; a migrációs runner tényleges tranzakciós viselkedését a célkörnyezetben ellenőrizni kell. Sikertelen részleges DDL esetén csak ellenőrzött backup/PITR restore után induljon újra az írás.
- Sikeres migráció után a séma egyszerű „visszavétele” nem tekinthető biztonságos rollbacknek: új revíziók és downstream linkek már az attesztációs szerződésre támaszkodhatnak, a guardok eltávolítása pedig újranyitná a trust-boundary rést.
- Elsődleges stratégia: **fail closed + roll forward**. Állítsd le az új konstrukciós írást/kapcsolást, tartsd meg az immutable adatot, javítsd előre a migrációt vagy konfigurációt, majd ismételd a smoke-ot.
- Teljes backup restore csak az elfogadott helyreállítási pont utáni írások elvesztésének tudatos vállalásával használható. Ha ez nem fogadható el, export/egyeztetés nélkül ne restore-olj.

## Ellenőrzések

| Ellenőrzés | Eredmény |
|---|---|
| TDD backfill RED | régi migráció: 5 attesztáció, ebből 1 ledger nélküli hamisított |
| TDD backfill GREEN | javított migráció: 4 legitim, 0 hamisított, 0 ledger-mismatch |
| Tiszta teljes migrációs lánc | 119/119 migráció + seed PASS |
| Célzott pgTAP `060` | 27/27 PASS |
| Teljes pgTAP | 62 fájl / 1319 PASS |
| Auth/Server Action/browser | PASS az A–D és a C valódi forrássoros útjára; E DB-integráció PASS, upgrade-browser nem futott |
| Teljes Vitest | 183 fájl PASS / 8 SKIP; 1101 PASS / 19 SKIP |
| ESLint | PASS — nincs issue |
| TypeScript | izolált `next typegen` + `tsc --noEmit` PASS |
| Production build | izolált Next.js 16.4.2 webpack build PASS, 32/32 statikus oldal |
| DB lint | 0 error; a korábbi, QA09-től független warningok megmaradtak |
| `git diff --check` | PASS |

## Fennmaradó problémák és release-döntés

- **P0:** nincs ismert.
- **P1:** nincs ismert az izolált QA09 hatókörben.
- **P2:** hostolt/staging migráció, credential-ellenőrzés, backup-restore próba és többtagú Auth/RLS smoke nem futott; ezek nélkül production rollout nem jóváhagyott. A pontos ledger nélküli történeti rekordok manuális kivételkezelést igényelnek.
- **P3:** a 101/201/51+ esetek csak automatizált fixture-rel futottak, tartós böngészős E2E-ként nem; az upgrade-snapshot történeti revízióját DB-szinten, nem böngészőben nyitottam/használtam. A restore-klónon 6, default-privilege tulajdonosi figyelmeztetés jelent meg; az app-object ACL-ek visszaálltak, a figyelmeztetés nem a migráció futása volt.

**Release readiness:** a forrás és az izolált integráció **READY FOR CONTROLLED STAGING ROLLOUT**, production/hosted bevezetés **BLOCKED az operációs kapuk teljesítéséig**.

## Felhasznált skillek

`supabase:supabase`, `supabase:supabase-postgres-best-practices`, `systematic-debugging`, `test-driven-development`, `build-web-apps:frontend-testing-debugging`, `verification-before-completion`, `ponytail:ponytail`, `antislop`.

Javasolt következő mérföldkő: **QA-10 — Controlled Staging Migration & Multi-User Auth Smoke**.

Javasolt Conventional Commit: `fix(QA-09): harden RPC backfill and prove release readiness`.
