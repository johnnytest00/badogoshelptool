# QA-02 — Anyagkatalógus teljessége, lapozása és közvetlen termékmegnyitás

2026-10-25 · **PASS WITH LIMITATIONS**

## Gyökérok és érintett adatútvonalak

Az általános `getMaterialProductsForOrganization` az `updated_at desc, id desc` szerint rendezett lista első 200 sorát adta. A termékrészlet ezt a listát kereste ID-val, ezért egy jogosult, régebbi termék URL-je tévesen „nem található” állapotba jutott. Az Anyagkezelő, az ajánlat- és anyaglista-szerkesztő, a kimutatás, a lemezkiosztás és a projektajánlat is ezt a korlátot örökölte. A kalkulátorprofilok külön, szűk oszloplistával szintén 200 aktív terméknél álltak meg; a két kategóriás tetőfedési kimutatás 200-at olvasott kategóriánként.

## Javítás

- A termékrészlet `organization_id` **és pontos `id`** alapján olvas, az archivált terméket is megnyitja. A hiányzó és más szervezethez tartozó ID egyaránt `null` eredményű; a meglévő részletútvonal ebből a korábbi nem található állapotot adja.
- Az Anyagkezelő 50 termékes szerveroldali lapokat, szerveroldali név/termékkód keresést, kategória- és archivált szűrőt kapott. A rendezés `updated_at desc, id desc`; a számlálás és az utolsó oldal jelzése a szűrt lekérdezésből jön. A keresés/szűrőváltás visszaáll az első oldalra; betöltés, hiba és üres találat külön állapot. A kategóriák melletti, az első 200 termékből számolt félrevezető darabszám megszűnt.
- Az ajánlat- és anyaglista-oldal induláskor 50 aktív terméket kap. A közös kiválasztó név/kód szerint keres, 50-es oldalakat kér és „További termékek” gombot ad; a kiválasztott teljes termékrekord a szerkesztő állapotába kerül, így az eddigi árforrás- és egységlogika használja. A már mentett ajánlat- és anyaglista-variánsok pontos ID szerint, az archivált termékkel együtt töltődnek vissza. Archivált vagy inaktív kategóriájú termék új kiválasztásra nem kerül az opciók közé.
- A teljes katalógust ténylegesen igénylő régi szerveroldali hívók, a kalkulátorprofilok és a két kategóriás kimutatás ellenőrzött, 200-as lekérdezési oldalakon haladnak végig. A variánsok, árverziók és áropciók legfeljebb 100 azonosítós csoportokban, azon belül 200 soros lapokkal töltődnek. Ez elkerüli az egy termékenkénti lekérdezést és a Supabase válaszsor-korlát miatti csendes történetiár-csonkolást. A kis F9.65 fixture lekérdezésszáma változatlan: kalkulátorprofil 4, tetőfedési opció 7.

## Adat- és jogosultsági garanciák

Az olvasások a meglévő SSR Supabase klienst és minden katalógustáblán az `organization_id` szűrőt használják. A lapozó server action a `getAuthContext` szervezeti tagságát ellenőrzi; a DB-n a `material_*_select_member` RLS-policy-k érvényesek. A termék–variáns és variáns–ár kapcsolatot az alkalmazott séma összetett, `(id, organization_id)` idegen kulcsai védik. Az árak rendezése `effective_date desc, recorded_at desc, id desc` maradt; az áropciók és `buildPriceOptions` értelmezése nem változott. Az árverziók és az ajánlat/anyaglista immutable snapshotjai nem módosultak. Versengő katalógusírás alatt több HTTP-lekérdezésnek nincs közös tranzakciós snapshotja; az oldalszámlálás változását az olvasó hibaként jelzi ahelyett, hogy hiányos listát adna.

## Regresszió és teljesítmény

Determinista Supabase-mock: 0/1/199/200/201/525 termék, pontos régi ID, más szervezet és hiányzó ID, archivált termék, 525 termék 1. és 11. oldala, keresés, azonos `updated_at` esetén ID-rendezés, 201. kalkulátor- és kategóriaopció, 525 elemű régi szerverfogyasztó, pontos mentett variáns, 1101 történeti ár. Külön action-teszt bizonyítja, hogy jogosulatlan szervezetnél a terméklekérdezés el sem indul. Az új célzott tesztet a régi kódon pirosra futtattuk (5 hiba), az új kódon zöldre.

Az 525 termékes **szintetikus** fixture-ben a korábbi Anyagkezelő terméklekérdezés 200 sort adott; az új első oldal 50-et. A terméksorok `JSON.stringify` mérete ugyanazon fixture-ben **77 939 → 19 489 byte**; az első termékoldal lekérdezésszáma üres variánskészletnél **4 → 4** (termék, gyártó, variáns, kategória). A teljes, régi szerverfogyasztó 525 termékhez 3 termékoldalt és 6 darab, 100 ID-ra darabolt variánslekérdezést használ; ez tudatos többlet a korábbi csonkoláshoz képest. Ez mock/sorozatosítási összehasonlítás, **nem** adatbázis-latencia vagy production payload-mérés. Az árak teljes történetének betöltése sok árverziónál továbbra is növeli az érintett oldal payloadját.

## Ellenőrzés és korlát

- Célzott Vitest: katalógus, kalkulátorprofil, kimutatás és kiválasztó tesztek **PASS**.
- Teljes Vitest **178 PASS / 8 SKIP fájl, 1067 PASS / 19 SKIP teszt**; ESLint PASS; izolált `npm run typecheck` és `npm run build` PASS; `git diff --check` PASS. Az izolált build a `/private/tmp/tetopro-qa02-build.0tWXyi` másolatban készült, a futó dev szerver `.next` könyvtárát nem érintette.
- Autentikált böngészős 201+ termékes E2E és valódi/hostolt DB teljesítménymérés **nem futott**: az elérhető helyi böngészőben az oldal a betöltőhéjnál maradt, a helyi szerver a sandboxból nem volt elérhető; megosztott DEMO katalógust nem módosítottunk. DB-migráció és pgTAP nem futott; a korábban ismert QA-05 hibát nem érintettük.
- A kereső a terméknévben és termékkódban keres szerveroldalon. Variáns SKU szerinti keresés és szerveroldali egységszűrés nem része a QA-02-nek; a felmérésből származó kiválasztó az egységet az oldal eredményein szűri, ezért ritka egységnél további oldal nyitása szükséges lehet.

Javasolt Conventional Commit: `fix(QA-02): page complete material catalog and open products by exact ID`.
