# M9.7 — Tetőforma- és szarufarajz E2E vizuális audit

Dátum: 2026-10-25 · Ág: `feat/m1-length-input` · Státusz: **PARTIAL** (a rajzi/interaktivitási magviselkedés ellenőrizve; érintéses gesztusok és a tetőmodell-oldali rétegkapcsolók nem)

Hatókör: az 1–5. szakasz az audit, amely alatt alkalmazáskód nem változott. **A három P1 hibát, majd az F-04 és F-06 tételt külön menetekben javítottuk; a javítások a 6. és 7. szakaszban.** Adatbázisba semmi nem íródott, migráció és commit nem készült.

## 0. A megszakadt Codex-futás átvétele

A Codex-futásból **kizárólag 5 képernyőkép** maradt a `docs/evidence/m97/` könyvtárban; audit-dokumentum, jegyzet vagy eredménylista nem. Ezért a korábbi munkából csak az tekinthető bizonyítottnak, ami a képeken látszik.

| Codex-fájl | Mit bizonyít | Megjegyzés |
|---|---|---|
| `rafter-cut-1440x900-light.png` | A `roof.rafter-cut` rajz 1440×900-on, világos témában; a „Talpszelemen” buborék takarja a „magasság 20” méretcímkét | érvényes bizonyíték |
| `rafter-cut-375x812-light.png` | Ugyanaz 375×812-n, világos témában | érvényes |
| `rafter-cut-375x812-dark.png`, `rafter-cut-768x1024-dark.png` | **Nem sötét téma.** A képen a konzol `document.documentElement.dataset.theme` → `'light'`, és a felület is világos | **félrecímkézett bizonyíték**, sötét témára nem használható |
| `rafter-cut-812x375-light.png` | Fekvő 812×375: a rajz teljesen a hajtás alatt, csak az eszköztár látszik | érvényes, de részleges |

A sötét témát ebben a futásban pótoltuk (lásd lent), így a hiány lezárult.

## 1. Ellenőrzési környezet

- Futó fejlesztői szerver: `http://localhost:3000` (nem indítottuk újra, nem állítottuk le).
- Böngésző: beépített Claude-böngésző pane, 1440×900 és 375×812 (mobil emuláció), sötét és világos témában.
- Vizsgált felületek:
  - `roof.rafter-cut` — `RafterJointDrawing` (egy szarufa, egy nézet).
  - `roof.timber-cutlist` — `RoofJointDrawing` (tetősíkonkénti keresztmetszet, bal/jobb oldal).
- Bemenetek kézzel, a kalkulátor űrlapján; mentés nem történt. A Codexétől eltérő számértékekkel is reprodukáltuk a hibákat, tehát azok nem egy konkrét adatsor sajátjai.
- Érintett forrás: `src/features/calculators/rafter-joint-drawing.tsx` (503 sor), `src/domain/drawings/rafter-joint-drawing.ts`, `src/app/globals.css`.

## 2. Eredménytábla

| # | Ellenőrzés | Eredmény | Bizonyíték |
|---|---|---|---|
| 1 | Talpszelemen-buborék és „magasság 20” átfedése | **FAIL (P1)** → **JAVÍTVA** (6. szakasz) | mért 88×20 px átfedés 1440×900, 100% nagyításon |
| 2 | Bal/jobb tetőoldal kattinthatósága a rajzon | **PARTIAL / FEATURE GAP (P1)** → **JAVÍTVA** (6. szakasz) | szimmetrikus nyeregtetőn a jobb oldalnak nincs buboréka |
| 3 | Kattintásra a megfelelő szarufa/csatlakozás kiválasztása | **PASS** | buborékkattintás → cím, gomb, útmutató, kiemelés együtt vált |
| 4 | Részletrajz és méretlista szinkronja | **PASS** (bal oldalon) / **PARTIAL** (jobb oldalon) | lásd 2. pont |
| 5 | Egérgörgős zoom | **PASS** | 100% → 115%, `defaultPrevented: true`, az oldal nem görgetett |
| 6 | Egeres pan | **PASS** | pointer-drag után a kontúr pontjai megváltoztak |
| 7 | Pinch / kétujjas pan | **NOT VERIFIED** | kódszinten megvan; valódi érintés nem injektálható |
| 8 | Reset / „Teljes szarufa” | **PASS** | reset → 100%, illesztett kamera |
| 9 | Billentyűzet (nyilak, +, −, 0) | **PASS** | +: 115→144%, 0: 100%, nyíl pannol |
| 10 | Tetősík- és szelemenválasztók | **PASS** | kontytetőn 3 elemű tetősík-választó, 3 csatlakozásgomb |
| 11 | Nézetek ki/bekapcsolása a szarufarajzon | **FEATURE GAP (P3)** | a rajzban 0 db réteg-kapcsoló |
| 12 | Mobil használhatóság és olvashatóság | **PARTIAL (P2)** → **JAVÍTVA** (6–7. szakasz) | illesztett nézetben tiszta, nagyításkor a buborékok takarnak |
| 13 | Támogatott/nem támogatott tetőformák | **PASS** | nyereg, félnyereg, konty: helyes rajz és indoklás |
| 14 | Egy érvénytelen csomópont hatása a rajzra | **FAIL (P1)** → **JAVÍTVA** (6. szakasz) | az egész rajz eltűnik, a jó csomópontok is |
| 15 | Hibaszöveg duplikáció | **FAIL (P3)** → **JAVÍTVA** (7. szakasz) | „Derékszelemen: Derékszelemen: …” |
| 16 | Sötét téma | **PASS** | sötét témás képernyőkép, azonos viselkedés |
| 17 | Fókuszgyűrű láthatósága a vásznon | **NOT VERIFIED** | `:focus-visible` stílus programból nem volt kiolvasható |

## 3. Megállapítások részletesen

### F-01 · Csomópont-buborékok takarják a méretcímkéket — **P1**

**Reprodukció:** `roof.rafter-cut`, fél fesztáv 400 cm, gerincemelkedés 200 cm, ereszkiülés 50 cm, HAP 20 cm, szarufamagasság 20 cm, derékszelemen 200/100 cm, talpszelemen 20 cm. 1440×900, illesztett (100%) nézet.

Mért átfedések (DOM befoglalók metszete):

```
dim:"magasság 20" X badge:"Talpszelemen"        = 88x20 px
dim:"219,3"       X badge:"Szembefutó szarufák" = 22x3  px
```

Ugyanez más számértékekkel is előáll, tehát nem adatspecifikus. 375×812-n illesztett nézetben nincs átfedés, de 183%-os nagyításon igen (`teljes hossz 493,5` × `Szembefutó szarufák` 19×20 px, `0` × `Talpszelemen` 18×7 px).

**Ok (kódbizonyíték):** `rafter-joint-drawing.tsx` — a méretcímkék végigmennek a `resolveAnnotationLabelPositions` → `nudgeOffSegments` → `drawnBoxes` ütközéskezelésen, a csomópont-buborékok viszont **utoljára, minden ütközésvizsgálat nélkül** kerülnek ki: pozíciójuk `anchor.y + 28`, és csak a vászon szélére vannak vágva. A `drawnBoxes` lista nem tartalmazza őket, és ők sem nézik meg.

**Javaslat:** a buborékok befoglalóit vegyük fel ugyanabba az ütközéslistába, amibe a méretcímkék kerülnek (`drawnBoxes`), és elsőként őket helyezzük el (a buborék a fontosabb), vagy a buborékot is engedjük a `nudgeOffSegments`-szerű eltolásra. Kis, lokális változtatás egyetlen komponensben.

Bizonyíték: `docs/evidence/m97/rafter-cut-1440x900-dark-label-overlap.jpg`, `docs/evidence/m97/rafter-cut-1440x900-light.png` (Codex), `docs/evidence/m97/rafter-cut-375x812-zoomed-badge-overlap.jpg`.

### F-02 · A jobb tetőoldal nem kattintható és nincs feliratozva — **P1 (FEATURE GAP + hiányzó visszajelzés)**

**Reprodukció:** `roof.timber-cutlist`, nyeregtető, 1000×800 cm, 30°, ereszkiülés 50 cm, osztás 80 cm, léc 35 cm, szarufa 10×20 cm, csatlakozásszámítás bekapcsolva, HAP 20, talpszelemen 20, derékszelemen 200/120 cm.

A rajzon két szarufa jelenik meg, de a buborékok mind a bal oldalhoz tartoznak:

```
["Talpszelemen részlet · bal oldal", "Derékszelemen részlet · bal oldal", "Szembefutó szarufák részlet · bal oldal"]
```

A jobb oldalra kattintani nem lehet; a „jobb oldal” gomb a részletnézetet helyesen átváltja (`Talpszelemen · jobb oldal`, saját részletrajzzal), **de az áttekintő rajzon ilyenkor egyetlen buborék sincs kijelölve** (`.rafter-joint-badge.is-selected` üres). A felhasználó számára a jobb oldal néma deszkának látszik.

**Ok:** szándékos duplikátum-elnyomás — a `SectionView` `secondary === "duplicate"` ágán a buborékok és a méretek nem rajzolódnak ki, ha a jobb oldal értékei megegyeznek a baléval. Ez elkerüli az egymásra csúszó dupla feliratokat, de egyben megszünteti a jobb oldal kattinthatóságát és a kijelölés visszajelzését.

**Javaslat (növekvő költség szerint):**
1. A kijelölt oldal buborékját akkor is rajzoljuk ki, ha az oldal duplikátum (minimális: a `duplicate` ág engedje át a `selected` slotot).
2. A rajzon jelezzük, hogy a két oldal azonos („a jobb oldal mérete azonos”), hogy az üres oldal ne tűnjön hibának.
3. Opcionálisan: a duplikátum oldal buborékjai kattinthatók, de felirat nélküli, kisebb találatpontként.

Bizonyíték: `docs/evidence/m97/gable-two-sides-right-unlabelled.jpg`.

### F-03 · Egyetlen nem rajzolható csomópont eltünteti az egész rajzot — **P1**

Két független reprodukció:

- `roof.rafter-cut`, derékszelemen felső síkja 140 cm: „A méretezett szarufarajz nem készíthető… Derékszelemen: a támasz felső síkja eléri a szarufa felső élét.”
- `roof.timber-cutlist`, nyeregtető, derékszelemen felső síkja 100 cm: „…a szarufa alsó éle a támasz fölött van, bevágás nem jön létre; a hézagot alátétezéssel kell megoldani.”

A második eset **kivitelezhető helyzet** (alátétezés), mégsem rajzolódik ki semmi — pedig a talpszelemen-madárszáj és a gerinccsatlakozás geometriája érvényes és kiszámított. Egy adatbeviteli melléfogás a derékszelemen mezőben a teljes rajzi munkafolyamatot megszünteti.

**Javaslat:** a rajz készüljön el a kiszámított csomópontokkal, és csak az érintett csomópont kapjon „nem rajzolható” státuszt a saját buborékjában és a részletnézetében; a `views.length === 0` teljes blokkolás maradjon a valóban üres esetre. Ez a `JointDrawingBody` feltételének szűkítése, nem új funkció.

### F-04 · Duplikált hibaszöveg — **P3**

A blokkoló üzenetben a csomópont neve kétszer szerepel: `Derékszelemen: Derékszelemen: a támasz felső síkja…` — a listaelem előtagja és a `reason` szövege is tartalmazza a nevet.

### F-05 · Nincs rétegkapcsoló a szarufarajzon — **FEATURE GAP, P3**

A `.drawing-layers` nézetkapcsolók csak a tetőmodell műszaki rajzán (`technical-drawing.tsx`) léteznek; a szarufa-/csomóponti rajzban 0 darab van. Ez nem hiba, hanem hiányzó funkció: a méretek, a jelölővonalak és a vázlatos szelemenek nem kapcsolhatók ki. Ha a zsúfoltság miatt kérik, ez a legolcsóbb megoldás az F-01 mellé.

### F-06 · Mobil olvashatóság — **PARTIAL, P2**

- 375×812, illesztett nézet: a feliratok nem fednek, a buborékok a vásznon belül maradnak (mérve: egyik sem lóg ki), a rajzterület 319×268 px, betűméret 13 px, az eszköztár-tipp mobilon elrejtve.
- Zsúfoltság: a „Szembefutó szarufák” buborék 164 px széles a 319 px-es vásznon (51%).
- Nagyítás után a buborékok takarják a méretcímkéket (F-01).
- A csatlakozásválasztó gombok 242×58 px-esek — jó érintési célpontok. A rajzi buborékok viszont 24 px magasak, a 44 px-es ajánlás alatt; érintésre nehezen találhatók, bár a gombsor teljes értékű alternatíva.
- Fekvő 812×375 (Codex képe): a rajz a hajtás alá kerül, csak az eszköztár látszik — használható, de kényelmetlen.

### F-07 · Tetőforma-lefedettség — **PASS**

| Tetőforma | Rajz | Oldalak | Korlátozás |
|---|---|---|---|
| Nyeregtető | igen | bal, jobb | – |
| Félnyeregtető | igen | 1 oldal | „Felső vég nem támogatott: a szarufák felső vége a félnyeregtető felső élén van” |
| Kontytető | igen | bal, jobb + 3 elemű tetősík-választó (1–2. közös, 3., 4.) | 3–4. tetősík felső vége nem támogatott (kontyos vég); „Kontyél- és vápaszarufa nincs a modellben” |
| Sátortető, Félkontytető, L, T, Manzárd | nincs rajz | – | a kalkuláció hiányos (további kötelező bemenetek), ezt a felület külön jelzi — ellenőrizve manzárdtetőn, a többi forma egyenként nem |

A nem támogatott esetek tehát **kimondva** vannak, nem némán kimaradnak.

### Ami működik (regresszió-figyelésre)

- Görgős zoom a kurzorhoz horgonyozva, `preventDefault`, az oldal nem ugrik.
- Egérrel pan, billentyűzettel nyilak/+/−/0, reset és „Teljes szarufa”.
- Kattintás → kiválasztás: a buborék kiemelése, a `Szarufa- és szelemenkapcsolat · részlet` gomb `aria-pressed`-je, a részlet címe, a részletrajz és a „Ennyit kell bevágni” útmutató egyszerre vált.
- A méretlista („Mit hol jelölj a szarufán”) ugyanabból a modellből jön, mint a rajz.
- Sötét témában azonos elrendezés és viselkedés.

## 4. Javítási sorrend

| Prioritás | Tétel | Becsült hatókör |
|---|---|---|
| P1 | F-03 — a részleges rajz készüljön el a jó csomópontokkal | 1 feltétel a `JointDrawingBody`-ban + a csomópont státusza |
| P1 | F-01 — a buborékok vegyenek részt a címkeütközés-kezelésben | 1 komponens, `drawnBoxes` kiterjesztése |
| P1 | F-02 — a kijelölt jobb oldal kapjon buborékot és visszajelzést | `SectionView` `duplicate` ágának szűkítése |
| P2 | F-06 — mobil zsúfoltság: rövidebb buborékfelirat vagy nagyobb találatpont | CSS + feliratszöveg |
| P3 | F-04 — duplikált hibaszöveg | 1 sor |
| P3 | F-05 — rétegkapcsolók a szarufarajzon (új funkció, jóváhagyás kell) | új UI-elem |

## 5. Korlátok és nem ellenőrzött területek

- **Valódi érintéses gesztus** (egyujjas oldalgörgetés, kétujjas pan, pinch, dupla koppintás) nem volt injektálható; a kód tartalmazza őket (`touch-action: pan-y`, kétujjas `zoomCameraAt` + `panCamera`, 320 ms-os dupla koppintás), de **futásban nem bizonyított**.
- A **dupla koppintás / dupla kattintás „legközelebbi csomópontra ugrás”** szintén csak kódszinten ellenőrzött.
- A **fókuszgyűrű** láthatósága a rajzvásznon nem volt programból kiolvasható — vizuálisan nem ellenőriztük.
- A **tetőmodell műszaki rajza** (`src/features/roof-models/technical-drawing.tsx`, rétegkapcsolókkal, bal/jobb tetősíkokkal) **nem volt része ennek a futásnak**: projektadatot igényel, és adatbázisba nem írtunk. A „nézetek ki- és bekapcsolása” ott élesben nem ellenőrzött.
- Nem futott: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — kódváltozás nem történt, ezért nem volt rá ok.
- Sátortető, félkontytető, L és T alaprajz hiányos-állapotának szöveges indoklását egyenként nem olvastuk végig (manzárdtetőn ellenőrizve).

---

## 6. P1 javítások (2026-10-25, az audit utáni menet)

A három P1 tétel javítva, az F-01 → F-02 → F-03 lista szerinti prioritási sorrendben megvalósítva. Érintett fájlok:
`src/domain/calculations/construction/rafter-joints.ts`, `src/features/calculators/rafter-joint-drawing.tsx` és a hozzájuk tartozó tesztek. Migráció, séma- és szerződésváltozás nincs; a számított értékek változatlanok.

### F-03 javítva · részleges rajz az igazolt csomópontokkal

- `rafter-joints.ts`: a rajz (`drawing`) már csak akkor marad el, ha a **talpszelemen vagy a gerinc** csomópontja érvénytelen — ezek rögzítik a metszet 0-pontját és felső végét. A **derékszelemen** középső támasz: érvénytelensége esetén csak a saját támasza marad ki (`supports.push` feltételessé vált), a szarufa és a többi csomópont kirajzolódik.
- Az érvénytelen derékszelemen a részletválasztóban „nem számítható” státuszt kap, és kiválasztva megjeleníti az indokát; a méretláncból és az állomáslistából kimarad.
- **Mellékhatás (kívánt):** manzárdtető alsó tetősíkjai, ahol a derékszelemen a megadott bemenettel érvénytelen, mostantól rajzot kapnak (síkonként egyet, mert nem közös gerincen osztoznak). A `plane-birdsmouth` mátrixteszt ezt 0 → 2 szekcióra frissítve rögzíti.
- Élesben ellenőrizve: `roof.rafter-cut`, derékszelemen felső síkja 140 cm — korábban a teljes rajz eltűnt, most rajzol, a csomópontsor `Talpszelemen · számított / Derékszelemen · nem számítható / Szembefutó szarufák · számított`.

### F-01 javítva · a csomópont-buborékok nem takarják a méretcímkéket

- A buborékok elhelyezése a címkeütközés-kezelés **elé** került: befoglalóik bekerülnek a `labelObstacles` listába (a lépésszám-körökkel azonos módon, doboz-átlókként), így a `nudgeOffSegments` **elmozdítja** róluk a méretcímkéket, nem egyszerűen eldobja őket. Ha egy címke az elmozdítás után is takarna, akkor marad a meglévő szabály: a méretvonal megmarad, a szövege nem, az érték pedig a rajz alatti listában van.
- Az ütközéslista (`drawn`) egy vászonra közös, így a második tetőoldal is kikerüli az első oldal címkéit és buborékjait.
- Mérés (ugyanaz a bemenet, amely 88×20 px átfedést adott): **0 átfedés** 1440×900-on és 375×812-n, illesztett és nagyított (156–195%) nézetben egyaránt, mindkét kalkulátorban.
- Ár: zsúfolt nézetben néhány méretcímke szövege eltűnik (pl. `magasság 20`, illetve az ereszméret az illesztett asztali nézetben). Ezek az értékek a „Mit hol jelölj a szarufán” listában szerepelnek, és nagyításra visszajönnek.

### F-02 javítva · mindkét tetőoldal kattintható

- A tükrözött oldal mostantól **saját csomópont-buborékokat** kap (tükrözött pozícióban, tehát nem egymásra csúszva); a megosztott gerincbuborék továbbra is egyszer rajzolódik, kivéve ha éppen az a kiválasztott csomópont. A méretlánc-duplikáció elnyomása változatlan.
- **Telefonszélességű vásznon** (mért szélesség < 600 px, és a mérés előtti 360 px-es alapérték is ilyen) a tükrözött oldal csak a kiválasztott buborékot mutatja: ekkora vászonra öt buborék nem fér ki olvashatóan. Bármely oldal bármely csomópontja továbbra is elérhető a rajz alatti gombsorból.
- Élesben ellenőrizve (nyeregtető, `roof.timber-cutlist`, 704 px-es vászon): 5 buborék (`Talpszelemen/Derékszelemen · bal`, `Talpszelemen/Derékszelemen · jobb`, `Szembefutó szarufák · bal`), a jobb oldali buborékra kattintva a részlet címe `Talpszelemen · jobb oldal`, az oldalgomb `aria-pressed=true`, a buborék `is-selected` — azaz a kiválasztás visszajelzése a rajzon is megjelenik.

### Ellenőrzések

| Ellenőrzés | Eredmény |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint` az érintett fájlokra | PASS |
| Teljes teszt (`npx vitest run`) | PASS · 189 fájl, 1169 teszt (8 fájl / 19 teszt kihagyva, változatlanul) |
| Böngésző · `roof.rafter-cut` 1440×900 és 375×812, illesztett + nagyított | 0 címkeátfedés |
| Böngésző · `roof.timber-cutlist` nyeregtető 1440×900 és 375×812, illesztett + nagyított | 0 címkeátfedés, jobb oldal kattintható |
| Böngésző · F-03 reprodukció (`purlinTop` 140 cm) | rajz elkészül, derékszelemen „nem számítható” |

Frissített tesztek (a megváltozott, szándékolt viselkedést rögzítik): `rafter-joint-drawing.test.ts` (érvénytelen derékszelemen → rajz megmarad, csak az S1/S3 támasz van; érvénytelen talpszelemen → nincs rajz), `plane-birdsmouth.test.ts` (manzárd 0 → 2 szekció), `rafter-joint-drawing.test.tsx` (buborékszám a nem mért, telefonszélességű vásznon).

Bizonyítékképek: `docs/evidence/m97/after-F01-no-label-overlap.jpg`, `docs/evidence/m97/after-F02-both-sides-selectable.jpg`.

### Ami ebben a menetben nem változott

- **F-04** (duplikált hibaszöveg), **F-05** (rétegkapcsolók — új funkció, jóváhagyás kell), **F-06** (mobil zsúfoltság, rövidebb buborékfeliratok és nagyobb érintési célpont) nyitva maradt.
- A buborékok közötti ütközés széles vásznon nincs külön kezelve: ha két csomópont nagyon közel kerül egymáshoz, a buborékjaik érintkezhetnek. A mért eseteinkben nem fordult elő.
- Az 5. szakasz korlátai (valódi érintéses gesztusok, fókuszgyűrű, tetőmodell műszaki rajza) változatlanul érvényesek.
- **Javasolt Conventional Commit:** `fix(M9.7): draw proven rafter joints and make drawing badges readable` (a 6. és 7. szakasz együtt).

---

## 7. F-04 és F-06 javítás (2026-10-25, harmadik menet)

### F-04 javítva · nincs duplikált csomópontnév a hibaszövegben

A `notchValues` eddig a csomópont nevét a `reason` szövegébe is beleírta (`prefix`), miközben minden megjelenítési és mentési hely külön is megnevezi a csomópontot (a blokkoló lista `{név}: {reason}` formában, a részletpanel a csomópont címe alatt, a `planeJointStatuses` pedig külön `joint` és `name` mezőben). A `prefix` paraméter megszűnt, a négy reason-szöveg önálló mondat lett.

- Előtte: `Derékszelemen: Derékszelemen: a támasz felső síkja eléri a szarufa felső élét.`
- Utána: cím `Derékszelemen · nem számítható`, szöveg `A támasz felső síkja eléri a szarufa felső élét.`
- Mellékhatás: a talpszelemennél a korábbi `Talpszelemen: Alsó felfekvés: …` kettős megnevezés is megszűnt.
- A mentett provenance (`planeJointStatuses`) változatlanul tartalmazza a csomópont azonosítóját és nevét, tehát kontextus nem veszett el.

### F-06 javítva · mobil érintési célpont és zsúfoltság

- **Érintési célpont:** a buborék köré 44 px magas, átlátszó találati téglalap került (`rect.rafter-joint-hit`), a látható pirula marad 24 px. Mérve: 110×44, 117×44, 94×44 px. Ellenőrizve, hogy a pirulán kívüli, de a találati területen belüli kattintás is kiválasztja a csomópontot.
- **Zsúfoltság:** 600 px-nél keskenyebb vásznon a leghosszabb név rövidül a megkülönböztető szavára (`Szembefutó szarufák` → `Szembefutó`). A teljes név megmarad a buborék akadálymentes nevében (`Szembefutó szarufák részlet`), a rajz alatti gombsorban és a részlet címében. Mérve 375×812-n: a leghosszabb buborék a vászonszélesség **51% → 29%**-a.
- A 600 px-es küszöb a vászon mért szélességére vonatkozik, nem az eszközre: a `roof.rafter-cut` kétoszlopos elrendezésében az asztali vászon is kb. 456 px, ott is a rövid felirat jelenik meg. Ez szándékos — a rendelkezésre álló helyhez igazodik, ahogy a betűméret is.

### Ellenőrzések

| Ellenőrzés | Eredmény |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint` az érintett TS/TSX fájlokra | PASS |
| Teljes teszt (`npx vitest run`) | PASS · 189 fájl, 1169 teszt (8 fájl / 19 teszt kihagyva) |
| Böngésző · 375×812: buborékméretek, találati terület, átfedés | 0 átfedés; 44 px találati magasság; 29% legnagyobb buborékszélesség |
| Böngésző · találati területre (pirulán kívülre) kattintás | kiválasztja a csomópontot |
| Böngésző · F-04 szövegek (`purlinTop` 140 és 60 cm) | nincs ismételt csomópontnév |

Bizonyítékkép: `docs/evidence/m97/after-F06-mobile-badges.jpg`.

### Nyitva maradt

- **F-05** (rétegkapcsolók a szarufarajzon) — új funkció, külön jóváhagyást igényel.
- Az 5. szakasz korlátai (valódi érintéses gesztus, fókuszgyűrű, tetőmodell műszaki rajza) változatlanul érvényesek. A 44 px-es találati terület valódi érintéssel nem lett próbálva, csak méretben és szimulált kattintással.
- A rövidítés egyelőre egyetlen névre vonatkozik; ha később hosszabb csomópontnév kerül a modellbe, a `SHORT_BADGE` táblát bővíteni kell.
