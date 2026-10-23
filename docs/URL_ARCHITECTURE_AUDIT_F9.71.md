# F9.71 — URL-architektúra és production-readiness audit

**Státusz:** audit complete; az ellenőrzött production-kompatibilitási hibák száma: **0**. Kód- és konfigurációs viselkedést nem módosítottam.  
**Hatókör:** verziókezelt alkalmazáskód, tesztek, helyi segédscriptek, Next.js/Supabase konfiguráció és releváns fejlesztési dokumentáció. `.env.local` tartalmát nem olvastam.

## Leltár és besorolás

Az audit a `src/`, `scripts/`, `supabase/config.toml`, `.env.example`, `next.config.ts`, csomagscriptek, valamint a releváns dokumentáció keresésével és a URL-építőik hívási helyeinek áttekintésével készült.

| Csoport | Ellenőrzött találat | Besorolás és döntés |
|---|---:|---|
| `localhost`, `127.0.0.1`, `0.0.0.0` literálok az alkalmazáskódban, tesztekben, scriptekben és helyi konfigurációban | 39 | **A — helyi fejlesztés/teszt.** 23 tesztfixture vagy helyi Supabase-védelem, 14 kizárólag helyi Supabase-t használó script, 2 helyi Auth/Supabase-konfiguráció. Megőrizve. |
| `192.168.1.31` LAN cím | 2 | **A — helyi LAN fejlesztés.** Az `.env.example` Supabase URL-je és a Next `allowedDevOrigins` értéke ugyanahhoz a dokumentált fejlesztői LAN-címhez tartozik. Fejlesztői konfiguráció, nem production-origin; megőrizve. |
| Forráskódbeli URL-/navigációs konstrukciók (`href`, `redirect`, `new URL`, `request.url`/`nextUrl`, kliens `fetch`) | 177 | **B/C/D.** Áttekintve; a belső útvonalak relatívak, az API-hívások root-relative-ek, az abszolút külső szolgáltatás-URL a megfelelő Supabase konfigurációból jön. |
| `http://` / `https://` literálok a runtime-, teszt-, script- és helyi konfigurációs fájlokban | 35 | Helyi URL-ek, fixture-ek, forrás-URL mezőpéldák és URL-validálási tesztek; hardcoded production app-domain nincs a futó alkalmazáskódban. |
| Releváns dokumentumok localhost-tal | 9 fájl | Korábbi helyi teszt-, futtatási és elfogadási jegyzetek; dokumentációs/historikus hivatkozások, nem runtime-konfigurációk. |

A keresés általános külső URL-eket is talált a design-skill csomagban és szakmai hivatkozásként a dokumentációban. Ezek nem alkalmazás-originök; nem módosítottam őket. A számok a fenti hatókörben talált literálok/kifejezések darabszámai, nem egyedi domainek vagy teljes útvonalak száma.

## Érintett URL-határok

- `src/features/auth/redirect.ts`: a `returnTo` csak egy `/` kezdetű, nem `//` kezdetű belső útvonal lehet; az abszolút és loginra visszamutató címeket a helper elutasítja. A `local.invalid` kizárólag URL-parser alapcím, nem hálózati cél.
- `src/infrastructure/supabase/proxy.ts`: a Proxy a `request.nextUrl` útvonalából/queryjából készít belső `returnTo` értéket. A Next.js 16.4 helyi dokumentációja a `new URL('/útvonal', request.url)` mintát írja Proxy redirectre; ez a bejövő kérés aktuális originjét tartja meg, nem rögzít canonical domaint.
- `src/features/field-surveys/field-survey-photos.tsx` és a beszerzési/ajánlati/dokumentációs felületek: same-origin API végpontokat root-relative útvonalon hívnak. A dinamikus azonosítók UUID-k; a lekérdezési értékek kódolása az érintett hívásokban megvan.
- `src/app/manifest.ts`: `start_url`, `scope` és ikonok root-relative útvonalak, így az aktuális hostot és telepítési gyökérútvonalat használják.
- `src/infrastructure/supabase/env.ts`: az egyetlen runtime szolgáltatás-origin a `NEXT_PUBLIC_SUPABASE_URL`; HTTP(S) sémát validál, és nem keveri össze a Supabase originjét az alkalmazáséval. A `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` nyilvános kliens kulcs.
- `supabase/config.toml`: a `site_url = "http://127.0.0.1:3000"` a verziókezelt helyi Supabase Auth-konfiguráció része; nem bizonyítja és nem állítja be a hostolt projekt URL-jét.
- `src/app/layout.tsx`: nincs canonical/Open Graph origin. Nincs sitemap, e-mail link vagy külső OAuth callback URL-képzés, amelyhez most megbízható `APP_URL` kellene.
- A PDF/CSV route-ok, aláírt Storage URL-ek és Auth: az API-kérések URL-jéből csak query/path adatot olvasnak; a privát Storage aláírt URL-jét a Supabase adja vissza. Útvonal-szerződés, jogosultság-ellenőrzés és szolgáltatáskonfiguráció változatlan.

## Talált production-kockázatok

**Igazolt javítandó production URL-hiba: nincs.** Nem találtam éles kódban localhostra mutató alkalmazáskérést, rögzített production domaint, `window.location.origin`-ből képzett canonical címet, vagy Supabase URL-lel összekevert alkalmazás-origint. A query `returnTo` nem fogad el külső hostot.

A Proxy átirányításai a bejövő `request.url` originjét használják a Next által dokumentált minta szerint. Ez nem alkalmazás-canonical URL és nem használ `Host`/`X-Forwarded-Host` fejlécet önálló konfigurációként. A reverse proxy/CDN host-header normalizálása deployment-konfiguráció; a repository önmagában nem azonosít hostot vagy trusted proxy listát, ezért hosted infrastruktúrát nem lehetett ellenőrizni.

## Alkalmazott és szükséges konvenciók

- Same-origin navigáció és API: relatív útvonal, meglévő `Link`, illetve `fetch('/api/...')` minták.
- Abszolút TetőPro-origin jelenleg nem szükséges, ezért nem vezettem be `APP_URL`-t vagy `NEXT_PUBLIC_APP_URL`-t. Ha később canonical metadata, sitemap, e-mailes belépési link vagy callback igényli, szerveroldali, ellenőrzött `APP_URL` kell; a `NEXT_PUBLIC_*` érték buildkor rögzülhet.
- Helyi Supabase és az alkalmazás hostja külön konfiguráció. A `.env.example` LAN-címe és `next.config.ts` `allowedDevOrigins` értéke helyi fejlesztői/LAN beállítás; staging/production értékként nem használható.
- Staging/production Supabase Auth esetén a megfelelő hostolt Supabase projekt `Site URL` és redirect allowlist beállítása szükséges az adott környezet pontos originjével és callback útvonalaival. Ezt a külső dashboard-beállítást nem módosítottam és nem ellenőriztem.
- Nem találtam implementált külső OAuth callback workflow-t. Ha később hozzáadjuk, a redirect célját Supabase allowlisthez kell kötni, nem kérésből kapott Host fejlécből vagy queryből levezetni.

## Módosítások és ellenőrzési eredmény

- Új auditdokumentum: `docs/URL_ARCHITECTURE_AUDIT_F9.71.md`.
- `docs/PROGRESS.md`: F9.71 audit-összefoglaló hozzáadva.
- Alkalmazáskód, útvonalak, `.env.example`, Supabase-konfiguráció, titkok, auth beállítások és adatok nem változtak.
- Célzott parancs: `npx vitest run src/features/auth/redirect.test.ts 'src/app/api/felmeresek/[surveyId]/photos/route.test.ts' src/app/api/ajanlatok/standalone-pdf-route.test.ts` — **3 fájl, 19 teszt PASS**. Ez a meglévő auth returnTo validációt, a fotó API-t és az aláírt URL-t adó PDF útvonal körüli tesztviselkedést fedi; nem teljes Auth callback vagy hosted teszt.
- `git diff --check`: **PASS**.
- Teljes tesztkészlet, lint, typecheck, build, adatbázis/hostolt Auth/Storage és böngésző: nem futott; kód nem változott, ezek nem adnak további bizonyítékot a repository URL-leltárára. A hostolt konfiguráció és a proxy/CDN header-kezelés deployment-hozzáférés nélkül nem ellenőrzött.

## Rövid eredmény

Az alkalmazás URL-stratégiája jelenleg környezetfüggetlen az abszolút app-origin szempontjából: a belső hivatkozások az aktuális originhez relatívak, a külső szolgáltatás címe külön Supabase-konfiguráció. Nincs bizonyított kódbeli javítás. A deployment tulajdonosának staging/production Auth `Site URL`/redirect allowlistet és trusted proxy hostkezelést kell konfigurálnia, amikor ezek a környezetek létrejönnek.
