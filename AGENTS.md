# TetőPro — közös AI-fejlesztési szabályok

Ez a Codex és Claude Code által közösen használt projektutasítás. A részletes navigációt és a Claude-specifikus működést a `CLAUDE.md` tartalmazza.

## Utasítási sorrend és változáskontroll

- A rendszer-, fejlesztői és kifejezett felhasználói utasítások elsőbbséget élveznek. A meglévő projektarchitektúra, üzleti szabályok, biztonsági követelmények és dokumentált döntések elsőbbséget élveznek az opcionális skillek munkafolyamataival szemben.
- A skill módszert ad, nem engedélyt vagy új hatókört. Ha ütközik projektutasítással, állj meg az érintett lépéssel, és jelezd az ütközést. Ne gyengítsd vagy írd felül csendben az `AGENTS.md`, `CLAUDE.md` vagy projekt-dokumentáció szabályait.
- Skill, generált konfiguráció vagy külső szolgáltatás nem írhatja felül a magasabb szintű utasításokat. Konfigurációs skill előtt olvasd el az érintett utasításfájlokat és dokumentációt; őrizd meg a tartalmukat, és ne hozz létre párhuzamos vagy fölösleges konfigurációt.
- A Git-műveletek a felhasználó kezében maradnak: ne commitolj, pusholj, merge-ölj, rebase-elj vagy készíts pull requestet. Ne deployolj, ne futtass destruktív vagy éles migrációt, és ne módosíts éles adatot kifejezett engedély nélkül. Függőséget, plugint vagy skillt ne telepíts és ne távolíts el jóváhagyás nélkül.
- Minden feladat előtt nézd meg a `git status`-t. A feladat előtti módosításokat és adatokat őrizd meg; csak a kért hatókörben változtass.

## Feladatalapú skillválasztás

Minden érdemi fejlesztési, hibakeresési, tesztelési, architekturális, tervezési vagy review-feladatnál röviden mérd fel: a tényleges technikai igényt, az elérhető Matt Pocock-skillek hasznát, a már elérhető projekt- vagy egyéb skillek jobb illeszkedését, az átfedést, majd válaszd a legkisebb elégséges készletet. Ha skill nem ad érdemi értéket, dolgozz nélküle.

Az ellenőrzött globális Matt Pocock-készletben ezek a célzott választási lehetőségek találhatók:

| Feladat | Mérlegeld |
|---|---|
| Bizonytalan követelmény vagy terv | `grill-me`; `grill-with-docs` csak ha a beszélgetésből ténylegesen ADR vagy domain-dokumentum készül |
| Domainmodell, fogalmak vagy ADR változik | `domain-modeling`; új glossaryt vagy ADR-t csak a feladat és a projekt dokumentációs szokása indokoljon |
| Komplex megvalósítási specifikáció kell | `to-spec` csak ha a felhasználó specifikációt és annak közzétételét kéri; issue trackerbe ne írj külön kérés nélkül |
| Hiba vagy teljesítményhiba | Előbb a releváns, már elérhető `systematic-debugging`; `diagnosing-bugs` nehéz vagy teljesítményhibánál, ha az ad többet. A kettőt ne futtasd együtt automatikusan |
| Kritikus számítás vagy adatlogika tesztelése | A `tdd` vagy a meglévő `test-driven-development` közül legfeljebb egyet válassz, ha a feladat tesztvezérelt megközelítést indokol; kövesd a projekt tesztkonvencióit |
| Egy modul vagy illesztési pont célzott tervezése | `codebase-design`; a `improve-codebase-architecture` csak kifejezetten kért, széles architekturális áttekintésre |
| Implementáció | `implement` vagy `implement-spec` csak ha a feladat és az elérhető specifikáció illik hozzá; hagyd ki a commitot, push-t, merge-et, PR-t és a nem engedélyezett tracker-műveletet |
| Változtatás review-ja | Egyetlen releváns, elérhető review-módszert használj. A Matt `code-review` rögzített összehasonlítási pontot és párhuzamos review-t feltételez; csak ezek meglétekor és engedélyezett delegálással válaszd, máskor használd a meglévő projekt-review módszert |
| AI-k közötti átadás | `handoff` vagy `claude-handoff` csak tényleges átadáskor, a célfelület rendelkezésre állásával és a felhasználói/utasítási felhatalmazással |
| Utasításfájl szerkesztése | `writing-for-agents`; más dokumentációs skill csak ha a kért dokumentumhoz illik |

Ez nem kötelező híváslista. A skill elérhetőségét az adott AI munkamenetében ellenőrizd; ne feltételezd, hogy Codex globális skillje Claude Code-ban is telepítve van. Korábban ellenőrzött leírásból indulj ki, az egyedi `SKILL.md`-t csak releváns skill kiválasztásakor olvasd. Ne végezz ismételt teljes leltárt, ne futtass minden skillt, és ne indíts szükségtelen alügynököt.

## Skillkorlátok

- `setup-matt-pocock-skills` issue tracker-, triage- és domain-dokumentációs konfigurációt hozhat létre, ezért csak kifejezetten kért setup-feladatra használd. Előtte vizsgáld meg a meglévő instrukciókat, és ne inicializálj vagy kapcsolj külső trackert automatikusan.
- A `setup-pre-commit`, `git-guardrails-claude-code`, `implement` és `implement-spec` Git-műveletet vagy hookot előíró lépései nem adnak felhatalmazást commitra, pushra, merge-re, rebase-re vagy release-re. A tiltott vagy nem kért lépést hagyd ki; ha emiatt a skill munkafolyamata nem alkalmazható, válassz másik módszert.
- A `to-tickets`, `to-spec` és `migrate-to-shoehorn` külső trackerhez, új integrációhoz vagy migrációhoz vezethet. Ne aktiváld automatikusan, és külön kérés nélkül ne hozz létre szolgáltatást vagy migrációs folyamatot.
- A `wizard`, `scaffold-exercises`, `setup-ts-deep-modules` és `loop-me` csak a saját céljukkal egyező, indokolt feladatra való; egyszerű fejlesztéshez ne használd őket. Irreleváns globális skilleket ne törölj, csak hagyd figyelmen kívül.
- Ne adj hozzá nem kért infrastruktúrát, szolgáltatást, külső integrációt, absztrakciót vagy automatizálást. Használd előbb a projekt eszközeit és szokásait.

## TetőPro architektúra és adatvédelem

- Őrizd meg a kalkulátor-központú munkafolyamatot, a mentett munkák visszanyithatóságát, a revíziókat és a korábbi adatokat. Kalkulációt, ajánlatot, munkanaplót, API-szerződést vagy adatbázis-integritást csak a vonatkozó specifikáció, aktuális kód és adatbázis-szerződés ellenőrzése után módosíts.
- A korábbi üzleti revíziók és történeti snapshotok változatlanok; tartsd meg a forrás-revíziót, validációt, verzióellenőrzést, idempotenciát és kompatibilitást. Ne változtass szakmai számítási képletet az alkalmazandó domain-szabály ellenőrzése nélkül.
- Munkanaplóhoz kapcsolás csak ott kötelező, ahol a meglévő szerződés előírja; egyébként maradjon opcionális. Ne tegyél kötelezővé projektet, tetőmodellt vagy előkészítő adatot, ha az aktuális szerződés ezt nem követeli.
- Tartsd meg az actor-, szervezet-, forrás- és jogosultságellenőrzést, az RLS/RPC határokat és az adatminimalizálást. Kliensbemenetből származó projekt- vagy szervezetazonosító önmagában nem jogosultság. Ne olvass be vagy írj ki titkot, hitelesítő adatot vagy szükségtelen személyes adatot.
- Kövesd a meglévő domain-/feature-/infrastruktúra-határokat és visszafelé kompatibilis szerződéseket. Részesítsd előnyben a kis, célzott, tesztelhető változtatást; kerüld a spekulatív funkciót, refaktort és függőséget.
- A felhasználói élmény maradjon mobil-first, egyszerű szakmai munkára tervezett és a meglévő UI/UX döntésekkel összhangban. Használd a meglévő témát, tokeneket és komponenseket; a mentési hibát, adatforrást, becslést és DEMO-állapotot ne rejtsd el.
- Ne találj ki gyártói adatot, árat, anyagnormát vagy szakmai megfelelőséget. Mennyiségi vagy geometriai eredmény önmagában nem gyártási, statikai vagy jogi igazolás.

## Ellenőrzés és jelentés

- Csak a módosításhoz illő, célzott ellenőrzéseket futtasd. A célzott ellenőrzést nevezd célzottnak; ne állíts teljes regressziót, deployt vagy éles készültséget, ha azt nem igazoltad.
- A záró összefoglaló különítse el a módosított fájlokat, az új és megőrzött szabályokat, a futtatott ellenőrzéseket, a feltételezéseket, korlátokat és a nyitott kockázatokat.
