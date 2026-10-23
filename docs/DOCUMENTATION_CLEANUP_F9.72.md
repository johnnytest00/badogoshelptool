# F9.72 — Dokumentációs audit, tisztítás és konszolidáció

**Állapot:** dokumentációs módosítások elkészültek; az ellenőrzési eredmények a záró szakaszban. Kód, konfiguráció, séma, adat és üzleti viselkedés nem változott.

## Kiinduló állapot és módszer

Induló Git-állapot: `main`, `origin/main` előtt két commit; meglévő módosítás: `docs/PROGRESS.md`, nem követett fájl: `docs/URL_ARCHITECTURE_AUDIT_F9.71.md`. Ezeket megőriztem, az F9.71 audit és bejegyzés tartalmát nem írtam át. A teljes `docs/` fa 45 Markdown-fájlját, a gyökér `AGENTS.md`, `CLAUDE.md`, `funkciok.md` hivatkozásait és a releváns kódállításokat vizsgáltam. F9.61–F9.71 anyagai célzottan áttekintve; az adott mérföldkő bizonyítékait nem futtattam újra.

A besorolás az aktuális használatot különíti el a dátumhoz kötött bizonyítéktól. A régi dokumentum nem redundáns pusztán a kora miatt. Ahol a kód mai viselkedést bizonyított, az aktív áttekintők ahhoz igazodnak; jövőbeli termék/adatvédelmi döntés nem lett eldöntve.

## Teljes dokumentuminventár — induló 45 fájl

| Dokumentum | Besorolás | Cél és döntés |
|---|---|---|
| `AI_TOOLING.md` | ACTIVE | Ellenőrzött skill/plugin/MCP leltár; megőrizve. |
| `ARCHITECTURE_REUSE_REVIEW.md` | REFERENCE | Anyagkezelő és architektúra újrahasznosítási review; időponthoz kötött, egyedi megállapításai miatt megőrizve. |
| `CALCULATION_ENGINE.md` | REFERENCE | Domain motorok és számítási határok; mély technikai referencia, megőrizve. |
| `CALCULATION_VERIFICATION_MATRIX.md` | REFERENCE | Számítási bizonyíték és határ; megőrizve. |
| `CALCULATOR_COVERAGE_MATRIX.md` | REFERENCE | Kalkulátoronkénti forrás- és feature-lefedettség; megőrizve. |
| `CALCULATOR_INPUT_OUTPUT_AUDIT.md` | HISTORICAL | F9.50.1 mezőfelelősségi audit; későbbi állításhoz kódellenőrzés kell. Megőrizve. |
| `CALCULATOR_MATH_VERIFICATION.md` | REFERENCE | Független képletek és fixture-ek; egyedi matematikai bizonyíték, megőrizve. |
| `CLAUDE_HANDOFF.md` | ACTIVE | Korábban F9.37-nél megállt és elavult funkció-/EXIF-állításokat tartalmazott; rövid, linkalapú, aktuális belépési ponttá frissítve. |
| `CODE_CLEANUP_F9.66.md` | HISTORICAL | Függőségeltávolítás és megőrzési döntések bizonyítéka; megőrizve. |
| `DAILY_WORKFLOW_UX_AUDIT.md` | HISTORICAL | Workflow UX audit és javaslatok; korabeli állapot, megőrizve. |
| `DATABASE.md` | ACTIVE | Sémák, RLS, migrációk és adatkonzisztencia részletes forrása; megőrizve. |
| `ENGINEERING_EXCELLENCE_AUDIT_F9.68.md` | HISTORICAL | Audit findings, köztük EXIF és hosted rollout kockázatok; egyedi bizonyíték, megőrizve. |
| `EXECUTION_DATA_REFACTOR_F9.70.md` | REFERENCE | Friss execution mapping/kompatibilitási korlát és mérés; megőrizve. |
| `F9.16_MOBILE_ACCEPTANCE_CHECKLIST.md` | HISTORICAL | Korábbi mobil-elfogadási checklist és bizonyíték; megőrizve. |
| `F9.19_WORKFLOW_MIGRATION.md` | HISTORICAL | Workflow átmenet/migrációs döntések; megőrizve. |
| `F9.22_PRODUCT_UX_AND_MATERIAL_MANAGER.md` | HISTORICAL | F9.22 UX és anyagkezelő eredmények; megőrizve. |
| `F9_29_SIMPLIFICATION_AUDIT.md` | HISTORICAL | F9.29 egyszerűsítési vizsgálat és megtartott határok; megőrizve. |
| `F9_30_SIMPLIFICATION_AUDIT.md` | HISTORICAL | F9.30 geometria/kalkulátor határ döntései; megőrizve. |
| `F9_31_LEGACY_CALCULATOR_DEPENDENCY_AUDIT.md` | REFERENCE | Legacy írók/RLS függőségi bizonyítéka; adatbiztonsági előzmény miatt megőrizve. |
| `F9_32_END_TO_END_REPORT.md` | HISTORICAL | Helyi workflow E2E korabeli bizonyítéka; megőrizve. |
| `F9_38_CALCULATOR_COMPLETION_REPORT.md` | HISTORICAL | Kalkulátor ikon/UX mérföldkövek; megőrizve. |
| `FLASHING_CALCULATOR_DESIGN.md` | HISTORICAL | Korábbi szegélykalkulátor domain-terve; az aktuális megvalósítást nem állítja, megőrizve. |
| `HUNGARIAN_PROFESSIONAL_UX_AUDIT.md` | REFERENCE | Szakmai UX korlátok és nyitott döntések; megőrizve. |
| `OPTIMIZATION_AUDIT_F9.62.md` | HISTORICAL | F9.62 audit findings és priorizálás; F9.63+ nem törli a bizonyítékot, megőrizve. |
| `OPTIMIZATION_RESEARCH.md` | HISTORICAL | F9.61 kutatás, F9.62 bemenet; dátumozott kutatási háttér, megőrizve. |
| `PERFORMANCE_AUDIT_F9.64.md` | HISTORICAL | F9.64 lokális mérések és korlátok; megőrizve. |
| `PERFORMANCE_VALIDATION_F9.63.3.md` | HISTORICAL | Fejlesztői runtime ellenőrzés; production következtetésre nem használható, megőrizve. |
| `PERFORMANCE_VALIDATION_F9.63.4.md` | HISTORICAL | Izolált production-build/böngészőmérés; egyedi trace, megőrizve. |
| `PHOTO_UPLOAD_SECURITY_F9.69.md` | REFERENCE | Friss alkalmazásszintű body-limit, auth és hosted ingress nyitott kockázat; megőrizve. |
| `PILOT_FEEDBACK_TEMPLATE.md` | REFERENCE | Pilot visszajelzéshez használható sablon; megőrizve. |
| `PILOT_READINESS.md` | ACTIVE | Pilot kapuk; EXIF és fotó út állításai a F9.69 kódhoz igazítva, policy-kérdés nyitva. |
| `PILOT_TEST_PLAN.md` | REFERENCE | Javasolt pilot forgatókönyvek; nincs futtatott pilotként feltüntetve, megőrizve. |
| `PRODUCT_READINESS_AUDIT.md` | HISTORICAL | Korábbi termékérettségi audit; jogi/szakmai háttér miatt megőrizve. |
| `PRODUCT_UX_WORKFLOW_AUDIT.md` | HISTORICAL | Korábbi UX findingek és lezárási jegyzetek; megőrizve. |
| `PROGRESS.md` | ACTIVE | Elsődleges mérföldkőnapló; F9.63.1–F9.71 teljes bejegyzései maradtak, 217 korábbi teljes bejegyzés archívumba került, címsor-indexet hagytam. |
| `PROJECT_MAP.md` | ACTIVE | Aktuális route/adatfolyam térkép; törölt gutter/flashing útvonalak és fotó-metaadat állítás frissítve. |
| `QUOTATION_FINALIZATION_DESIGN.md` | REFERENCE | Ajánlatvéglegesítés és PDF terv/szerződések; nem állít elkészült véglegesítést, megőrizve. |
| `ROOF_CALCULATION_SPECIFICATION.md` | ACTIVE | Tetőszámítási szerződések és nyitott kimenetek; megőrizve. |
| `SHEET_METAL_PROFILE_DESIGN.md` | HISTORICAL | Profilterv és 2026-10-13-as kódkontekstus; már törölt flashing fájlokra mutató két hivatkozás F9.59 történeti feljegyzésre cserélve. |
| `STANDALONE_WORKFLOWS.md` | REFERENCE | Ownership, revíziók és workflow integráció; megőrizve. |
| `TEST_MATRIX.md` | REFERENCE | Hosszú, történeti tesztbizonyíték-mátrix; nincs rövidítve, mert a futtatási bizonyíték egyedi. |
| `UI_UX_AUDIT.md` | HISTORICAL | Korábbi UI audit és backlog; megőrizve. |
| `URL_ARCHITECTURE_AUDIT_F9.71.md` | HISTORICAL | Friss URL-architektúra-audit; a felhasználó által előzetesen hozzáadott fájl érintetlenül megőrizve. |
| `ZHITOV_PARITY_GAP_REPORT.md` | REFERENCE | Külső kalkulátor-paritás hiányai és bizonyítékhatára; megőrizve. |
| `ZHITOV_PARITY_REDESIGN.md` | REFERENCE | Kalkulátor-katalógus jövőbeli/implementált döntések; implementált és nyitott elemeket elválaszt, megőrizve. |

## Fő megállapítások és korrekciók

- **Duplikáció/context:** `PROGRESS.md` 229 másodszintű mérföldkő-bejegyzést és 584 201 byte-ot tartalmazott. A legrégebbi 217 teljes bejegyzés az `archive/PROGRESS_HISTORY.md` fájlba került; a teljes bejegyzésszöveg megmaradt. Az aktív napló felső részébe 2026-10-23 állapotösszefoglaló került. Az archívumba helyezett fejezetcímek az aktív fájlban linkelt indexként maradtak meg, így a korábbi `PROGRESS.md#...` célpontok működnek.
- **Elavult fotóállítások:** a `PILOT_READINESS.md`, `PROJECT_MAP.md`, `funkciok.md` és `CLAUDE_HANDOFF.md` a F9.69 után is úgy fogalmazott, mintha az EXIF/GPS-strippelés nem létezne vagy ismeretlen lenne. A jelenlegi `normalize-survey-photo.ts` Sharp-alapú újrakódolása és a teszt ezt cáfolja; az aktív áttekintők most a metaadat-eltávolítást tényként, a hosted/korábbi képeket és retention/privacy policy-t nyitott kérdésként kezelik.
- **Elavult funkciótérkép:** a `PROJECT_MAP.md` eltávolított `gutters`/`flashings` modulokat mutatott jelenlegi funkcióként. Az F9.59 történeti napló és a tényleges `src/` leltár alapján a térkép ezt helyesbítette.
- **Elavult átadás:** a `CLAUDE_HANDOFF.md` F9.37-es állapotot, már nem létező funkciókat, illetve régi fotóállítást ismételt. A gyökér `funkciok.md` aktuális összefoglalója frissült; a 454 fájlos részletes export F9.37.3-as történeti leltárként most egyértelműen jelölt, ezért útvonaligazságként nem használandó. 176 soros, 22 906 byte-os dokumentumból rövid navigációs/határ dokumentum lett; a részletes adat nem veszett el, mert hivatkozott forrásokban él.
- **Halott belső linkek:** `SHEET_METAL_PROFILE_DESIGN.md` két már törölt F9.59 fájlútvonalát a törlés előzményére irányítottam. Az F9.68 auditban URL-kódolt `[surveyId]` útvonal szabályos link, nem törött.
- **F9.61–F9.71:** a F9.61 kutatás és F9.62 audit (`OPTIMIZATION_RESEARCH.md`, `OPTIMIZATION_AUDIT_F9.62.md`), F9.63–F9.70 teljes részletes anyagai, valamint az F9.71 jelentés bizonyítékai megmaradtak. A F9.70 eltérő/hibás történeti survey JSON snapshot kompatibilitási kockázatot nem jelöltem megoldottnak. A F9.69 hosting ingress limit és F9.71 hostolt proxy/Auth korlátok szintén nyitva maradtak.

## Konszolidáció és törlési napló

- **Törölt fájl:** 0. Nincs olyan történeti dokumentum, amely bizonyíthatóan egyedi döntés vagy mérési bizonyíték nélküli, biztonságosan törölhető redundancia lenne.
- **Összevont fájl:** 0. Eltérő témájú tervet, auditot és tesztmátrixot nem vontam össze.
- **Archivált fájl:** 1 (`PROGRESS_HISTORY.md`), benne 217 teljes, korábbi milestone-szakasz. Az `archive/` szerkezet itt indokolt: csökkenti a gyakran megnyitott napló kontextusát, miközben az archívum változatlanul kereshető.
- **Új navigáció:** [`README.md`](README.md) rövid, linkalapú útmutató a 48 fájlos dokumentációs térben.
- A korábban felhasználói módosításként jelölt F9.71 anyagot nem tekintem törlésre vagy átírásra felhatalmazásnak; a F9.72 bejegyzés külön, a napló elején marad.

## Kanonikus források

| Téma | Aktuális kanonikus forrás |
|---|---|
| Projektutasítások és szabályok | `AGENTS.md`, `CLAUDE.md` |
| Legfrissebb fejlesztési/ellenőrzési állapot | `docs/PROGRESS.md` |
| Route-ok, rétegek, adatfolyamok | `docs/PROJECT_MAP.md` |
| Funkciótérkép | `funkciok.md` |
| Sémák, RLS, migrációk | `docs/DATABASE.md` + aktuális migráció |
| Számítási határok | `docs/CALCULATION_ENGINE.md`, `docs/ROOF_CALCULATION_SPECIFICATION.md` és specifikus feature contract |
| Futtatott tesztek bizonyítéka | `docs/TEST_MATRIX.md` és a legutóbbi milestone jelentés |
| Pilot/readiness kapuk | `docs/PILOT_READINESS.md` |
| Történeti mérföldkő részletek | `docs/archive/PROGRESS_HISTORY.md` és az adott audit/feature report |

## Mérés

Az összehasonlítás a verziókezelt `docs/**/*.md` fájlokra vonatkozik (nem számolja a gyökérszintű Markdownokat vagy más fájltípust). A sorok a newline-delimited sorok száma; a byte a fájlméretek összege.

| Mutató | F9.72 előtt | F9.72 után |
|---|---:|---:|
| Markdown-fájlok | 45 | 48 (+3 új: archívum, index, auditjelentés) |
| Összes méret | 1 953 650 byte | 1 991 618 byte (+37 968; az archívum megőrzése és új navigációs/auditfájlok miatt) |
| Összes sor | 14 542 | 15 656 (+1 114 index és új jelentések miatt) |
| `PROGRESS.md` | 584 201 byte / 4 029 sor | 60 583 byte / 1 014 sor (−89,6% byte / −74,8% sor) |
| `CLAUDE_HANDOFF.md` | 22 906 byte / 176 sor | 3 200 byte / 29 sor (−86,0% byte / −83,5% sor) |
| Törölt / archivált fájl | 0 / 0 | 0 / 1 |
| Archivált milestone-szakasz | 0 | 217 |
| Dokumentációba javított, bizonyítottan elavult állításcsoport | 0 | 4 |
| Javított belső Markdown-hivatkozás | 0 ismert | 15 (3 útvonal + 12 heading-fragment) |
| Fennmaradó, relatív útvonal- vagy heading-link hiba | A teljes anchor-scan előtt nem volt felmérve; 4 path-jelöltből 1 kódolási hamis pozitív volt | 0 / 429 ellenőrzött Markdown-hivatkozás |

A kontextuscsökkenést csak a konkrét belépőfájlokra állítom: a `PROGRESS.md` aktív nézete byte-ban 89,6%-kal, sorban 74,8%-kal; a `CLAUDE_HANDOFF.md` 86,0%-kal, illetve 83,5%-kal rövidebb. Ez nem tokenmérés vagy teljes AI-session context-megtakarítás. A teljes dokumentáció mérete 37 968 byte-tal nőtt, mert a történeti tartalom az új indexszel és auditjelentéssel együtt megmaradt; lemezhasználat-csökkenést nem állítok.

## Nyitott / nem eldönthető kérdések

- A hosted ingress/parser előtti payload limit és concurrency-védelem, staging/prod Auth/Storage, proxy/CDN beállításai repó-hozzáférésből nem bizonyíthatók.
- A régebbi, már feltöltött képek tényleges metaadat-állapota, a retention/törlés, adatkezelési tájékoztató és adatvédelmi jóváhagyás termék-/üzemeltetési döntés.
- F9.70: az execution read-model az aktuális section sémával ellenőrzi a történeti JSON snapshotokat; eltérő korábbi shape kezelése nincs kompatibilitási fixture-rel bizonyítva.
- A régi dated audit/spec-ek jövőbeli követelményei és termékdöntései nem írhatók felül a jelenlegi implementáció alapján; ezért megőriztem őket.
- Nincs szükség további kézi jóváhagyásra a dokumentációs fájlok eltávolításához; nem töröltem bizonytalan fájlt.

## Ellenőrzés

- A végső link-check 54 Markdown-fájlt és 430 relatív Markdown-hivatkozást vizsgált; URL-dekódolással és diakritika-normalizált GitHub heading-slug összevetéssel 0 útvonal- és 0 anchorhibát talált.
- Ellenőrizendő még: `AGENTS.md`/`CLAUDE.md` kereszthivatkozások, kódból/scriptsből hivatkozott docs utak, kanonikus dokumentumok jelenléte, archivált fejezetek és régi anchorok, whitespace és teljes diff.
- `git diff --check` futtatva: PASS. Alkalmazásteszt, build, adatbázis- vagy böngészőteszt dokumentációs-only változás miatt nem indokolt.
- A F9.61–F9.71 teszteredményeket a korabeli dokumentumokból vettük át; ebben a mérföldkőben nem futottak újra.

**Javasolt Conventional Commit:** `docs(F9.72): consolidate project documentation`
