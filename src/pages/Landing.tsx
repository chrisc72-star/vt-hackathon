import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, GitBranch, Github, Sparkle, Terminal } from "lucide-react";
import { Link } from "react-router";

// Elliptical orbits, tilted and rotating slowly, each carrying a small dot.
// Kept inside the SVG viewport after tilt so no ring clips at the edges.
const orbits = [
  { rx: 30, ry: 22, rotate: -14, duration: 30, dot: "#d97b2b", dotR: 1.3, dotDur: 12 },
  { rx: 36, ry: 26, rotate: -14, duration: 42, dot: "#8aa384", dotR: 1.1, dotDur: 16 },
  { rx: 30, ry: 22, rotate: 32, duration: 36, dot: "#c6552e", dotR: 1.1, dotDur: 14 },
  { rx: 38, ry: 28, rotate: 32, duration: 50, dot: "#c98a4b", dotR: 0.9, dotDur: 20 },
];

const cards = [
  {
    position: "left-0 top-[8%] sm:left-[2%]",
    chip: "bg-[#f3d9c8]",
    icon: null,
    label: "YOUR PROJECT",
    title: "taskflow / server.ts",
    subtitle: "12 teaching moments found",
  },
  {
    position: "right-0 top-[14%] sm:right-[2%]",
    chip: "bg-[#fbeede]",
    icon: <Sparkle className="size-3 text-[#c2571a]" />,
    label: "YOUR DEPTH",
    title: "Comfortable",
    subtitle: "Calibrated in 3 questions",
  },
  {
    position: "left-1/2 bottom-[2%] -translate-x-1/2",
    chip: "bg-[#dbe4d3]",
    icon: <ArrowUpRight className="size-3 text-[#1d3f2c]" />,
    label: "NEXT UP",
    title: "The shape of data",
    subtitle: "18 min · 3 exercises",
  },
];

function OrbitDiagram() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
      {/* Soft halo behind the core */}
      <div className="absolute left-1/2 top-1/2 size-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e7ecd9]" />

      {/* Tilted elliptical orbits as SVG so the dots follow the true curve.
          Each tilted ring plane sweeps a full 360° around the still core,
          which reads as a 3D orbit precessing. Dots ride the ellipse path. */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        {orbits.map((o, i) => (
          <motion.g
            key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: o.duration, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "50px 50px" }}
          >
            <g transform={`rotate(${o.rotate} 50 50)`}>
              <ellipse
                cx="50"
                cy="50"
                rx={o.rx}
                ry={o.ry}
                fill="none"
                stroke="#d3d5c8"
                strokeWidth="0.45"
              />
              <circle r={o.dotR} fill={o.dot}>
                <animateMotion
                  dur={`${o.dotDur}s`}
                  repeatCount="indefinite"
                  path={`M ${50 - o.rx} 50 a ${o.rx} ${o.ry} 0 1 0 ${o.rx * 2} 0 a ${o.rx} ${o.ry} 0 1 0 -${o.rx * 2} 0`}
                />
              </circle>
            </g>
          </motion.g>
        ))}
      </svg>

      {/* Dark core with sparkle + light green glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute left-1/2 top-1/2 z-10 size-[32%] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="absolute inset-0 rounded-full bg-[#b7cfae]/50 blur-xl" />
        <div className="relative flex size-full items-center justify-center rounded-full bg-[#28352b] shadow-[0_18px_40px_-12px_rgba(40,53,43,0.35)]">
          <span className="text-[#eef2e4]">
            <Sparkle className="size-9 sm:size-11" fill="currentColor" />
          </span>
          <span className="absolute right-[18%] top-[22%] size-4 rounded-full bg-[#dd6f4a] sm:size-5" />
          <span className="absolute bottom-[26%] left-[24%] size-2 rounded-full bg-[#8aa384]" />
        </div>
      </motion.div>

      {/* Floating stat cards: gentle idle float + hover animation */}
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: [0, -5, 0] }}
          transition={{
            opacity: { duration: 0.55, delay: 0.45 + i * 0.15 },
            y: { duration: 3.6 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 },
          }}
          whileHover={{
            scale: 1.04,
            y: -8,
            boxShadow: "0 18px 40px -12px rgba(40,53,43,0.28)",
          }}
          className={`group absolute z-20 w-44 cursor-default rounded-md border border-[#e0ddd2] bg-white/95 p-3.5 shadow-[0_10px_30px_-12px_rgba(40,53,43,0.18)] backdrop-blur-sm transition-colors hover:border-[#c9c5b8] sm:w-52 ${card.position}`}
        >
          <div className="flex items-center gap-2">
            <span className={`flex size-5 items-center justify-center rounded ${card.chip} transition-transform group-hover:scale-110`}>{card.icon}</span>
            <span className="font-mono text-[9px] font-semibold tracking-[.14em] text-[#8a867a]">{card.label}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#1f231c]">{card.title}</p>
          <p className="mt-0.5 text-[11px] text-[#7a776b]">{card.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#faf8f2] text-[#1f231c]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3 text-sm font-semibold tracking-tight">
          <img src="/orbit-logo.svg" alt="Orbit" className="h-10 w-auto max-w-[150px] object-contain object-left" />
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
          <h1 className="max-w-3xl font-serif text-6xl font-semibold leading-[1.02] tracking-[-.02em] sm:text-7xl lg:text-[5.6rem]">
            Put your code<br />
            <span className="text-[#c2571a]">in orbit.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[#5d5f55]">
            Orbit turns a GitHub repo into a practical computer science course. Learn the patterns, architecture, and decisions hiding inside your own codebase — at your depth.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/auth?mode=signup" className="group inline-flex items-center justify-center gap-3 rounded-sm bg-[#1d3f2c] px-5 py-3.5 text-sm font-semibold text-[#f7ecda] shadow-[4px_4px_0_#e3b98b] transition-transform hover:-translate-y-0.5">
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
            // your repo, your depth, and your next lesson — in orbit
          </p>
        </motion.div>
      </section>

      <section className="border-y border-[#e0dbd0] bg-[#f5f0e6] px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-[#a85416]">/ the flight path</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold tracking-[-.02em] sm:text-5xl">Three steps to liftoff.</h2>
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
                <h3 className="mt-12 font-serif text-2xl font-semibold">{t}</h3>
                <p className="mt-3 text-sm leading-6 text-[#6d6a5e]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#b06a2a]">
            <img src="/orbit-logo.svg" alt="Orbit" className="h-4 w-auto max-w-[58px] object-contain object-left" /> BUILT FOR LEARNING IN PUBLIC
          </div>
          <h2 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-tight tracking-[-.02em] sm:text-5xl">
            Your project is the textbook. Your commits are the proof.
          </h2>
        </div>
        <Link to="/auth?mode=signup" className="inline-flex items-center justify-center gap-3 border border-[#1d3f2c] px-5 py-3 text-sm font-semibold text-[#1d3f2c] transition-colors hover:bg-[#fbeee0]">
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
