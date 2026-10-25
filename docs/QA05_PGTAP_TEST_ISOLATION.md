# QA-05 — pgTAP tesztizoláció és teljes helyi regresszió

2026-10-25 · **COMPLETE a helyi QA-05 mérföldkőre**

## Gyökérok és javítás

A `040_execution_plan_document_links.sql` 13. állítása a második szervezeti tag nevében a **teljes** `execution_plan_document_links` táblában várt nulla látható sort. A teszt előkészítése ezt a tagot a szervezethez kapcsolja; ezzel a helyi DB-ben már létező, M3 szerint jogszerűen látható aktív kalkulációs kapcsolat is láthatóvá válik. Az eredeti teszt **24 állításból 1 hibával** futott (`have: 1`, `want: 0`). A tranzakciós, csak olvasó diagnosztikai másolat a többletsort `calculation:true:preexisting` kategóriába sorolta. Ez környezeti adatfüggés volt, nem bizonyított RLS-szivárgás.

A teszt most a saját maga által létrehozott és `test.link`, illetve `test.quotation_link` változóban rögzített **két pontos link-ID-t** számolja. A negatív állítás előtt új pozitív állítás ellenőrzi, hogy a létrehozó mindkét különálló rekordot látja, azonos szervezettel, megfelelő `material_list`/`quotation` típussal és forrásazonosítóval. Így üres vagy elrontott fixture mellett a negatív állítás nem adhat álpozitív eredményt. A linkelési, leválasztási, `42501` jogosultsági, immutabilitási és audit-állítások megmaradtak. A teszt `BEGIN`/`ROLLBACK` kerete változatlan.

Az M3 policy-hoz, authhoz, szervezeti logikához és üzleti SQL-függvényhez nem nyúltunk. Az aktív kalkulációs kapcsolat szervezeti tag számára továbbra is látható; a leválasztott kalkulációs kapcsolatot csak a létrehozó látja. A `057_execution_plan_calculation_links.sql` ezt külön vizsgálja. A `040` a másik tag privát linkhez való olvasását és írását, valamint a más szervezet naplójához kapcsolás `42501` elutasítását is megtartja.

## Futtatott ellenőrzések

| Ellenőrzés | Eredmény |
|---|---|
| Eredeti `040`, módosítás előtt | **FAIL**, 24 állításból 1 hiba, korábbi 13. állítás: 1 látható sor, 0 várt |
| Új pozitív fixture-állítás, régi negatívval | **FAIL**, 25 állításból 1 hiba; az új pozitív állítás sikeres, a hibás teljes táblás számolás továbbra is bukott |
| Javított `040` | **PASS, 25/25** |
| `040` + M3 `057` | **PASS, 46/46** |
| `057` + `040`, fordított sorrend | **PASS, 46/46** |
| Teljes `npm run db:test`, első futás | **PASS, 61 fájl / 1292 állítás** |
| Teljes `npm run db:test`, második futás | **PASS, 61 fájl / 1292 állítás** |
| `npm test` | **PASS, 178 fájl / 1067 teszt; 8 fájl / 19 teszt kihagyva** |
| `npm run lint`; `git diff --check` | **PASS** |

A pgTAP tesztek helyi, már futó Supabase-re csatlakoztak; minden módosított fixture-t a teszt tranzakciója visszagörgetett. Nem történt DB-reset, migráció vagy meglévő rekord törlése. A meglévő aktív kalkulációs kapcsolat típusát és a teszt fixture-jétől független eredetét a jelen futásban egy `/private/tmp` alatti, visszagörgetett diagnosztikai másolat is megerősítette. A javított teszt ilyen környezetben kétszer teljes suite-tal is sikeres. Külön, üres adatbázist nem indítottunk.

## Fennmaradó korlát

Hostolt Supabase-en nem futott regresszió. Typecheck/build nem futott ebben a mérföldkőben, mert kizárólag pgTAP SQL-teszt és dokumentáció változott. A teljes suite jelenlegi adatállapotra és alkalmazott helyi migrációkra bizonyított; jövőbeli policy- vagy üzletiszabály-változás külön regressziót igényel.

Javasolt Conventional Commit: `test(QA-05): scope document-link RLS assertions to owned fixtures`.
