import { ArrowLeft, ArrowRight, BookOpen, Check, ExternalLink, GitBranch, Github, Terminal } from "lucide-react";
import { Link } from "react-router";

const steps = [
  {
    number: "01",
    title: "Create a GitHub account",
    description: "GitHub is a place to store and share your code. A free account is all you need to get started.",
    icon: Github,
  },
  {
    number: "02",
    title: "Choose a starter project",
    description: "Create a small project you care about — a to-do list, portfolio, or API is more than enough for your first course.",
    icon: BookOpen,
  },
  {
    number: "03",
    title: "Upload it to GitHub",
    description: "Use GitHub’s ‘Add file’ button to upload your project files. Keep the repository public so Orbit can read it in v1.",
    icon: GitBranch,
  },
];

export default function ProjectHelp() {
  return (
    <main className="orbit-workspace min-h-screen bg-[#faf8f2] text-[#1f231c]">
      <header className="border-b border-[#e0dbd0] bg-[#fcfaf5]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center bg-[#1d3f2c] text-[#f7e8cd]"><Terminal className="size-4" /></div>
            <span className="font-serif text-lg font-semibold">orbit</span>
            <span className="hidden border-l border-[#e2ddd1] pl-3 font-mono text-[10px] text-[#8a867a] sm:block">PROJECT SETUP</span>
          </div>
          <Link to="/dashboard" className="flex items-center gap-2 font-mono text-xs text-[#6d6a5e] transition-colors hover:text-[#1d3f2c]"><ArrowLeft className="size-3.5" /> back to upload</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="font-mono text-xs text-[#b06a2a]">$ orbit guide --first-project</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.05] tracking-[-.02em] sm:text-6xl">No GitHub project?<br /><span className="text-[#c2571a]">Start here.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#5d5f55]">You do not need to be a Git expert to learn with Orbit. Make a small project, put it on GitHub, and we’ll turn it into a course that explains the code you actually wrote.</p>
        </div>

        <section className="mt-12 border border-[#d3cfc2] bg-[#fcfaf5] shadow-[8px_8px_0_#e6d4bc]">
          <div className="flex items-center justify-between border-b border-[#e0dbd0] bg-[#f5f0e6] px-5 py-3 font-mono text-[11px] text-[#7a776b]"><span>GETTING STARTED</span><span>3 steps</span></div>
          <div className="grid divide-y border-[#e0dbd0] md:grid-cols-3 md:divide-x md:divide-y-0">
            {steps.map(({ number, title, description, icon: Icon }) => (
              <article key={number} className="p-5 sm:p-7">
                <div className="flex items-center justify-between"><span className="font-mono text-xs text-[#9a958a]">{number}</span><Icon className="size-5 text-[#d97b2b]" /></div>
                <h2 className="mt-10 font-serif text-xl font-semibold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#6d6a5e]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <section className="border border-[#d8dfd4] bg-[#eef3e9] p-6 sm:p-8">
            <p className="font-mono text-[10px] tracking-[.16em] text-[#789071]">RECOMMENDED FIRST PROJECTS</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold">Keep it small and yours.</h2>
            <ul className="mt-5 space-y-3 text-sm text-[#5d6b58]">
              {["A to-do list with filters", "A personal portfolio page", "A notes app with search", "A small weather or movie API"].map((item) => <li key={item} className="flex items-center gap-3"><Check className="size-4 shrink-0 text-[#1d3f2c]" />{item}</li>)}
            </ul>
          </section>
          <section className="border border-[#ddd6c9] bg-[#fcfaf5] p-6 sm:p-8">
            <p className="font-mono text-[10px] tracking-[.16em] text-[#8a867a]">NEED A WALKTHROUGH?</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold">GitHub explains the basics.</h2>
            <p className="mt-3 text-sm leading-6 text-[#6d6a5e]">Their beginner guide covers creating a repository and adding files without using the command line.</p>
            <a href="https://docs.github.com/en/get-started/start-your-journey/hello-world" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 font-mono text-xs font-semibold text-[#a85416] hover:text-[#c2571a]">Open GitHub’s beginner guide <ExternalLink className="size-3.5" /></a>
          </section>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-[#e0dbd0] pt-6 sm:flex-row sm:items-center">
          <div><p className="font-mono text-[10px] text-[#8a867a]">READY WHEN YOU ARE</p><p className="mt-1 text-sm text-[#6d6a5e]">Have a repository now? Paste it into the connector.</p></div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-sm bg-[#1d3f2c] px-5 py-3 text-xs font-semibold text-[#f7ecda] transition-colors hover:bg-[#2a5a40]">Go to repository upload <ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </main>
  );
}
