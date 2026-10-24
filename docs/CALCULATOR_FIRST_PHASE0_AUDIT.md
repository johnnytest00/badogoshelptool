# Kalkulátor-központú átalakítás — 0. fázis előértékelés

**Dátum:** 2026-10-25 · **Típus:** csak olvasási audit; alkalmazáskód, adatbázis és UI nem változott.
**Jelölések:** **[B]** BIZONYÍTOTT (forráskódban/migrációban ellenőrizve) · **[T]** TERVEZETT · **[NE]** NEM ELLENŐRZÖTT · **[J]** JÓVÁHAGYÁST IGÉNYEL

Munkakörnyezet: `main`, a munkafában a F9.73.1 folyamatban lévő, nem commitolt execution/material-takeoff változásai vannak. Ezekhez nem nyúltam; az M3 (munkanapló) mérföldkő ugyanezeket a fájlokat érinti, ezért előtte ezt a munkát le kell zárni.

---

## 0. A Codex előzetes megállapításainak ellenőrzése

| Állítás | Eredmény |
|---|---|
| `standalone-persistence.ts` csak bizonyos típusokat ment | **[B]** Még szűkebb: csak `sheet-metal-profile` (`src/features/calculations/standalone-persistence.ts:4`). A trapézlemez, cserepeslemez és többsíkú tetőgeometria saját modullal ment (`src/features/roof-models/*-persistence.ts`, `multi-roof-actions.ts`). |
| A standalone ajánlatban van katalógusválasztás és anyaglista nélküli piszkozat | **[B]** `standalone-quotation-editor.tsx` (`WorkflowMaterialProductPicker`, árválasztás), `20261017130000_allow_unpriced_standalone_drafts.sql`. Korlát: csak **nettó** HUF ár fogadható el (`standalone-quotation-editor.tsx:242`). |
| `units.ts` hossz-alapegysége mm | **[B]**, de: (1) a UI sehol nem használja (csak `domain/math`, `domain/geometry`); (2) `mToMm` lebegőpontos szorzás után `Number.isSafeInteger`-t követel, ezért pl. `1.001 m` → `1000.9999…` → kivétel. 1–99,999 m közötti 3 tizedesű értékek közül **1472** így hibát dob (helyi `node` mérés). Beviteli konverzióra ebben a formában nem használható. |
| `roof.rafter-cut` és `roof-timber-layout` külön feladat | **[B]** `construction/roofs.ts:calculateRafterGeometry` (egy szarufa keresztmetszeti hossza) vs. `roof-timber-layout.ts:calculateRoofTimberLayout` (tetősík-kiosztás). Nincs közös kód. |
| `startInsetMm`/`endInsetMm` befolyásolja a kiosztást | **[B]** `roof-timber-layout.ts:positions()` — lásd 6. pont. |
| A kapcsolati adatmodell nem fedi az összes kívánt kapcsolatot | **[B]** `execution_plan_document_links.document_kind` csak `material_list`/`quotation`; standalone ajánlatsorban a `takeoffItemId` mindig `null`-ra íródik; kalkulációs forrás sehol nincs. |

Dokumentációs eltérés **[B]**: a `docs/PROJECT_MAP.md` még listázza a `/kalkulatorok/ereszcsatorna` és `/kalkulatorok/szegelyek` útvonalat; ezek a `src/app/kalkulatorok/` alatt már nem léteznek.

---

## 1. Kalkulátortípusok és képességek mátrixa

Két, egymástól független kalkulátorcsalád létezik **[B]**:

- **A) Construction suite** — `/kalkulatorok` (`construction-suite.tsx`), 31 katalógus-ID (`construction/catalog.ts`). Helyi előnézet: *„Nem mentődik ügyfélhez, projekthez, felméréshez, anyaglistához, munkanaplóhoz vagy ajánlathoz”* (`construction-suite.tsx`, `independentContent`).
- **B) Dedikált tetőfedés/profil kalkulátorok** — külön route-ok, mentéssel.

| Kalkulátor | Bemenet és egység | Belső egység | Domain | SVG | Mentés / újranyitás | Revízió | PDF/export | → Napló / Ajánlat |
|---|---|---|---|---|---|---|---|---|
| `roof.rafter-cut` | fél fesztáv, gerincemelkedés, ereszkiülés, madárszáj-magasság; mm, **tört mm megengedett** | mm | `construction/roofs.ts` | `construction-visuals.tsx` (rafter) | nincs | nincs | nincs | nincs |
| `roof.material-takeoff` | tetőforma, hossz/szélesség (egész mm), hajlás °, kiülések, faanyag-kiosztás (peremsávval), alátét/fedés spec | mm | `roof-geometry.ts`, `roof-material-takeoff.ts` | `TechnicalDrawing` | nincs (`createSpecSnapshot` → `persisted: false`) | nincs | nincs | nincs |
| `roof.timber-cutlist` | mint fent, csak faanyag | mm | `roof-timber-layout.ts` | `TechnicalDrawing` | nincs | nincs | nincs | nincs |
| `roof.truss-members` | fesztáv, magasság mm; osztás db | mm | `construction/roofs.ts` | truss | nincs | nincs | nincs | nincs |
| 16 lépcső (`stair.*`) | mm (41 mezőből 14 egész), db | mm | `construction/stairs.ts`, `winder-stairs.ts` | lépcsőrajz | nincs | nincs | nincs | nincs |
| 9 beton + `aux.diagonal` | mm, kg/m³ stb. | mm/mm³ | `construction/concrete.ts` | anyagrajz | nincs | nincs | nincs | nincs |
| Trapézlemez-fedés (`roof.gable.trapezoidal-covering`) | `/kalkulatorok/nyeregteto`; mm/m | mm | `gable-trapezoidal-covering.ts` | igen | **igen** (korlátozott writer) | igen | nincs saját PDF | anyaglista-tervezet (`create_gable_covering_takeoff_draft`) → ajánlat anyaglistán át |
| Többsíkú standalone geometria (`roof.geometry.*`) | `/nyeregteto` | mm | `roof-geometry.ts` | igen | **igen** (`save_standalone_roof_geometry_calculation`, operation-id idempotens, `p_actor_id` → szerveroldali író) | igen | nincs | felmérés-forrásként; közvetlen napló/ajánlat nincs |
| Cserepeslemez (`roof.gable.metal-tile-covering`) | `/cserepeslemez`; mm | mm | `gable-metal-tile-covering.ts` | igen | **igen**, `?revision=` újranyitás | igen | nincs | anyaglista-tervezet |
| Lemezprofil (`sheet-metal-profile`) | `/lemezprofilok`; mm | mm | `sheet-metal-profile.ts` | igen | **igen** (`save_standalone_profile_calculation`, expected revision; **nincs** operation-id ledger) | igen | nincs | anyaglista (`create_profile_takeoff_draft`) |
| Csatorna / szegély (régi) | UI eltávolítva (F9.59) | — | — | — | DB-típusok és rekordok megmaradtak | — | — | read-only kompatibilitás **[NE]** részletesen |

Közös hiány **[B]**: kalkulátor-PDF egyik típusnál sincs; PDF csak ajánlathoz és kivitelezési dokumentációhoz, CSV csak projekt-beszerzéshez van. Mentett lista: `/kalkulatorok/mentett` csak a trapéz-, cserepeslemez- és profiltípust listázza.

Standalone kalkuláció láthatósága **[B]**: `calculations_select_authorized` — standalone sort csak a létrehozó lát (`20261014010000`). Ez a munkanapló-kapcsolásnál döntést igényel (12/6).

---

## 2. Meglévő adatfolyamok

**[B]** a migrációk és actionök alapján:

```
Construction suite ──(nincs perzisztencia)──▶ csak képernyő

Dedikált kalkulátor ─save RPC─▶ calculations + calculation_revisions (immutable)
        └─create_*_takeoff_draft─▶ material_takeoffs ─▶ material_preparation_lists ─▶ standalone ajánlat (source_line_map)

Felmérés ─save_field_survey(_workspace)─▶ field_surveys + field_survey_revisions (immutable)
   ├─link_field_survey_calculation ─▶ kalkuláció (pontos revízió)
   ├─save_workflow_material_list_from_survey_revision ─▶ anyaglista
   ├─createSurveyFollowups ─▶ projekt / ajánlat
   ├─create_execution_plan_from_survey ─▶ execution_plans + field_survey_execution_plan_links (immutable, pontos survey_revision_id)
   └─fotók: privát Storage, signed URL

Munkanapló ─link_execution_plan_document─▶ önálló anyaglista | önálló ajánlat (visszavonható, request_key idempotens)
Ajánlat (standalone) ─ kézi sor | katalógus változat + árverzió | anyaglista-revízió sora | munkadíj-szabály
```

- `execution_plans.project_id` nullable (`20261016120000`) — projekt nélküli munkanapló **[B]**.
- `create_execution_plan_from_survey` atomikusan hoz létre tervet és pontos revízió-kapcsolatot — közvetlen minta a kalkulációs változathoz **[B]**.
- Ajánlat pénzügy: `numeric`, soronkénti kerekítés, nettó/bruttó vegyesen tiltott, ÁFA nincs számolva; standalone UI csak nettót enged **[B]**.

---

## 3. Az új termékmodellhez szükséges tényleges módosítások

1. **Construction suite mentése** — ma a fő kalkulátorok egyike sem menthető; ez az egész átalakítás kritikus útja. **[B]** hiány / **[T]** megoldás.
2. **Hosszbevitel mm/cm/m** — ma minden hosszmező fix mm (UI-ban sehol nincs cm). **[B]**
3. **Kalkulációs revízió → munkanapló kapcsolat** — nincs adatmodell. **[B]**
4. **Kalkulációs revízió → ajánlat forrás** — nincs adatmodell; ajánlat ma kézi/katalógus/anyaglista-forrású. **[B]**
5. **Navigáció** — dashboardon a Kalkulátorok az utolsó, a Felmérések az első; mobil alsó sávban Felmérések van, Ajánlatok nincs (`dashboard.data.ts`, `app-navigation-links.tsx:mobileIds`). **[B]**
6. **Felmérés-létrehozás lezárása** UI-ban (`/felmeresek/uj`, dashboard-indító, draft-értesítő) és szerveren (`saveFieldSurveyAction` `surveyId=null` ág, `save_field_survey*` RPC új rekord ága). **[B]** belépési pontok.
7. **Peremsáv és szarufa-csomópontok** — szakmai döntés után. **[J]**

Nem szükséges **[B]**: anyaglista-kötelezettség megszüntetése (az ajánlat már ma is készíthető anyaglista nélkül), új katalógusválasztó (meglévő újrahasznosítható), projekt/tetőmodell-függőség oldása a fenti kalkulátoroknál (egyik sem követeli).

---

## 4. Újrahasznosítható modulok

| Cél | Modul |
|---|---|
| Számítás | Minden `src/domain/calculations/**` motor változatlanul; suite-definíciók (`*-calculator-definitions.ts`) `calculate()` függvénye szerveroldali újraszámításra is jó. |
| Mentés minta | `save_standalone_roof_geometry_calculation` + `standalone_roof_geometry_save_operations` (operation-id idempotencia, expected revision, szerveroldali író `p_actor_id`-vel); `standalone-data.ts` lista/olvasás. |
| Napló-kapcsolat | `execution_plan_document_links` + `link_/unlink_execution_plan_document`; `create_execution_plan_from_survey` atomikus minta; `execution-plan-document-links.tsx` UI. |
| Ajánlat | `save_standalone_quotation_draft(_with_document)`, `validateStandaloneLines`, `WorkflowMaterialProductPicker`, `price-options-panel`, `labor-rate-*`, `standalone-quotation-pdf.ts`. |
| Egységbevitel | `domain/field-surveys/quick-gable.ts:quickLengthMm` — toleranciás egész-mm kerekítés hibajelzéssel (a drift-mentes konverzió mintája); felmérés mm/m egységválasztó (`field-survey-editor.tsx:668`). |
| UI | `GlassDisclosure`, `GlassPageHeader`, `Notice`, `GuardedLink`, téma/skálázás providerek. |

---

## 5. Megőrzendő történeti adatkapcsolatok **[B]**

- `field_surveys`, `field_survey_revisions`, fotók (Storage + metaadat), `field_survey_execution_plan_links`, `field_survey_roof_geometry_sources`, survey→kalkuláció és survey→anyaglista források, `roofTimberParameters` (benne `rafterStartInsetMm`…) a szakasz-snapshotokban és a `private.valid_field_survey_sections` fehérlistájában.
- `calculation_revisions` input/output snapshotjai; régi csatorna/szegély kalkulációk.
- `material_preparation_lists` + revíziók, `quotation_*` forrás-/ár-/munkadíj-snapshotok, `execution_plan_document_links` audit-bélyegek.
- Olvasási szerződések: `/felmeresek/[surveyId]`, `execution-linked-surveys.tsx`, F9.70.1 kompatibilitási réteg, `tetopro-survey:*` localStorage draftok.

Egyik sem törölhető vagy írható át; a validátorfüggvényekből mező nem vehető ki (régi snapshot érvényessége).

---

## 6. A peremsáv eltávolításának hatása

**Hol van [B]:** kizárólag a `roof-timber-layout` családban — `material-spec-editor.tsx:81` (suite `roof.material-takeoff`, `roof.timber-cutlist`), `roof-timber-quantity-panel.tsx` (projekt tetőmodell), felmérési szakasz `roofTimberParameters`. A `roof.rafter-cut`-ban nincs.

**Algoritmus [B]** (`positions()`): egy tetősík-csoport gerinccel párhuzamos kiterjedése `[min, max]`;
`span = (max − endInset) − (min + startInset)`, `n = ceil(span / maxSpacing)` köz, `n + 1` szarufa, tényleges osztás `span / n`.
A sík határa **tartalmazza a homlokzati kiülést** (`roof-geometry.ts:175–176`: `−frontGableOverhangMm … L + rearGableOverhangMm`). 0 peremsávnál tehát a szélső szarufa a kiülés külső élén áll.

**Példa** (épülethossz 9 600 mm, 2 × 200 mm homlokzati kiülés → W = 10 000 mm; legnagyobb osztás 900 mm; szarufa-szélesség 75 mm):

| Változat | Szabály | Span | Darab | Tényleges osztás | Következmény |
|---|---|---|---|---|---|
| A | peremsáv = 0 (fix) | 10 000 | 13 | 833,3 | szélső szarufa a kiülés élén; hagyományos kinyúló szelemenes megoldásnak felelhet meg |
| B | peremsáv = homlokzati kiülés (meglévő mezőből) | 9 600 | 12 | 872,7 | szélső szarufa az oromfal síkjában; a kiülést más elem hordja (nem számolt) |
| C | peremsáv = szarufa-szélesség / 2 | 9 925 | 13 | 827,1 | szarufa külső síkja a sík élével egy vonalban; keresztmetszet kell hozzá |
| D | mező marad „Részletes · opcionális” alatt, alapértelmezés A/B/C | — | — | — | nincs kötelező bevitel, kivételes esetre megmarad |

Hatás: darabszám (±1/sík), tényleges osztás, rajz pozíciók, vágáslista, térfogat változik. Mentett suite-kalkuláció nincs (nem menthető), tehát ott nincs regresszió; a felmérési snapshotokban a mezők maradnak, olvasáskor az eredeti értékkel kell újraszámolni. Referencia: a Zhitov-féle `roof2` is szélső távolsággal és `floor`-ral számol (`docs/ZHITOV_PARITY_GAP_REPORT.md`), a mi motorunk `ceil`-lel (osztás ≤ maximum) — ez szándékos, nem hiba **[B]**.

A léc (`battenStart/EndInsetMm`, eresztől/gerinctől) ugyanebben a sémában van; külön döntés, hogy az is kikerüljön-e **[J]**.

---

## 7. A három szarufacsatlakozás hiányzó paraméterei

Jelenlegi `roof.rafter-cut` **[B]**: `α = atan2(rise − seatCut, halfSpan)`, test = `hypot(halfSpan, rise − seatCut)`, eresz = `eave / cos α`, függővágás a tengelyhez `90° − α`. Keresztmetszet nem input. **[J]** A modellben a madárszáj-magasság a hajlásszöget is módosítja; ez a mérési vonal (felső él vs. zsinórvonal) konvenciójától függ, és a 8.2-es munka előtt tisztázandó.

| Csomópont | A. biztosan számítható (meglévő adatból) | B. számítható, ha megadják | C. hiányzó kötelező bemenet | D. statikai/szakemberi |
|---|---|---|---|---|
| Alsó felfekvés (talpszelemen/koszorú) | függő- és vízszintes vágás szöge (90°−α, α) | vízszintes ülékhossz és függő magasság adott bevágási mélységből; felfekvési pont helye | szarufa-magasság h; talpszelemen keresztmetszet és vízszintes helye (külső sík vagy tengely); mérési referenciavonal; bevágás mélysége (felhasználói érték) | megengedett bevágási mélység, keresztmetszet-gyengítés |
| Közbenső (derékszelemen) | — | felfekvési pont távolsága a szarufa mentén; bevágás-geometria adott mélységgel | szelemen vízszintes helye (eresztől vagy gerinctől), felső síkjának magassága, keresztmetszete; bevágás vagy alátétezés | szelemen és szarufa méretezése, bevágás megengedhetősége, dúc/kakasülő |
| Felső (gerinc) | szembefutó szarufáknál függővágás 90°−α | gerincdeszka/gerincszelemen esetén a futás csökkenése t/2 → hosszcsökkenés (t/2)/cos α | csatlakozás típusa (szembefutó / gerincdeszka / gerincszelemen bevágással), t vagy szelemenméret | gerincszelemen bevágása, kapcsolóelemek |

Minden képlethez független kézi/CAD tesztadat kell, és a táblázat, a rajz és a képlet közös geometriai kimenetből készüljön. Bevágási mélységet, megengedett gyengítést vagy kivitelezési jóváhagyást a rendszer nem számol és nem javasol. **[J]**

---

## 8. mm-kanonikus, cm-alapértelmezésű egységrendszer [T]

1. **Domain:** új `src/domain/measurements/length-input.ts`: `parseLengthInput(text, unit, { integerMm, minMm, maxMm })` → `{ mm } | { error }`, és `formatLength(mm, unit)`.
   - Elfogadja a `,` és `.` tizedesjelet; üres → `null` (nem 0); a köztes szerkesztési állapot (`"12,"`) nem hibát, hanem „hiányos” állapotot ad.
   - Konverzió decimális sztringből, nem `value * 1000` lebegőpontosan (vagy a `quickLengthMm` toleranciás kerekítése); így `1,001 m = 1001 mm` hibamentes.
   - Egész-mm mezőnél tört mm-t **hibával elutasít**, nem kerekít csendben (pl. `12,34 cm`).
   - A `units.ts` `mToMm`/`cmToMm` hibáját (0. pont) e körben dokumentálni és a domainben javítani kell, vagy az új modul kerüli.
2. **UI:** egyetlen közös `LengthField` (szöveg + mm/cm/m szegmentált választó, min. 44 px érintési cél). Állapot: `{ text, unit }`; a kanonikus érték mindig mm. Egységváltáskor az érvényes mm-értéket formázzuk az új egységbe (mm → cm/m tizedes eltolás, pontos); érvénytelen szövegnél a váltás nem ír át adatot.
3. **Bekötés:** a suite `Field` típusa már hordozza a `unit: "mm"` jelölést — ezek a mezők automatikusan `LengthField`-et kapnak; °, db, %, m², m³, kg, Ft mezők változatlanok. Utána: `material-spec-editor` kiosztás, tetőmodell- és fedésűrlapok, profil-szerkesztő.
4. **Pontosság [J]:** egész mm: tetőforma, faanyag-kiosztás, felmérés (meglévő szerződés). Tört mm ma megengedett a rafter/stair/concrete motorokban — javaslat: 0,1 mm a cm egy tizedese, ennél finomabb bevitelt elutasítani.
5. **Mentés/újranyitás:** csak kanonikus mm kerül az input snapshotba; a megjelenítési egység opcionális UI-metaadat, a számítást nem befolyásolja. Régi snapshotok változatlanok.
6. **Kimenet:** eredmény- és rajzfeliratok egységesen; a cm/m megjelenítési mód külön kis döntés (alapértelmezés: kimenet marad mm + m összegeknél).
7. Egységpreferencia tartós mentése nem része e körnek.

---

## 9. Az Anyaglista opcionális megtartásának következményei

- **[B]** Az ajánlat már ma is készülhet anyaglista nélkül; rejtett anyaglista-létrehozás nincs a standalone ajánlat útvonalán.
- **[B]** A dedikált fedés/profil kalkulátoroktól az ajánlatig ma csak az anyaglista visz út. Az M4 a kalkulációs revíziót közvetlen forrássá teszi; az anyaglista-út párhuzamosan marad.
- Kockázat: két út ugyanahhoz a mennyiséghez — a felületen a forrás típusát mindig jelölni kell (kalkuláció / anyaglista / kézi / katalógus).
- A meglévő anyaglisták, revíziók, `source_line_map` és munkanapló-kapcsolatok érintetlenek; végleges kivezetés külön döntés **[J]**.

---

## 10. Migrációk és biztonsági ellenőrzések terve [T]

Mind additív, csak helyi DB-n, pgTAP-pal; hosted alkalmazás nincs.

| Mérföldkő | Migráció | Biztonsági követelmény | Teszt |
|---|---|---|---|
| M2 | `save_standalone_construction_calculation` + `standalone_construction_save_operations`; `calculator_type` fehérlista (`construction.<catalogId>`) | szerveroldali író (`p_actor_id`, authenticated EXECUTE visszavonva) — a kimenetet a szerver számolja újra, kliens nem küldhet hamis outputot; org-tagság, expected revision, operation-id idempotencia | pgTAP: kereszt-org, más creator, stale, retry azonos/eltérő payload, immutabilitás |
| M3 | `execution_plan_document_links`: `document_kind` + `calculation`, `calculation_id`, `calculation_revision_id`, összetett FK `(calculation_revision_id, calculation_id)` és `(calculation_id, organization_id)`; aktív egyediség per terv+revízió; link/unlink RPC és read policy újradefiniálása; `create_execution_plan_from_calculation` atomikus RPC | idegen org / más creator kalkulációja nem kapcsolható; a kalkuláció nem módosul; request_key idempotencia; törlés tiltva | meglévő `040` pgTAP regresszió + új esetek |
| M4 | standalone ajánlat: kalkulációs forrás (fej: `calculation_revision_id`; sor: forrás-kulcs + ellenőrzött mennyiség/egység), DB oldali egyezés-ellenőrzés az output snapshottal | csak létező, saját, azonos org revízió; mennyiség/egység snapshot változtathatatlan; katalógus-törzsadat nem íródik | pgTAP + `018` regresszió |
| M6 | felmérés-létrehozás tiltása: `field_surveys` BEFORE INSERT trigger (vagy az RPC új-rekord ágának tiltása) | meglévő rekordok olvasása/jogosultsága változatlan | pgTAP `023`–`055` releváns regresszió |

---

## 11. Javasolt mérföldkövek (függőségi sorrendben)

A javasolt sorrend eltér a briefben szereplőtől: az egységbevitel előrébb kerül, mert DB nélküli, alacsony kockázatú, és a mentett inputot már kanonikus formában adja; az „Anyagkezelő-integráció” beolvad az M4-be, mert a választó és az árverzió már létezik.

### M1 — Egységes hosszbevitel (cm alapértelmezés, mm/cm/m)
- **Fájlok:** új `src/domain/measurements/length-input.ts` (+teszt), `src/components/ui/length-field.tsx`, `construction-suite.tsx` `renderField`, `construction-calculator-types.ts`, `material-spec-editor.tsx`; második körben `roof-models/*-form.tsx`, `sheet-metal/profile-editor.tsx`.
- **Teszt:** parser-tábla (vessző/pont, üres, köztes, negatív, 0, max, 1,001 m, 12,34 cm egész-mm mezőn), oda-vissza váltás driftmentesség (property-szerű ciklus), suite eredményparitás mm-bevitelhez képest; mobil böngészős ellenőrzés.
- **Elfogadás:** azonos fizikai méret minden egységben, azonos eredmény; nem lineáris mezőn nincs választó.
- **Kockázat:** alacsony; DB nincs.

### M2 — Construction suite mentése, újranyitása, revíziói
- **Fájlok:** `standalone-persistence.ts` bővítése vagy párhuzamos `construction-persistence.ts`; új server action; `construction-suite.tsx` mentés-sáv (mentetlen / mentett rev. N / ütközés); `/kalkulatorok/mentett` lista; migráció (10. pont).
- **Domain:** a definíciók `calculate()` kimenete szerveren újraszámolva kerül a revízióba; input snapshot kanonikus mm.
- **Elfogadás:** mentés nélkül számol; mentés után újranyitva azonos input és eredmény; stale/ütközés kezelt; idempotens retry.
- **Függőség:** M1 (ajánlott), **[J]** 12/7 hatókör.

### M3 — Kalkuláció → Munkanapló
- **Fájlok:** `execution-document-link-actions.ts`, `execution-document-links.ts`, `execution-plan-document-links.tsx`, `execution-plan-link-control.tsx`, kalkulátor-eredmény akciósáv; migráció.
- **Elfogadás:** új napló kalkulációból / meglévőhöz kapcsolás; pontos revízió látszik; több naplóhoz kapcsolható; dupla kattintás nem duplikál; részleges hiba nem hagy árva tervet (atomikus RPC).
- **Függőség:** M2; a folyamatban lévő F9.73.1 lezárása; **[J]** 12/6.

### M4 — Kalkuláció → Árajánlat (+ közvetlen anyagkezelő)
- **Fájlok:** `standalone-quotation-actions.ts`, `standalone-quotation-editor.tsx`, `src/domain/quotations/standalone.ts`, `/ajanlatok/uj/page.tsx`; migráció.
- **Domain:** csak a kalkulátor által „igazolt” besorolású mennyiség (pl. vágáslista hossz/db) kerülhet mennyiségként sorba; geometriai terület tájékoztató; termék, változat, árforrás felhasználói választás; hiányzó ár „hiányzó” marad.
- **Elfogadás:** ajánlatpiszkozat napló és anyaglista nélkül; történeti ár/mennyiség/forrás változatlan katalógusváltozáskor; PDF-előnézet forrásjelöléssel.
- **Függőség:** M2; **[J]** 12/8, 12/9.

### M5 — Felmérések aktív workflow-jának kivezetése, kalkulátor-központú navigáció
- **Fájlok:** `dashboard.data.ts` (sorrend, Felmérések ki), `app-navigation-links.tsx` (`mobileIds`), `dashboard.tsx`, `survey-draft-notice.tsx`, `/felmeresek/uj` → átirányítás, `/felmeresek` és `[surveyId]` read-only, `saveFieldSurveyAction` új-rekord ág tiltása, migráció.
- **Elfogadás:** új felmérés sehonnan nem indítható (UI + szerver + DB); régi felmérés, fotó, PDF/kapcsolat olvasható; deep link működik.
- **Függőség:** M2–M4 (előbb legyen meg a kalkulátoros alternatíva); **[J]** 12/5.

### M6 — Peremsáv-szabály és szarufa-csomópontok
- Csak a 12/1–12/2 döntések és ellenőrzött tesztadatok után. Peremsáv: `roof-timber-layout.ts` szabály + mezők elrejtése, a séma régi mezői olvashatók maradnak. Csomópontok: új, a `rafter-cut`-tól elválasztott vagy azt bővítő domain függvény A/B/C/D besorolású kimenettel, közös geometria a táblázathoz és az SVG-hez.

### M7 — Integráció, teljes munkafolyamat, mobil UI, dokumentáció
- Lint, typecheck, teljes Vitest, izolált build, releváns pgTAP, mobil/tablet/desktop böngészőellenőrzés; `PROJECT_MAP.md`, `DATABASE.md`, `funkciok.md`, `CLAUDE_HANDOFF.md` célzott frissítése.

---

## 12. Csak felhasználói vagy szakemberi döntéssel feloldható kérdések [J]

1. **Peremsáv szabály** (6. pont): A / B / C / D? A léc peremsávjára is vonatkozik?
2. **Szarufa-csomópontok konvenciója:** mérési referenciavonal, a madárszáj hajlásra gyakorolt hatása, mely tetőtípusok, gerinc-csatlakozás típusai; ki adja az ellenőrzött tesztadatokat?
3. **Tört mm:** a suite-ben 0,1 mm-es határ elfogadható, vagy mindenhol egész mm?
4. **Kimeneti egység:** az eredmények is kövessék a választott egységet, vagy maradjanak mm/m-ben?
5. **Meglévő felmérés-draftok és utókövetések:** a régi, még nem lezárt felmérés szerkeszthető maradjon, vagy azonnal read-only? A meglévő felmérésből indítható napló/ajánlat/anyaglista megmaradjon?
6. **Láthatóság:** a standalone kalkuláció ma csak a létrehozónak látszik, a munkanapló viszont szervezeti. Kapcsoláskor a többi tag lássa a kalkulációs snapshotot?
7. **M2 hatókör:** mind a 31 suite-kalkulátor menthető legyen, vagy első körben csak a tetős (4) + a leggyakoribbak?
8. **Igazolt mennyiség ajánlathoz:** pontosan mely eredménysorok vihetők át mennyiségként (pl. vágáslista hossz/db igen, tetőfelület m² csak tájékoztató)?
9. **Bruttó ár:** a standalone ajánlat maradjon csak nettó (mai szabály), vagy kell bruttó/ÁFA kezelés? Utóbbi új pénzügyi szabály.
10. **Mobil alsó sáv öt eleme:** javaslat: Műhely, Kalkulátorok, Munkanaplók, Árajánlatok, Anyaglisták.
11. **Projekt-hatókörű kalkulációk** (projekt tetőmodell alatti mentések) is kapcsolhatók legyenek naplóhoz/ajánlathoz, vagy csak a standalone-ok?

---

## Ellenőrzési bizonyíték és korlátok

- Futtatott: célzott fájlolvasás és `grep` a felsorolt útvonalakon és mind a 113 migráción; `node` mérés a lebegőpontos konverzióról. Teszt, lint, typecheck, build, DB és böngésző **nem futott** (nem volt kódváltozás).
- **[NE]:** hosted séma és RLS; a régi csatorna/szegély rekordok read-only útvonalának részletei; a profil- és fedésszerkesztők mezőnkénti tört-mm szabályai; a `quotation_*` PDF forrásjelölésének mostani tartalma.
- Next.js útmutatót nem olvastam, mert nem írtam Next.js kódot; az M1-től kezdve minden implementáció előtt kötelező.
