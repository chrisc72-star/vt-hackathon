import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  Github,
  GitBranch,
  LockKeyhole,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Link } from "react-router";

const steps = [
  {
    number: "01",
    title: "Point at a repo",
    description: "Paste a public GitHub URL. We map the project you already care about.",
    icon: Github,
  },
  {
    number: "02",
    title: "Set your baseline",
    description: "Tell us what feels familiar. Your course meets you at the right depth.",
    icon: Braces,
  },
  {
    number: "03",
    title: "Ship while learning",
    description: "Every lesson ends with a small, real change you can push back to your project.",
    icon: GitBranch,
  },
];

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f7f2] text-[#172019]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3 font-mono text-sm font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-sm bg-[#173f2b] text-[#dcf7b4]"><Terminal className="size-4" /></span>
          <span>learn//local</span>
        </Link>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="hidden items-center gap-2 text-[#68736b] sm:flex"><span className="size-2 rounded-full bg-[#86b94a]" /> v1.0 / github only</span>
          <Link to="/auth" className="rounded-sm border border-[#cdd4c8] bg-white px-4 py-2 font-semibold transition-colors hover:border-[#173f2b] hover:bg-[#f0f4e9]">sign in <span className="ml-1">↗</span></Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-32 lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
          <div className="mb-7 inline-flex items-center gap-2 border border-[#c8d7bd] bg-[#edf6e2] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[.16em] text-[#39712e]"><Sparkles className="size-3.5" /> a course for your code</div>
          <h1 className="max-w-3xl font-mono text-5xl font-semibold leading-[1.02] tracking-[-.07em] sm:text-6xl lg:text-[5.6rem]">Understand<br /><span className="text-[#54833e]">what you build.</span></h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[#5b665d]">Turn a GitHub repo into a practical computer science course. Learn the patterns, architecture, and decisions hiding inside your own codebase.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/auth" className="group inline-flex items-center justify-center gap-3 rounded-sm bg-[#173f2b] px-5 py-3.5 font-mono text-sm font-semibold text-[#eef7e7] shadow-[4px_4px_0_#b9cdb1] transition-transform hover:-translate-y-0.5">Start with a repo <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#cdd4c8] bg-white px-5 py-3.5 font-mono text-sm font-semibold hover:bg-[#f0f4e9]">See how it works</a>
          </div>
          <p className="mt-5 font-mono text-[11px] text-[#7b857d]">No blank-slate tutorials. No generic curriculum. Just your code.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .6, delay: .12 }} className="relative">
          <div className="absolute -right-5 -top-7 hidden font-mono text-[10px] text-[#9ba59c] lg:block">// course_preview.ts</div>
          <div className="overflow-hidden rounded-sm border border-[#bfcabd] bg-[#fcfcf8] shadow-[12px_12px_0_#e2e8da]">
            <div className="flex items-center justify-between border-b border-[#d8ded3] bg-[#f0f2eb] px-4 py-3 font-mono text-[11px] text-[#7a847b]"><span className="flex gap-1.5"><i className="size-2 rounded-full bg-[#d8aa5d]" /><i className="size-2 rounded-full bg-[#b9c8a7]" /><i className="size-2 rounded-full bg-[#8dad7d]" /></span><span>your_course / overview</span><span>⌘ K</span></div>
            <div className="grid gap-5 p-5 sm:grid-cols-[.85fr_1.15fr] sm:p-7">
              <div className="border-r border-[#e1e5dd] pr-5 font-mono text-xs"><p className="mb-5 text-[#879288]">COURSE OUTLINE</p>{["01  Read the room", "02  The request path", "03  State & boundaries", "04  Ship a change"].map((item, i) => <div key={item} className={`mb-3 border-l-2 px-3 py-2 ${i === 1 ? "border-[#76a74d] bg-[#edf5e7] text-[#31572e]" : "border-transparent text-[#6d786f]"}`}>{item}{i === 1 && <span className="ml-2 text-[10px] text-[#76a74d]">●</span>}</div>)}</div>
              <div className="font-mono"><p className="text-[11px] text-[#879288]">MODULE 02 / LESSON 01</p><h3 className="mt-3 text-2xl font-semibold tracking-[-.04em]">Follow a request</h3><p className="mt-3 text-xs leading-6 text-[#657067]">Trace one user action through your app. See how routes, state, and data connect in <span className="bg-[#eff4e9] px-1 text-[#3d6d37]">your codebase</span>.</p><div className="mt-6 border border-[#d3ddcd] bg-[#f3f7ef] p-3 text-xs leading-6 text-[#496047]"><span className="text-[#8da279]">$</span> grep -R "handleSubmit" src/<br /><span className="text-[#8da279]">→</span> 3 files mapped <span className="text-[#6ea04c]">✓</span></div><button className="mt-6 flex w-full items-center justify-center gap-2 bg-[#173f2b] px-4 py-3 text-xs font-semibold text-white">Open lesson <ArrowRight className="size-3.5" /></button></div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-[#8b968d]"><span>generated for / acme-dashboard</span><span>depth: intermediate</span></div>
        </motion.div>
      </section>

      <section id="how-it-works" className="border-y border-[#dce2d8] bg-[#eef1e9] px-6 py-20 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-[#608255]">/ the workflow</p><h2 className="mt-3 font-mono text-3xl font-semibold tracking-[-.05em] sm:text-4xl">From repo to roadmap.</h2></div><p className="max-w-sm font-mono text-xs leading-6 text-[#69756c]">The first version is intentionally narrow: GitHub in, useful lessons out.</p></div><div className="grid gap-px border border-[#d3dcd0] bg-[#d3dcd0] md:grid-cols-3">{steps.map(({ number, title, description, icon: Icon }) => <div key={number} className="bg-[#f7f8f3] p-6 sm:p-8"><div className="flex items-center justify-between"><span className="font-mono text-xs text-[#92a08f]">{number}</span><Icon className="size-5 text-[#6e9b51]" /></div><h3 className="mt-12 font-mono text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#68736a]">{description}</p></div>)}</div></div></section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10"><div><div className="flex items-center gap-2 font-mono text-xs text-[#6a875d]"><LockKeyhole className="size-4" /> BUILT FOR LEARNING IN PUBLIC</div><h2 className="mt-4 max-w-2xl font-mono text-3xl font-semibold leading-tight tracking-[-.05em] sm:text-4xl">Your project is the textbook. Your commits are the proof.</h2></div><Link to="/auth" className="inline-flex items-center justify-center gap-3 border border-[#173f2b] px-5 py-3 font-mono text-sm font-semibold text-[#173f2b] hover:bg-[#edf5e7]">Create your course <ArrowRight className="size-4" /></Link></section>
      <footer className="border-t border-[#dce2d8] px-6 py-6 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 font-mono text-[11px] text-[#849087] sm:flex-row"><span>learn//local — v1.0</span><span className="flex items-center gap-2"><Check className="size-3 text-[#75a94f]" /> github connector ready</span></div></footer>
    </main>
  );
}
