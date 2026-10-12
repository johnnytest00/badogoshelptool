# TetőPro

Magyar, mobil-first tetőfedő és bádogos kalkulációs platform. Ez a repository az **F0 projektalap**: a későbbi funkciókhoz szükséges Next.js, TypeScript, Tailwind, shadcn/ui és Lucide alapokat, valamint egy minimális kezdőoldalt tartalmaz.

## Előfeltételek

- Node.js 20 vagy újabb
- npm 10 vagy újabb

## Indítás

```bash
npm install
npm run dev
```

Nyisd meg a `http://localhost:3000` címet.

## Ellenőrzés

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Az F0 nem tartalmaz Supabase-kapcsolatot vagy szükséges titkos környezeti változót. A részletes állapot a `docs/PROGRESS.md`, a tényleges ellenőrzési napló a `docs/TEST_MATRIX.md` fájlban található.
