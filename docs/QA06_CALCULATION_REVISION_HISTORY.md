# QA-06 — Kalkulációs revíziótörténet és lapozás

**Dátum:** 2026-10-25  
**Státusz:** COMPLETE a QA-06 célzott mérföldkőre

## Gyökérok

`getConstructionCalculation` a `calculation_revisions` lekérdezést 50 sor után lezárta, a `ConstructionSavePanel` pedig kizárólag a kapott tömbből építette a revízióválasztót. A történeti snapshotok az adatbázisban megmaradtak, de V51 és régebbi nem volt kiválasztható.

## Javítás

- Az első lekérdezés stabilan `revision_number DESC, id DESC` sorrendben, 51 sort kér; a kliens 50-et jelenít meg, a plusz sorból megállapítható, hogy van-e további oldal.
- A „Régebbi revíziók betöltése” szerver action 50-es oldalakat kér `revision_number < cursor` feltétellel. A lapok összefűzése rekordazonosítóval deduplikál, majd verziószám szerint rendez.
- Minden lap szervezet- és kalkulációazonosító szerint szűrt; az action inputja UUID- és pozitív kurzor-ellenőrzést kap.
- A kiválasztott snapshotot a meglévő immutable input/output adatokból nyitja meg; a betöltés nem ír adatbázist és nem számolja újra a történeti eredményt.
- A direkt revízióforrás-olvasás (`getConstructionRevision`) nem függ az első 50-es listától, így egy régebbi ajánlati forrás is pontos ID alapján tölthető.
- A mentetlen draft, dirty-összehasonlítás, inkompatibilis régi mező és QA-04 teljességi/downstream guard változatlan maradt. A lapozási async válasz csak az aktuális kalkulációhoz és kéréshez alkalmazható.

## Bizonyíték és ellenőrzési terv

A célzott tesztek lefedik a 0/1/49/50/51/125 revíziós állapotot, az első–köztes–legfrissebb sorrendet, azonos időbélyeget, lapok közötti hézagmentességet és deduplikációt, szervezeti/kalkulációs szűrést, direkt V125 elérést, jogosulatlan ID-t, inkompatibilis történeti inputot és a szerver action hibahatárait. A panelteszt a régebbi oldal vezérlőjét és az aktuális V50 jelölését ellenőrzi.

Futtatott bizonyíték: célzott adat/action/panel **21/21 PASS**; teljes Vitest **182 fájl PASS, 8 SKIP; 1098 PASS, 19 SKIP teszt**; `npm run lint` PASS; `npm run typecheck` PASS; izolált Next 16.4.2 webpack build PASS; teljes helyi pgTAP **61 fájl / 1292 PASS**; `git diff --check` PASS.

## Adatbiztonság és teljesítmény

Nem változott séma, RLS-policy, migráció, snapshot vagy formula. A lekérdezés az eddigi legfeljebb 50 teljes snapshot helyett kezdetben 51-et kér a „van-e még” jelzéshez; 50-nél több történet csak explicit felhasználói műveletre indít további 51-soros oldallekérdezést. Metaadat-only lista nem került bevezetésre, mert a meglévő választó és történeti megnyitás teljes snapshotot használ; ezzel a módosítás a jelenlegi szerződés legkisebb bővítése marad.

## Böngésző és korlátok

A panel mobilbarát, teljes szélességű másodlagos gombot, betöltési és hibaállapotot ad. Ebben a körben nem futott hitelesített browser E2E: nem volt futó helyi fejlesztői szerver és 51/125-ös tartós fixture, ezért élő UI-átkattintást és valódi hálózati payload-mérést nem állítok bizonyítottnak. Hostolt RLS- és production mérés külön szükséges, ha ilyen környezet rendelkezésre áll.

**Javasolt Conventional Commit:** `fix(QA-06): paginate complete calculation revision history`
