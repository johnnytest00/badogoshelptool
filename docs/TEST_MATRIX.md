# Tesztmátrix

## F0 ellenőrzések

| Parancs | Állapot | Megjegyzés |
| --- | --- | --- |
| `npm install` | Sikeres | 2026-10-12; 359 csomag települt. npm audit: 13 tranzitív sérülékenység (4 moderate, 7 high, 2 critical). |
| `npm run typecheck` | Sikeres | 2026-10-12; `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 1 Vitest smoke teszt / 1 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 15.5.27 production build, `/` statikusan generálva. |
| Böngészős smoke | Sikeres | 2026-10-12; helyi `http://127.0.0.1:3000/` oldal megnyílt, a magyar kezdőoldal tartalma látható volt. |

Az első Vitest-futtatás alias-konfigurációs hibát jelzett; a `vitest.config.ts` alias-javítása után a teszt sikeres lett.
