# A1 — A rajzos munkamenet megőrzése és visszaállítása (VÉGLEGESÍTETT TERV)

**Verzió:** 0.2.0 · **Dátum:** 2026-11-04 · **Állapot:** JÓVÁHAGYOTT IRÁNY, implementáció még nem kezdődött.

A 0.1.0 javaslatát a felhasználó elfogadta: IndexedDB, **rajzbájtok tartós tárolása nélkül**, a meglévő v3 munkamenetsémával, SHA-256 visszakötéssel és egyszeri, kifejezett engedélyezéssel. Ez a verzió az öt véglegesítési pontot dolgozza be (2.–6. szakasz). Alkalmazáskód ebben a körben nem változott.

---

## 1. Kiindulás: mit őrzünk meg és mivel

A rajzos munka ma kizárólag a böngésző memóriájában él (`useDrawingDocument`): a betöltött forrás, a nézett oldal és a tetőszakaszok geometriája. Lapfrissítés, tabeldobás vagy egy bejövő hívás után mindez elvész; az egyetlen megőrzési út a kézi „Munkaállapot mentése" JSON-export.

**A formátumot nem kell kitalálni.** A `drawing-roof-work-session.ts` teljes, használható API-t ad:

| Függvény | Szerep a tárban |
|---|---|
| `createRoofWorkSessionJson(input, profiles)` | a tárolandó JSON előállítása — **ugyanaz**, amit az export ír fájlba |
| `parseRoofWorkSessionJson(json)` | beolvasás: zod-validáció és v1→v3 migráció |
| `rebindRoofWorkSessionSource(session, source)` | SHA-256 egyezés utáni visszakötés |

A tár ezért **vékony kulcs→string adapter**: ugyanazt a sztringet írja és ugyanazon a parseren olvassa vissza, amit a fájlexport és -import használ. **Nincs új séma, új validáció és duplikált v3 logika.** A payload mérete a séma saját `MAX_BYTES` (1 MB) és `MAX_SECTIONS` (30) korlátja alatt marad.

Tárolási felosztás, a meglévő precedenshez igazítva:

- **Engedély-kapcsoló → `localStorage`**, a többi beállítás (téma, méretezés, liquid glass) mellé. Ez *beállítás*, a precedens pontosan ezt engedi.
- **Munkamenet-tartalom → IndexedDB**, egyetlen object store. Nem blokkolja a fő szálat és nem szorítja ki a beállításokat.
- **A rajz bájtjai → sehol.** Visszatöltéskor a felhasználó újra kiválasztja a fájlt.

---

## 2. Mentési állapot — néma hiba nincs

A tárolás **soha nem feltétele a munkavégzésnek**, de a kimaradása soha nem maradhat rejtve.

Megjelenített állapotok, egyetlen diszkrét soron a rajzpanel műveletei mellett:

| Állapot | Szöveg (jelentés) | Megjelenés |
|---|---|---|
| `off` | „Ezen az eszközön nincs folytatás bekapcsolva." | halvány sor + bekapcsoló művelet |
| `saving` | „Mentés…" | halvány sor |
| `saved` | „Folytatható · *16:40*" | halvány sor |
| `blocked` | „Ezen az eszközön nem tárolható (privát ablak vagy letiltott tárhely). Használd a *Munkaállapot mentése* gombot." | **`.plan-alert-line is-error`** |
| `quota` | „Megtelt a helyi tárhely; ez a munka nem tárolódik. Mentsd le a munkaállapotot, vagy törölj régi helyi munkákat." | **`.plan-alert-line is-error`** + törlési művelet |
| `conflict` | lásd 6. szakasz | **`.plan-alert-line is-error`** |

Szabályok:

- A hibajelzés a **meglévő** `.plan-alert-line is-error` elem, ugyanaz, amit a `workSessionError` ma is használ — nincs új hibakezelési architektúra.
- Rutinmentésre **nincs toast**. A munkamenet első hibájánál egy `Notice` (`kind: "error"`) megy ki az `useAppInteraction.notify`-on keresztül, utána már csak a sor marad — nem zaklatjuk a felhasználót minden kísérletnél.
- A kézi **„Munkaállapot mentése"** minden hibaállapotban kiemelt kiútként jelenik meg. Mai feltétele (`workSessionSource && sections.length > 0`) változatlan: dokumentum nélkül nincs mit exportálni, és ilyenkor tárolni sincs mit.
- Minden írás és olvasás `try/catch`; kivétel nem buborékolhat a munkafolyamatba.

---

## 3. Felhasználói elkülönítés — izoláció adatvesztés nélkül

**Az IndexedDB nem biztonsági és nem titkosítási határ.** Az elkülönítés célja a véletlen összekeveredés és a kényelmetlen felfedés megelőzése, nem az eszközhöz hozzáférő személy elleni védelem. Ebből következik a két szabály:

1. **Minden rekord `userId` + `organizationId` szerint szűrve listázódik.** Más felhasználónak nem ajánljuk fel, nem mutatjuk a nevét, a fájlnevét és a korát.
2. **Fiókváltás önmagában nem töröl.** A 0.1.0 „eltérő tulajdonosnál töröljük" szabálya **visszavonva**: egy egyszerű ki- és visszajelentkezés nem okozhat visszavonhatatlan munkavesztést. A rekord megmarad, és a tulajdonosa újra bejelentkezve megtalálja.

Mivel így idegen rekord is maradhat az eszközön, három ellensúly:

- **A tartalom minimális** (nincs rajzbájt) — ez a fő védelem.
- **Lejárat** 7 nap inaktivitás után (4. szakasz), tulajdonostól függetlenül.
- **„Helyi munkamenetek törlése ezen az eszközön"** művelet, amely **felfedés nélkül töröl**: bárki futtathatja, de senki nem látja tőle más munkájának tartalmát. Ez a megosztott tablet valódi válasza.

---

## 4. Megőrzési idő — 7 nap inaktivitás

- Minden íráskor frissül az `updatedAt`. A **7 nap az utolsó írástól**, nem a létrehozástól számít; aktív munka nem jár le.
- A lejárat **beolvasáskor érvényesül** (lusta takarítás), nem időzítővel: így zárt tab és leállított alkalmazás mellett is működik. A panel megnyitásakor a lejárt rekordok előbb törlődnek, és csak utána áll össze a felajánlható lista.
- A lejárt rekord **nem kerül felajánlásra és nem állítható vissza** — törlődik, nem rejtve marad.
- Kézi törlés három helyen: a folytatási ajánlat **„Eldobom"** gombja, az **„Új kalkuláció"** megerősítése után, és a 3. szakasz eszközszintű törlése. Az engedély kikapcsolása azonnal törli a tár teljes tartalmát.
- A felajánlás mindig kiírja a kort („tegnap 16:40"), hogy a felhasználó lássa, mit folytat.

---

## 5. Visszaállítás — ellenőrizetlen bizonyíték nem aktiválódhat

A visszaállítás **pontosan ugyanazon a kapun** megy át, mint a fájlimport: `parseRoofWorkSessionJson` → `rebindRoofWorkSessionSource`. Egyetlen jóváhagyási út van, nem kettő.

A rekord betöltése után, amíg a felhasználó nem választotta ki újra a forrásrajzot és a SHA-256 nem egyezik (`restoredSourceMatch === "pending"`), **inaktív marad**:

- a tetőszakaszok rajzi kijelölése (a pontok nem jelennek meg bizonyítékként),
- a kalibráció (amely amúgy is `documentSha256` + `pageNumber` kötésű),
- a felirat–mérés összekapcsolás,
- a laponkénti rajztípus-válasz és a rajzi hatókör-megerősítés.

Eltérő rajznál (`different`) a szakaszok leválnak, a kalibráció nem használható — a meglévő viselkedés.

**Egyezés (`matched`) után sem tér vissza minden automatikusan.** A P3.5.1 szabálya változatlan: a `coverageConfirmed` **`false`-ra áll**, a fedettséget és a rajzi jóváhagyásokat a felhasználónak újra kell adnia. A visszaállított munka pontosan annyit ér, mint ma egy importált munkafájl — se többet. A mentési kapuk (`canSaveDrawingTakeoff`), a P3.2 átviteli védelmek és a provenance érintetlenek.

A felajánlás szövege kimondja, hogy a rajz nincs eltárolva: *„A tervrajzot újra ki kell választanod; a szakaszok és a lépték csak egyező rajznál állnak vissza."*

---

## 6. Több böngészőfül — frissebb munkamenetet nem írunk felül

Minden rekord egy monoton növekvő `seq` mezőt visz. A fül megjegyzi, melyik `seq`-et töltötte be vagy írta utoljára (ez a *bázisa*).

Írás menete **egyetlen IndexedDB `readwrite` tranzakción belül**:

1. a rekord újraolvasása,
2. ha a tárolt `seq` **nagyobb**, mint a fül bázisa → **az írás elmarad**,
3. különben írás `seq + 1`-gyel, és a fül bázisa erre frissül.

Az ellenőrzés és az írás ugyanabban a tranzakcióban van, ezért nincs versenyhelyzet.

Elmaradt írás esetén a mentési sor `conflict` állapotba megy: *„Ezt a munkát egy másik lapon frissebben mentették, ezért itt nem írunk felül. Mentsd le a munkaállapotot, vagy folytasd a másik lapon."* **Automatikus összefésülés nincs** — két szakaszlista egyesítése kitalált üzleti szabály lenne.

A rekord azonossága: `userId` + `organizationId` + a dokumentum `sha256`-a. Két fül ugyanazon a rajzon ütközhet; különböző rajzokon nem.

`BroadcastChannel` és tabok közti szinkron **nem része** a tervnek: a tranzakción belüli ellenőrzés a helyességi határ, a többi felesleges gépezet.

---

## 7. Megvalósítási hatókör

| Fájl | Változás |
|---|---|
| `src/infrastructure/drawings/roof-work-session-store.ts` | **új**, ~egy modul: `get` / `put` (seq-ellenőrzéssel) / `list` (lejárat-takarítással) / `remove` / `clearDevice`. Egyetlen object store, nincs általános keretrendszer. |
| `src/features/preferences/` | az engedély-kapcsoló a meglévő `localStorage`-mintával |
| `src/features/calculators/plan-field-transfer.tsx` | késleltetett automatikus mentés, folytatási ajánlat a panel üres állapotában, mentési állapotsor |
| `drawing-roof-work-session.ts` | **nem változik** |

Épít a meglévőkre: **T10** (a dokumentumállapot túléli a kalkulátorváltást — a tár ehhez az állapothoz kötődik), **T7** (a vezetett mezőbekérés változatlan), **P3.7** (a rajzos mód a kalkulátor kiválasztása utáni módválasztóból indul, így a folytatási ajánlat helye egyértelmű: a rajzos mód üres állapota).

### Amit a terv kizár

Szerveroldali tárolás, új tábla, RLS-policy vagy migráció · a rajz bájtjainak tartós tárolása · új munkamenet-formátum vagy a v3 séma bővítése · általános tárolási keretrendszer · automatikus összefésülés · a `coverageConfirmed` vagy bármely rajzi jóváhagyás automatikus visszaállítása · bármilyen változás a számításon, a mentési RPC-ken és a provenance-on.

---

## 8. Fennmaradó kockázatok

- **Az IndexedDB nem titkosított**, és fiókváltáskor szándékosan nem törlünk. A tárolt metaadat (szakasznevek, méretek) eszközhozzáféréssel olvasható. Ellensúly: nincs rajzbájt, 7 napos lejárat, eszközszintű törlés.
- **A felajánlás félreérthető lehet** („a rajz is megmaradt"); ezt a szövegnek kell egyértelművé tennie, és a `pending` állapot vizuálisan is jelzi.
- **A kvótaviselkedés eszközönként eltér.** A hibajelzés most már látható, de a megőrzés nem garantált — a kézi export marad a biztos út.
- **A visszaállítás feltételezi, hogy a felhasználó megtalálja ugyanazt a fájlt.** Törölt vagy átnevezett forrásnál a mezőértékek visszajönnek, a kijelölések és a lépték nem.
- **Nem mért:** valós IndexedDB-kvóták mobil böngészőkben és egy tipikus munkamenet-JSON tényleges mérete (a séma 1 MB-ot enged, a valós méret vélhetően jóval kisebb).

## 9. Következő lépés

A terv döntései lezártak. Az implementáció célzott: egy tárolóadapter, egy beolvasáskori lejárat- és tulajdonosszűrés, egy folytatási ajánlat és egy mentési állapotsor — új formátum és új hibakezelési architektúra nélkül. A munka tesztvezérelten indulhat: a `seq`-ütközés, a lejárat, a `pending` kapu és a hibaállapotok mind egységtesztelhetők a tárolóadapteren és a meglévő v3 parseren.
