# F9.5 – Termékérettségi audit

**Projekt:** Bádogos HelpTool / TetőPro munkanév  
**Audit dátuma:** 2026-10-13  
**Hatókör:** repository és dokumentáció, célzott külső jogi/szakmai/termékkutatás. Nem jogi vagy statikai szakvélemény.  
**Audit státusza:** COMPLETE – a kért repository-audit és célzott külső kutatás elkészült. A **termék érettségi besorolása** korlátozott pilotra előkészített, kereskedelmi SaaS-készültség nem bizonyított; a nem ellenőrzött tételek a 16. fejezetben szerepelnek.

## 1. Vezetői összefoglaló

**Jelenlegi érettség: fejlett, lokális prototípus / korlátozott pilotra előkészített alkalmazás; kereskedelmi SaaS-érettség nem bizonyított.** A legutóbbi rögzített állapot F9.4.2.1, amely újabb a feladatban közölt F9.4.2-nél. A rendszer projekt-, ügyfél-, verziózott nyeregtető-geometria-, anyagkimutatás-, ajánlat-, kivitelezési terv-, munkanapló-, fotó- és PDF-folyamatot kapcsol össze. Vannak fontos adatkonzisztencia- és tenantvédelmi minták.

A számítási kínálat szűk: szimmetrikus nyeregtető-geometria és korlátozott lemezkiosztás áll rendelkezésre. Nincs cserép-, faanyag-, fólia-, bádogosprofil-, ereszcsatorna- vagy statikai kalkulátor. A mennyiségi kimutatás területet, kijelölt élhosszt és kézi mennyiséget kezel; nem állít elő általános darab/csomag, vágásoptimalizálási vagy szerkezeti igazolást.

A magyar jogi környezet miatt az alkalmazás nem pozicionálható hivatalos e-építési naplóként, számlázóként, szakmai jogosultság-ellenőrzőként vagy statikai számítóként. Az e-napló kötelezettsége tevékenység- és dokumentációfüggő; ahol fennáll, azt az állami rendszerben kell teljesíteni.

**Ajánlott következő mérföldkő: F9.5.1 – Pilotkészségi és adatkezelési kapuk.** Az éles ügyféladat előtti backup/restore, adatkezelési és retention döntések, jogosultság- és deploy-bizonyíték, valamint a belső riport/e-napló és ajánlati státusz/aláírás világos elhatárolása legyen a fókusz. A következő szakmai kalkulátort csak egy pilotcél és ellenőrizhető gyártói forrás kiválasztása után érdemes megkezdeni.

## 2. A jelenlegi rendszer bizonyított állapota

Az alábbiak repository CODE/DOCUMENTATION megállapítások. A dokumentált tesztek múltbeli eredmények; ebben az auditban nem futtattam tesztet.

| Terület | Ellenőrzött állapot | Határ |
|---|---|---|
| Projekt/ügyfél/Auth | Szervezeti projekt- és ügyféladat; szerveroldali Auth-kontextus, tagság, RLS, keresés, archiválás/visszaállítás. | Több szervezet alapjai vannak; SaaS-üzemeltetés nincs igazolva. |
| Tetőmodell | roof.gable v1.0.0; mm-méretek, emelkedés- vagy szögbemenet; két szimmetrikus sík, terület, vetület, élek és vertexek. Kód megjegyzi, hogy a ferde hossz nem szarufavágási/statikai igazolás. | Téglalap alaprajzú szimmetrikus nyeregtetőre korlátozott; nincs félnyeregtető kalkulátor sem. |
| Rajz | SVG felülnézet, oldalnézet és metszetek, rétegek/méretek; lemezkiosztás megjeleníthető. | Egyetlen tetőmodellből készül; nem 2D szerkesztő vagy tervdokumentáció. |
| Lemezkiosztás | Hasznos fedési szélességből hosszanti sávszám, partial edge interval, opcionális minimum/maximum hossz és végoldali ráhagyás. Snapshot és revízió. | Nincs keresztirányú toldás, automatikus vágás, száloptimalizálás vagy gyártói megfelelőség-ellenőrzés. |
| Anyagkatalógus | Szervezeti gyártó/termék/változat/ár; forrás/dátum/provenance; névleges és hasznos szélesség, vastagság, hossz, csomagolási mennyiség; műszaki JSON. Árrekord immutable. | Nincs gyártói import vagy ellenőrzött központi termékkatalógus. A verified mező önmagában nem gyártói igazolás. |
| Anyagkimutatás | Területi, lineáris és kézi mennyiség; explicit ráhagyás; termék-/ársnapshot; admin/owner approval és source-revision ellenőrzés. | Nincs általános darab/csomag-konverzió, raktárkészlet, beszerzési rendelés vagy vágásoptimalizálás. |
| Ajánlat | HUF, nettó/bruttó osztály, fixpontos összegzés, immutable revízió/finalizálás, manuális lifecycle, PDF. | Nem számla, e-aláírás, e-mail kézbesítés vagy automatikus ÁFA-minősítés. |
| Kivitelezés | Accepted ajánlati revízióhoz köthető kézi terv; feladatok, eseménytörténet, append-only munkanapló, privát fotók, before/after, projektáttekintés, PDF-riport. | Nem hivatalos e-napló; nincs csapat-hozzárendelés, naptár/ütemezés, offline sync vagy aláírt átadás. |
| Revízió és jogosultság | Immutable snapshotok, RLS, szervezeti composite FK-k, RPC, expected-version/idempotencia több kritikus írásnál. | A tenant-izoláció hosted és valós több-session környezetben nem tesztelt az audit során. |
| Architektúra | Next.js/TypeScript, app/features/domain/infrastructure szerkezet, explicit kétkalkulátoros registry. | Több feature közvetlenül használ Supabase klienst; nem minden adat-hozzáférés port/adapterszerűen elválasztott. |

**Számítási eredet besorolása**

- **GEOMETRIAILAG ELLENŐRZÖTT:** nyeregtető-kimenet a dokumentált geometriai feltételezésekkel; korábbi progressben független referenciaeset van.
- **FELHASZNÁLÓI BECSLÉS:** ráhagyás, kézi mennyiség, lemezhossz-ráhagyás, felhasználó által bevitt műszaki érték.
- **KATALÓGUSBÓL:** a szervezet konkrét változatának snapshotolt adata. Ez nem jelenti automatikusan, hogy gyártói forrásból hiteles.
- **GYÁRTÓILAG ELLENŐRZÖTT:** auditban nem találtam olyan konkrét katalógus-rekordot, amelyre általánosan ezt lehetne állítani.
- **ISMERETLEN/NEM TÁMOGATOTT:** statika, hó/szélteher, csatorna-hidraulika, összetett geometria, termékrendszer-megfelelőség, gyártási vágáskép.

A docs/TEST_MATRIX.md F9.4.2.1-ig tartalmaz korábbi ellenőrzéseket; F9.4.2 esetén 25 Vitest fájl/87 teszt, typecheck, lint és webpack build PASS szerepel. Ezeket most nem ismételtem, és nem tekinthetők az audit friss futásának. Hosted RLS/Storage, restore, terheléses vagy GDPR tesztet ez nem bizonyít.

## 3. Magyar építőipari szabályozási áttekintés

Az ellenőrzés dátuma 2026-10-13. A szabályok projekt-, szerep- és hatályfüggők; ez nem jogi tanács.

| Minősítés / forrás | Ellenőrzött megállapítás | Termékkövetkezmény |
|---|---|---|
| **Általános / feltételes** – 2023. évi C. törvény a magyar építészetről, [NJT](https://njt.hu/jogszabaly/2023-100-00-00) | Az üzletszerű kivitelezői tevékenység törvény szerinti feltételekhez és bejelentéshez kötött; részletek a kapcsolódó rendeletekben. | Cégprofilban nyilvántartási adatok segíthetnek, de az app ne állítson jogosultságot automatikusan ellenőrzés nélkül. |
| **Általános / kamarai útmutatás** – [MKIK GYIK](https://mkik.hu/epitoipari-kivitelezo-vallalkozasok-gyik), [tájékoztató](https://mkik.hu/altalanos-tajekoztato-2) | Az MKIK tájékoztatója szerint Magyarországon kivitelezői tevékenységet végző vállalkozás/egyéni vállalkozó regisztrációja szükséges; az engedélyköteles munka hiánya nem mentesít. A részleteket hatályos joggal együtt kell olvasni. | A nyilvántartási szám/cégadat rögzíthető; ne jelenjen meg automatikus jogi megfelelőség pecsétjeként. |
| **Tevékenységhez kötött képesítés** – 34/2021. (VII. 26.) ITM rendelet 1. melléklet 12., 17., 21. sora, [NJT](https://njt.hu/jogszabaly/2021-34-20-7Q) | Külön sorolja az épületbádogos munkát, tetőfedést és fedélszerkezet-építést. A szükséges képesítés és az önálló/nem önálló tevékenység megengedhetősége soronként eltér. A rendelet átmeneti rendelkezései és hatályos módosításai is számítanak. | A rendszer különböztesse meg a bádogos, tetőfedő, ács és jogosultsághoz kötött tervezői/FMV feladatokat; ne adjon általános jogosultsági minősítést. |
| **Írásbeli kivitelezési szerződés** – 191/2009. (IX. 15.) Korm. rendelet 3. §, [NJT](https://njt.hu/jogszabaly/2009-191-20-22) | Üzletszerű kivitelezési tevékenység meghatározott körében a szerződést írásba kell foglalni. Az app accepted ajánlati státusza nem szerződéskötés: a kód is jelzi, hogy nem e-aláírás. | Ajánlatot ne címkézzük szerződésnek; szerződésmodul külön jogi követelmény-egyeztetés után készülhet. |
| **Feltételes e-építési napló** – 191/2009. rendelet 24. §, [NJT 24. §](https://njt.hu/jogszabaly/2009-191-20-22.44), [Építésügyi portál](https://www.e-epites.hu/e-naplo), [GYIK](https://www.e-epites.hu/gyik?temakor=132) | 24. § (1): kivitelezési dokumentáció alapján végezhető kivitelezés esetén e-építési naplót kell vezetni. A rendelet 24. § (2) azt hivatalos, időrendi dokumentációként határozza meg. Az alkalmazhatóság a konkrét munkától függ. 2026-ban is jelentek meg friss változások az e-napló portálon. | Bádogos HelpTool munkanaplója belső nyilvántartás. Hivatalos e-napló-integráció nincs bizonyítva. Ha kötelező, az állami e-naplóban kell rögzíteni. |
| **TÉKA / OTÉK átmenet** – 280/2024. (IX. 30.) Korm. rendelet, [NJT](https://njt.hu/jogszabaly/2024-280-20-22.1), átmeneti szabály [135. §](https://njt.hu/jogszabaly/2024-280-20-22.7) | TÉKA 2025-01-01-jén lépett hatályba, 135. §-a több átmeneti rendelkezést tartalmaz. A 135. § (4) foglalkozik bizonyos 2025-07-01 előtti engedély/bejelentés után fennmaradt munkák dokumentációjától való, engedély-/bejelentésköteles eltéréssel. Ezért nem igaz, hogy minden korábbi projektre automatikusan a legújabb szabályt kell ráhúzni. | A szoftver ne soroljon be automatikusan jogi megfelelőséget. Építési jogi kérdésnél engedélyezési dátum, helyi HÉSZ és szakértői állásfoglalás szükséges. |
| **Szabvány / statikai tervezés** – MSZT [MSZ EN 1991-1-3:2016](https://ugyintezes.mszt.hu/webaruhaz/szabvany-adatok?standard=132091), [MSZ EN 1991-1-3:2025](https://ugyintezes.mszt.hu/webaruhaz/szabvany-adatok?standard=151047) | A 2016-os kiadás adatlapja 2016-09-01 kezdő és 2028-03-31 visszavonási dátumot mutat; a 2025-ös második generáció kezdete 2025-07-01. MSZT szerint első generáció visszavonása 2028-04-01, a generációk vegyes használata általában nem javasolt a megadott kivételeken kívül. Csak az adatlap/scope lett ellenőrizve, nem a szabványszöveg vagy numerikus hóteher-előírás. | Nincs hó-/szélteherből szarufa vagy kötőelem-méretezés. Bármely későbbi statikai modulhoz tervező, teljes hozzáférhető szabvány és verziózott nemzeti paraméter kell. |
| **Pénzügyi és számlázási** – Áfa tv.; [NAV számla/nyugta füzet](https://nav.gov.hu/pfile/file?path=/ugyfeliranytu/nezzen-utana/inf_fuz/2023/18.-informacios-fuzet---A-szamla-nyugta-kibocsatasanak-alapveto-szabalyai), [NAV számlaadat-szolgáltatás](https://nav.gov.hu/ado/afa/A_szamlakibocsatok_sz20201231) | Számlaadat és adózás az ügylet/jogalany feltételei szerint értelmezendő. Fordított adózás nem következik pusztán abból, hogy egy munka építőipari. NAV füzet 2023-as tájékoztató, ezért a kiadás előtt hatályos szabályt újra ellenőrizni kell. | Jelen ajánlat HUF nettó vagy bruttó besorolással működik, nincs ÁFA-motor vagy számlázás. Számlázás előtt könyvelői és aktuális NAV ellenőrzés kell. |
| **Adatvédelem** – GDPR (EU) 2016/679, főként 5., 6., 13., 17., 25., 28., 30., 32. cikk, [EUR-Lex magyar szöveg](https://eur-lex.europa.eu/legal-content/hu/ALL/?uri=CELEX:32016R0679) | Ügyfél/dolgozó adata, képmás, címhez köthető fotó és esetleges helyadat jogalaphoz, célhoz, tájékoztatáshoz, adattakarékossághoz, megőrzéshez/törléshez és biztonsághoz kötött. | Fotó EXIF-kezelés, retention, érintetti folyamat, adatfeldolgozói szerződés nem bizonyított. Privát bucket/signed URL önmagában nem GDPR-megfelelőség. |

## 4. Magyar ács-, tetőfedő- és bádogosvállalkozások munkafolyamatai

A kutatás nem tartalmaz kivitelezői interjúkat; az alábbiak szakmai folyamatmodell/hipotézisek, pilotban kell validálni őket.

| Folyamat | Jelenlegi támogatás | Hiány |
|---|---|---|
| Felmérés | Projekt címe, kézzel megadott gable-méretek; kivitelezési fotók külön munkaterv alatt. | Nincs egységes terepi felmérőlap, él/áttörés rögzítés vagy mérési forrás/fotó összerendelés. |
| Ácsmunka | Geometriai lejtőhossz/élek. | Nincs szarufa/léc kiosztás, faanyagjegyzék és statikai ellenőrzés; tervezési felelősség elválasztandó. |
| Tetőfedés | Korlátozott lemezkiosztás és általános katalógus. | Cserép/léctáv, fedési méret, fólia, szellőző, gerinc/él, tetőáttörés és trapéz/korcolt rendszer nincs. |
| Bádogosmunka | Kézi terméktétel, egyes geometriából származó lineáris élek. | Csatorna/ejtő, vápa, falszegély, kémény/ablakcsatlakozás, lemezprofil, hajtás és vágáskép nincs. Hidraulikai alkalmasság nincs. |
| Anyagbecslés | m², kijelölt fm, kézi mennyiség és explicit ráhagyás. | Darab/csomag-konverzió, átfedési/vágási veszteség, gyártói hosszkorlát, rendelési kerekítés és hulladék nincs általánosan megoldva. |
| Terepi végrehajtás | Kézi feladatok, dátum, napló, fotó, PDF. | Személyhez/brigádhoz rendelés, naptár, offline mód, anyagbeszerzés és tényleges költség hiányzik. |
| Átadás/garancia | Belső PDF és kapcsolódó fotó/napló. | Nincs aláírt átadás, hibajegy lezárás és garanciális ügykezelés; PDF nem e-napló. |

A későbbi domainben külön kell tartani: geometriai méret, termék tényleges fedési mérete, beszerzési egység, kiszerelés, gyártási hossz, hajtás, rögzítési előírás, szerelési korlát és felhasználói felülírás.

## 5. Szakmai számítások és műszaki hiányosságok

- **Geometria:** a gable inputot Zod ellenőrzi; eredmények a dokumentált nyeregtető-feltételezéseken belül. Nincs kontyolt, sátor, L/T, nyílás vagy félnyeregtető.
- **Pontosság:** canonical hossz mm és terület mm², safe-integer korlát, explicit fok/radián konverzió; trigonometria IEEE-754 és dokumentált relatív tolerancia 1e-9. Ez matematikai implementációs tolerancia, nem helyszíni mérési pontosság vagy építési tűrés.
- **Registry:** production registryben két kalkulátor: roof.gable és covering.metal-sheets.layout. Általános dependency scheduler és automatikus számítási stale-propagation nincs igazolva.
- **Lemezkiosztás:** használható szélesség mentett paraméter; névleges külön mező; kézi min/max hossz; no cross-lap. Nincs dedikált overlap/profile/fastener/pitch mező, gyártási szálterv vagy vágásoptimalizálás. A within_limits státusz kizárólag a megadott min/max hossz ellenőrzése, nem teljes gyártói megfelelés.
- **Anyagkimutatás:** számított geometriai terület és kijelölt élhossz, vagy kézi mennyiség; ráhagyás felhasználói paraméter. Nem cserép-/csavar-/faanyag-norma.
- **Statika:** hó, szél, teherbírás, szarufaméret, alátámasztás és kötőelem-méretezés hiányzik, és nem kerülhet kalkulátorra megfelelő szabványverzió/jogosult tervező nélkül.
- **Csatorna:** nincs kalkulátor. Folyóméter becslés különbözik a vízelvezetési méretezéstől; utóbbihoz szabályozási, éghajlati és termékrendszer-adat kell.

**Gyártói megfigyelés:** Bramac magyar oldala szerint szerkezeti méretek a hajlástól, ellenléc-vastagságtól és cseréptípustól függenek; PREFA külön rendszer-/termékútmutatókat tesz közzé. Ez termékspecifikus adatszerkezetet indokol, nem általánosítható minden fedésre. [Bramac szerkezeti méretek](https://www.bmigroup.com/hu/szakembereknek/bramac-tudastar/szerkezeti-meretek/), [PREFA beépítési útmutatók](https://www.prefa.hu/extranet/downloadbereich/beepitesi-iranyelvek-es-szerelesi-utasitasok/).

## 6. Anyagkatalógus és gyártói adatigények

| Adatigény | Szükség | Meglévő támogatás | Következő ellenőrzés |
|---|---|---|---|
| Névleges / hasznos szélesség | Darab- és fedési kiosztás | Külön alapmezők; hasznos szélességet használja a layout. | Ne vezesse le a névlegesből; konkrét SKU adatlap. |
| Minimum/maximum termékhossz | Gyárthatóság/szállíthatóság | Layoutban kézi mezők és snapshot. | Gyártó adott termékre és aktuális útmutatóra. |
| Oldal- és végtoldás | Fedés/vízzárás | Nincs dedikált mező/szabály. | Gyártói útmutató, termékprofil, hajlás. |
| Vastagság/bevonat/alapanyag | Termékazonosítás/tartósság | Vastagság mező; többi részben szabad JSON. | Adatlap/teljesítménynyilatkozat SKU- és verzióazonosítóval. |
| Hajlásszög-korlát, aljzat | Rendszer használati határa | Nincs normalizált validált mező. | Gyártói telepítési utasítás és tetőgeometria. |
| Csavar/rögzítő/kiosztás | Biztonság és kompatibilitás | Nincs típusos séma/kalkulátor. | Gyártói útmutató és szerkezetet érintve tervező. |
| Tartozék kompatibilitás | Eresz/gerinc/szellőzés/rendszer | Nincs kompatibilitási gráf. | Gyártói rendszerkatalógus. |
| Csomagolás, vágás, ráhagyás | Beszerzés | Csomagméret mező és user allowance van, optimalizáló nincs. | Gyártó kiszerelés + szakember által jóváhagyott vágás/ráhagyás. |

A mezők mellett tárolandó az adatforrás, URL, dátum/verzió, mértékegység, provenance, ellenőrző személy/állapot. Snapshotnak meg kell őriznie a konkrétan felhasznált adatot. A verified címkét ne adja ki a rendszer pusztán szerkesztésből. Auditban reprezentatív Bramac és PREFA forrást néztem; nem dolgoztam fel nagy katalógust és nem vittem be termékadatot az alkalmazásba.

## 7. Végponttól végpontig tartó üzleti munkafolyamatok értékelése

| Átmenet | Megvalósítás | Provenance / jogosultság / napi korlát |
|---|---|---|
| Ügyfél → projekt | Ügyfél opcionális; gyors létrehozás elérhető. | Szervezeti FK/RLS; nincs CRM lead import. |
| Projekt → felmérés | Cím és kézzel bevitt tetőméret. | Terepi mérési forrás és dokumentált mérőlap nincs integrálva. |
| Felmérés → tető | User-indított gable kalkuláció, mentett revision. | Szerver újraszámol és expected revisiont ellenőriz; nincs mérésimport. |
| Tető → anyag | Kézzel választott változat és opcionális override; mentett layoutnál verified geometry kell. | Anyagsnapshot/provenance van; gyártói adat nincs automatikusan importálva. |
| Kalkuláció → takeoff | Gable terület/fm becslés; layoutból egy kompatibilis m² draft. | Source snapshot és approval; más beszerzési egységre nincs implicit konverzió. |
| Takeoff → ajánlat | Sorokat a user választja/állítja össze, ár- és mennyiségsnapshot. | Nem automatikus teljes ajánlat; ismételt adatbevitel várható. |
| Ajánlat → elfogadás | Finalize, majd kézi sent/accepted/rejected állapot. | Immutable revision és status event; nincs e-mail, e-aláírás vagy kézbesítési bizonyíték. |
| Elfogadás → kivitelezési terv | Kézi terv; optional accepted finalized quote source. | DB ellenőrzi a projektet/állapotot/revíziót; nincs quote line→task generálás. |
| Terv → napló/fotó | Kézi task, append-only napló, kézzel kapcsolt kép. | Privát Storage, rövid signed URL, MIME/signature check; offline sync nincs. |
| Projektadat → PDF | Aktuális tervadatokból szerveroldali PDF, max. 8 fotó. | Nem immutable snapshot/e-napló; WebP nem kerül a riportba. |

Fő adminisztrációs súrlódás: terepi méretek újrabevitele, takeoffból ajánlatsor és accepted offerből feladat manuális létrehozása, beszerzés/tényleges költség külön rögzítése. Integrációt ne végezzünk csendes felülírással: elfogadott ajánlat és történeti riport maradjon a forrásrevízióhoz kötve.

## 8. Pénzügyi és kivitelezési munkafolyamatok értékelése

**Megvan:** anyagár-történet, ajánlati sorok, HUF összegek fixpontos logikája, net/gross osztály, immutable ajánlati pillanatkép, finalizálás és elfogadott ajánlathoz kötött kivitelezési terv.

**Nincs:** szállítói rendelés/visszaigazolás, tényleges beszerzési költség, beérkezett mennyiség/visszáru, munkaóra/bér, gép/utazás/rezsi, alvállalkozói költség, terv–tény költség, projektprofit, számlázás vagy könyvelési export. Az ajánlati végösszeg nem tényleges bevétel vagy projektköltség.

Döntés előtt tisztázandó: melyik árazási osztály az alap; munkadíj mértékegysége; kedvezmény és kerekítés; beszerzési/eladási ár jogosultság; előleg/részszámla; szállítói ár érvényessége; ÁFA/fordított adózás könyvelő által jóváhagyott kezelése. Ajánlott sorrend: approved takeoffból kézi szerkesztésű beszerzési előkészítő lista, majd csak valós igény esetén tényleges költség. Profit csak teljes költségdefiníció után jelenjen meg.

## 9. Biztonság és SaaS-felkészültség

| Osztály | Megállapítás | Bizonyíték és korlát |
|---|---|---|
| **CODE-VERIFIED erősség** | getClaims alapú auth; tagság- és szervezeti szűrés; RLS/composite FK; revíziók immutable; owner/admin takeoff approval; quote-finalization lock/version; privát képtár, metadata-szűrt signed URL, MIME és magic-byte ellenőrzés. | auth.server.ts, organization.ts, feature action/data, migrationök. Forráskód-vizsgálat, nem penetration teszt. |
| **FUTURE REQUIREMENT** | Tagmeghívás/provisioning, dolgozóhoz rendelés, finom jogosultsági mátrix, suspend/tenant törlés/export UI nincs teljesen igazolva. | Role alapok vannak, életciklus- és SaaS adminfolyamat nem. |
| **TEST-COVERAGE GAP** | Progress kifejezetten említi, hogy cross-org Storage böngészős jogosulatlan hozzáférés nem lett vizsgálva; valódi multi-session terhelés sem bizonyított. | Nem állítok sérülékenységet. |
| **DEPLOYMENT RISK** | Docs a lokális Supabase-only működést rögzíti; éles hosting, secrets, TLS, monitoring, restore, RPO/RTO, incident response és backup-retenció nincs bizonyítva. | Ügyféladatot élesben használó szolgáltatásnak ez blocker; nem kódbeli sebezhetőség állítása. |
| **FUTURE REQUIREMENT** | GDPR adatfolyam/jogalap, adatfeldolgozói szerződés, EXIF, retention/deletion, hordozhatóság, adatminimalizált logging és backup-gyakorlat. | Kód és docs nem bizonyítja ezeket. |

Az RLS jó alap, de nem egyenlő SaaS readinessszel. Hosted izolációt, adat-visszaállíthatóságot, felhasználói életciklust és üzemeltetési kontrollt külön kell bizonyítani.

## 10. UX és mobilhasználati hiányosságok

**CODE:** CSS több mobil breakpointot, reduced-motion szabályt és focus-visible stílust tartalmaz; dashboard/űrlapok aria-labelt használnak; a rajz pointer/touch pan/pinch támogatása kódban látható. **Korábbi TEST:** docs szerint narrow 320/375/390/430 px viewport teszt nem volt elérhető. A jelen feladat tiltja a böngészős/CUA ellenőrzést, ezért itt vizuális UI-teszt nem történt.

Validálandó UX hipotézisek:

- Fotó feltöltése online kapcsolatot igényel; a tetőn végzett munkánál hibaállapot és mentett piszkozat fontos.
- Felmérőlap, ami egy képernyőn összekapcsolja a méretet, mértékegységet, mérési forrást, fotót és megjegyzést, csökkentheti az újragépelést.
- Kis brigádnál először felelős és határidő lehet fontosabb a Gantt-nál; currently nincs személy-hozzárendelés.
- A verified badge mögé konkrét forrás és ellenőrzési dátum kell.
- Focus/ARIA/reduced-motion jelenléte nem WCAG megfelelőségi bizonyíték. Screen reader, billentyűzetes végigjárás, 200%-os reflow, valós Android/iOS teszt és helyszíni gyenge hálózat ismeretlen.

## 11. Piaci összehasonlítás ellenőrzött források alapján

A táblázat a szolgáltatók saját nyilvános leírása; nem független funkcióteszt, lokalizációs vagy részesedési elemzés. Árakat nem hasonlítok.

| Termék | Nyilvánosan leírt képességek | Jelentés |
|---|---|---|
| [Roofr](https://roofr.com/products), [ajánlatok](https://roofr.com/proposals) | Tetőmérési riport, azonnali becslés, CRM/job board, digitális ajánlat/aláírás, anyagrendelés, munkalap, naptár/ütemezés, invoicing, payments és job costing; saját leírás mobil használatot és beszállítói árkapcsolatot említ. | Észak-amerikai roof-sales/CRM benchmark. A magyar app lehetséges fókusza a forrásolt számítás, magyar anyagfolyamat és verziózott projektlánc. Magyar jogi megfelelőséget nem állítok róla. |
| [PlanRadar HU](https://www.planradar.com/hu/), [site report workflow](https://help.planradar.com/en/site-reports-workflows-in-planradar/) | Általános építőipari feladat/dokumentáció/fotó/jelentés; mobil napi riport, heti előrehaladás és PDF export leírása. | Dokumentáció/terepi workflow benchmark, nem tetőgeometriai kalkuláció. |

A mintában nem kutattam át magyar fejlesztésű tetőszoftverek teljes piacát, és nincs ellenőrzött magyar árlista vagy interjú. Nem következik ebből, hogy nincs helyi versenytárs/fizetőképes piac. A lehetséges differenciálás – eredetjelölt geometria és anyag, rajz, ajánlati snapshot, fotó és munkanapló egy projekten belül – termékhipotézis, amelyet contractor interjúval kell igazolni.

## 12. Prioritási mátrix – P0/P1/P2/P3

| ID | Gap és aktuális bizonyíték | Forrás/elvárás | Hatás és függőség | Komplexitás | Prioritás |
|---|---|---|---|---|---|
| G01 | Hosted deploy, backup/restore, monitoring, incident és tenant lifecycle nincs bizonyítva; lokális Supabase-only workflow szerepel docsban. | GDPR 32. cikk; SaaS üzemeltetés. | Ügyféladat-vesztés/bizalmi kockázat; éles adat előtt kell. | Közepes–nagy | **P0** – üzemeltetési belépési kapu. |
| G02 | Fotó/ügyféladat jogalap, tájékoztatás, retention/törlés, EXIF, feldolgozói szerepek nincs leírva. | GDPR 5/6/13/17/28/32. cikk. | Pilot előtt adatvédelmi/jogi döntés kell. | Közepes | **P0** – személyes adat előtt. |
| G03 | Kimenet szakmai státuszának félreértése; csak gable/layout és user-provided paraméterek. | MSZT szabványhatárok és gyártói útmutató. | Rossz megrendelés/szakmai bizalom; G05 függő. | Közepes | **P0** – eredmény felhasználói figyelmeztetése és becslés státusza. |
| G04 | Belső napló/PDF és accepted quote elkülönítése e-naplótól/szerződéstől/számlától. | 191/2009 3. és 24. §; NAV. | Téves jogi ígéret; kiadási szövegek review-ja. | Alacsony–közepes | **P0** – termékszöveg/dokumentum kapu. |
| G05 | Gyártói provenance és verified folyamat nem formalizált; alapméretmező és szabad JSON van. | Bramac/PREFA források. | Hibás anyagbecslés; konkrét SKU és reviewer kell. | Közepes | **P1** – termékkalkulátor előtt. |
| G06 | Mérés→takeoff→ajánlat→feladat közti kézi adatátvitel. | Kód + Roofr/PlanRadar workflow benchmark. | Adminidő/duplikáció; valós folyamatteszt kell. | Közepes | **P1** – core workflow. |
| G07 | Gable only; összetettek hiányoznak. | Target roof mix UNKNOWN. | Sok munka nem lefedhető; target user döntés után egy geometriatípus. | Nagy | **P1** – pilot munkatípus szerint. |
| G08 | Cserép/faanyag/fólia/bádogos kalkulátor nincs; takeoff area/linear/manual. | Gyártói spec + szakértői példák. | Korlátozott beszerzési pontosság. | Nagy | **P1** – egyszerre egy kategória. |
| G09 | Tényleges anyag-, munka- és egyéb költség/profit hiányzik. | Nem jogi, üzleti követelmény. | Pénzügyi eltérés nem látszik; cost definíció kell. | Közepes–nagy | **P2** |
| G10 | Nincs assignment/naptár/offline; task csak státusz és due date. | Piaci workflow és terepi validálás. | Kisbrigád használhatóság. | Közepes | **P2** |
| G11 | Keskeny mobil/akadálymentes teszt nem bizonyított. | Blueprint, WCAG cél. | Terepi hibás adatbevitel/kizárás. | Közepes | **P2** |
| G12 | Számlázó, fizetés, beszállító API, SaaS billing nincs. | Üzleti/partnerdöntés. | Jelentős komplexitás. | Nagy | **P3** |
| G13 | 3D/AI tetőfelismerés nincs, blueprintben szándékos non-goal. | Nincs validált igény. | Költség és fenntartás. | Nagy | **P3** |

P0 a valós ügyféladat vagy kockázatos jogi/szakmai ígéret előtti blocker; nem azt jelenti, hogy bizonyított sérülékenység található a kódban.

## 13. Következő 3–5 fejlesztési mérföldkő

Javaslat, nem implementáció; a jelenlegi F9-es al-számozás folytatása.

| Mérföldkő | Cél és hatókör | Elfogadási feltétel / függőség | Kizárás, kockázat | Becslés |
|---|---|---|---|---|
| **F9.5.1 Pilotkészségi és adatkezelési kapuk** | Nem termelési pilot terv; backup/restore, retention/deletion, fotó EXIF, hozzáférés, adatfeldolgozók, incident és export menet. UI feliratok: belső riport ≠ e-napló; státusz ≠ aláírás; mennyiség ≠ statikai igazolás. | Adatfolyam, felelősségi térkép, restore próba, tenant/RLS terv; üzemeltető és jogi/adatvédelmi review. | Nincs production adat, automatikus törlés vagy e-napló/számlázó integráció. | M |
| **F9.5.2 Terepi pilot workflow validálás** | Egy tulajdonos és egy kis csapat 3 valós/anonim munkáján mérje fel az adminidőt, duplikációt, hibapontot; célzott UX javítás csak bizonyított súrlódásra. | 3 folyamatjegyzőkönyv; mobil eszköz/narrow viewport, accessibility alap QA; egy újratesztelt flow. | Nincs CRM, offline sync vagy e-aláírás. | M |
| **F9.6 Forrásolt fedőanyag-kalkulátor** | Válasszon egyetlen gyártó/termékcsaládot és vagy cserépet vagy fémfedést. Verziózott gyártói adat, provenance és kimeneti státusz. | Reviewer + jogszerűen elérhető útmutató + referenciaesetek; határérték/invalid tesztek és snapshot. | Nem statika és nem más gyártóra általánosított adat. | L |
| **F9.7 Beszerzési előkészítés és tényköltség alapja** | Approved takeoffból szerkeszthető lista; supplier, árforrás/dátum, megrendelési státusz, beérkezett mennyiség. | Nettó/bruttó és cost semantics döntések; planned/actual elkülönítés, jogosultság és változáselőzmény. | Nem könyvelés, számlázás, áfa-automatizálás vagy beszállító API. | L |
| **F9.8 Csapat/ütemezés (igény esetén)** | Felelős, kezdés/határidő, csapatszerep és offline szükséglet egy kis brigáddal validálva. | Függ G10-től, adatkezeléstől és concurrency döntésektől; idempotencia/audit és terepi smoke. | Nem ERP, payroll vagy GPS. | M–L |

Ajánlott sorrend F9.5.1 → F9.5.2 → pilot alapján **F9.6 vagy F9.7**; ezután F9.8 csak bizonyított igénynél.

## 14. Felhasználói döntést igénylő kérdések

**Kritikus**

1. Első pilot célcsoport: egyéni vállalkozó/1–2 fős brigád vagy több dolgozós cég? Ez határozza meg a szerepkört és assignment igényt.
2. Első szakmai munkatípus: cserépfedés, cserepeslemez/trapézlemez vagy önálló eresz/bádogosmunka? F9.6-hoz egyet válasszunk.
3. Van-e szakmai reviewer és konkrét gyártói dokumentáció/referenciaeset; ki hagyhat jóvá verified jelölést?
4. Ki a szolgáltatás adatkezelője, hol tárolunk pilotadatot, mennyi a fotó/ajánlat retention, milyen jogalap/tájékoztatás kell? Adatvédelmi szakértői döntés szükséges.

**Következő kör**

- Tényleges beszerzési és munkadíj-költség követése fontos-e, és milyen net/gross szemantikával?
- SaaS több vállalkozásnak már pilotban a cél, vagy előbb egy cég belső használata?

## 15. Felhasznált források és ellenőrzési dátumok

Minden online forrás ellenőrizve: **2026-10-13**. Alkalmazandó szabályt projektenként újra kell ellenőrizni.

**Jogi/hivatalos:** [191/2009 Korm. rendelet](https://njt.hu/jogszabaly/2009-191-20-22), [e-napló §24](https://njt.hu/jogszabaly/2009-191-20-22.44), [2023. évi C. törvény](https://njt.hu/jogszabaly/2023-100-00-00), [34/2021 ITM rendelet](https://njt.hu/jogszabaly/2021-34-20-7Q), [280/2024 TÉKA](https://njt.hu/jogszabaly/2024-280-20-22.1) és [135. §](https://njt.hu/jogszabaly/2024-280-20-22.7), [e-építés napló](https://www.e-epites.hu/e-naplo), [e-napló GYIK](https://www.e-epites.hu/gyik?temakor=132), [MKIK GYIK](https://mkik.hu/epitoipari-kivitelezo-vallalkozasok-gyik), [NAV számla füzet](https://nav.gov.hu/pfile/file?path=/ugyfeliranytu/nezzen-utana/inf_fuz/2023/18.-informacios-fuzet---A-szamla-nyugta-kibocsatasanak-alapveto-szabalyai), [GDPR EUR-Lex](https://eur-lex.europa.eu/legal-content/hu/ALL/?uri=CELEX:32016R0679).

**Szabvány/gyártó:** [MSZ EN 1991-1-3:2016](https://ugyintezes.mszt.hu/webaruhaz/szabvany-adatok?standard=132091), [MSZ EN 1991-1-3:2025](https://ugyintezes.mszt.hu/webaruhaz/szabvany-adatok?standard=151047), [Bramac szerkezeti méretek](https://www.bmigroup.com/hu/szakembereknek/bramac-tudastar/szerkezeti-meretek/), [PREFA magyar dokumentumtár](https://www.prefa.hu/extranet/downloadbereich/beepitesi-iranyelvek-es-szerelesi-utasitasok/), [PREFA tető-útmutató PDF](https://www.prefa.hu/fileadmin/user_upload/_HU/Downloads/Verlegerichtlinien/PREFA_Verlegerichtlinie_Dach_HU.pdf).

**Termékpiac:** [Roofr termékek](https://roofr.com/products), [Roofr ajánlatok](https://roofr.com/proposals), [PlanRadar magyar](https://www.planradar.com/hu/), [PlanRadar site reports](https://help.planradar.com/en/site-reports-workflows-in-planradar/).

## 16. Bizonyítékok, feltételezések és nem ellenőrzött állítások

- **CODE:** repository fájlok, route-ok, kalkulátorok, migrations, Auth/action/data, CSS. Kódstruktúrát és adatkontraktust igazol, nem production telepítést.
- **TEST:** docsban rögzített korábbi futási eredmény F9.4.2.1-ig. Audit során nem futtattam tesztet.
- **DOCUMENTATION:** blueprint/progress/database/calculation/test matrix történeti és célállapot állításai.
- **OFFICIAL SOURCE:** NJT, NAV, MKIK, e-építés, EUR-Lex és MSZT; 2026-10-13 hozzáférés. Értelmezés projekt- és szerepfüggő.
- **MANUFACTURER SOURCE:** Bramac/PREFA oldalakon ellenőrzött rendszerfüggő megállapítások; termékértékeket nem vittem be és SKU-t nem validáltam.
- **INFERENCE:** érettségbesorolás, UX prioritás és piaci pozicionálás kód/dokumentáció/külső forrás alapján. Kivitelezői interjúk nélkül hipotézis.
- **UNKNOWN:** production állapot/config, hosted RLS/Storage és restore, adatkezelési tájékoztató/DPA, valós telefon/offline és WCAG, kivitelezői interjú, magyar piaci ár/részesedés, konkrét SKU pontosság, statikai megfelelőség, költség- és áfaszabály.

**Javasolt Conventional Commit üzenet:** docs(F9.5): add product readiness audit

