import { PlaneTakeoff, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import SearchForm from "../components/SearchForm";

const PERKS = [
  { icon: Wallet, title: "Transparent pricing", desc: "The fare you see is the fare you pay — no surprise fees at checkout." },
  { icon: ShieldCheck, title: "Free cancellation lookup", desc: "Manage or cancel any booking in seconds with your reference code." },
  { icon: Sparkles, title: "Modern fleet", desc: "Fly on newer, more comfortable aircraft across our global network." },
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 pb-28 pt-16 text-white sm:pt-24">
        <PlaneTakeoff className="animate-fly pointer-events-none absolute top-24 h-10 w-10 text-white/10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(76,201,240,0.18),transparent_45%)]" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-sky-400">
            Fly further, spend less
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Book your next flight <span className="text-gold-400">in minutes.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Compare fares across our global network and lock in your seat — no account required.
          </p>
        </div>
        <div className="relative mx-auto mt-10 max-w-5xl px-4 sm:px-6">
          <SearchForm />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {PERKS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-navy-900/10 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-400/15 text-sky-500">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-navy-950">{title}</h3>
              <p className="mt-1 text-sm text-navy-700/70">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
