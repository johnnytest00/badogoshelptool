# F9.69 — Biztonságos fotófeltöltési határ és erőforrás-védelem

## Státusz

**IMPLEMENTÁLVA — az alkalmazás multipart parser előtti kerete tesztelt; a hoszt/ingress korlátja továbbra sem igazolt.** Ez az eredmény az alkalmazáson belüli, kérésenkénti méretkorlátot bizonyítja, nem a teljes hálózati vagy konkurens erőforrás-védelmet.

## A tényleges kérésút és a határok

1. A `src/features/field-surveys/field-survey-photos.tsx` `FormData`-t küld: szervezet, idempotencia-kulcs, várt felmérésverzió, leírás és egy kép. A kliens és a domain validátora képenként `10 * 1024 * 1024` bájtot enged; a soros feltöltés és meglévő újrapróbálás megmaradt.
2. **Hosting/ingress:** a repositoryban nincs Vercel, Netlify, Cloudflare Workers, Fly, Render, Railway, Docker vagy más telepítési konfiguráció, és a `docs/PILOT_READINESS.md` a hosted környezetet nem igazoltnak jelöli. A bejövő payload Next.js előtti korlátja és annak parser előtti érvényesülése **NINCS IGAZOLVA**. Vercel-célzásra sincs bizonyíték, így annak payload-limitjét nem alkalmaztam a termékszerződésre.
3. **Next.js:** a fotó endpoint App Router Route Handler. A route nem állít be külön `runtime`-ot; a projektben Next.js 16.4.2 van, amelynek telepített `runtime` útmutatója a Node.js runtime-ot jelöli alapértelmezettnek. A handler standard Web `Request`/`Response` API-kat és `Request.formData()`-t használó keretrendszerre épül. A dokumentált `serverActions.bodySizeLimit` Server Action konfiguráció; ez az endpoint nem Server Action, ezért nem tekintettem a védelme részének.
4. **Route Handler:** a route először hitelesít; ezután ellenőrzi a multipart Content-Type-ot és a bejelentett Content-Length-et. A teljes body-t olvasható streamből, bájtonként számlálva legfeljebb **11 MiB**-ig gyűjti össze. A Content-Length csak gyors, nagyobb értékű elutasítás: hiányzó vagy kisebb érték esetén is a stream számlálása dönt. Túllépéskor a route lemondja az olvasást, **413**-at ad, és nem indít multipart parse-t.
5. A 11 MiB-os összkérés-határ a jelenlegi **10 MiB-os fájlmaximumot** és legfeljebb **1 MiB** együttes mező-/multipart-többletet hagyja meg. Így a több rész, extra fájl vagy szokatlanul nagy mező is ugyanabba az összegkorlátba esik. Az összefűzött body buffer a multipart parse után kikerül a lokális scope-ból.
6. A korláton belüli kérés parseren megy át; utána a route ellenőrzi a kötelező mezőket, a szervezeti tagságot, a 10 MiB-os fájlméretet, a MIME- és magic-byte egyezést, majd az image normalizáló 40 megapixeles korlátját és a kimeneti méretet. A `reserveFieldSurveyPhoto` csak ezután fut; ezt követi a privát Storage feltöltés és az `attachFieldSurveyPhoto`. A retry/idempotencia és felmérésverzió-szerződés változatlan.

## Döntés és viselkedés

- A repository alapján nem választható platform-specifikus ingress-konfiguráció: az eredeti incidens alkalmazásszinten javítható volt, ezért nem vettem fel függőséget és nem írtam át a tárolási architektúrát.
- **Előtte:** a `request.formData()` a teljes, korlátlan body-t parse-olta; a 10 MiB-os fájlellenőrzés csak utána történt.
- **Utána:** a parser legfeljebb 11 MiB body-t kaphat. A hiányzó vagy alámondott Content-Length nem kerüli meg a stream-számlálást. A Content-Type hiba 400; a testált túlméretes kérés és fájl 413; az auth hiba 401, az idegen szervezet 403.
- A parser előtti 11 MiB túllépés, a multipart hiba, az engedélyezett típuson kívüli fejléctípus, a túllépett fájlméret és a tagsághiba esetén nincs reservation, Storage-írás vagy attach. DB, RLS, történeti revízió és Storage-policy nem változott.
- A platform-limitet a hosted kontroll tulajdonosának kell megerősítenie: a 10 MiB-os fájlszerződés megtartásához az ingressnek a teljes multipart kérésből legalább 11 MiB-ot át kell engednie (plusz az esetleges platformon kívüli protokoll/fejléc korlátok). Ha a választott hoszt ennél kisebb payloadot enged, a 10 MiB-os fájl és a jelenlegi szerveroldali szerződés nem kompatibilis; platformdöntés kell, mielőtt kisebb fájllimitet vagy közvetlen Storage feltöltést választunk.

## Kockázat és ellenőrzési korlát

- **Igazolt:** a Route Handler kód a multipart parser meghívása előtt korlátozza a streamből felolvasott body-t; Content-Length nélkül és `1` bájtot hirdető érték mellett is elutasítja a 12 MiB-os testbody-t. A túlméretes elutasítás a route-szinten megelőzi a tartós mellékhatásokat.
- **Nem igazolt:** a reverse proxy/hoszt már a handler előtt pufferel-e adatot, milyen ingress plafon vagy időkorlát van konfigurálva, illetve mennyi az egyidejű uploadok összesített memóriaigénye. A route csak az átvett stream-chunk kiolvasásakor tudja a méretet ellenőrizni; egy runtime által már előállított, szokatlanul nagy chunk és az ingress pufferelése nem korlátozható ezzel. Az elfogadási határnál a chunk-lista és az összefűzött parse-bemenet rövid időre másolati memóriát is igényelhet. A 11 MiB-os kapu ezért kérésenkénti parser-bemeneti plafon, önmagában nem ingress DoS-védelem, processz-RAM maximum vagy konkurencia-limit.
- A testek a Route Handler függvényét Vitestben futtatják, a külső auth/Supabase Storage és reservation/attach műveleteket mockolják. A multipart parser és a Sharp a maximális érvényes képnél valódi helyi implementáció. Valós helyi HTTP-kérést és tényleges hosted ingress enforcementet nem futtattam.

## Ellenőrzések

- Először az új hiányzó/alámondott Content-Length tesztek a régi kóddal **2 FAIL** eredményt adtak (400 a várt 413 helyett); a streamlimit után zöldek lettek.
- Fókuszteszt: `npm test -- --run 'src/app/api/felmeresek/[surveyId]/photos/route.test.ts'` — **1 fájl / 12 teszt PASS**. Lefedés: kis sikeres kép és meglévő retry; pontosan 10 MiB-os érvényes kép; 10 MiB feletti fájl; több multipart rész összméret-korlátja; hiányzó és hibásan kicsi Content-Length; hibás multipart; nem multipart Content-Type; auth és szervezeti jogosultság; elutasítás melletti side effect hiánya.
- `npm run lint` — **PASS**, ESLint: no issues.
- `npm test` — **159 fájl PASS / 8 SKIP; 933 teszt PASS / 19 SKIP**.
- `npm run typecheck` — **PASS**, külön ideiglenes munkapéldányban (`next typegen` + `tsc`).
- `npm run build` — **PASS**, külön ideiglenes munkapéldányban, Next.js 16.4.2 Webpack build; a fotó route dinamikus endpointként elkészült.
- `git diff --check` — **PASS**. A DB/pgTAP, valós HTTP/hoszt ingress és böngészős workflow nem futott; az UI szerződés nem változott. A 3000-es aktív dev szerver folyamata a végellenőrzéskor is a helyén volt.
- Munkafolyamat-megjegyzés: egy typecheck-próbálkozás tévesen a fő checkoutból futott, így a `next typegen` a fő `.next` területre írt; a szervert nem állítottam le vagy indítottam újra, és a folyamat a végellenőrzéskor továbbra is figyelt a 3000-es porton. A végleges typecheck és build már kizárólag az izolált `/private/tmp` másolatban futott. A `.next` generált fájlok ignoráltak; nem állítom, hogy ez a rövid írási művelet hatástalan volt a fejlesztői szerver cache-ére.

## Eszközök és érintett fájlok

- Használt útmutatók: `ponytail` (full), `test-driven-development`, `verification-before-completion`, `supabase`. A projekt `AGENTS.md`, `CLAUDE.md`, `docs/AI_TOOLING.md`, F9.68 audit és pilot readiness dokumentumok, valamint a telepített Next.js 16.4.2 Route Handler/Request/runtime dokumentációja alapján dolgoztam. Új plugin, csomag vagy Supabase-kapcsolat nem kellett.
- Módosított: `src/app/api/felmeresek/[surveyId]/photos/route.ts`; `src/app/api/felmeresek/[surveyId]/photos/route.test.ts`; `docs/PROGRESS.md`.
- Új: `docs/PHOTO_UPLOAD_SECURITY_F9.69.md`.
- Nincs adatbázis-változtatás, migration, commit, push vagy deploy. A korábbi F9.68 módosítások megmaradtak.

## Következő üzemeltetési kapu

Állapítsátok meg a tényleges deployment platformot, és ellenőrizzétek/konfiguráljátok a fotó API ingress plafonját legalább **11 MiB teljes kérésre**. A platform bizonyítása után lehet a mérföldkövet `COMPLETE`-re zárni; jelenleg csak az alkalmazási parser-határ igazolt.

**Javasolt Conventional Commit:** `fix: F9.69 bound survey photo request bodies`
