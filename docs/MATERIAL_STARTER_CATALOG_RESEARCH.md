# P1.2/A — Valós induló anyagkatalógus és szakmai adatkutatás

**Ellenőrzés dátuma:** 2026-11-04  
**Hatókör:** lokális fejlesztői műhely, `00000000-0000-4000-8000-000000000010`  
**Státusz:** PASS WITH LIMITATIONS

## A. Vezetői összefoglaló

A meglévő Anyagkezelőben ténylegesen létrejött négy aktív, forrásolt `user_provided` termék/variáns. Nem állítottam őket automatikusan `verified` vagy minden szervezet számára alapértelmezett állapotba.

| Csoport | Felvett termék | Állapot | Kalkulátor-kompatibilitás |
|---|---|---|---|
| Szarufa | Szarufa fenyő 75×200 mm · 5 m | RÉSZLEGES | Keresztmetszet előtölthető; statikai osztály nincs igazolva |
| Tetőléc | Bramac tetőléc 30×50 mm · 4 m | RÉSZLEGES | Keresztmetszet előtölthető; léctávolság munkaspecifikus |
| Alátétfólia | DELTA-VENT S PLUS · 1,5×50 m | RÉSZLEGES | Tekercsméret előtölthető; átfedések nincsenek kitalálva |
| Tetőfedő lemez | Lindab LTP 20 Classic 0,5 mm | NEM ALKALMAS automatikus előtöltésre | Hasznos szélesség igazolt, fix használható hossz nincs; rendelhető hosszú termék |

## B. Meglévő Anyagkezelő-kompatibilitás

- Kategóriák: `roof_covering`, `sheet_metal`, `gutter`, `flashing`, `insulation`, `timber`, `accessory`, `other`; mind a nyolc kategória már létezett, duplikáció nem készült.
- A szarufa és tetőléc a meglévő `timber` kategóriába került.
- A sémában nincs külön alátétfólia kategória; a kalkulátor jelenlegi csoportleképezése miatt a fólia `insulation` alatt szerepel. Ez kompatibilitási kompromisszum, nem új kategória.
- A tetőfedő lemez a meglévő `sheet_metal` kategóriába került.
- Termékmezők: név, kategória, gyártó, termékkód, státusz, provenance, forrásnév/URL/dátum/jegyzet.
- Variánsmezők: SKU, egység, névleges/effektív szélesség, hossz, csomagolási mennyiség, `technical_specs`, saját forrásmezők.
- Ármezők: HUF, nettó/bruttó, értékesítési egység, hatálybalépés dátuma, forrás. A kalkulátor-adatbetöltés ármezőket nem olvas.
- A termékek és variánsok aktívak; az árak immutable árhistoriasorokként kerülnek tárolásra.

## C. Kötelező kalkulátormező-mátrix

| Katalógusmező | Kalkulátormező | Egység | Jelentés | Kötelező? | Termék / munka | Hitelesítés | Automatikus előtöltés |
|---|---|---|---|---|---|---|---|
| `technical_specs.section_width_mm` | `sectionWidthMm` | mm | faanyag keresztmetszeti szélessége | igen, ha faanyag-profilt használunk | termék | konkrét variánsadatlap | csak `verified` + egyértelmű default |
| `technical_specs.section_height_mm` | `sectionHeightMm` | mm | faanyag keresztmetszeti magassága | igen, párban | termék | konkrét variánsadatlap | csak párban |
| `nominal_width_mm` | `nominalWidthMm` | mm | lemez fizikai/tényleges szélessége | fedésnél szükséges | termék | gyártói profiladat | igen, ha a modellhez illeszkedik |
| `effective_width_mm` | `effectiveCoveringWidthMm` | mm | átfedés utáni fedőszélesség | fedésnél szükséges | termék | gyártói profiladat | igen, fizikai szélességtől külön |
| `length_mm` | `physicalLengthMm` | mm | konkrét variáns fizikai hossza | csak fix hosszú panelnél | termék | konkrét variánsadatlap | csak igazolt fix hossz esetén |
| `technical_specs.usable_covering_length_mm` | `usableCoveringLengthMm` | mm | kalkulátor által használható fedési hossz | fedésnél szükséges | termék/modellekötés | gyártói szerelési adat | fix hossz nélkül nem |
| `technical_specs.roll_width_mm` | `rollWidthMm` | mm | fóliatekercs szélessége | fólia-számításhoz igen | termék | gyártói DoP/adatlap | igen, `verified` esetén |
| `technical_specs.roll_length_mm` | `rollLengthMm` | mm | fóliatekercs hossza | fólia-számításhoz igen | termék | gyártói DoP/adatlap | igen, `verified` esetén |
| `technical_specs.side_overlap_mm` | `sideOverlapMm` | mm | oldaltoldási átfedés | csak dokumentáltan | termék/rendszerfüggő | gyártói kivitelezési előírás | hiány esetén nem |
| `technical_specs.end_overlap_mm` | `endOverlapMm` | mm | végtoldási átfedés | csak dokumentáltan | termék/rendszerfüggő | gyártói kivitelezési előírás | hiány esetén nem |
| `technical_specs.installation_direction` | `installationDirection` | enum | fektetési irány | munkamódszer | munkaspecifikus | szakmai döntés | nem általánosítható |
| `technical_specs.roof_calculator_default_group` | P1.1 default-kapu | enum | melyik csoporthoz jelölhető | opcionális jelölő | termék-kijelölés | szervezeti jóváhagyás | csak pontosan egy jelöltként |

A tetőn szükséges szarufahossz, tengely-/léctávolság, ereszkiülés, fóliaátfedés és fektetési irány nem vezethető le pusztán a termék nevéből; ezek munkaspecifikusak vagy külön rendszerelőírást igényelnek.

## D. Termékadatlapok és források

### 1. Szarufa — 75×200×5000 mm

- Termékazonosság: `Szarufa fenyő 75×200 mm · 5 m`, variáns `75×200×5000 mm`, Anyagkezelő ID: `c589a092-3538-44aa-aa6d-b7cbe24fa498`, variáns ID: `3068d71d-d6d9-4584-bdbe-3432eac93382`.
- Igazolt adatok: 75×200 mm keresztmetszet, 5 m hossz, bruttó 16 673 Ft/db referenciaár.
- Forrás: [Skandináv Fatelep fenyő árlista](https://www.skandinavfatelep.hu/wp-content/arlista/fenyo-fureszaru.pdf), 2026-02-05.
- Hiányzik: gyártói fafaj-/szilárdsági osztály-dokumentáció. A méret nem statikai megfelelőség.

### 2. Tetőléc — 30×50×4000 mm

- Termékazonosság: `Bramac tetőléc 30×50 mm · 4 m`, SKU `FA30x50x4`, Anyagkezelő ID: `8671a6d5-6448-45ff-8e99-d87b54e16d2b`, variáns ID: `9e118094-1071-49f1-b742-6af9b0f91ee7`.
- Igazolt adatok: 30×50 mm, 4 m, impregnált fenyő, I. osztályú kereskedői jelölés, bruttó 1 300 Ft/szál (4 fm).
- Forrás: [Építőanyag.hu termékoldal](https://epitoanyag.hu/bramac-impregnalt-tetolec-3x5-cm-4-m-pRkEzMHg1MHg0), ellenőrizve 2026-11-04.
- Hiányzik: a fedési rendszerhez tartozó léctávolság; ezt nem rögzítettem termékadatként.

### 3. Alátétfólia — DELTA-VENT S PLUS

- Termékazonosság: `DELTA-VENT S PLUS alátétfólia · 1,5×50 m`, gyártó Dörken, cikkszám `02202543`, Anyagkezelő ID: `8b62874b-f8ae-4d18-b5e7-30a429654f18`, variáns ID: `e6b5d27f-a711-487e-8c31-b0a690973b84`.
- Igazolt adatok: 1,50 m × 50 m tekercs, 75 m² névleges terület, W1, Sd≈0,02 m, 150 g/m².
- Forrás: [Dörken magyar teljesítménynyilatkozat](https://www.doerken.com/hu/hu/content/preview/24196/file/DELTA-VENT%20S%20PLUS%20teljes%C3%ADTM%C3%89NYNYILATKOZAT.pdf), ellenőrizve 2026-11-04; magyar forgalmazói méretmegerősítés: [Tetősipos Dörken oldal](https://webshop.tetosipos.hu/pages/doerken-tetofoliak).
- Ár: nincs rögzítve, mert ellenőrizhető magyar ár nem volt egyértelmű.
- Hiányzik: oldal-/végtoldás és fektetési irány; ezek nem kerültek kitalálásra.

### 4. Tetőfedő lemez — Lindab LTP20 Classic 0,5 mm

- Termékazonosság: `Lindab LTP 20 trapézlemez · 0,5 mm · Classic`, Anyagkezelő ID: `5f0b276e-9b99-430d-9654-dc9ba9851d0c`, variáns ID: `3d716ec1-6fa1-4a27-a855-50d649c17169`.
- Igazolt adatok: Lindab LTP20 profil, fedőszélesség 1026 mm a gyártói oldalon; magyar műszaki összefoglalóban 1028 mm és 1075 mm tényleges szélesség szerepel. A gyártói oldal 100–10 000 mm közötti rendelhető hosszakat ír.
- Forrás: [Lindab LTP20 gyártói oldal](https://www.lindab.com/Catalog/building-products/roof/roofing/ltp20/), [Lindab magyar műszaki összefoglaló](https://newsite.lindab-biatorbagy.hu/wp-content/uploads/2021/10/lindab_sillabusz_lemezek.pdf).
- Ár: a [Tetőcentrum termékoldala](https://www.tetocentrum.hu/hu/termekek/lindab-ltp-20-trapezlemez-0-5-mm-classic-bevonat-015-fekete-33050) 6 045 Ft/m² listaárat mutat, de a nettó/bruttó jelleg nem egyértelmű; ezért az Anyagkezelőben nem rögzítettem.
- Döntés: nincs `roof_calculator_default_group`, mert a jelenlegi kalkulátor fix `usableCoveringLengthMm` mezőt igényel, miközben a termék rendelhető hosszú. Nem jelölhető automatikus előtöltésre további modellezés nélkül.

## E. Termékadat és munkaspecifikus adat

Termékadatként csak a variánsazonosság, keresztmetszet, tekercsméret, lemez fizikai/fedőszélessége és konkrétan dokumentált hossz került fel. Munkaspecifikus maradt a szarufahossz, kiosztás, léctávolság, ereszkiülés, fóliaátfedés, fektetési irány és a lemez tényleges rendelési hossza.

## F. P1.2/B minimális terv

1. Szakember ellenőrizze a négy rekordot és a forrásokat.
2. A jóváhagyott variánsokat külön szervezeti döntéssel állítsa `verified` állapotba.
3. Pontosan egy variáns kapjon csoportonként `roof_calculator_default_group` jelölést.
4. LTP20-hoz csak akkor adjunk automatikus defaultot, ha a fix panelhossz/hasznos hossz szerződése tisztázott.
5. Fólia- és lemezátfedést csak gyártói kivitelezési dokumentáció alapján töltsünk.
6. Futtassuk a kalkulátor DEMO-t, majd ellenőrizzük, hogy az ár nem jelenik meg a kalkulátor UI-ban.
7. A P1.1.1 snapshot/revízió teszteket változatlanul meg kell őrizni.

## G. Nyitott szakmai kérdések

- Mely szervezet és mely szakember hagyja jóvá a `verified` státuszt?
- A faanyaghoz szükséges-e külön gyártói minőségi/szilárdsági dokumentum?
- A fólia oldal-/végtoldása milyen konkrét tetőrendszerhez legyen kötve?
- A lemezkalkulátor fix panelt vagy rendelhető hosszú profilt kívánjon kezelni?
- Az `insulation` kategória hosszú távon megfelelő hely-e az alátétfóliára, vagy későbbi kategóriabővítés szükséges?

## H. Implementációs és QA-megjegyzés

Az adatfelvétel a meglévő Anyagkezelő REST/RLS-szerződésen keresztül, a lokális fejlesztői műhelyben történt; nem készült migráció, új modul, új UI vagy kalkulációs képlet. A rekordok ár nélkül is működőképesek, a kalkulátor kódja ármezőket nem olvas.

