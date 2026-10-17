# F9.25 — Kalkulátor-konszolidáció és napi munkafolyamat UX-audit

**Állapot:** **PARTIAL** — az új navigáció és a mentett felmérés/számítás újranyitása helyi, hitelesített böngészőben ellenőrizve; az üzleti átadási lánc egy része nem futtatható meglévő DEMO-anyaglista/elfogadott ajánlat nélkül, a mobil viewport-sorozat pedig nem volt emulálható.

**Aktuális kiegészítés (F9.29, 2026-10-17):** a lentebbi első állapotfelmérés F9.25-kori pillanatkép. Az F9.27 azóta megvalósította a mentett felmérésből indítható, forrásrevízióhoz kötött anyaglistát; az F9.27.2 pedig az önálló, üres anyaglista-piszkozat mentését. Ezért a későbbi táblákban szereplő „felmérésből nincs közvetlen import” és „legalább egy tétel kell” megállapítás történeti, már nem aktuális. A jelenlegi átadási lánc korlátai és a F9.29 által reprodukált adatbázis-hibák a [F9.29 egyszerűsítési auditban](F9_29_SIMPLIFICATION_AUDIT.md) vannak összefoglalva.

**Aktuális kiegészítés (F9.30, 2026-10-17):** a mentett felmérés tetőrajza most a közös geometry engine-ből készül mind a hét támogatott formára. A survey editor nem nyit beágyazott roof/gutter/flashing kalkulátort; a régi survey calculator URL visszairányít a pontos survey revisionre, miközben a külön Kalkulátorok útvonalai és mentett számításai megmaradnak. A material-list, quotation follow-up, execution-plan és opcionális project roof-model kapcsolat érintetlen. A kódváltozás, történeti geometriakorlát és a frissen reprodukált `001`/`009`/`011`/`029` DB-hibák részletei a [F9.30 auditban](F9_30_SIMPLIFICATION_AUDIT.md) vannak; az alábbi workflow-táblák a korábbi F9.25 browser snapshotot rögzítik.

## Hatókör és módszer

Áttekintett területek: `/`, `/kalkulatorok`, `/kalkulatorok/epitesi`, `/kalkulatorok/mentett`, `/felmeresek`, `/felmeresek/uj`, `/anyaglistak`, `/anyaglistak/uj`, `/ajanlatok`, `/ajanlatok/uj`, `/kivitelezes`, `/kivitelezes/uj`; továbbá a suite-választó, a felmérés-szerkesztő, az anyaglista-szerkesztő, az ajánlatszerkesztő, a kivitelezési tervező és a kapcsolódó workspace actionök.

A felmérési, anyaglista-, ajánlati és munkanapló-folyamat szervezeti jogosultsággal működik. Projekt, ügyfél és katalógustermék egyik önálló indításnál sem alapkövetelmény. Az alkalmazáskód alapján a teljes folyamat egyes átadásai explicit módon működnek; nincs minden rekordtípust összefűző automatikus lánc.

## Jelenlegi munkafolyamat

| Terület | Belépés és szükséges adat | Meglévő folytatás / újrafelhasználás | Állapot |
|---|---|---|---|
| Felmérés | Dashboard → `/felmeresek` → `Új felmérés`; új felmérésnél munkatípus-választás. Projekt és tetőforma nélkül is menthető; a mérések és további mezők opcionálisak, amíg nincs számításhoz szükség rájuk. | Mentett listaelem újranyitja a felmérést; revízióválasztás és piszkozat-visszaállítás/eldobás elérhető. Mentett forrásrevízióból számítás, támogatott anyaglista-import és munkanapló-kapcsolás indítható. | Megvalósított; forrásadat és mértékegység ellenőrzése korlátozza az importot. |
| Anyaglista | `/anyaglistak` → `Új anyaglista`; önálló piszkozat üresen is menthető. Felmérésből csak támogatott, forrásolt sorok kerülnek át; projekt, munkanapló, katalógus és ár nélkül kézi tételként is folytatható. | Mentett lista újranyitható. A forrásművelet mentett lista-revíziót visz az ajánlati piszkozatba; az immutable forráshivatkozás megmarad. | Megvalósított; helyi DEMO szervezetben a F9.27 anyaglista-átadás korábban ellenőrizve, az F9.25-es körben forrásrekord hiányzott. |
| Árajánlat | `/ajanlatok` → `Új árajánlat`; önálló piszkozatként indítható, ügyfélkapcsolat és katalógus nélkül. | Anyaglista-revízióból forráshoz kötött draft importálható; az ajánlat sorai szerkeszthetők, az ár snapshotja külön marad. A draft nem hivatalos, véglegesített/elküldött ajánlat. | Kódban megvalósított; korábbi böngészős körben forrásrekord hiányzott. |
| Munkanapló | `/kivitelezes` → `Új munkanapló`; csak név szükséges. Projekt és ügyfél nélküli önálló munkatér; az ajánlati forrás opcionális, és csak elérhető elfogadott ajánlat választható. | Felmérésből a mentett felmérés-revízió közvetlenül munkanaplóhoz kapcsolható, vagy új munkanapló készíthető. A mentett tervben feladatok és napi bejegyzések kezelhetők. | A meglévő felmérés CTA-ja megnyitotta a munkanapló-nevet kérő létrehozó panelt; létrehozást nem küldtem. Elfogadott ajánlatból indítást nem teszteltem. |
| Kalkulátor | Dashboard → `/kalkulatorok`; ugyanazon a felületen kategóriafül, kereshető vizuális lista, bemenet, rajz és eredmény. | A kategóriafül első ellenőrzött számításra vált; a felhasználó kereséssel vagy a vizuális listával másik variánst választhat. A suite új eredményei helyben maradnak; a meglévő mentett roof/materiál számítások a `Mentett számításaim` útvonalon továbbra is megnyithatók. | Megvalósított; az új suite-eredmények mentése nem része a funkciónak. |

## Igazolt súrlódások és lépésszám

Az alábbi számok csak navigációs műveleteket mérnek a dashboardtól a szerkesztő/workspace megnyitásáig; nem számolják a mérések begépelését, mentést vagy a kötelező munkatípus-választást.

| Feladat | Előtte | Utána | Értékelés |
|---|---:|---:|---|
| Dashboard → új felmérés szerkesztő | 1 kártyaművelet közvetlenül az új űrlapra | 2 művelet: felméréslista, majd `Új felmérés` | Az új indítás egy művelettel hosszabb, cserébe ugyanaz a belépés ad közvetlen hozzáférést mentett felmérésekhez és azok újranyitásához. A létrehozáskor meglévő munkatípus-választás változatlan. |
| Dashboard → mentett felmérés újranyitása | A dashboard kártyájáról nem volt felméréslista-belépés | 2 művelet: `Felmérések`, majd kiválasztott listaelem | Újra megnyitási út jött létre, a lista a jelenlegi/korábbi mentésekhez visz. |
| Dashboard → kategória kezdő kalkulátora | 2 művelet: dashboard kártya, majd régi kategóriaindító | 2 művelet: dashboard kártya, majd kategóriafül; a fül automatikusan első ellenőrzött kalkulátort választ | A fő belépés egy oldalra került. Másik kalkulátorhoz a kereső/lista külön választása szükséges; mobilon a listanyitó is egy plusz érintés. |
| Dashboard → új anyaglista / új munkanapló | 2 művelet: dashboard, majd listafejléc CTA | 2 művelet | A meglévő rövid indítás megmarad; az üres, önálló lista menthető. |
| Dashboard → önálló ajánlati piszkozat | 2 művelet: dashboard, majd ajánlatlista CTA | 2 művelet | A rövid indítás és az önálló draft megmarad. |
| Anyaglista → ajánlati piszkozat | Forráskód alapján mentett listarevízió megnyitása után a forrásművelet megnyitja az ajánlatot | Kódbeli átadás; az adott helyi szervezetben nem volt listarekord a böngészős próbához | Az immutable forrásrevízióhoz kötött import elkerülheti az azonos tételek újragépelését; end-to-end működést itt nem igazoltam. |

### Konkrét súrlódási pontok

1. A F9.27 óta van közvetlen, felhasználó által indított felmérés → anyaglista út. A támogatott mérések és verified tetőfelület kerülnek át; a mértékegység és a pontos source revision megmarad. Ez nem általános kalkulációs eredményből készülő beszerzési mennyiség.
2. Az önálló ajánlati piszkozat közvetlenül nem alakítható munkanaplóvá. Munkanapló ajánlati forrása a jelenlegi szabály szerint elfogadott ajánlat; az önálló piszkozat hivatalos véglegesítése/kiállítása nincs jóváhagyva ebben a scope-ban.
3. A kereshető kalkulátorcsomag eredménye nem menthető. A `Mentett számításaim` meglévő állományai és útvonalai megmaradnak, de a suite új, helyi eredményének újranyitása nem támogatott.
4. Az új felmérés munkatípus-választása első lépés. Ez a bemeneti sablonhoz szükséges; a komponens kifejezetten engedi a projekt és tetőforma nélküli folytatást, így indokolatlan ügyfél/projekt adatbekérés nem történt.
5. A mentett felmérési lista kódjában nincs kereső/szűrő. A helyi DEMO listán a rekordok közvetlenül újranyithatók voltak, de hosszabb listán telefonon a görgetési terhelés nőhet; pilot nélkül nem indokolt újabb navigációt bevezetni.
6. A survey piszkozat-elhagyás, sor/tétel törlés és ajánlati státuszváltás megerősítése adatvesztést vagy állapotváltást véd. A megvizsgált kódban ezek eltávolítására nincs bizonyíték; nem tekintem felesleges kattintásnak.

## Átadások és böngészős bizonyíték

| Forrás → cél | Tényleges működés |
|---|---|
| Felmérés → roof/gutter/flashing számítás | A mentett felmérésből a megfelelő, már meglévő számítás munkaterülete megnyitható; egyes tetőgeometriai utak projektkontextust is igényelnek. Nem állítok automatikus anyagkiosztást a suite-ban. |
| Felmérés → munkanapló | A mentett V3 felmérésben a CTA megnyitotta a munkanapló-név bekérőpanelt, benne a konkrét felmérés-revíziós indítással. A létrehozó műveletet nem küldtem el; rekordkapcsolatot ezért nem állítok böngészőben igazoltnak. |
| Felmérés → anyaglista | F9.27 óta a felmérés összesítője támogatott, mentett source revisionből indítja; csak ellenőrzött mezőket visz át, adatbázisban immutable source snapshot kapcsolja a lista-revízióhoz. A `docs/PROGRESS.md` és célzott pgTAP/Vitest-bizonyíték tartalmazza az ellenőrzést. |
| Anyaglista → árajánlat | Forráskódban van mentett lista-revíziót átadó út; az F9.25 böngészős körben nem volt forráslista, ezért ott az importált sorok megjelenítését nem ellenőriztem. |
| Árajánlat → munkanapló | Forráskód csak elfogadott ajánlatot enged forrásként; meglévő elfogadott rekord hiánya miatt a böngészős út nem volt tesztelhető. Az önálló piszkozat közvetlen átalakítását nem állítom. |
| Kalkulátor-suite → üzleti rekord | Nincs; a helyi számítás nem kerül automatikusan felmérésbe, anyaglistába, munkanaplóba vagy ajánlatba. |

## Megvalósított változtatások

- A `/kalkulatorok` az eddigi `/kalkulatorok/epitesi` kereshető, vizuális, háromkategóriás felületet szolgálja ki a meglévő szervezeti hozzáférés-ellenőrzéssel és a mentett számítások hivatkozásával.
- A suite korábbi `/kalkulatorok/epitesi` útvonala 307-es átirányítással az új fő útvonalra visz; a kiválasztott kalkulátor és a `organization` query megmarad.
- A régi tető- és cserepeslemez-indító kártyák, az eresz/szegély/profil archívumdoboz, valamint az üres mentett-lista új legacy-számítás indítólinkjei eltűntek az aktív navigációból. A mentett rekordok típus-szűrői, megnyitási linkjei, motorjai és route-jai érintetlenek.
- A dashboard „Gyors felmérés” kártyája „Felmérések” néven a meglévő `/felmeresek` listára vezet. A lista fejlécében elérhető `Új felmérés` CTA megmarad; a lista mentett felmérések megnyitását kínálja.
- A kalkulátor suite meglévő Liquid Glass, `RoofWorkspace`, SVG-rajz, skálázás és kereshető vizuális választó komponensei változatlan motorokkal maradtak használatban.

## Javasolt következő egyszerűsítések

| Prioritás | Javaslat | Indok és korlát |
|---|---|---|
| P0 | Nincs igazolt blokkoló hiányosság a kódauditban. | Pilot- vagy helyszíni megfigyelés nem történt; ezért ez nem használati garancia. |
| P1 | A mentett mérések és az anyaglista közti forrásolt átadás fedettségének bővítése. | A jelenlegi út kizárólag egyértelmű, támogatott típusokra korlátozott. Új egység, tetőforma vagy mennyiségi szabály csak provenance-szal, preview-val, szervervalidációval és külön DB/RLS mérföldkőben kerülhet be. |
| P1 | Munkanapló és ajánlat életciklusának átláthatóbb összekötése. | Az accepted-only szabályt nem szabad megkerülni. Hivatalos kiállítás, elfogadás vagy státuszátmenet bővítéséhez külön termék- és jogi scope szükséges. |
| P1 | A suite lokális új eredményeinek opcionális, önálló menthetősége. | Most nem támogatott; csak a jelenlegi mentett tető/kalkuláció adatszerződés, jogosultság és immutable revízió mintájának külön vizsgálatával tervezhető. |
| P2 | Felméréslista-kereső vagy egyszerű szűrő, ha a rekordmennyiség piloton hosszú görgetést okoz. | A jelenlegi lista közvetlen megnyitást ad, de nincs kereső. A hasznosságot a tényleges helyszíni listaméretekhez kell igazítani. |
| P2 | Egyetlen 390 px/320 px-es, egyesített dashboard → felmérés → kalkulátor terepi feladat mérése valós felhasználóval. | Forráskód és korábbi kalkulátor-viewport tesztek nem mutatják meg a valódi görgetési, billentyűzet- és kesztyűs érintési terhelést. |
| P2 | Űrlap- és CTA mikrocopy rövidítése pilot-megfigyelés alapján. | A jelenlegi mezők és üzleti figyelmeztetések szakmailag eltérőek; csak bizonyított félreértésnél egyszerűsítsük. |

## Eltávolításra jelölt elemek és adatmegőrzés

- Az aktív `/kalkulatorok` indítólistáról eltávolítható volt az ismétlődő tetőgeometria/cserepeslemez-bejárat és az archivált eresz/szegély/profil bejárati csoport. Az üres mentett-lista legacy-indítólinkjei is kikerültek; meglévő rekord mellett a típus-szűrő és a megnyitás megmarad. Ez csak navigációs eltávolítás.
- Nem törölhető biztonságosan a `/kalkulatorok/nyeregteto`, `/kalkulatorok/cserepeslemez`, `/kalkulatorok/ereszcsatorna`, `/kalkulatorok/szegelyek`, `/kalkulatorok/lemezprofilok` útvonal és motor: mentett számítások, korábbi revíziók és más üzleti workflow-k használják őket. A releváns régi mentett rekordok megnyitása külön megmarad.
- A `/kalkulatorok/epitesi` route-ot sem töröltem; átirányítással kompatibilis marad a korábbi hivatkozásokhoz.

## Ellenőrzési határ

**Böngésző (helyi production build, 1280×720, hitelesített DEMO szervezet, csak olvasás):** dashboard → `Felmérések` lista → mentett V3 felmérés megnyitása és revízióválasztó látható; a lista `Új felmérés` CTA-ja a munkatípus-választóra navigált, mentés nem történt. Meglévő felmérésen a `Munkanapló létrehozása` művelet megnyitotta a névbekérő panelt; a létrehozó gombot nem küldtem el. Dashboard → `Kalkulátorok` → `Lépcsők` → 90°-os, pihenős fa lépcső megnyitása működött. A régi `/kalkulatorok/epitesi?calculator=…&organization=…` útvonal az új főoldalra irányított és mindkét query-paramétert megtartotta. A `Mentett számításaim` listából meglévő Cserepeslemez-fedés V2 rekord újranyílt a korábbi útvonalon. Az `/anyaglistak` oldal üres állapotot mutatott; új listát nem hoztam létre, így a forrásrevízió-importot és ajánlat→munkanapló folyamatot böngészőben nem ellenőriztem. A helyi DEMO rekordokhoz nem írtam.

**Responsive korlát:** CUA in-app browser ebben a futásban normál 1280×720 viewportot adott, CSS viewport-emulációt/viewport-beállítást nem kínált. A 1440/1024/768/390/320 px sorozatot ezért nem állítom teszteltnek; CSS breakpoint review nem helyettesíti a böngészős vizuális próbát. Kontraszt, fizikai iOS/touch, screen reader és hosted Auth/RLS teszt szintén nem futott.
