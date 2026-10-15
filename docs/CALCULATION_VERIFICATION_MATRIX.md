# F9.14 számítás-ellenőrzési mátrix

Az ellenőrzés helyi, matematikai és szoftveres audit. Nem statikai méretezés,
gyártói megfelelőségi vizsgálat vagy szakmai tanúsítás. A referenciaadatok DEMO
adatok. Az újrafelhasználható, production függvényektől független tetőfixture-ek:
`src/domain/calculations/engineering-reference-fixtures.ts`.

## Tetőgeometria

Hossztűrés: `max(0,000001 mm; |várt| × 1e-10)`. Területtűrés:
`max(0,001 mm²; |várt| × 1e-10)`. A teszt a síkterületet külön 3D
vektorszorzatos háromszög-összeggel, a vetületet külön shoelace képlettel
ellenőrzi. Minden modell 3× hosszskálán is fut; az élek 3×, a területek 9×
értékre változnak.

| Modell | Támogatott referencia-tartomány | Független DEMO referencia (várt = tényleges) | Eredmény | Műszaki korlát |
| --- | --- | --- | --- | --- |
| Félnyeregtető | Téglalap, egy hajlás, 0° < hajlás < 80° | 10×6 m, 45°: 60 m² vetület; 84,852814 m² felület; 10 m eresz; 10 m felső él; 2×8,485281 m oromél | PASS | A külső kontúr a bemenet; rétegrend/statika nincs. |
| Nyeregtető | Szimmetrikus két sík; emelkedés vagy szög; explicit túlnyúlások | 10×6 m, 3 m emelkedés: 60 m²; 84,852814 m²; 20 m eresz; 10 m gerinc; 4×4,242641 m oromél | PASS | Aszimmetrikus sík nem támogatott. |
| Kontytető | `hossz > szélesség`, azonos hajlás | 10×6 m, 45°: 60 m²; 84,852814 m²; 4 m gerinc; 4×5,196152 m kontyél | PASS | Szimmetrikus konty; eltérő hajlás nincs. |
| Sátortető | Négyzet, azonos hajlás | 6×6 m, 45°: 36 m²; 50,911688 m²; 24 m eresz; 4×5,196152 m kontyél | PASS | Csak négyzetes, központi csúcs. |
| Félkontyos | `hossz > szélesség`; a félkonty elférési feltétele teljesül | 10×6 m, 45°, 1 m végmagasság: 60 m²; 84,852814 m²; 6 m gerinc; 4×3,464102 m kontyél | PASS | Szimmetrikus végek, azonos hajlás. |
| L alakú | Téglalap főtető + merőleges szárny, közös ereszszint/hajlás | 10×6 m + 4×5 m, 45°: 80 m²; 113,137085 m²; 17 m gerinc; 2×3,464102 m vápa | PASS | Paraméteres L; tetszőleges poligon nem támogatott. |
| T alakú | Középre helyezett merőleges szárny, közös ereszszint/hajlás | 10×6 m + 4×5 m, 45°: 80 m²; 113,137085 m²; 17 m gerinc; 2×3,464102 m vápa | PASS | Paraméteres T; eltolt/aszimmetrikus csatlakozás nincs. |

Minden sík egyszeres területet ad, önmetszés nélkül. A belső gerinc, konty és
vápa két síkhoz, a külső él egy síkhoz tartozik; az él mindkét végpontja a
deklarált szomszédos síkok határán van. A paraméteres sémák az önmetsző
szabadpoligont nem engedik bemenetként, a lehetetlen konty/félkonty/szárnyméretet
elutasítják.

## Fedés, eresz, szegély és profil

| Számítás | Támogatott bemenet | Független referencia (várt = tényleges) | Tűrés / eredmény | Korlát |
| --- | --- | --- | --- | --- |
| Trapézlemez | Csak két téglalap nyeregtetős sík; explicit névleges/hasznos méret | 10×6 m, 5 m ferde hossz, 1000 mm hasznos szélesség: 10 oszlop/sík, 20 db; 110 m² névleges terület | Egész darab, PASS | Takeoff csak egysoros, teljes hosszú layoutból; toldott eredmény nem adható át. |
| Cserepeslemez | Csak nyeregtető, egy teljes hosszú sor; igazolt hosszforrás | Ugyanez 1200/1000 mm és 5100/5000 mm fizikai/hasznos hosszal: 20 db; 122,4 m² névleges terület | `0,000001 mm`, PASS | Pozitív hosszanti toldás nem támogatott; moduladat explicit. |
| Eresz | Külön mért szakaszok és explicit szálhossz | 8500 + 8000 mm, 4000 mm szál: 3 + 2 = 5 szál | Egész darab, PASS | Nincs vágásoptimalizálás, automatikus összekötő vagy hidraulikai méretezés. |
| Szegély | Egész mm hossz, explicit szál- és kapcsolati adat | 3900 mm cél, 2000 mm szál, 100 mm átfedés: 2 szál, 1 kötés, 3900 mm kapacitás | Egész mm/db, PASS | Ismeretlen kapcsolatnál darabszám `null`; szerelés/gyárthatóság nincs igazolva. |
| Lemezprofil | Kész tangensméret; explicit BA vagy K | 30+40 mm, 90°, R=1 mm, t=1 mm, K=0,4: BA=`0,7π`, teríték `72,199115 mm` | numerikus `toBeCloseTo`, PASS | Ismeretlen BA/K: teríték és anyagterület `null`; külső csúcsméret nem támogatott. |

## Mennyiség, egység és forrásbiztonság

- A kanonikus hossz mm, terület mm², térfogat mm³; a m²/m³ átváltás explicit
  `10⁶`/`10⁹` osztóval történik. Nem véges és nem biztonságos egész kanonikus
  érték elutasított.
- Területkimutatás m², vonalas kimutatás mm → m, fedési darabjegyzék `piece`.
  Nincs implicit `piece`/`linear_meter`/`square_meter` átváltás.
- Az aggregáció legfeljebb hat tizedesjegyet BigInt mikroegységben összegez;
  eltérő egység, termék, méret vagy műszaki snapshot nem olvad össze.
- Csak kijelölt, jóváhagyott takeoff aggregálódik. A forrás calculation/revision
  megmarad, az eltérő current revision `stale`; hiányzó vagy vegyes ár nem kap
  kitalált egységárat.
- A fedési takeoff adapter a mentett input/output snapshotot újraszámolja;
  hamisított outputot, nem aktuális vagy nem támogatott layoutot elutasít.

## Auditmegállapítás

Igazolt P0/P1 hiba nem maradt és production számítási képlet nem változott.
A biztonsági szélsőértékek, az ismeretlen toldás/hajlítás, valamint a nem
támogatott fedési layoutok továbbra is mennyiség nélkül állnak meg. A
matematikai lefedettség nem helyettesíti a gyártói termékadatot, a vízelvezetési
méretezést, a statikát vagy a hajlítógép-próbát.
