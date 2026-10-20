# TetőPro — architektúra-újrahasznosítási és Anyagkezelő review

**Állapot:** read-only forrásvizsgálat, 2026-10-20. A riport a jelenlegi munkafát vizsgálja, beleértve a még nem commitolt F9.50.2–F9.50.4 kalkulátoros fájlokat. Kód, adatbázis és meglévő dokumentáció nem változott; teszt/build nem futott, mert a megállapításokhoz statikus forrás- és migrációvizsgálat elegendő volt.

## Rövid válasz

**A kalkulátoroknak nem kell új, tartós anyagprofil-rendszer.** A meglévő, szervezethez kötött Anyagkezelő legyen a termék, variáns, műszaki adat, proveniencia és ár kanonikus forrása. A mostani kalkulátoros `MaterialProfile` jó, kis méretű **adapter-/bemeneti szerződés**, de ne váljon második terméktörzzsé. A kalkulációban csak a kiválasztott variáns azonosítóját, a ténylegesen felhasznált értékeket, azok eredetét és egy történeti snapshotot kell megőrizni.

## 1. Egyszerű modultérkép

```text
Anyagkezelő ── termék/variáns/spec/ár ─┬─> Kalkulátor
                                       ├─> Anyagkimutatás / Anyaglista
                                       └─> Ajánlati anyagsor

Felmérés-revízió ─┬─> támogatott kalkuláció-revízió
                   ├─> mért/számított javaslat ─> Anyaglista-revízió
                   └─> opcionális kivitelezési terv / munkanapló

Kalkuláció-revízió ─> Anyagkimutatás ─> Anyaglista ─> Ajánlat-revízió
                                                    └─> opcionális munkanapló-kapcsolat
```

| Modul | Bizonyított jelenlegi felelősség | Fontos határ |
|---|---|---|
| Felmérések | Szakaszok, mérések, fotók, tetőgeometria-paraméterek és immutable revíziók; pontos felmérés-revízióból anyaglista-javaslat és támogatott kalkuláció-/kivitelezési kapcsolat. | Projekt nélkül is működhet; nem minden mérésből lesz termékmennyiség. |
| Kalkulátorok | Tiszta domain motorok, rajzok, egyes típusoknál mentett `calculation_revisions`, forrásfüggőségek és katalógusvariáns-snapshot. | A jelenlegi általános építési suite helyi előnézet; az új tető-anyagprofil snapshot `persisted: false`. |
| Anyagkezelő | Szervezeti kategória, gyártó, termék, variáns, műszaki adat, proveniencia, beszállítói ársor és ártörténet. | Katalógus, nem kalkulációs eredmény- vagy rendeléskezelő. |
| Anyagkimutatás / Anyaglista | Projektben jóváhagyható takeoff; projekt-, standalone-, terv- vagy felmérésforrású, verziózott előkészítési lista. Katalógus- és forrássnapshotokat őriz. | Geometriai mennyiség nem automatikusan beszerzési mennyiség. |
| Ajánlatok | Projektajánlat és standalone DRAFT, tétel-, ár-, forrás- és dokumentumsnapshotokkal. | A két workflow képessége eltér; standalone ajánlat nem véglegesíthető. |
| Kivitelezés / munkanapló | Opcionális terv, feladat, append-only napló, fotó és visszavonható dokumentumkapcsolat felméréshez, anyaglistához vagy ajánlathoz. | Terminális fogyasztó; nem hivatalos e-építési napló. |

## 2. A meglévő Anyagkezelő képességei

### Adattárolás

- `material_categories`: szervezeti, átnevezhető és inaktiválható megjelenítési kategória. Nyolc alap kategória automatikusan létrejön. A `material_products.category` enum megmaradt technikai kompatibilitási osztályozónak; az egyedi kategóriák szándékosan `other` értékre képeződnek.
- `material_manufacturers` → `material_products` → `material_variants`: minden rekord `organization_id`-hoz kötött, az összetett idegen kulcsok kizárják a más szervezetből származó kapcsolatot.
- A termék hordozza a nevet, gyártót, kategóriát, kódot, leírást, aktív/archivált állapotot és forrásmetaadatot. A variáns hordozza az SKU-t, beszerzési egységet, méreteket, csomagmennyiséget és kalkulátorspecifikus JSON műszaki adatot.
- Proveniencia termék-, variáns- és árszinten: `verified`, `user_provided`, `estimated`, `demo`, `missing`.

### Meglévő műszaki specifikációk

Relációs variánsmezők: névleges szélesség, hasznos szélesség, vastagság, hossz, csomagmennyiség és beszerzési egység. A `technical_specs` jelenleg `Record<string,string>` / JSONB; bizonyított fogyasztói kulcsok többek között:

- profilanyag: `profileMaterialSpec`;
- lemezkiosztás: `minimum_sheet_length_mm`, `maximum_sheet_length_mm`, `end_allowance_mm`;
- cserepeslemez-szerződések: `moduleBaseLengthMm`, `modulePitchMm`, `moduleCount`.

A jelenlegi általános tető-anyagkalkulátor további mezőket igényel (például fóliatekercs mérete/átfedése, használható táblahossz, fa keresztmetszet). Ezekhez **nincs még kanonikus katalógus-adapter és teljes, típusos Anyagkezelő-validáció**, de a meglévő JSONB bővítési pont miatt új tábla nem szükséges.

### Beszállítói árak és előzmény

- A `material_price_options` egy variánshoz tartozó, elnevezett „beszállító / forrás” ársor. Ez nem külön beszállítótörzs: csak címke, állapot és kapcsolat.
- Minden ármódosítás új `material_prices` sort ír; az árak update/delete triggerrel append-only történetet alkotnak. Az ársor átnevezése nem írja át a régi ár `source_name` snapshotját.
- Árhoz kötelező az egység, nettó/bruttó jelleg, HUF és érvényességi dátum; az egységnek egyeznie kell a variáns egységével. Árral rendelkező variáns egysége nem változtatható meg.
- Több aktív beszállítói sor esetén a rendszer nem választ automatikusan „legolcsóbbat”; automatikus alapár csak pontosan egy választható ársornál van.

### Meglévő CRUD-támogatás

- Kategória: létrehozás, átnevezés, aktiválás/inaktiválás.
- Gyártó: létrehozás és módosítás.
- Termék: atomi gyors létrehozás variánssal és opcionális árral, részletes módosítás, archiválás/visszaállítás.
- Variáns: létrehozás és módosítás; történeti ár mellett az egység zárolt.
- Ár: új immutable árverzió; ársor létrehozása, átnevezése, archiválása/visszaállítása; előzmény megjelenítése.
- Hard delete nincs a felhasználói CRUD-ban; ez helyes a snapshotokra hivatkozó üzleti adatok miatt.

## 3. Anyagkezelő ↔ kalkulátor integráció

### Bizonyított jelenlegi állapot

Az integráció nem ismeretlen minta a repóban:

- a lemezkiosztás a katalógusvariánst tiszta adapterrel `SheetLayoutMaterialCatalog` szerződésre képezi, felülírást és stale-ellenőrzést kezel;
- a lemezprofil-kalkulátor kategória-, egység-, vastagság-, anyagjelölés- és forrásegyezést ellenőriz, mentéskor szerver/DB oldalon újra feloldja a variánst és snapshotot tárol;
- anyagkimutatás, anyaglista és ajánlat a variáns és a kiválasztott ár adatait snapshotolja.

Ezzel szemben a munkafában lévő `roof-material-spec.ts` öt hardcoded, jól láthatóan DEMO profilt ad át közvetlenül a `construction-suite.tsx` komponensnek. A `MaterialProfile` csak `verified | demo` státuszt ismer, nincs benne külön product/variant identity, és a snapshot kifejezetten nem perzisztált. Ez a rendszer **jelenleg leválasztott előnézeti réteg**, nem valós termékkatalógus.

### Javasolt opciók

| Opció | Értékelés |
|---|---|
| **A. Anyagkezelő → kalkulátorspec adapter** | **Javasolt.** Egy tiszta, kalkulátoronként típusos adapter a releváns aktív variánsokból `MaterialProfile`-t készít. A terméktörzs nem duplikálódik. |
| B. Új `material_profiles` tábla / külön CRUD | Nem indokolt. Ugyanazt a nevet, forrást, műszaki adatot és szervezeti izolációt másolná le. Szinkronizációs és történeti ellentmondást okozna. |
| C. Csak kézi specifikáció | Átmenetileg biztonságos, de nem használja ki a már működő katalógust, és ismételt adatbevitelt okoz. |

### Minimum integrációs változás

1. **Tiszta adapter:** aktív, megfelelő technikai kategóriájú `MaterialProductRecord`/variáns → kalkulátorcsoport-specifikus profil. Csak validált, ténylegesen jelen lévő mezőt adjon át; hiány maradjon hiány.
2. **Típusos műszaki kulcsok:** a szükséges fedés-, fólia- és faanyagkulcsokhoz Zod-sémák és egyértelmű JSON kulcsnevek. Ehhez első körben nem kell DB-migráció; a meglévő `technical_specs` elég. Az Anyagkezelő haladó űrlapján célszerű a kalkulátor által használt kulcsokat névvel és egységgel megjeleníteni a nyers JSON helyett/mellett.
3. **Szerveroldali betöltés:** `/kalkulatorok` már ismeri az aktív szervezetet; innen kell betölteni a katalógust, az adapter eredményét pedig propként átadni a kliens suite-nak a hardcoded DEMO tömb helyett. A DEMO profilok maradhatnak külön, explicit DEMO mintakészletként.
4. **Proveniencia- és identity-bővítés:** a profil őrizze a `productId`, `variantId`, teljes katalógus-proveniencia és forrásmetaadat értékét. `user_provided` vagy `estimated` adatot nem szabad `verified`-dé összevonni.
5. **Mentés csak akkor, ha a kalkulátor menthetővé válik:** a szerver újra töltse be és validálja az azonos szervezethez tartozó aktív variánst, majd a kalkulációs revízióba mentse a katalógussnapshotot, effektív értékeket és mezőnkénti `catalog/user_override/manual` eredetet. A meglévő `calculation_revisions` minta újrahasznosítható; külön profilperzisztencia nem kell.

Az ár nem szükséges a geometriai/kiosztási számításhoz. Ár csak anyaglista/ajánlat átadáskor váljon explicit választássá, és ne módosítsa a kalkuláció műszaki eredményét.

## 4. Újrahasznosítható közös infrastruktúra

### Domain motorok

- közös tetőgeometria, tetősík és élmodell;
- szarufa/léc kiosztás, alátétfólia-kiosztás, fedőtábla-kiosztás és összesített `calculateRoofMaterialTakeoff`;
- kalkulátor-registry/engine és verziózott input/output szerződések;
- anyagigény-aggregáció, felmérésből biztonságosan átadható javaslatok;
- pontos pénzszámítás, árválasztás és ársor-feloldás.

### UI

- `RoofWorkspace`, `TechnicalDrawing`, `RoofGeometryResults`;
- `RoofTimberQuantityPanel` és `RoofUnderlayQuantityPanel` már a felmérésben is közös;
- `WorkflowMaterialProductPicker`, `UnitPriceField`, anyaglista-szerkesztő és anyaglistából ajánlat gomb;
- közös Glass fejlécek/disclosure/toolbar és visszajelzési komponensek.

### Szolgáltatások és perzisztencia

- Anyagkezelő betöltők/actionök, szervezeti ellenőrzés és RLS;
- immutable ár-, kalkuláció-, felmérés-, anyaglista- és ajánlatrevíziók;
- `expectedVersion` optimista konkurenciakezelés és idempotency/request kulcsok;
- pontos forrásrevízió-, katalógus-, ár- és dokumentumsnapshotok;
- survey ↔ calculation, survey → material list, material list → quotation, valamint execution ↔ survey/material list/quotation kapcsolótáblák.

## 5. Bizonyított duplikáció és leválasztott rendszerek

| Eset | Meglévő megoldások | Kanonikus forrás / újrahasználat | Kockázat |
|---|---|---|---|
| Tető-anyagprofil | Anyagkezelő variáns + műszaki JSON; külön hardcoded `DEMO_MATERIAL_PROFILES`. | Katalógus a törzsadat; `MaterialProfile` csak adapter DTO és kalkulációs snapshot. | Mezőnév/egység téves leképezése; régi DEMO snapshotok azonosítója nem katalógus-UUID. |
| Katalógusvariáns leképezése | Lemezkiosztás-adapter; profil-kompatibilitás; több action saját DB-lekérdezése/snapshotépítése. | Közös read model és kalkulátoronként tiszta adapter; íráskor továbbra is kötelező a szerveroldali újraellenőrzés. | Túlzott központosítás gyengítheti a kalkulátorspecifikus DB-biztonsági szerződést. |
| Faanyag/fólia paraméter UI | Felmérésben közös `Roof*QuantityPanel`; új construction suite-ban külön `MaterialSpecEditor` és kiosztási mezők. | A domain paramétertípusok maradjanak közösek; a termék/kézi specifikációs szerkesztő kerüljön később megosztott feature-be, de a felmérés régi snapshotformátuma maradjon olvasható. | Meglévő felmérés-revíziók nem tartalmaznak variáns/proveniencia linket; visszamenőleges átírás tilos. |
| Anyaglista workflow | Projekt takeoff → `save_material_preparation_revision`; standalone/terv/felmérés → `save_workflow_material_list_revision`; két szerkesztési szerződés ugyanazon lista/revízió táblákon. | A `material_preparation_lists/revisions` a közös perzisztencia. Megosztható termékválasztó, ársor és snapshot DTO; a jóváhagyott takeoff szigorú szabályai maradjanak külön. | Erőltetett összevonás elveszítheti a projektforrás jóváhagyási és stale szabályait. |
| Ajánlat workflow | Projektajánlat és standalone DRAFT külön action/UI; már közös line contractot, pénzműveleteket és katalógust használ. | Közös domain pénz-, line-, snapshot- és import-primitívek; a lifecycle maradjon külön, amíg a képességek eltérnek. | A standalone nem finalizálható; a két folyamat korai összevonása hibás jogosultságot vagy státuszt adhat. |
| Kategóriák | Szervezeti `category_id` + régi technikai `category` enum. | `category_id` a megjelenítési/törzs kategória; enum kizárólag igazolt technikai kompatibilitási osztály. | Ezek látszólagos duplikációk, de most szándékos kompatibilitási rétegek; eltávolítás migrációs és számítási kockázat. |

### Leválasztott, de integrálható

- A construction suite anyagprofiljai nem töltik be az Anyagkezelőt, és a suite nem ment kalkulációt vagy downstream dokumentumot.
- A felmérés faanyag/fólia paraméterei közös motorokat használnak, de termékvariánshoz és katalógus-provenienciához nem kapcsolódnak.
- Nem minden kalkulátornak van biztonságos anyaglista-átadása. A mostani tető takeoff eredményei tudatosan `GEOMETRIC/LAYOUT/NOMINAL`, nem `PROCUREMENT` mennyiségek.

### Valóban hiányzik

- a fenti Anyagkezelő → általános tetőkalkulátor adapter és típusos kulcsséma;
- menthető general-suite kalkuláció esetén szerver/DB oldali variánsvalidálás és immutable source snapshot;
- igazolt szabály, amely a geometriai/kiosztási eredményt rendelési mennyiséggé alakítja (kiszerelés, átfedés, veszteség, vágásmaradék, gyártói korlátok);
- szükség esetén valódi beszállítótörzs — a jelenlegi ársorcímke önmagában nem partnerkezelés.

## 6. Top 5 javasolt fejlesztés

1. Készítsünk egyetlen, tesztelt **catalog variant → roof `MaterialProfile`** adaptert, és azt adjuk át a construction suite-nak.
2. Definiáljuk a tetőfedés/fólia/faanyag kalkulátorspecifikus `technical_specs` kulcsait és Zod-validációját; első körben séma-migráció nélkül.
3. Bővítsük a profil/snapshot szerződést variánsazonosítóval, teljes provenienciával és mezőnkénti forrással; perzisztáláskor kövessük a már működő lemezkiosztás mintáját.
4. Osszuk meg a termék/kézi specifikációs UI-t a kalkulátor és — későbbi, külön mérföldkőben — a felmérés között, a régi felmérés-revíziók változatlan olvasásával.
5. Csak ezután tervezzünk kalkulátor → anyaglista átadást, külön elfogadott procurement-szabályokkal; a meglévő anyaglista- és ajánlatsnapshot mechanizmust használjuk.

## 7. Kifejezetten kerülendő változtatások

- Új `material_profiles`/`calculator_products` tábla és második termék- vagy ártörzs.
- DEMO vagy becsült adat automatikus „ellenőrzött” minősítése; hiányzó műszaki adat kitöltése feltételezéssel.
- Legolcsóbb beszállító automatikus kiválasztása vagy ár beépítése a geometriai motorba.
- Történeti ár, kalkuláció, felmérés, anyaglista vagy ajánlat snapshotjának utólagos átírása a mai katalógus alapján.
- `category_id` és a technikai `category` enum azonnali összevonása/törlése.
- Geometriai darabszám közvetlen rendelési mennyiségként való mentése igazolt kiszerelési és veszteségi szabály nélkül.
- Projekt- és standalone anyaglista/ajánlat workflow nagy, egyszeri összevonása; előbb csak a bizonyított közös primitíveket érdemes kiemelni.

## 8. Releváns forrásfájlok

- Anyagmodell és validáció: `src/domain/materials/contracts.ts`; `src/features/materials/material-data.ts`; `src/features/materials/material-actions.ts`.
- Anyagkezelő UI: `src/features/materials/material-manager.tsx`; `src/features/materials/material-forms.tsx`; `src/features/materials/price-options-panel.tsx`.
- Katalógus/ár séma és biztonság: `supabase/migrations/20261012040000_material_catalog.sql`; `20261012040100_material_price_immutability.sql`; `20261017010000_material_manager_categories.sql`; `20261017020000_material_manager_product_action.sql`; `20261019010000_material_price_options.sql`.
- Árfeloldás: `src/domain/pricing/index.ts`.
- Új, még nem commitolt tetőprofil-réteg: `src/domain/calculations/roof-material-spec.ts`; `roof-calculation-snapshot.ts`; `roof-material-takeoff.ts`; `src/features/calculators/material-spec-editor.tsx`; `construction-suite.tsx`.
- Már működő katalógusadapter-minta: `src/domain/calculations/sheet-layout-material.ts`; `src/features/roof-models/sheet-layout-data.ts`; `sheet-layout-actions.ts`; `src/domain/calculations/profile-material-compatibility.ts`; `src/features/sheet-metal/profile-data.ts`.
- Felmérés és downstream átadás: `src/domain/field-surveys/workspace.ts`; `src/features/field-surveys/workspace-actions.ts`; `src/features/material-takeoffs/survey-material-source.ts`; `src/features/field-surveys/survey-material-list-panel.tsx`.
- Anyagkimutatás/lista: `src/domain/material-takeoffs/aggregation.ts`; `src/domain/material-preparations/contracts.ts`; `src/domain/materials/material-list-contract.ts`; `src/features/material-takeoffs/`.
- Ajánlat és munkanapló: `src/features/quotations/material-list-quotation-import.ts`; `material-list-quotation-actions.ts`; `quotation-actions.ts`; `src/features/execution/`; `src/domain/execution/contracts.ts`.
- Revíziós alapok: `supabase/migrations/20261012010000_versioned_calculation_architecture.sql`; `20261015120000_unified_field_survey_workspace.sql`; `20261015140000_material_preparation_workflow.sql`; `20261013020000_quotations.sql`; `20261018100000_execution_plan_document_links.sql`.

## Ellenőrzési státusz

- **Bizonyított:** a fenti megállapítások a jelenlegi TypeScript-forrásból, SQL-migrációkból és meglévő tesztforrásokból származnak.
- **Nem futtatott:** teszt, typecheck, lint, build, böngészős és adatbázis-ellenőrzés; a feladat nem módosított futó kódot vagy sémát.
- **Blokkolt / nem igazolt:** hosted adatbázis tényleges migrációs állapota, valós gyártói termékadatok teljessége és a procurement-szabályok szakmai jóváhagyása.
