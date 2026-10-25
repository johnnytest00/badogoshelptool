# TetőPro — Claude Code átadás

Ez rövid belépési pont; a kód és a lefuttatott bizonyíték az irányadó. A tervdokumentumok jövőbeli követelményt rögzíthetnek, nem bizonyítják a megvalósítást.

## Jelenlegi állapot

- A termék kalkulátor-központú (2026-10-25, M1–M7, `feat/m1-length-input` ág): Kalkulátor → mentett, immutable revízió → opcionális munkanapló-kapcsolás vagy ajánlatpiszkozat. A Felmérések kivezetve (új felmérés nem hozható létre, adat megmaradt). Terv és döntések: [`CALCULATOR_FIRST_PHASE0_AUDIT.md`](CALCULATOR_FIRST_PHASE0_AUDIT.md); friss állapot: [`PROGRESS.md`](PROGRESS.md). Az M1–M7 commitolva; a korábbi F9.73.1 munka nem commitolt.
- Az alkalmazás Next.js App Router, React, TypeScript és helyi Supabase-alapú adatmodell. Rétegek: `src/app/` route/kompozíció, `src/features/` alkalmazási folyamat, `src/domain/` keretrendszerfüggetlen szerződés és számítás, `src/infrastructure/` adapterek.
- Projektek, kalkulátorok, anyaglisták, ajánlatok és kivitelezési munkafolyamatok léteznek eltérő integrációs és mentési lefedettséggel. Az aktuális route- és adatfolyam-térkép: [`PROJECT_MAP.md`](PROJECT_MAP.md); rövid funkciótérkép: [`../funkciok.md`](../funkciok.md).
- A felmérési fotókat feltöltéskor Sharp újrakódolja, EXIF/GPS nélkül. A handler 10 MiB/fájl és 11 MiB/kérés korlátja implementált; a hosting ingress-védelme nincs igazolva.

## Nyitott kockázatok és következő lépések

- Nyitott döntések: 12/3 (tört mm), 12/4 (eredmény egysége), 12/11 (projekt-kalkulációk kapcsolhatósága).
- A szarufa-csomópontok tesztadata független kézi számítás; CAD- vagy szakemberi ellenőrzés még nincs. A talpszelemen szélessége nem bemenet.
- A belső felmérés-kód (szerkesztő, actionök, fotó-API) a helyén maradt; eltávolítása külön döntés. Hostolt adatbázison az M2–M5 migrációk nincsenek ellenőrizve.

## Fejlesztési határok

- A `PROJECT_BLUEPRINT.md` a jóváhagyott célterv, nem kész funkciólista. Ellenőrizd az aktuális kódot, migrációkat és az adott folyamat specifikációját.
- Ne találj ki ár-, gyártói, üzleti vagy szakmai adatot. Geometriai/mennyiségi eredmény nem statikai vagy gyártási igazolás.
- Tartós írásnál kövesd a meglévő actor/szervezet-ellenőrzést, RLS/RPC-határt, expected-version/idempotencia-szerződést és immutable revízió/snapshot mintát. Kliensből érkező szervezetazonosító önmagában nem jogosultság.
- Ne írj át történeti revíziót. Az F9.70 execution loader meglévő sémával validálja a snapshot JSON-t; ettől eltérő vagy hibás történeti shape kompatibilitása nyitott korlát.
- Hosted staging/production, cross-org Storage, mentés/helyreállítás, RPO/RTO, retention és szakmai/jogi pilot-elfogadás nincs igazolva. A részletes kapuk a [`PILOT_READINESS.md`](PILOT_READINESS.md)-ben vannak.

## Hol keresd a részleteket

- Projektutasítások és munkafolyamat: [`../AGENTS.md`](../AGENTS.md), [`../CLAUDE.md`](../CLAUDE.md)
- Adatbázis/RLS/migrációs szerződés: [`DATABASE.md`](DATABASE.md)
- Számítási szerződések: [`CALCULATION_ENGINE.md`](CALCULATION_ENGINE.md), [`ROOF_CALCULATION_SPECIFICATION.md`](ROOF_CALCULATION_SPECIFICATION.md)
- Önálló workflow-k és ajánlati PDF: [`STANDALONE_WORKFLOWS.md`](STANDALONE_WORKFLOWS.md), [`QUOTATION_FINALIZATION_DESIGN.md`](QUOTATION_FINALIZATION_DESIGN.md)
- Tesztfuttatási bizonyíték: [`TEST_MATRIX.md`](TEST_MATRIX.md); friss mérföldkő-bejegyzés: [`PROGRESS.md`](PROGRESS.md)
- Dokumentációs navigáció és történeti auditok: [`README.md`](README.md)

Ellenőrzésnél csak az érintett kapukat futtasd; célzott teszt nem teljes regresszió. Next.js-kód módosítása előtt olvasd el a telepített verzió megfelelő útmutatóját. Ne commitolj, pusholj, deployolj vagy futtass éles DB-migrációt külön kérés nélkül.
