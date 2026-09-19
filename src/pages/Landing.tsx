import { motion } from "framer-motion";
import { ArrowRight, Check, GitBranch, Github, Orbit, Terminal } from "lucide-react";
import { Link } from "react-router";

const rings = [
  { size: "size-56 sm:size-72", duration: 26, node: { label: "repo", accent: true } },
  { size: "size-80 sm:size-[26rem]", duration: 38, node: { label: "lessons", accent: false } },
  { size: "size-[28rem] sm:size-[40rem]", duration: 54, node: { label: "commits", accent: false } },
];

function OrbitDiagram() {
  return (
    <div className="relative flex aspect-square w-full max-w-[34rem] items-center justify-center">
      {rings.map((ring) => (
        <motion.div
          key={ring.size}
          className={`absolute rounded-full border border-[#d8d0bf] ${ring.size}`}
          animate={{ rotate: 360 }}
          transition={{ duration: ring.duration, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute -top-[13px] left-1/2 -translate-x-1/2">
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: ring.duration, repeat: Infinity, ease: "linear" }}
              className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] font-semibold ${
                ring.node.accent
                  ? "border-[#d99a4e] bg-[#fbeede] text-[#a85416]"
                  : "border-[#d5d0c4] bg-white text-[#6d6a5e]"
              }`}
            >
              <span className={`size-1.5 rounded-full ${ring.node.accent ? "bg-[#d97b2b]" : "bg-[#1d3f2c]"}`} />
              {ring.node.label}
            </motion.div>
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative z-10 flex size-24 flex-col items-center justify-center rounded-full border border-[#1d3f2c] bg-[#1d3f2c] text-[#f7e8cd] shadow-[6px_6px_0_#e3b98b] sm:size-28"
      >
        <Orbit className="size-8" />
        <span className="mt-1.5 font-mono text-[10px] font-semibold tracking-[.2em]">ORBIT</span>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#faf8f2] text-[#1f231c]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3 font-mono text-sm font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-sm bg-[#1d3f2c] text-[#f7e8cd]">
            <Orbit className="size-4" />
          </span>
          <span>orbit</span>
        </Link>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="hidden items-center gap-2 text-[#6d6a5e] sm:flex">
            <span className="size-2 rounded-full bg-[#e8913a]" /> v1.0 / github only
          </span>
          <Link to="/auth" className="rounded-sm border border-[#d5d0c4] bg-white px-4 py-2 font-semibold transition-colors hover:border-[#1d3f2c] hover:bg-[#f9efe2]">
            sign in
          </Link>
          <Link to="/auth?mode=signup" className="rounded-sm bg-[#1d3f2c] px-4 py-2 font-semibold text-[#f7ecda] transition-colors hover:bg-[#2a5a40]">
            sign up
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-14 lg:grid-cols-2 lg:items-center lg:px-10 lg:pb-32 lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="mb-7 inline-flex items-center gap-2 border border-[#eccfae] bg-[#fbeede] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[.16em] text-[#a85416]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#e8913a] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#c2571a]" />
            </span>
            a course for your code
          </div>
          <h1 className="max-w-3xl font-mono text-5xl font-semibold leading-[1.02] tracking-[-.07em] sm:text-6xl lg:text-[5.6rem]">
            Put your code<br />
            <span className="text-[#c2571a]">in orbit.</span>
          </h1>
          <p className="mt-8 max-w-xl font-sans text-lg leading-8 text-[#5d5f55]">
            Orbit turns a GitHub repo into a practical computer science course. Learn the patterns, architecture, and decisions hiding inside your own codebase — at your depth.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/auth?mode=signup" className="group inline-flex items-center justify-center gap-3 rounded-sm bg-[#1d3f2c] px-5 py-3.5 font-mono text-sm font-semibold text-[#f7ecda] shadow-[4px_4px_0_#e3b98b] transition-transform hover:-translate-y-0.5">
              Create your account <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#d5d0c4] bg-white px-5 py-3.5 font-mono text-sm font-semibold hover:bg-[#f9efe2]">
              I already have an account
            </Link>
          </div>
          <p className="mt-5 font-mono text-[11px] text-[#8a867a]">
            No blank-slate tutorials. No generic curriculum. Just your code.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.12 }}>
          <OrbitDiagram />
          <p className="mt-2 text-center font-mono text-[10px] text-[#8a867a]">
            // every artifact of your learning revolves around one codebase
          </p>
        </motion.div>
      </section>

      <section className="border-y border-[#e0dbd0] bg-[#f5f0e6] px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-[#a85416]">/ the flight path</p>
              <h2 className="mt-3 font-mono text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Three steps to liftoff.</h2>
            </div>
            <p className="max-w-sm font-mono text-xs leading-6 text-[#6d6a5e]">
              The first version is intentionally narrow: GitHub in, useful lessons out.
            </p>
          </div>
          <div className="grid gap-px border border-[#ddd6c9] bg-[#ddd6c9] md:grid-cols-3">
            {[
              { n: "01", t: "Point at a repo", d: "Paste a public GitHub URL. Orbit maps the project you already care about.", icon: Github },
              { n: "02", t: "Set your baseline", d: "Tell us what feels familiar. Your course meets you at the right depth.", icon: Terminal },
              { n: "03", t: "Ship while learning", d: "Every lesson ends with a small, real change you can push back to your project.", icon: GitBranch },
            ].map(({ n, t, d, icon: Icon }) => (
              <div key={n} className="group bg-[#faf7f0] p-6 transition-colors hover:bg-[#f8efe3] sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#9a958a]">{n}</span>
                  <Icon className="size-5 text-[#d97b2b] transition-transform group-hover:-translate-y-1" />
                </div>
                <h3 className="mt-12 font-mono text-lg font-semibold">{t}</h3>
                <p className="mt-3 font-sans text-sm leading-6 text-[#6d6a5e]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#b06a2a]">
            <Orbit className="size-4" /> BUILT FOR LEARNING IN PUBLIC
          </div>
          <h2 className="mt-4 max-w-2xl font-mono text-3xl font-semibold leading-tight tracking-[-.05em] sm:text-4xl">
            Your project is the textbook. Your commits are the proof.
          </h2>
        </div>
        <Link to="/auth?mode=signup" className="inline-flex items-center justify-center gap-3 border border-[#1d3f2c] px-5 py-3 font-mono text-sm font-semibold text-[#1d3f2c] transition-colors hover:bg-[#fbeee0]">
          Start learning with Orbit <ArrowRight className="size-4" />
        </Link>
      </section>

      <footer className="border-t border-[#e0dbd0] px-6 py-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 font-mono text-[11px] text-[#8a867a] sm:flex-row">
          <span>orbit — v1.0</span>
          <span className="flex items-center gap-2">
            <Check className="size-3 text-[#d97b2b]" /> github connector ready
          </span>
        </div>
      </footer>
    </main>
  );
}
