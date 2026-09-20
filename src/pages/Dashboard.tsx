import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, CircleDot, FileCode2, Github, GitBranch, Layers3, Loader2, LogOut, RefreshCw, Search, Settings as SettingsIcon, Sparkles, Terminal, Upload } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

type Skill = "beginner" | "intermediate" | "advanced";

function isGithubUrl(value: string) { return /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(value.trim()); }

const SKILL_LABELS: [Skill, string, string][] = [
  ["beginner", "I’m building fundamentals", "Concepts first, plain language"],
  ["intermediate", "I can read most code", "Patterns, tradeoffs, architecture"],
  ["advanced", "I’m sharpening systems thinking", "Deep dives, constraints, edge cases"],
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [repoUrl, setRepoUrl] = useState("");
  const [skill, setSkill] = useState<Skill | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [creatingNewCourse, setCreatingNewCourse] = useState(false);
  const [error, setError] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("");

  const projects = useQuery(api.courses.myProjects, {}) ?? [];
  const activeProject: Doc<"projects"> | undefined = projects.find((project) => project._id === selectedProjectId) ?? projects[0];
  const course = useQuery(api.courses.latestCourse, activeProject ? { projectId: activeProject._id } : "skip") ?? null;
  const progress = useQuery(api.courses.courseProgress, course ? { courseId: course._id } : "skip") ?? [];

  const summarize = useAction(api.generation.summarizeRepo);
  const generate = useAction(api.generation.generateCourse);
  const toggleComplete = useMutation(api.courses.toggleLessonComplete);

  const completed = new Set(progress.map((p) => `${p.moduleIndex}:${p.lessonIndex}`));
  const totalLessons = course?.modules.reduce((n, m) => n + m.lessons.length, 0) ?? 0;

  // Flatten for display
  const flatLessons = course
    ? course.modules.flatMap((m, mi) => m.lessons.map((l, li) => ({ ...l, moduleIndex: mi, lessonIndex: li, moduleTitle: m.title })))
    : [];
  const [activeIdx, setActiveIdx] = useState(0);
  const active = flatLessons[Math.min(activeIdx, Math.max(flatLessons.length - 1, 0))];

  const handleAnalyze = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isGithubUrl(repoUrl)) { setError("Paste a public GitHub URL, like https://github.com/owner/repository"); return; }
    if (!skill) { setError("Choose the depth that feels right for you"); return; }
    setError("");
    setIsSummarizing(true);
    setStatusText("Fetching repository and mapping structure...");
    try {
      const { cached, projectId } = await summarize({ url: repoUrl.trim() });
      setStatusText(cached ? "Using cached codebase map — generating course..." : "Codebase analyzed — generating course...");
      setIsSummarizing(false);
      setIsGenerating(true);
      // Use the ID returned by the action instead of the potentially stale
      // reactive projects query. Convex updates that query asynchronously.
      await generate({ projectId, skillLevel: skill });
      setSelectedProjectId(projectId);
      setCreatingNewCourse(false);
      setStatusText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setStatusText("");
    } finally {
      setIsSummarizing(false);
      setIsGenerating(false);
    }
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const isWorking = isSummarizing || isGenerating;

  return <main className="orbit-workspace min-h-screen bg-[#faf8f2] text-[#1f231c]">
    <header className="border-b border-[#e0dbd0] bg-[#fcfaf5]"><div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 lg:px-8"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center bg-[#1d3f2c] text-[#f7e8cd]"><Terminal className="size-4" /></div><span className="font-serif text-lg font-semibold">orbit</span><span className="hidden border-l border-[#e2ddd1] pl-3 font-mono text-[10px] text-[#8a867a] sm:block">STUDENT WORKSPACE</span></div><div className="flex items-center gap-4"><Link to="/settings" className="flex items-center gap-2 text-xs text-[#6d6a5e] transition-colors hover:text-[#1d3f2c]"><SettingsIcon className="size-3.5" /> <span className="hidden sm:inline">settings</span></Link><span className="hidden text-xs text-[#7a776b] sm:block">{user?.email ?? "student@workspace"}</span><button onClick={handleSignOut} className="flex items-center gap-2 text-xs text-[#6d6a5e] hover:text-[#1d3f2c]"><LogOut className="size-3.5" /> <span className="hidden sm:inline">sign out</span></button></div></div></header>

    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8 lg:py-10"><AnimatePresence mode="wait">
      {!course || creatingNewCourse ? (
        <motion.div key="setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-4xl">
          {creatingNewCourse && course && (
            <button type="button" onClick={() => { setCreatingNewCourse(false); setRepoUrl(""); setSkill(null); setError(""); }} className="mb-8 inline-flex items-center gap-2 font-mono text-xs text-[#6d6a5e] transition-colors hover:text-[#1d3f2c]"><ArrowLeft className="size-3.5" /> Back to my lessons</button>
          )}
          <div className="mb-10">
            <p className="font-mono text-xs text-[#b06a2a]">$ orbit init --personalized</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.05] tracking-[-.02em] sm:text-6xl">Build a course<br /><span className="text-[#c2571a]">from your code.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#5d5f55]">Start with a public GitHub repository. Orbit reads its stack and patterns, then shapes a practical CS and software architecture course around your current level.</p>
          </div>
          <div className="border border-[#d3cfc2] bg-[#fcfaf5] shadow-[8px_8px_0_#e6d4bc]">
            <div className="flex items-center justify-between border-b border-[#e0dbd0] bg-[#f5f0e6] px-5 py-3 font-mono text-[11px] text-[#7a776b]"><span className="flex items-center gap-2"><Github className="size-3.5" /> REPOSITORY CONNECTOR</span><span>step 1 / 2</span></div>
            <form onSubmit={handleAnalyze} className="p-5 sm:p-8">
              <label className="mb-2 block font-mono text-xs font-semibold text-[#5d6b58]">GITHUB REPOSITORY URL</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1"><Search className="absolute left-3 top-3.5 size-4 text-[#9a958a]" /><Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repository" className="h-12 rounded-sm border-[#d3cfc2] bg-white pl-10 text-sm" disabled={isWorking} /></div>
                <Button type="submit" disabled={isWorking} className="h-12 rounded-sm bg-[#1d3f2c] px-5 text-xs text-[#f7ecda] hover:bg-[#2a5a40]">{isWorking ? <><Loader2 className="mr-2 size-4 animate-spin" /> {statusText || "Working..."}</> : <>Generate my course <ArrowRight className="ml-2 size-4" /></>}</Button>
              </div>
              <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-[#8a867a]"><CircleDot className="size-3 text-[#d97b2b]" /> Public repositories only in v1. The codebase map is cached, so re-analysis of the same commit is instant.</p>
              {error && <p className="mt-4 border-l-2 border-[#c2571a] bg-[#fbeede] px-3 py-2 text-xs text-[#98451c]">{error}</p>}
              {isSummarizing && (
                <div className="mt-6 flex items-center gap-3 border border-[#e0dbd0] bg-[#f5f0e6] px-4 py-3"><Sparkles className="size-4 animate-pulse text-[#d97b2b]" /><span className="font-mono text-xs text-[#5d5748]">Reading stack, patterns, and architecture from your repo...</span></div>
              )}
              <div className="my-8 border-t border-[#e2ddd1]" />
              <label className="mb-3 block font-mono text-xs font-semibold text-[#5d6b58]">YOUR CURRENT DEPTH</label>
              <div className="grid gap-2 sm:grid-cols-3">{SKILL_LABELS.map(([value, title, detail]) => <button type="button" key={value} onClick={() => { setSkill(value); setError(""); }} disabled={isWorking} className={`border p-4 text-left transition-colors ${skill === value ? "border-[#d99a4e] bg-[#fbeede] shadow-[3px_3px_0_#eccfae]" : "border-[#ddd6c9] bg-white hover:border-[#c9a97e]"}`}><span className="flex items-center justify-between text-xs font-semibold">{title}<span className={`size-3 rounded-full border ${skill === value ? "border-[#d99a4e] bg-[#d97b2b]" : "border-[#c9c5b8]"}`} /></span><span className="mt-2 block text-xs text-[#7a776b]">{detail}</span></button>)}</div>
            </form>
          </div>
          <div className="mt-7 grid gap-3 font-mono text-[11px] text-[#7a776b] sm:grid-cols-3"><div className="flex gap-2"><FileCode2 className="size-4 text-[#d97b2b]" /> Stack & patterns mapped</div><div className="flex gap-2"><Layers3 className="size-4 text-[#d97b2b]" /> Lessons at your depth</div><div className="flex gap-2"><GitBranch className="size-4 text-[#d97b2b]" /> Exercises you can push as commits</div></div>
        </motion.div>
      ) : (
        <motion.div key="course" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside className="border border-[#cfcabc] bg-[#fcfaf5] lg:sticky lg:top-6">
            <div className="border-b border-[#e0dbd0] bg-[#f5f0e6] p-5">
              <p className="font-mono text-[10px] text-[#7a776b]">YOUR GENERATED COURSE</p>
              <h2 className="mt-2 break-words font-serif text-xl font-semibold">{course.title}</h2>
              <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-[#a06a34]"><span className="size-1.5 rounded-full bg-[#d97b2b]" /> {completed.size} / {totalLessons} lessons complete</div>
            </div>
            {projects.length > 1 && (
              <div className="border-b border-[#e0dbd0] p-3">
                <p className="px-2 py-2 font-mono text-[10px] text-[#8a867a]">YOUR COURSES · {projects.length}/2</p>
                <div className="space-y-1">
                  {projects.map((project) => (
                    <button key={project._id} onClick={() => { setSelectedProjectId(project._id); setCreatingNewCourse(false); setError(""); setActiveIdx(0); }} className={`flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-[11px] ${activeProject?._id === project._id && !creatingNewCourse ? "bg-[#fbeede] text-[#a85416]" : "text-[#7a776b] hover:bg-[#f5f0e6]"}`}>
                      <Github className="size-3.5" /><span className="truncate">{project.owner}/{project.repo}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="max-h-[50vh] overflow-y-auto p-3">
              {course.modules.map((module, mi) => (
                <div key={mi}>
                  <p className="px-2 py-2 font-mono text-[10px] text-[#8a867a]">MODULE {String(mi + 1).padStart(2, "0")} — {module.title}</p>
                  {module.lessons.map((lesson, li) => {
                    const idx = flatLessons.findIndex((l) => l.moduleIndex === mi && l.lessonIndex === li);
                    const isDone = completed.has(`${mi}:${li}`);
                    return <button key={li} onClick={() => setActiveIdx(idx)} className={`flex w-full gap-3 border-l-2 p-3 text-left ${activeIdx === idx ? "border-[#d97b2b] bg-[#fbeede]" : "border-transparent hover:bg-[#f5f0e6]"}`}><span className={`font-mono text-xs ${isDone ? "text-[#1d3f2c]" : "text-[#8a867a]"}`}>{isDone ? "✓" : String(li + 1).padStart(2, "0")}</span><span><span className="block text-xs font-semibold">{lesson.title}</span></span></button>;
                  })}
                </div>
              ))}
            </div>
            <div className="border-t border-[#e0dbd0] p-4"><button onClick={() => { if (projects.length >= 2) { setError("You can have up to 2 courses. Remove an existing course before adding another."); return; } setCreatingNewCourse(true); setRepoUrl(""); setSkill(null); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-2 text-[11px] text-[#7a776b] hover:text-[#1d3f2c]"><Upload className="size-3.5" /> {projects.length >= 2 ? "Course limit reached (2/2)" : "New course from another repo"}</button></div>
          </aside>
          <section>
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#e0dbd0] pb-6 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-xs text-[#b06a2a]">$ course status --skill {course.skillLevel}</p>
                <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-.02em] sm:text-4xl">{course.overview.slice(0, 90)}{course.overview.length > 90 ? "…" : ""}</h1>
              </div>
              <button onClick={async () => { if (!skill || !activeProject) return; setIsGenerating(true); try { await generate({ projectId: activeProject._id, skillLevel: skill }); } catch (err) { setError(err instanceof Error ? err.message : "Regeneration failed."); } finally { setIsGenerating(false); } }} disabled={isGenerating} className="flex items-center gap-2 self-start border border-[#c9c5b8] px-3 py-2 font-mono text-[10px] text-[#6d6a5e] hover:border-[#1d3f2c] hover:text-[#1d3f2c] disabled:opacity-50"><RefreshCw className={`size-3 ${isGenerating ? "animate-spin" : ""}`} /> REGENERATE</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-[#ddd6c9] bg-[#fcfaf5] p-4"><p className="font-mono text-[10px] text-[#8a867a]">MODULES</p><p className="mt-3 text-sm font-semibold">{course.modules.length} modules</p><p className="mt-1 text-[11px] text-[#7a776b]">{totalLessons} lessons total</p></div>
              <div className="border border-[#ddd6c9] bg-[#fcfaf5] p-4"><p className="font-mono text-[10px] text-[#8a867a]">PROGRESS</p><p className="mt-3 text-sm font-semibold">{completed.size} / {totalLessons} lessons</p><div className="mt-2 h-1 bg-[#e8e2d4]"><div className="h-full bg-[#d97b2b] transition-all" style={{ width: `${totalLessons ? (completed.size / totalLessons) * 100 : 0}%` }} /></div></div>
              <div className="border border-[#ddd6c9] bg-[#fcfaf5] p-4"><p className="font-mono text-[10px] text-[#8a867a]">DEPTH</p><p className="mt-3 text-sm font-semibold capitalize">{course.skillLevel}</p><p className="mt-1 text-[11px] text-[#7a776b]">tuned to your level</p></div>
            </div>
            {active && (
              <article className="mt-6 border border-[#cfcabc] bg-[#fcfaf5] shadow-[6px_6px_0_#e6d4bc]">
                <div className="flex items-center justify-between border-b border-[#e0dbd0] bg-[#f5f0e6] px-5 py-3 font-mono text-[10px] text-[#7a776b]">
                  <span>MODULE {active.moduleIndex + 1} · LESSON {active.lessonIndex + 1}</span>
                  <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#d97b2b]" /> for {activeProject ? `${activeProject.owner}/${activeProject.repo}` : "your repo"}</span>
                </div>
                <div className="p-5 sm:p-8">
                  <p className="font-mono text-xs text-[#b06a2a]">{active.moduleTitle.toUpperCase()}</p>
                  <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-.02em]">{active.title}</h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#5d5f55]">{active.explanation}</p>
                  <div className="my-7 grid gap-3 border-l-2 border-[#d97b2b] bg-[#f8efe3] p-4 text-sm leading-6 text-[#5d5748] sm:grid-cols-[auto_1fr]"><span className="text-[#d97b2b]">→</span><span><strong className="font-mono">Objective:</strong> {active.objective}</span></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="border border-[#e0dbd0] p-4"><div className="flex items-center gap-2 text-xs font-semibold"><BookOpen className="size-4 text-[#1d3f2c]" /> CONCEPT</div><p className="mt-3 text-sm leading-6 text-[#6d6a5e]">{active.concept}</p></div>
                    <div className="border border-[#e0dbd0] p-4"><div className="flex items-center gap-2 text-xs font-semibold"><GitBranch className="size-4 text-[#1d3f2c]" /> EXERCISE</div><p className="mt-3 text-sm leading-6 text-[#6d6a5e]">{active.exercise}</p>{active.relevantFiles.length > 0 && <div className="mt-3 border-t border-[#e0dbd0] pt-3"><p className="font-mono text-[10px] text-[#8a867a]">FILES TO EXPLORE</p><ul className="mt-1 space-y-0.5">{active.relevantFiles.slice(0, 5).map((f) => <li key={f} className="truncate font-mono text-[10px] text-[#5d6b58]">→ {f}</li>)}</ul></div>}</div>
                  </div>
                  <div className="mt-8 flex flex-col justify-between gap-3 border-t border-[#e2ddd1] pt-5 sm:flex-row sm:items-center">
                    <label className="flex items-center gap-2 text-xs text-[#6d6a5e]"><input type="checkbox" checked={completed.has(`${active.moduleIndex}:${active.lessonIndex}`)} onChange={async () => { await toggleComplete({ courseId: course._id, moduleIndex: active.moduleIndex, lessonIndex: active.lessonIndex }); }} className="size-4 accent-[#1d3f2c]" /> Mark this lesson complete</label>
                    <Button onClick={() => setActiveIdx(Math.min(activeIdx + 1, flatLessons.length - 1))} disabled={activeIdx >= flatLessons.length - 1} className="rounded-sm bg-[#1d3f2c] text-xs text-[#f7ecda] hover:bg-[#2a5a40]">Next lesson<ChevronRight className="ml-2 size-4" /></Button>
                  </div>
                </div>
              </article>
            )}
            {error && <p className="mt-4 border-l-2 border-[#c2571a] bg-[#fbeede] px-3 py-2 text-xs text-[#98451c]">{error}</p>}
          </section>
        </motion.div>
      )}
    </AnimatePresence></div>
  </main>;
}
