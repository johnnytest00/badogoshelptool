# Standalone ajánlat véglegesítése és PDF — architektúra

Állapot: **A véglegesítés továbbra is DESIGN; az F9.7.6.6.3.2c draft PDF előnézet implementálva.**
Ez a dokumentum az F9.7.6.6.3.1 issuance-tervét és a lentebb rögzített, külön
piszkozat-előnézeti implementációt tartalmazza. A preview nem vezet be
adószámítást, véglegesítő RPC-t vagy kiállított PDF-et.

## Bizonyított jelenlegi szerződés

- A `quotations` és `quotation_revisions` közös, `project` / `standalone`
  scope-ú modell. A standalone draft projekttől és ügyféltől független lehet;
  `created_by`-t a szerver/RPC állítja.
- A standalone mentés aktív szervezeti tagságot, létrehozót, scope-ot,
  idempotens operation ID-t, várt verziót és immutable revíziókat használ.
  HUF az egyetlen pénznem; DB-oldali `NUMERIC(20,2)` összegek, legfeljebb 6
  tizedes mennyiség, 2 tizedes egységár és soronként half-up, 2 tizedes
  kerekítés bizonyított. Kézi MATERIAL/LABOR/OTHER sor és ellenőrzött
  katalógusár-snapshot támogatott.
- A jelenlegi `price_class` csak egységes `net` vagy `gross` besorolás. Az üres
  standalone draftnál `price_class` és subtotal lehet null. Nincs adókulcs,
  adókategória, adóösszeg vagy nettó↔bruttó számítás. A projekt
  `finalize_quotation` egységes besorolást, teljes HUF összesítést, legalább
  egy tételt, ügyfelet és aktuális revíziót követel; adót nem számol.
- Közös státuszok: `draft → finalized → sent → accepted/rejected`. Csak a
  projekt route/RPC implementálja ezeket; az elfogadás nem aláírás és a `sent`
  nem igazol kézbesítést. A projekt finalize zárja az ajánlat sort `FOR UPDATE`
  zárral, rögzíti a `finalized_revision_id/at/by` adatokat, és utána tiltja az
  üzleti módosítást. A finalize RPC projektet és `client_id`-t vár.
- A projekt PDF a `src/features/quotations/quotation-document.tsx` React-PDF
  A4 nézetét és `quotation-pdf.ts` `renderToBuffer` adapterét használja. A
  projekt API route bejelentkezést, aktív szervezeti tagságot, project/quote/
  revision kapcsolatot és RLS-t használ; lezárt ajánlatnál kizárólag a
  `finalized_revision_id`-t rendereli. `private, no-store` választ ad, nem
  publikus Storage URL-t. A layout tételeket, csoportos részösszegeket,
  net/gross címkét, revíziót, ügyfelet és projektet mutat. Piszkozatnál
  hiányossági figyelmeztetés lehet.
- A tényleges `organizations` mező jelenleg csak `id/name`; nincs cím,
  hivatalos névforma, elérhetőség vagy adóazonosító. A `clients` opcionális
  `name/email/phone/billing_address` adatot ad, de nincs recipient-típus vagy
  adóazonosító. Nincs ajánlatszám-számláló/tábla: a gépi UUID és a revíziószám
  létezik, külön üzleti dokumentumszám nem. `created_at`, `finalized_at` és
  `finalized_by` létezik; `valid_until` nincs.

## Dokumentum-adat szerződés

Az issue snapshot teljes, szerveroldalon validált és változtathatatlan legyen.
Draftban hiányos adat megengedett; véglegesítésnél az alábbi *kiállítási*
mezők mindegyikéről explicit döntés/érték szükséges. A jogszabályi kötelező
adatmezőket csak könyvelő/jogász által megerősített listából szabad kódolni.

| Adat | Draftban | Véglegesítéskor | PDF-en |
| --- | --- | --- | --- |
| Kibocsátó | Név az orgból; hiányzó cégadat később beállítható | Az account profilból explicit snapshot; hivatalos név/cím/azonosítók követelménye könyvelővel megerősítendő | Szervezet blokk; csak snapshot-adat |
| Címzett | Opcionális `client_id` vagy kézi ideiglenes snapshot | Azonosítható recipient snapshot; meglévő ügyfélből vagy validált kézi adatból. Tartós ügyfélrekord önmagában nem feltétel | Címzett blokk; későbbi kliensmódosítás nem változtatja meg |
| Ajánlatazonosító | UUID + revíziószám | UUID mindig; olvasható dokumentumszám csak a számozási szabály megerősítése után | Név és egyértelmű kiállítási azonosító |
| Kiállítás dátuma | Nincs | Szerver `issued_at` UTC timestampje; helyi megjelenítési zóna rögzítendő/egységesítendő | Kiállítás dátuma |
| Érvényesség | Nincs | Explicit dátum vagy megerősített „nincs lejárat” opció; alapérték nem kitalálható | Érvényességi feltétel |
| Tétel | Megengedett hiányos draft | Legalább egy sor; megnevezés, pozitív mennyiség, egység, nemnegatív egységár, típus és egységes árbesorolás; MATERIAL-hoz saját org aktív validált variáns kötelező, kézi ár-felülírás ettől még megengedett | Megnevezés, mennyiség, egység, egységár, immutable sorösszeg, opcionális megjegyzés |
| Pénzügy | HUF és draft subtotal; class hiányozhat | Szerver által újraellenőrzött HUF subtotal és explicit net/gross class | Subtotal, pénznem, az árbesorolás megnevezése; nincs kitalált adóadat |
| Adó | Nincs | Csak támogatott, verziózott és jóváhagyott tax treatment snapshot; amíg ilyen nincs, issue blokkolt | Csak a snapshotban rögzített és támogatott adósorok |
| Megjegyzés/feltételek | Nincs általános mező | Opcionális, explicit szerkesztett dokumentumszöveg snapshotolva | Feltételek blokk |

Kézi címzett nem hoz létre `clients` rekordot: a címzett snapshot (forrásjelöléssel:
`linked_client` vagy `manual`) az issue rekordba kerül. A rendszer nem állíthat
ki, nem egészíthet ki és nem normalizálhat üzleti adatot a kliens által
ellenőrzött értéken túl.

## Ár, adó és kerekítés határai

`net/gross` jelenleg árbesorolás, nem adókulcs vagy adókezelési döntés. A gross
árból nettó értéket, adóösszeget vagy fordított számítást nem szabad képezni.
Mai igazolt kerekítés: mennyiség × egységár, soronként `NUMERIC(20,2)`/half-up,
majd kerekített sorok összege. Nincs történeti tax snapshot; csak ár,
provenance, line total és subtotal snapshot van.

F9.7.6.6.3.2-ben a domain szerződés későbbi, diszkriminált
`taxTreatmentSnapshot`-ot várjon (pl. explicit konfigurált treatment ID,
verzió, alkalmazási mód, forrás/jogalap, érvényesség, rate és kerekítési
szabály). Ezek konkrét értékei és támogatott esetei nem készülhetnek el addig,
amíg az adótanácsadó/könyvelő meg nem erősíti a joghatóságot, a kibocsátó
adóprofilját, az árajánlatban megjelenítendő adókezelést, kulcsokat, árak
nettó/bruttó értelmezését, részösszeg- és végösszegkerekítést, illetve a
mentesség/egyéb esetek kezelési körét. Ismeretlen vagy nem támogatott treatment
esetén a backend adjon konkrét validációs hibát, és ne bocsásson ki PDF-et.
27%-os kulcs, mentesség, reverse charge vagy „nettó, ezért nincs ÁFA” nincs
feltételezve.

## Véglegesítési szerződés

- Az új `finalize_standalone_quotation` RPC tranzakcióban, auth.uid() + aktív
  tagság + `ownership_scope='standalone'` + creator ellenőrzéssel működjön. A
  jelenlegi projekt `finalize_quotation` RPC-t ne hívd át, és ne változtasd meg
  annak kötelező project/client feltételeit.
- RPC fogadjon `quotation_id`, `expected_version`, exact `current_revision_id`
  és UUID `operation_id`-t. Sor `FOR UPDATE` zárral, stale ID/verzió elutasítással,
  owner/scope/org ellenőrzéssel és megismételhető idempotency ledgerrel
  végezze a validálást és az issue snapshot insertet. Azonos kulcs+azonos
  request ugyanazt az issue/revision eredményt adja vissza; módosult payload
  elutasítandó. Két párhuzamos kiállításból csak egy eredményezhet dokumentumot.
- Tranzakció ellenőrizze a kiállítási mezőket, legalább egy teljes sort,
  egységes price class-t, HUF-ot, backend által rögzített összegeket és
  támogatott tax treatmentet. Új issuance rekord őrizze az immutable
  kibocsátó-, címzett-, dokumentum-, tax- és totals snapshotot, a pontos
  revíziót, `issued_at/by`, validity mezőt és idempotency adatot. A közös quote
  `finalized_revision_id/at/by` mutasson ugyanerre a revízióra és a státusz
  `finalized` legyen; a meglévő guard + immutability trigger maradjon hatályban.
- Az alkalmazott közös enum további `sent/accepted/rejected` állapotokat is
  ismer, de a jelen milestone standalone-on csak `draft → finalized`-ot
  vezethet be. Nem jelenik meg acceptance, aláírás, kézbesítési bizonyíték,
  számla vagy kivitelezési átadás. Kiállítás után javítás csak új
  standalone ajánlat/issue útján, eredetihez visszakövethető kapcsolatban;
  eredeti rekord nem módosul. Hogy a későbbi verzió új sorszámot kap-e, nyitott
  üzleti döntés.

## PDF-architektúra

Meglévő A4 React-PDF layout és `renderQuotationPdf` buffer-adapter újrahasználandó.
`QuotationDocumentData`-t közös issuer/recipient/issue metadata és line/totals
snapshot felé kell bővíteni; projekt mező maradjon opcionális blokk. A meglévő
projekt PDF adatátalakítás és pixel/layout-kimenet regressziótesztje legyen
megőrizve. Közös table, tipográfia, kategóriaösszegzés, fontok, lapozás és
nyomtatási stílus: egy renderer.

Standalone PDF csak véglegesített, engedélyezett kiállítás snapshotból
készülhet, URL-paraméterből nem fogadhat összeget, címzettet vagy revíziót.
Az új route sessiont, aktív tagságot, `standalone` scope-ot és creator ID-t
ellenőriz, majd az issuance sor `quotation_id + finalized_revision_id`
kapcsolatát olvassa RLS mellett. Rejtett/idegen rekord egységesen 404. Kimenet
inline `application/pdf`, `private, no-store`, safe filename; nincs public vagy
hosszú életű signed URL.

Első kiadásban PDF byte-ok on-demand renderelése illeszkedik a meglévő
projektkonvencióhoz, nem kell Storage bucket vagy documents tábla. A tartalom
reprodukálhatóságát az immutable issuance snapshot adja, nem garantált az
azonos PDF byte hash renderer/font verziók között. Ha jogi/audit követelmény az
eredeti kibocsátott bináris byte-pontos megőrzése, külön immutable artifact
Storage-terv és hash szükséges, accountant/legal döntés után.

## Biztonsági modell

- Creator + aktív org tagság minden standalone read/finalize/PDF úton; más
  azonos szervezeti tag és más szervezet tiltott.
- RPC az actor ID-t `auth.uid()`-ból veszi. Client `organization_id`, creator,
  issuer, tax profile, totals vagy revision input nem jogosultsági bizonyíték.
- Összetett organization/quote/revision FK; immutable issue snapshot és
  append-only issuance/idempotency táblák; authenticated direct write tiltott,
  rögzített `search_path`-es RPC kizárólagos írási kapu.
- Konkurencia: quote soron `FOR UPDATE` + expected version/revision, unique
  operation request; opcionális emberi sorszám esetén ugyanabban a tranzakcióban
  org-scope counter lock/unique constraint.
- Project PDF/action/RLS viselkedés változatlan; cross-scope finalize/read
  teszt kifejezetten elutasítja project quote standalone RPC-be adását.

## F9.7.6.6.3.2 — végrehajtási sorrend

**Issuance belépési feltétel (döntés):** könyvelő/adótanácsadó által
jóváhagyott kiállítói mezők, recipient minimum, tax treatment/összegzési
szabály, emberi ajánlatszám-igény/formátum és érvényességi policy. A
tax-semleges domain/DB contract és readiness megvalósítható ezek nélkül; adó
számítása, tax configuration és kiállítás nem.

1. Véglegesítsük és verziózzuk a TS/Zod document/tax adatkontraktot, a review
   hibakódokat és a snapshot JSON shape-et; rögzítsük, mely mező kézi vagy
   meglévő profil/ügyfél forrásból jön.
2. Additív DB migráció: org issuer-profile mezők vagy profil-snapshot forrás,
   immutable `quotation_issuances`, szükség esetén emberi szám-számláló,
   idempotency record, összetett FK/check/index, RLS/grant/revoke és immutable
   triggerek. Existing project rows and RPCs untouched.
3. Domain/DB validáció és pénzügyi contract: server-owned snapshotból
   ellenőrzött HUF sorösszeg és részösszeg; az adó, bruttó és fizetendő csak
   jóváhagyott treatment után számolható. Enélkül tax unresolved és fail closed.
4. SECURITY INVOKER `finalize_standalone_quotation` RPC + append-only
   idempotency; tranzakcióban validálás, issue insert, quote finalize pointer
   és timestamp; project RPC marad változatlan.
5. Auth Server Action: review/preflight és finalize, expected-version,
   operationId retry, hasznos mezőnkénti hibák és stale conflict kezelése.
6. PDF shared renderer refactor és standalone API route: immutable issued
   snapshot only; `safeQuotationFilename` általános dokumentumazonosítót
   fogadjon; project output regression maradjon.
7. UI: „Mentés piszkozatként”, „Ajánlat ellenőrzése” és csak támogatott
   rekordnál „Ajánlat véglegesítése”, majd „PDF megnyitása”. Review oldalon
   actionable hibák, nettó/bruttó és tax blocks explicit; projekt nem kell.
   Desktop/iPad/iPhone layout, unsaved-navigation guard.
8. Bizonyítás: célzott domain Vitest; pgTAP RLS/immutability/transition;
   Auth Server Action owner/non-owner/cross-org; pénzügyi half-up és határok;
   operation retry és két session concurrency; tax case matrix; project PDF
   snapshot-regression; végül egy authenticated standalone browser workflow
   V1 issue → PDF → reload → unchanged issued snapshot, plus project PDF smoke.

Kötelező; opcionális később: bináris PDF archiválása/hash, e-mailes kézbesítés,
ügyfélportál, elfogadás/aláírás, számla, PDF localization. Ezek nem részei a
6.3.2 scope-nak.

## Nyitott megerősítések és elfogadási feltételek

Könyvelő/adótanácsadó: kiállító hivatalos adatköre; címzett minimális adatai;
joghatóság és tax treatment/rate/formula/rounding/labels; net/gross árak
értelmezése; kivételek támogatási köre; ajánlatszámozás; expiry szabály; a
byte-pontos PDF-megőrzés elvárása. Ne használjunk demó- vagy kitalált tax
adatokat éles dokumentumhoz.

F9.7.6.6.3.2 elfogadás: csak autholt creator saját standalone draftot tud
véglegesíteni; stale/conflict és retry nem hoz létre több issuance-t; missing
issuer/recipient/validity/line/tax adat konkrét okkal blokkol; szerverösszegek
és issue snapshot a kiválasztott revízióval egyeznek; finalized állapot immutable;
PDF csak authorized snapshotból jön; projekt-ajánlat PDF/layout és lifecycle
regresszió változatlan. Böngészős COMPLETE csak az összes kritikus pont tényleges
igazolása után adható.

## F9.7.6.6.3.2a — dokumentumadat-alap

Állapot: **COMPLETE (DOCUMENT FOUNDATION)**. A dokumentum-metaadat az immutable
quotation revision `input_snapshot.document` mezőjében, `schemaVersion: 1`
formában él. Minden mentés a jelenlegi organization issuer-profilt szerveroldali
snapshotként rögzíti; a kézi címzett mezői vagy az azonos szervezetből kiolvasott
ügyfél `name/billing_address/email/phone` adatai ugyanitt kapnak forrásjelölt
pillanatképet. Ügyféladat módosítása vagy az issuer profil frissítése nem írja át
a korábbi revíziót. A `validUntil` `YYYY-MM-DD` dátumként kerül a JSON-ba,
timezone-konverzió nélkül; a referencia, megjegyzés és feltételek opcionális.
Hiányos adatokkal is menthető a piszkozat.

Az organization issuer mezők: `business_name`, `business_address`,
`contact_email`, `contact_phone`, `tax_identifier`. Olvasás aktív tagként
lehetséges; írás a meglévő owner/admin RLS policy és az oszlop-grant alapján
történik. Az adóazonosító szabad szöveges profiladat, nem adókonfiguráció.
A `quotation_document_sequences` szervezetenként tárol monoton
`last_issued_number` állapotot, de draft nem hoz létre számlálósort és számot
sem. Későbbi kiállítási tranzakciónak kell zárolva növelnie és az issuance
rekorddal együtt commitolnia.

A `validateQuotationDocumentReadiness` domain-validátor a dátumot,
e-mail-formátumot és hiányzó kibocsátói/címzett mezőket ellenőrzi; a hitelesített
Server Action a címzettet azonos szervezetből oldja fel. Az eredmény soha nem
állít kiállíthatóságot: tax, kiosztott szám és véglegesítés blokkolóként marad.

## F9.7.6.6.3.2b — pénzügyi contract és adósemleges readiness

Állapot: **COMPLETE (FINANCIAL FOUNDATION)** a domain, migráció és helyi
automatizált ellenőrzések körében. Jóváhagyott adókezelés nem szerepel az
ellenőrzött projekt-specifikációban. Nincs supported tax treatment; az issuer
`tax_identifier` leíró profilmező marad, nem konfiguráció, és nincs org-default.

Az új `quotation_revisions.financial_contract` csak új revíziókhoz töltődik
triggerből. A DB a már számított `price_class`, HUF `subtotal` és meglévő
sorsnapshotok szemantikáját rögzíti: forrásverzió, NET/GROSS input basis,
NET amount csak NET alapnál, GROSS amount csak GROSS alapnál, `taxTreatment`
unresolved, `taxAmount` és `totalPayable` null, valamint a meglévő 6/2 skálájú,
soronkénti half-up kerekítés. A meglévő soradatok maradnak az egyedi
line amountok forrásai. A korábbi revíziók oszlopa null marad; nincs backfill,
adatmódosítás vagy régi snapshot-átírás.

A domain decimal-safe bigint szerződése ugyanazt a sortotal-szabályt modellezi.
Az önálló szerkesztő nettó HUF összegeket mutat; readiness ellenőrzi a saját
creator aktuális revízióját, a tételsorokat és a szerverről olvasott pénzügyi
összeg konzisztenciáját. Hiányzó/eltérő összegek strukturált magyar blokkolók.
Minden esetben false marad `canIssue`, a tax, a sorszám és a finalize hiánya
miatt. A readiness nem változtat számlálót, draft továbbra is menthető.

Szervezeti adókonfigurációs mező/tábla és quotation treatment-választó nem
került be: üresen konfigurálható vagy tetszőleges szövegként elfogadható
tax-mode önmagában veszélyes lenne; új defaultot sem szabad a régi ajánlatokra
alkalmazni. Ismeretlen treatment ID domain-szinten unsupported, és a draft RPC
nem fogad klienstől pénzügyi/tax snapshotot. Következő lépés előtt a könyvelő
erősítse meg a joghatóságot, issuer státuszt, támogatott eseteket, rate/formulát,
NET/GROSS megjelenítést, kerekítést, kötelező adatokat és az alkalmazandó
időbeli érvényességet. Csak ezután készülhet admin-konfiguráció, explicit quote
választás és executable rule.

Hiányzó issuance prerequisites: atomikus expected-revision finalize RPC,
idempotencia és concurrency teszt, issue snapshot és számlálótranzakció,
jóváhagyott tax-rule-mátrix, valamint standalone issued PDF. E milestone ezekhez
nem allokál számot és nem hoz létre issuance-t.

## F9.7.6.6.3.2c — mentett standalone piszkozat PDF előnézet

Az on-demand `GET /api/ajanlatok/{quotationId}/pdf?revision={revisionId}` route
a `getAuthContext()` sessiont, az aktív szervezeti tagságot és a quote
`created_by = auth.userId` tulajdonosát ellenőrzi. Az organization ID csak a
hitelesített quote rekordból származik; a revíziót a meglévő
`get_standalone_quotation_revision` RPC-vel, explicit revision ID-val olvassa.
Hiányzó, más creator/szervezet által birtokolt quote vagy revízió azonos 404-et
ad. A válasz `private, no-store`, nem használ service role-t és nem ír storage-ba.

A `renderQuotationPdf` meglévő adapter kapott standalone-draft ágat; a meglévő
`QuotationPdfDocument`, projekt route és project adatszemantika változatlan.
Az önálló oldal ugyanazt az A4, font, fejléc/táblázat és formázási alapot használja,
de mentett issuer/recipient snapshotból, dokumentumszövegből, kiválasztott
revízióból és annak tételsnapshotjaiból épül. Minden oldalon rögzített,
színfüggetlen `PISZKOZAT` / `NEM VÉGLEGES AJÁNLAT` címke és a
„Tájékoztató piszkozat. Nem véglegesített ajánlat.” pontosítás jelenik meg.
Kiállítási dátum/szám nincs.

Csak HUF/net és a financial contracttal, totals snapshot-tal, mentett sorárakkal,
soronkénti line totalokkal és subtotal-lal konzisztens revision renderelhető. A
PDF az eltárolt sorösszegeket jeleníti meg; a szerver kizárólag ellenőrzéshez
számol újra. Gross, hiányos, régi financial contract nélküli vagy ellentmondó
adat actionable 422 hibával elutasított. ÁFA, bruttó/fizetendő vagy 0% adósor
nincs. Az editor a mentett aktuális vagy explicit történeti revízió PDF-jét
nyitja meg; mentetlen módosításnál mentés / utolsó mentett előnézet / mégse
választást mutat.

**Fennmaradó issuance határ:** `canIssue = false`; jóváhagyott adókezelés,
kötelező kiállítási adatok, atomikus/idempotens véglegesítés, hivatalos szám és
kiállított dokumentum továbbra sincs.
