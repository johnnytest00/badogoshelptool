# AI tooling leltár

**Ellenőrzés dátuma:** 2026-10-22 (Europe/Budapest)  
**Hatókör:** a jelenlegi Codex-munkamenet, a lokális skill-regiszter, a telepítési manifestek és az elérhető MCP tool-katalógus.

Ez a leltár csak ténylegesen ellenőrzött telepítéseket és ebben a munkamenetben exponált képességeket tartalmaz. A fájlban szereplő „elérhető” nem jelent automatikus fiókcsatlakozást vagy írási jogosultságot.

## Használati szabály

- A skill-ek feladat alapján automatikusan választhatók; külön aktiválás csak akkor kell, ha az adott skill maga ezt írja elő vagy a felhasználó kifejezetten nevezi meg.
- A helyi, read-only vagy fejlesztési eszközök releváns feladatnál használhatók. Külső fiókot, connected sessiont, deployt, adatbázis-írást, fájl-/munkakönyvtár-műveletet vagy beállításmódosítást csak a feladat és a szükséges jogosultság alapján szabad indítani.
- Egy telepített plugin nem bizonyítja, hogy az általa kezelt külső szolgáltatás csatlakoztatva is van. A kapcsolati állapotot az adott művelet előtt kell ellenőrizni.

## Ténylegesen ellenőrzött pluginok

Az azonos nevű runtime- és cache-példányokat egy sorban vontam össze. A verziók a `.codex-plugin/plugin.json` manifestekből származnak; az „elérés” a tényleges telepítési könyvtár.

| Plugin | Verzió | Cél és ajánlott használat | Aktiválás / elérés |
|---|---:|---|---|
| `documents` | 26.1020.11127 | DOCX/Word és dokumentum-artifact létrehozása, szerkesztése, renderelése, ellenőrzése | Automatikus feladat-illesztés; `/Users/bence/.cache/codex-runtimes/codex-primary-runtime/plugins/openai-primary-runtime/plugins/documents` |
| `pdf` | 26.1020.11127 | PDF olvasás, létrehozás, szöveg-/táblázatkinyerés és vizuális ellenőrzés | Automatikus feladat-illesztés; `/Users/bence/.cache/codex-runtimes/codex-primary-runtime/plugins/openai-primary-runtime/plugins/pdf` |
| `presentations` | 26.1020.11127 | PPTX/PowerPoint és prezentációs artifact készítése, szerkesztése, renderelése | Automatikus feladat-illesztés; `/Users/bence/.cache/codex-runtimes/codex-primary-runtime/plugins/openai-primary-runtime/plugins/presentations` |
| `spreadsheets` | 26.1020.11127 | XLSX/CSV/TSV és Google Sheets-kompatibilis munkafüzetek | Automatikus feladat-illesztés; `/Users/bence/.cache/codex-runtimes/codex-primary-runtime/plugins/openai-primary-runtime/plugins/spreadsheets` |
| `template-creator` | 26.1020.11127 | Dokumentum-, deck-, spreadsheet-, kép-, e-mail-, Slack- vagy Site-minta készítése | Kifejezett sablonkészítési feladat; `/Users/bence/.cache/codex-runtimes/codex-primary-runtime/plugins/openai-primary-runtime/plugins/template-creator` |
| `codex-app-tools` | 0.1.6 | Codex desktop: szálak, worktree-k, fájl-/panelmegnyitás, automatizálás, LaTeX és használati állapot | Helyi MCP, releváns feladatnál; `/Users/bence/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/codex-app-tools` |
| `browser` | 26.1013.40934 | In-app böngészés, helyi webapp megnyitása, navigáció és célzott UI-ellenőrzés | Böngészős feladatnál; `/Users/bence/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/browser` |
| `unified-computer-use` | 26.1013.40934 | App-kezeléshez használt böngésző-automatizálási runtime | Csak indokolt UI-automatizálási feladatnál; `/Users/bence/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/unified-computer-use` |
| `computer-use` | 1.0.1001501 | macOS desktop app vezérlése | Csak kifejezett, szükséges desktop-műveletnél; `/Users/bence/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/computer-use` |
| `code-review` | 26.1013.40934 | GitHub pull request és CI-diagnosztika | PR/CI review feladatnál és hozzáféréssel; `/Users/bence/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/code-review` |
| `visualize` | 1.0.50 | Interaktív chart, diagram, térkép, szimuláció és UI-preview | Vizualizációs feladatnál; `/Users/bence/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/visualize` |
| `plugin-management` | 0.1.0 | Plugin-felfedezés, függőségek és app-permissionök megtekintése, plugin-műveletek | Megtekintés releváns kérdésnél; módosítás vagy eltávolítás csak kifejezett kérésre; `/Users/bence/.codex/plugins/cache/openai-curated-remote/plugin-management/0.1.0` |
| `build-web-apps` | 0.1.2 | Frontend webapp-építés, UI, payments, adatbázis- és böngészős irányelvek | Webapp-feladatnál; `/Users/bence/.codex/plugins/cache/openai-curated-remote/build-web-apps/0.1.2` |
| `game-studio` | 0.1.2 | Browser game tervezés, 2D/3D runtime, asset pipeline és playtest | Játékfeladatnál; `/Users/bence/.codex/plugins/cache/openai-curated-remote/game-studio/0.1.2` |
| `openai-templates` | 0.1.1 | OpenAI alapértelmezett dokumentum-, prezentáció- és spreadsheet-sablonok | Sablon-alapú artifact feladatnál; `/Users/bence/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1` |
| `remotion` | 4.0.534 | React-alapú programozott videók, animáció, caption, audio és render | Videó/Remotion feladatnál; `/Users/bence/.codex/plugins/cache/openai-curated-remote/remotion/4.0.534` |
| `sites` | 1.1.1 | Site létrehozása, mentése, inspect és deploy | Site-feladatnál; connected Site-hozzáférés és írási művelet előtt ellenőrzés; `/Users/bence/.codex/plugins/cache/openai-curated-remote/sites/1.1.1` |
| `supabase` | 1.0.0 | Supabase projekt, Postgres, Auth, Edge Functions, logok és migrációk kezelése | Csak kapcsolt Supabase-környezettel és indokolt feladattal; írás/migráció különösen óvatosan; `/Users/bence/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0` |
| `work-pets` | 0.1.6 | ChatGPT Work animated pet létrehozás és kezelés | Csak ChatGPT Pets feladatra; `/Users/bence/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6` |
| `ponytail` | 5.3.2 | Minimális, YAGNI-alapú fejlesztési és review-szabályok | Munkamenet-szintű instrukció; `/Users/bence/.codex/plugins/cache/ponytail/ponytail/5.3.2` |

## Elérhető skill-ek

Az alábbi skill-nevek a jelenlegi skill-regiszterben ténylegesen elérhetők. A skill nem külön telepítendő könyvtár, hanem feladatra betöltött instrukciócsomag.

| Forrás | Skill-ek | Ajánlott használat |
|---|---|---|
| Projekt: `/Users/bence/Documents/badogos_helptool/.agents/skills` | `banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max` | Márka, UI/UX, design tokenek, bannerek és stratégiai prezentációk ebben a repóban |
| Rendszer: `/Users/bence/.codex/skills/.system` | `imagegen`, `openai-docs`, `skill-creator`, `skill-installer` | Képalkotás, OpenAI/Codex hivatalos dokumentáció, skill létrehozás vagy telepítés |
| `/Users/bence/.codex/plugins/cache/openai-curated-remote/build-web-apps/0.1.2/skills` | `frontend-app-builder`, `frontend-testing-debugging`, `react-best-practices`, `shadcn`, `stripe-best-practices`, `supabase-postgres-best-practices` | Új vagy javított frontend, React/Next teljesítmény, shadcn, Stripe és Postgres |
| `/Users/bence/.codex/plugins/cache/openai-curated-remote/game-studio/0.1.2/skills` | `game-studio`, `game-playtest`, `game-ui-frontend`, `phaser-2d-game`, `react-three-fiber-game`, `sprite-pipeline`, `three-webgl-game`, `web-3d-asset-pipeline`, `web-game-foundations` | Browser game stack, UI, playtest, Phaser/Three/R3F és asset pipeline |
| `/Users/bence/.codex/plugins/cache/openai-curated-remote/remotion/4.0.534/skills` | `remotion-best-practices`, `remotion-captions`, `remotion-create`, `remotion-docs`, `remotion-interactivity`, `remotion-maps`, `remotion-markup`, `remotion-multimedia`, `remotion-render`, `remotion-saas`, `remotion-studio`, `remotion-upgrade` | Remotion videó fejlesztés, dokumentáció, interaktivitás, render és upgrade |
| `/Users/bence/.codex/plugins/cache/openai-curated-remote/sites/1.1.1/skills` | `sites`, `sites-remix` | Site létrehozás, módosítás és remix |
| `/Users/bence/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills` | `supabase`, `supabase-postgres-best-practices` | Bármely Supabase- vagy Postgres-feladat |
| `/Users/bence/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills` | `create-pet`, `pets`, `update-pet` | ChatGPT Work pet létrehozás és kezelés |
| `/Users/bence/.cache/codex-runtimes/codex-primary-runtime/plugins/openai-primary-runtime/*/skills` | `documents`, `pdf`, `Presentations`, `Spreadsheets`, `excel-live-control`, `template-creator` | Dokumentum, PDF, prezentáció, spreadsheet és Excel Live munkafolyamat |
| `/Users/bence/.codex/plugins/cache/ponytail/ponytail/5.3.2/skills` | `ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review` | Minimalista implementáció, audit, review és shortcut-adósság |

`review-agent` fájl található a rendszer skill-könyvtárában, de a jelenlegi elérhető skill-regiszterben nem szerepel; ezért aktív skillként nem dokumentálom.

## MCP-integrációk a jelenlegi munkamenetben

Az alábbi namespace-eket a jelenlegi tool-katalógus ténylegesen exponálta. A namespace-ekben lévő egyedi műveletek száma változhat; itt a stabil használati csoportot dokumentálom.

| MCP namespace / tool-csoport | Cél | Automatikus vagy külön aktiválás |
|---|---|---|
| `mcp__codex_app__*` | Codex desktop, thread/worktree, artifact, LaTeX, automatizálás és app-állapot | Helyi, releváns feladatra automatikusan használható; külső vagy destruktív művelethez külön felhasználói szándék kell |
| `mcp__codex_apps__supabase_*` | Supabase projekt- és adatbáziskezelés | Tool elérhető, de kapcsolt fiók/projekt és írásnál kifejezett, biztonságos feladat kell |
| `mcp__codex_apps__sites_*` | Sites olvasás, mentés, deploy és környezeti beállítás | Tool elérhető; Site-hozzáférés és deploy/írás külön ellenőrzendő |
| `mcp__codex_apps__plugin_management_*` | Plugin permission, dependency, discovery és lifecycle | Megtekintés indokolt kérdésre; permission-, install- vagy uninstall-módosítás csak kifejezett kérésre |
| `mcp__codex_apps__codex_document_control_*` | Kapcsolt dokumentumsessionek és támogatott dokumentumműveletek | Külön kapcsolt session szükséges |
| `mcp__codex_apps__pets_*` | ChatGPT Work Pets | Csak kifejezett Pets-feladatra |
| `mcp__codex_apps__safety_settings_*` | Parental Controls és Trusted Contact | Csak kifejezett biztonsági beállítási kérésre; állapotolvasás megelőzi az írást |
| `mcp__codex_apps__hotline_*` | Helyi önsértési/suicide helpline routing | Csak releváns safety-contextben |
| `mcp__codex_apps__search_service__*`, `web__run` | Internetes keresés és oldalmegnyitás | Keresést igénylő vagy időérzékeny feladatra használható |
| `mcp__artifact_session__*` | Bound spreadsheet/presentation/whiteboard artifact CRDT szerkesztése | Aktív bound artifact szükséges |
| `mcp__node_repl__*` | Lokális JavaScript futtatókörnyezet | Helyi, releváns technikai feladatra automatikusan használható |
| `mcp__code_review__*` | Pull request ellenőrzési diagnosztika | PR/account kontextus és kifejezett review-feladat szükséges |
| `image_gen__imagegen` | Raster kép létrehozása vagy szerkesztése | Képkérés vagy képmódosítás esetén automatikusan választható |
| `multi_agent_v1__*` | Alügynökök indítása és kezelése | Nem automatikus: csak felhasználói vagy magasabb szintű explicit delegálási engedéllyel |

## Mit nem tekintettem aktívnak

Marketplace-könyvtárban talált, de a jelenlegi elérhető tool-katalógusban vagy skill-regiszterben nem szereplő leírókat nem vettem fel aktív telepítésként. A plugin-listát és a skill-regisztert a következő ellenőrzéskor újra kell venni, ha a Codex runtime vagy a plugin-készlet változik.
