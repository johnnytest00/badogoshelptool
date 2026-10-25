# F9.73.1 — Munkanapló betöltési hibák izolálása

## Státusz és döntés

**PASS WITH LIMITATIONS.** A három vizsgált, opcionális adatforrás már nem blokkolja a munkanapló oldalának egymástól független részeit. A section saját hibaállapotot mutat; a részleges adat nem jelenik meg teljesként. Az authorization-, source-integrity- és exact-revision hibák láthatók maradnak, a kritikus munkanapló- és ajánlatforrások továbbra is hard failure-t okoznak.

## Betöltési határok

| Olvasás | Kötelező? | Hibahatár és fogyasztók | Teljes adatra vonatkozó szabály |
| --- | --- | --- | --- |
| `getWorkflowMaterialLists` | Nem kötelező a munkanaplóhoz | A saját anyaglisták panelje és az anyaglista-jelöltek forrása. A panelen kívüli munkanapló, feladatok, naplóbejegyzések, felmérések és ajánlatjelöltek tovább használhatók. | A lista öt, szervezettel szűrt olvasása közül bármelyik hibája a teljes anyaglista-sectiont `unavailable` vagy `access_denied` állapotba teszi. Hiányzó aktuális revízió, illetve hiányzó vagy eltérő pontos felmérésforrás nem lesz 0 tételként vagy másik revízióval bemutatva; az ajánlatkészítés az adott listához letiltott. A lista betöltési hibája nem hoz létre részleges jelöltlistát. |
| `getPlanLinkedDocuments` | Nem kötelező az oldalhoz; a kapcsolattábla szükséges a dokumentumok pontos megjelenítéséhez és új kapcsolat biztonságos írásához | A kapcsolatlista hibája a teljes kapcsoltdokumentum-panelben látható, az új kapcsolás letiltott. A kapcsolt anyaglista- és ajánlatsorok két külön olvasási határt kaptak: egyik hibája mellett a másik típusa megmarad. | A látható kapcsolat hiányzó, nem olvasható célrekordja az adott típust `unavailable` állapotúvá teszi; a rendszer nem dobja el és nem mutatja üresnek. Sérült cél esetén nem készül link. |
| `getStandaloneQuotationCandidates` | Nem kötelező | Csak a meglévő ajánlatok kiválasztási jelöltforrását érinti. A kapcsolt dokumentumok és a sikeresen olvasható anyaglista-jelöltek megmaradnak. | Nincs részleges/hiányos jelöltlista sikeresként feltüntetve; az ajánlatjelölt hiba külön állapotot kap, retry-val. |

A három olvasás a page-level `Promise.all`-ban marad, de a felsorolt opcionális DB-hibák a lekérdezési határon `SupabaseReadError`-ré válnak, és a saját section eredményébe kerülnek. A wrapper kizárólag ezt a típusos olvasási hibát izolálja; váratlan programozási hibát továbbdob. Nem történt általános `Promise.allSettled` csere.

## Hibák besorolása

- PostgreSQL `42501`, PostgREST `PGRST301`/`PGRST302`, illetve HTTP 401/403: `access_denied`; a felület nem állítja, hogy a rekordlista üres.
- Egyéb DB-hiba vagy elutasított query/átmeneti hálózati hiba: `unavailable`, retry lehetőséggel.
- A Supabase RLS a jogosulatlan rekordot hiba helyett üres találatként is elrejtheti. Ezért a sikeres üres állapot szövege „látható” rekordokról szól, és minden célrekordhoz tartozó szervezeti szűrés megmarad.
- A hivatkozott, de vissza nem olvasható célrekordot a dokumentumlista nem `flatMap`-eli el. Az adott dokumentumtípus hibát jelez, a már igazolt testvértípus továbbra is megjelenik.
- A pontos, immutable ajánlati quotation/revision forrás betöltése, párosítása, a munkanapló szükséges workspace-adatai és a hozzájuk tartozó napló/feladat adatok nem opcionálisak. Ezek hibája továbbra is hard failure; PDF és számítás nem használhat hiányos vagy aktuális revízióval helyettesített forrást.

## Implementáció és garanciák

- A közös betöltési határ a `SupabaseReadError` és a `loadOptionalExecutionSection`; az érintett három funkciót a meglévő page és section fogyasztók használják.
- Az anyaglista-kártya egy hiányzó `current_revision_id` célra „pontos revízió nem érhető el” figyelmeztetést ad; nem mutat 0 tételt, és nem kínál ajánlatkészítő linket. Felmérésforrásnál nincs név- vagy revision-fallback.
- Dokumentumolvasási hiba esetén a „Kapcsolás” gomb letiltott a kapcsolatlista ellenőrzéséig, ami megakadályozza, hogy a hibásan olvasott meglévő kapcsolat miatt duplikátum keletkezzen. Ha csak az egyik dokumentumtípus nem olvasható, a sikeres típus megmarad; a hibás típus jelöltjei nem választhatók.
- Kérésmennyiség az összehasonlítható, minden típusú rekordot tartalmazó útvonalakon nem nőtt: a kapcsolatok + céltáblák 3 DB-olvasás, az önálló ajánlatjelöltek 1, az anyaglista loader meglévő fixture-e 5. Tesztek a szervezeti filtereket és idegen szervezeti fixture rekord kizárását ellenőrzik.
- A kapcsolatokat tároló migráció változatlan, és ugyanazon `organization_id` összetett FK/RLS szerződése marad érvényben. Nem változott séma, RLS, RPC, üzleti számítás vagy történeti snapshot. A Vitest teszt-double nem bizonyít hostolt RLS-t.

## Karakterizáció és ellenőrzés

A tesztek lefedik a sikeres olvasást és korábbi formátum/paritást, az egyenként hibázó kapcsolat-, anyaglista-, ajánlat- és jelöltolvasást, párhuzamos/független típusú hibákat, hiányzó célrekordot és pontos revíziót, 42501/403 jogosultsági hibát, ideiglenes `08006` hibát és sikeres újrapróbálást. A korábbi állapotban az opcionális hívások elutasítása a page-level `Promise.all` miatt az egész oldalt hibára vitte; a hiányzó dokumentumcélt csendben elhagyta, a hiányzó listarevízió pedig 0 tételként jelenhetett meg. A kötelező munkanapló- és immutable ajánlati olvasások hibája már korábban is helyesen blokkolt.

- Célzott tesztek: **6 fájl / 44 teszt PASS**.
- `npm run lint`: **PASS**.
- `npm test`: **164 fájl PASS / 8 SKIP; 975 PASS / 19 SKIP**.
- Izolált `npm run typecheck` (`next typegen` + `tsc --noEmit`): **PASS**.
- Izolált `npm run build` (Next.js 16.4.2, Webpack): **PASS**, 32 statikus oldal generálása.
- `git diff --check`: **PASS**.
- Authenticated DEMO böngészősmoke: az első betöltés error boundary állapotot adott, majd egy manuális reload után az oldal helyesen betöltött. Az anyaglista-panel, két kapcsolt dokumentum, kereső és üres választású letiltott kapcsológomb ellenőrizhető volt. Az első hiba oka nem diagnosztizált; adatbázis-hibaállapotokat célzott komponens- és olvasási tesztek fedtek le. Hosted DB/RLS és mesterséges hálózati hibás böngészősmoke nem futott.

## Korlátok

- A `getProjectForOrganization` opcionális projekt-metaadatolvasása továbbra is ugyanabban a page-level `Promise.all`-ban maradt, így annak olvasási hibája még blokkolhatja a lapot. Ez a három kért adatforrás körén kívül esett, ezért nem változott.
- A `getWorkflowMaterialLists` listái közösek a más munkafolyamatokban használt olvasóval; bármely source-integrity hiba az execution anyaglista-panel teljes listáját unavailable állapotba teszi. Ez konzervatív, látható viselkedés; részleges listázás és annak teljességét igazoló külön metadata nincs.
- Hosted RLS, storage, adatbázis pgTAP és külön böngészős retry/hibaállapot nem lett futtatva. Az alkalmazás nem végzett adatírást.

**Javasolt Conventional Commit:** `fix(F9.73.1): isolate optional workspace read failures`
