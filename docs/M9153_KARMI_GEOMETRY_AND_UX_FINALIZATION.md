# M9.15.3 — kiosztásmentes KARMI-geometria és külön funkcióállapotok

## Státusz: PARTIAL
Kész és bizonyított: a fiktív 100 000 mm-es kiosztás megszűnt; külön KARMI- és anyagállapot. **NOT VERIFIED**: mentés–újranyitás E2E, valódi telefonteszt, termékalapú szarufa böngészőben (az ideiglenes útvonalon nincs aktív katalógustermék; domain-szinten tesztelve).

## 1. A korábbi workaround szerepe
`planeBirdsmouthsFor` a `RoofTimberLayout` szegmenseiből kapta a leghosszabb ereszről induló szarufavonalat. Az M9.15.1–2 előnézet ehhez egy szintetikus, 100 000 mm-es tengelytávú layoutot épített. Ez a rögzített kiosztás megszűnt.

## 2. Új adatút (`plane-birdsmouth.ts`)
- `calculatePlaneBirdsmouths(geometry, layout, input)` szétválasztva: a layoutból `PlaneRafterSource[]` (síkazonosító, vonalak, darabszám, osztás) készül, majd a változatlan belső `planeBirdsmouthsFromSources` számol (futás, ereszkiülés, hajlás, felsővég-típus, `calculateRafterJoints`). A mentett útvonal numerikusan változatlan (az összes meglévő teszt zöld).
- `fallLineRaftersOf(geometry)`: a kanonikus `RoofGeometry` síkjaiból szarufaforrást ad, **csak ha** minden sík 4 csúcsú, síkvetületben téglalap, két oldala az esésvonallal párhuzamos (esésvonal = a magasság vízszintes gradiense), és nincs két sík azonos kiosztási csoportban. Ekkor minden szarufavonal egyforma hosszú, az esésvonallal párhuzamos oldal a leghosszabb ereszi szarufa, tengelytávtól függetlenül. Egyébként `null`.
- `calculatePlaneBirdsmouthsFromGeometry` / `planeBirdsmouthsFromGeometryFor`: ugyanaz a bemenet-leképezés (`birdsmouthInputFrom`), darabszám és osztás 0 (a rajz ilyenkor elrejti). `previewPlaneBirdsmouths` ezt hívja.
- Nincs új képlet, DB-írás, és a kanonikus kimenet nem változik; az előnézet nem része a `computeConstruction` kimenetének.

## 3. Támogatott formák
Bizonyított (teszt): nyeregtető, félnyeregtető (shed). Nem támogatott, nincs előnézet (teszt): konty, sátor, félkonty, L, T; a manzárd síkjai szintén kiesnek. Ott a „Faanyag” kiosztás és tengelytáv kell. Nem történt bővítés.

## 4. Külön állapotok (UI)
Az eredmények élén „Funkciók állapota”: **KARMI és csatlakozások** (pl. „A megadott geometria alapján a bevágási előnézet elkészült.” / „A bevágáshoz még hiányzik: …” / hibaok / „csak szarufakiosztással számolható”) és **Anyagszükséglet** („Anyagmennyiségi számításhoz válassz anyagcsoportot.” / elkészült / nem teljes). `karmiStatusText` (`rafter-connection-fields.ts`). A teljességi és mentési státusz, szövegei és szabályai változatlanok. Kapcsolók: négy kombináció működik, nincs új szarufa-kapcsoló, a keresztmetszet-szerkesztő nem duplikálódik.

## 5. Bizonyítékok
Domain/feature tesztek (`construction-computation.test.ts`, `rafter-connection-fields.test.ts`): kiosztásmentes nyereg/shed = rétegút (300/900/2500 mm), független kézi számítás 24 kombinációra (hajlás 20/35/45°, ereszkiülés 0/400 mm, szelvény 160/200, HAP 60/100: futás 4000, ereszkiülés, függővágás = d/cos α − HAP, ülék = függővágás/tan α), nem támogatott formák → null, hip → nincs előnézet, termék = kézi szelvény, nincs hatás a teljességre. Vitest 192 fájl / 1184 teszt PASS (8 fájl/19 skip), ESLint, tsc, `git diff --check`, izolált `npm run build` PASS.
Böngésző (beépített pane, **ideiglenes, törölt útvonalon**, nem hitelesített workflow-E2E; nézetméretek 375×812, 812×375, 768×1024, 1440×900; sötét és világos a fő kitöltött/hiányos állapotra): mind a négy kapcsolókombináció, HAP nélkül „hiányzik: HAP”, hip → fallback üzenet, nincs túlcsordulás, érintési célok ≥ 44 px, a két állapotsor olvasható 375 px-en (képernyőkép).

## 6. Korlátok / megfigyelések
- Az „Ereszkiülés a lejtés irányában” mező a modellben vízszintes (síkvetületi) eltolás (a teszt 400 mm → 400 mm vízszintes); a felirat félreérthető, ezt nem módosítottam, szakmai döntés kell.
- Derékszelemen-csoport csak betöltéskor nyílik ki magától.
- Az előnézet szándékosan nem ad egyetlen általános metszetet a kiosztásfüggő formákra.
