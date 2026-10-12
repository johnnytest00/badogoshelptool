import { ArrowRight, Hammer, ShieldCheck, Sparkles } from "lucide-react";

const foundations = [
  { icon: Hammer, title: "Moduláris alap", text: "A későbbi kalkulátorok számára tiszta rétegek és jól bővíthető struktúra." },
  { icon: ShieldCheck, title: "Ellenőrizhető kezdet", text: "Szigorú TypeScript, célzott teszt és dokumentált fejlesztési kapuk." },
  { icon: Sparkles, title: "Mobil-first irány", text: "Magyar nyelvű, jól olvasható és kivitelezői munkára előkészített felület." },
];

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col justify-between gap-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-semibold tracking-wide text-slate-700">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--brand)] text-white shadow-lg shadow-orange-200">
              <Hammer aria-hidden="true" className="size-5" />
            </span>
            TETŐPRO
          </div>
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            F0 · projektalap
          </span>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">Hamarosan épül</p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-6xl">
              A tetőmunka tisztább számítási alapja.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              A TetőPro műszaki alapjai elkészültek. A következő fázisban ebből a stabil kiindulópontból épül fel a kivitelezők mindennapi munkáját segítő felület.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              Projektalap inicializálva <ArrowRight aria-hidden="true" className="size-4" />
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Most elkészült</p>
            <div className="mt-6 space-y-5">
              {foundations.map(({ icon: Icon, title, text }) => (
                <div className="flex gap-4" key={title}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-[var(--brand)]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Magyar tetőfedő és bádogos kalkulációs platform</span>
          <span>F1 előtt: nincs még üzleti funkció</span>
        </footer>
      </div>
    </main>
  );
}
