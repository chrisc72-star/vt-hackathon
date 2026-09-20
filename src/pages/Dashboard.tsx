import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LessonChat } from "@/components/LessonChat";
import { StreakPanel } from "@/components/StreakPanel";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, CircleDot, Code2, FileCode2, FilePlus2, Flame, Folder, FolderPlus, Github, GitBranch, Home, Layers3, Loader2, LogOut, PanelLeftClose, PanelLeftOpen, Play, RefreshCw, Search, Settings as SettingsIcon, Sparkles, Terminal, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

type Skill = "beginner" | "intermediate" | "advanced";
type RepositoryFile = { path: string; content: string; readable: boolean };
type PyodideRuntime = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (text: string) => void }) => void;
  setStderr: (options: { batched: (text: string) => void }) => void;
};
type PyodideWindow = Window & { loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime> };
let pyodidePromise: Promise<PyodideRuntime> | null = null;

function loadPyodideRuntime() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise<PyodideRuntime>((resolve, reject) => {
    const pyodideWindow = window as PyodideWindow;
    const start = () => {
      if (!pyodideWindow.loadPyodide) { reject(new Error("Python runtime did not load.")); return; }
      pyodideWindow.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/" }).then(resolve).catch(reject);
    };
    if (pyodideWindow.loadPyodide) { start(); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js";
    script.onload = start;
    script.onerror = () => reject(new Error("Could not load the Python runtime."));
    document.head.appendChild(script);
  });
  return pyodidePromise;
}

type EditorLanguage = "javascript" | "typescript" | "python" | "java" | "cpp" | "csharp" | "c" | "go" | "rust" | "ruby" | "php" | "swift" | "kotlin" | "dart" | "scala" | "r" | "sql" | "bash";

const COMMON_EDITOR_LANGUAGES: EditorLanguage[] = ["javascript", "typescript", "python", "java", "cpp", "csharp", "c", "go", "rust", "ruby", "php", "swift", "kotlin", "dart", "scala", "r", "sql", "bash"];

const EDITOR_LANGUAGE_LABELS: Record<EditorLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  csharp: "C#",
  c: "C",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart",
  scala: "Scala",
  r: "R",
  sql: "SQL",
  bash: "Bash / Shell",
};

function detectEditorLanguages(files: string[]): EditorLanguage[] {
  const paths = files.map((file) => file.toLowerCase());
  const hasExtension = (extensions: string[]) => paths.some((file) => extensions.some((extension) => file.endsWith(extension)));
  const detected: EditorLanguage[] = [];
  const add = (language: EditorLanguage) => { if (!detected.includes(language)) detected.push(language); };
  if (hasExtension([".ts", ".tsx", ".mts", ".cts"])) add("typescript");
  if (hasExtension([".js", ".jsx", ".mjs", ".cjs"]) || paths.some((file) => file.endsWith("package.json"))) add("javascript");
  if (hasExtension([".py"]) || paths.some((file) => file.endsWith("requirements.txt") || file.endsWith("pyproject.toml"))) add("python");
  if (hasExtension([".go"]) || paths.some((file) => file.endsWith("go.mod"))) add("go");
  if (hasExtension([".rs"]) || paths.some((file) => file.endsWith("cargo.toml"))) add("rust");
  if (hasExtension([".java"]) || paths.some((file) => file.endsWith("pom.xml"))) add("java");
  if (hasExtension([".cpp", ".cc", ".cxx", ".hpp"]) || paths.some((file) => file.endsWith("cmakelists.txt"))) add("cpp");
  if (hasExtension([".cs", ".csproj", ".sln"])) add("csharp");
  if (hasExtension([".c"])) add("c");
  if (hasExtension([".rb"]) || paths.some((file) => file.endsWith("gemfile"))) add("ruby");
  if (hasExtension([".php"]) || paths.some((file) => file.endsWith("composer.json"))) add("php");
  if (hasExtension([".swift"]) || paths.some((file) => file.endsWith("package.swift"))) add("swift");
  if (hasExtension([".kt", ".kts"]) || paths.some((file) => file.endsWith("build.gradle"))) add("kotlin");
  if (hasExtension([".dart"]) || paths.some((file) => file.endsWith("pubspec.yaml"))) add("dart");
  if (hasExtension([".scala"]) || paths.some((file) => file.endsWith("build.sbt"))) add("scala");
  if (hasExtension([".r"])) add("r");
  if (hasExtension([".sql", ".sqlite"])) add("sql");
  if (hasExtension([".sh"]) || paths.some((file) => file.endsWith("bashrc") || file.endsWith("zshrc"))) add("bash");
  return detected.length ? detected : ["javascript"];
}

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
  const [workspaceTab, setWorkspaceTab] = useState<"today" | "lessons" | "streak">("today");
  const [error, setError] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isLessonNavMinimized, setIsLessonNavMinimized] = useState(false);
  const [isWorkspaceNavMinimized, setIsWorkspaceNavMinimized] = useState(false);

  const projects = useQuery(api.courses.myProjects, {}) ?? [];
  const githubStatus = useQuery(api.githubConnections.getStatus, {});
  const activeProject: Doc<"projects"> | undefined = projects.find((project) => project._id === selectedProjectId) ?? projects[0];
  const course = useQuery(api.courses.latestCourse, activeProject ? { projectId: activeProject._id } : "skip") ?? null;
  const progress = useQuery(api.courses.courseProgress, course ? { courseId: course._id } : "skip") ?? [];

  const summarize = useAction(api.generation.summarizeRepo);
  const beginGithubOAuth = useAction(api.github.beginOAuth);
  const fetchProjectFiles = useAction(api.github.fetchProjectFiles);
  const fetchProjectFile = useAction(api.github.fetchProjectFile);
  const pushFiles = useAction(api.github.pushFiles);
  const generate = useAction(api.generation.generateCourse);
  const toggleComplete = useMutation(api.courses.toggleLessonComplete);

  const completed = new Set(progress.map((p) => `${p.moduleIndex}:${p.lessonIndex}`));
  const totalLessons = course?.modules.reduce((n, m) => n + m.lessons.length, 0) ?? 0;

  // Flatten for display
  const flatLessons = course
    ? course.modules.flatMap((m, mi) => m.lessons.map((l, li) => ({ ...l, moduleIndex: mi, lessonIndex: li, moduleTitle: m.title })))
    : [];
  const [activeIdx, setActiveIdx] = useState(0);
  const [editorDrafts, setEditorDrafts] = useState<Record<string, string>>({});
  const [consoleOutputs, setConsoleOutputs] = useState<Record<string, string[]>>({});
  const [editorLanguages, setEditorLanguages] = useState<Record<string, EditorLanguage>>({});
  const [createdExplorerEntries, setCreatedExplorerEntries] = useState<Record<string, string[]>>({});
  const [selectedExplorerFile, setSelectedExplorerFile] = useState("");
  const [newEntryType, setNewEntryType] = useState<"file" | "folder" | null>(null);
  const [newEntryName, setNewEntryName] = useState("");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isPushingFiles, setIsPushingFiles] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [pushStatus, setPushStatus] = useState("");
  const [repositoryFilesByProject, setRepositoryFilesByProject] = useState<Record<string, RepositoryFile[]>>({});
  const [repositoryBranchesByProject, setRepositoryBranchesByProject] = useState<Record<string, string>>({});
  const [isLoadingRepositoryFiles, setIsLoadingRepositoryFiles] = useState(false);
  const [repositoryLoadError, setRepositoryLoadError] = useState("");
  const active = flatLessons[Math.min(activeIdx, Math.max(flatLessons.length - 1, 0))];
  const courseKey = course?._id ?? "course";
  const repositoryFiles = repositoryFilesByProject[courseKey] ?? [];
  const repositoryBranch = repositoryBranchesByProject[courseKey] ?? activeProject?.defaultBranch;
  const selectedRepositoryFile = repositoryFiles.find((file) => file.path === selectedExplorerFile);
  const lessonKey = active ? `${courseKey}:${active.moduleIndex}:${active.lessonIndex}` : "";
  const editorKey = active ? `${lessonKey}:${selectedExplorerFile || "lesson-draft"}` : "";
  const editorValue = editorKey ? editorDrafts[editorKey] ?? selectedRepositoryFile?.content ?? "" : "";
  const consoleOutput = editorKey ? consoleOutputs[editorKey] ?? [] : [];
  const languageDetectionFiles = repositoryFiles.length ? repositoryFiles.map((file) => file.path) : flatLessons.flatMap((lesson) => lesson.relevantFiles);
  const detectedEditorLanguages = detectEditorLanguages(languageDetectionFiles);
  const editorLanguage = editorKey ? editorLanguages[editorKey] ?? detectedEditorLanguages[0] : "javascript";
  const explorerSourceEntries = [...repositoryFiles.map((file) => file.path), ...(createdExplorerEntries[courseKey] ?? [])];
  const explorerRows = Array.from(new Set(explorerSourceEntries.flatMap((entry) => {
    const cleanEntry = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    const parts = cleanEntry.split("/");
    return parts.map((_, index) => `${parts.slice(0, index + 1).join("/")}${index < parts.length - 1 || entry.endsWith("/") ? "/" : ""}`);
  }))).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!activeProject) return;
    let cancelled = false;
    setIsLoadingRepositoryFiles(true);
    setRepositoryLoadError("");
    fetchProjectFiles({ owner: activeProject.owner, repo: activeProject.repo, branch: activeProject.defaultBranch })
      .then((result) => {
        if (cancelled) return;
        const loadedFiles = result.files;
        setRepositoryBranchesByProject((branches) => ({ ...branches, [courseKey]: result.branch }));
        setRepositoryFilesByProject((files) => ({ ...files, [courseKey]: loadedFiles }));
        const firstReadable = loadedFiles.find((file) => file.readable);
        setSelectedExplorerFile(firstReadable?.path || "");
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load repository files.";
        setRepositoryFilesByProject((files) => ({ ...files, [courseKey]: [] }));
        setSelectedExplorerFile("");
        setRepositoryLoadError(message.includes("rate limit") ? "GitHub API rate limit reached. Add GITHUB_TOKEN in the Keys panel to load the real repository tree." : message);
      })
      .finally(() => { if (!cancelled) setIsLoadingRepositoryFiles(false); });
    return () => { cancelled = true; };
  }, [activeProject?._id, activeProject?.owner, activeProject?.repo, activeProject?.defaultBranch, courseKey, fetchProjectFiles]);

  useEffect(() => {
    if (!activeProject || !selectedExplorerFile || selectedExplorerFile.endsWith("/")) return;
    const isLocalEntry = (createdExplorerEntries[courseKey] ?? []).includes(selectedExplorerFile);
    if (isLocalEntry) return;
    const existing = repositoryFiles.find((file: RepositoryFile) => file.path === selectedExplorerFile);
    if (existing?.content) return;
    let cancelled = false;
    fetchProjectFile({ owner: activeProject.owner, repo: activeProject.repo, branch: repositoryBranch, path: selectedExplorerFile })
      .then((file) => {
        if (cancelled) return;
        setRepositoryFilesByProject((files) => ({ ...files, [courseKey]: (files[courseKey] ?? []).map((item) => item.path === file.path ? file : item) }));
      })
      .catch((err) => { if (!cancelled) setRepositoryLoadError(err instanceof Error ? err.message : `Could not load ${selectedExplorerFile}.`); });
    return () => { cancelled = true; };
  }, [activeProject?._id, activeProject?.owner, activeProject?.repo, repositoryBranch, selectedExplorerFile, courseKey, repositoryFiles, createdExplorerEntries, fetchProjectFile]);

  const createExplorerEntry = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = newEntryName.trim().split("/").filter(Boolean).join("/");
    if (!cleanName || !newEntryType) return;
    const entry = newEntryType === "folder" ? `${cleanName}/` : cleanName;
    setCreatedExplorerEntries((entries) => ({ ...entries, [courseKey]: Array.from(new Set([...(entries[courseKey] ?? []), entry])) }));
    setSelectedExplorerFile(entry);
    setNewEntryName("");
    setNewEntryType(null);
  };

  const runEditorCode = async () => {
    if (!editorKey || isRunningCode) return;
    const output: string[] = [];
    setIsRunningCode(true);
    const formatValue = (value: unknown) => {
      if (typeof value === "string") return value;
      try { return JSON.stringify(value, null, 2); } catch { return String(value); }
    };
    try {
      if (!editorValue.trim()) {
        output.push(`Nothing to run. Add ${EDITOR_LANGUAGE_LABELS[editorLanguage]} to the editor first.`);
      } else if (editorLanguage === "python") {
        output.push("Loading Python runtime...");
        const pyodide = await loadPyodideRuntime();
        output.length = 0;
        pyodide.setStdout({ batched: (text) => output.push(text) });
        pyodide.setStderr({ batched: (text) => output.push(`ERROR: ${text}`) });
        await pyodide.runPythonAsync(editorValue);
        if (output.length === 0) output.push("Process finished with no console output.");
      } else if (editorLanguage === "javascript") {
        const lessonConsole = {
          log: (...values: unknown[]) => output.push(...values.map(formatValue)),
          info: (...values: unknown[]) => output.push(...values.map(formatValue)),
          warn: (...values: unknown[]) => output.push(`WARN: ${values.map(formatValue).join(" ")}`),
          error: (...values: unknown[]) => output.push(`ERROR: ${values.map(formatValue).join(" ")}`),
        };
        new Function("console", editorValue)(lessonConsole);
        if (output.length === 0) output.push("Process finished with no console output.");
      } else {
        output.push(`${EDITOR_LANGUAGE_LABELS[editorLanguage]} selected. The browser console currently runs JavaScript and Python.`);
      }
    } catch (err) {
      output.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunningCode(false);
    }
    setConsoleOutputs((outputs) => ({ ...outputs, [editorKey]: output }));
  };

  const handlePushFiles = async () => {
    if (!activeProject || !lessonKey || isPushingFiles) return;
    setPushStatus("");
    const prefix = `${lessonKey}:`;
    const editedFiles = Object.entries(editorDrafts)
      .filter(([key]) => key.startsWith(prefix) && !key.endsWith(":lesson-draft"))
      .map(([key, content]) => ({ path: key.slice(prefix.length), content }));
    const filesToPush = editedFiles.length > 0
      ? editedFiles
      : selectedExplorerFile && !selectedExplorerFile.endsWith("/")
        ? [{ path: selectedExplorerFile, content: editorValue }]
        : [];
    if (filesToPush.length === 0) {
      setPushStatus("Select or create a file before pushing. Folders need a file inside them to be committed.");
      return;
    }
    setError("");
    setPushStatus("Pushing to GitHub...");
    setIsPushingFiles(true);
    try {
      const result = await pushFiles({
        projectId: activeProject._id,
        branch: activeProject.defaultBranch,
        message: commitMessage.trim() || `Complete lesson: ${active.title}`,
        files: filesToPush,
      });
      setCommitMessage("");
      setPushStatus(`Pushed ${result.fileCount} file${result.fileCount === 1 ? "" : "s"} to ${result.branch}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not push files to GitHub.";
      setPushStatus(message);
    } finally {
      setIsPushingFiles(false);
    }
  };

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
      setWorkspaceTab("today");
      setStatusText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setStatusText("");
    } finally {
      setIsSummarizing(false);
      setIsGenerating(false);
    }
  };

  const handleConnectGithub = async () => {
    try {
      const { url } = await beginGithubOAuth({});
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start GitHub connection.");
    }
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const isWorking = isSummarizing || isGenerating;

  return <main className="orbit-workspace min-h-screen bg-[#faf8f2] text-[#1f231c]">
    <header className="border-b border-[#e0dbd0] bg-[#fcfaf5]"><div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 lg:px-8"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center bg-[#1d3f2c] text-[#f7e8cd]"><Terminal className="size-4" /></div><span className="font-serif text-lg font-semibold">orbit</span><span className="hidden border-l border-[#e2ddd1] pl-3 font-mono text-[10px] text-[#8a867a] sm:block">STUDENT WORKSPACE</span></div><div className="flex items-center gap-4"><Link to="/settings" className="flex items-center gap-2 text-xs text-[#6d6a5e] transition-colors hover:text-[#1d3f2c]"><SettingsIcon className="size-3.5" /> <span className="hidden sm:inline">settings</span></Link><span className="hidden text-xs text-[#7a776b] sm:block">{user?.email ?? "student@workspace"}</span><button onClick={handleSignOut} className="flex items-center gap-2 text-xs text-[#6d6a5e] hover:text-[#1d3f2c]"><LogOut className="size-3.5" /> <span className="hidden sm:inline">sign out</span></button></div></div></header>

    <div className="mx-auto flex max-w-[1400px] gap-6 px-5 py-8 lg:px-8 lg:py-10">
      {course && !creatingNewCourse && (
        <aside className={`hidden shrink-0 lg:block ${isWorkspaceNavMinimized ? "w-12" : "w-52"}`}>
          <div className="sticky top-6 rounded-sm border border-[#e0dbd0] bg-[#fcfaf5] p-3">
            <div className={`flex items-center ${isWorkspaceNavMinimized ? "justify-center" : "justify-between"}`}>
              {!isWorkspaceNavMinimized && <p className="px-3 py-3 font-mono text-[10px] font-semibold tracking-[.16em] text-[#8a867a]">WORKSPACE</p>}
              <button type="button" onClick={() => setIsWorkspaceNavMinimized((value) => !value)} className="flex size-8 items-center justify-center rounded-sm text-[#6d6a5e] transition-colors hover:bg-[#f5f0e6] hover:text-[#1d3f2c]" aria-label={isWorkspaceNavMinimized ? "Expand workspace navigation" : "Minimize workspace navigation"} title={isWorkspaceNavMinimized ? "Expand workspace navigation" : "Minimize workspace navigation"}>
                {isWorkspaceNavMinimized ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </button>
            </div>
            <div className={isWorkspaceNavMinimized ? "hidden" : "block"}>
            <button onClick={() => setWorkspaceTab("today")} className={`flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm font-semibold transition-colors ${workspaceTab === "today" ? "bg-[#fbeede] text-[#a85416]" : "text-[#6d6a5e] hover:bg-[#f5f0e6]"}`}><Home className="size-4" /> Today</button>
            <button onClick={() => setWorkspaceTab("lessons")} className={`flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm font-semibold transition-colors ${workspaceTab === "lessons" ? "bg-[#fbeede] text-[#a85416]" : "text-[#6d6a5e] hover:bg-[#f5f0e6]"}`}><BookOpen className="size-4" /> Lessons</button>
            <button onClick={() => setWorkspaceTab("streak")} className={`flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm font-semibold transition-colors ${workspaceTab === "streak" ? "bg-[#fbeede] text-[#a85416]" : "text-[#6d6a5e] hover:bg-[#f5f0e6]"}`}><Flame className="size-4" /> Streak</button>
            <Link to="/settings" className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm font-semibold text-[#6d6a5e] transition-colors hover:bg-[#f5f0e6]"><SettingsIcon className="size-4" /> Settings</Link>
            <div className="mt-4 border-t border-[#e0dbd0] pt-4"><p className="px-3 font-mono text-[10px] text-[#8a867a]">PROGRESS</p><p className="mt-2 px-3 font-serif text-2xl font-semibold">{totalLessons ? Math.round((completed.size / totalLessons) * 100) : 0}%</p><div className="mx-3 mt-2 h-1 bg-[#e8e2d4]"><div className="h-full bg-[#d97b2b]" style={{ width: `${totalLessons ? (completed.size / totalLessons) * 100 : 0}%` }} /></div></div>
            </div>
          </div>
        </aside>
      )}
      <div className="min-w-0 flex-1">
        {course && !creatingNewCourse && (
          <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
            <button onClick={() => setWorkspaceTab("today")} className={`flex shrink-0 items-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold ${workspaceTab === "today" ? "border-[#d97b2b] bg-[#fbeede] text-[#a85416]" : "border-[#e0dbd0] bg-[#fcfaf5] text-[#6d6a5e]"}`}><Home className="size-3.5" /> Today</button>
            <button onClick={() => setWorkspaceTab("lessons")} className={`flex shrink-0 items-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold ${workspaceTab === "lessons" ? "border-[#d97b2b] bg-[#fbeede] text-[#a85416]" : "border-[#e0dbd0] bg-[#fcfaf5] text-[#6d6a5e]"}`}><BookOpen className="size-3.5" /> Lessons</button>
            <button onClick={() => setWorkspaceTab("streak")} className={`flex shrink-0 items-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold ${workspaceTab === "streak" ? "border-[#d97b2b] bg-[#fbeede] text-[#a85416]" : "border-[#e0dbd0] bg-[#fcfaf5] text-[#6d6a5e]"}`}><Flame className="size-3.5" /> Streak</button>
            <Link to="/settings" className="flex shrink-0 items-center gap-2 rounded-sm border border-[#e0dbd0] bg-[#fcfaf5] px-4 py-2 text-xs font-semibold text-[#6d6a5e]"><SettingsIcon className="size-3.5" /> Settings</Link>
          </div>
        )}
        <AnimatePresence mode="wait">
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
              <div className="mb-6 flex flex-col justify-between gap-3 border border-[#d8dfd4] bg-[#eef3e9] p-4 sm:flex-row sm:items-center"><div><p className="font-mono text-[10px] tracking-[.14em] text-[#789071]">GITHUB ACCOUNT</p><p className="mt-1 text-sm text-[#5d6b58]">{githubStatus?.connected ? `Connected as @${githubStatus.login}` : "Connect your account to browse and push your own repositories."}</p></div><Button type="button" onClick={handleConnectGithub} disabled={githubStatus?.connected} className="rounded-sm bg-[#1d3f2c] text-xs text-[#f7ecda] hover:bg-[#2a5a40]">{githubStatus?.connected ? "GitHub connected" : <><Github className="size-3.5" /> Connect GitHub</>}</Button></div>
              <label className="mb-2 block font-mono text-xs font-semibold text-[#5d6b58]">GITHUB REPOSITORY URL</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1"><Search className="absolute left-3 top-3.5 size-4 text-[#9a958a]" /><Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repository" className="h-12 rounded-sm border-[#d3cfc2] bg-white pl-10 text-sm" disabled={isWorking} /></div>
                <Button type="submit" disabled={isWorking} className="h-12 rounded-sm bg-[#1d3f2c] px-5 text-xs text-[#f7ecda] hover:bg-[#2a5a40]">{isWorking ? <><Loader2 className="mr-2 size-4 animate-spin" /> {statusText || "Working..."}</> : <>Generate my course <ArrowRight className="ml-2 size-4" /></>}</Button>
              </div>
              <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-[#8a867a]"><CircleDot className="size-3 text-[#d97b2b]" /> Public repositories only in v1. The codebase map is cached, so re-analysis of the same commit is instant.</p>
              <Link to="/start-project" className="mt-4 inline-flex items-center gap-2 border-b border-[#d9a36d] pb-0.5 font-mono text-[11px] font-semibold text-[#a85416] transition-colors hover:border-[#c2571a] hover:text-[#c2571a]"><BookOpen className="size-3.5" /> Don’t have a GitHub project? See how to get started <ArrowRight className="size-3" /></Link>
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
      ) : workspaceTab === "today" ? (
        <motion.div key="today" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl">
          <div className="mb-10"><p className="font-mono text-xs text-[#b06a2a]">$ orbit status --today</p><h1 className="mt-3 font-serif text-5xl font-semibold tracking-[-.03em]">Good to see you{user?.name ? `, ${user.name}` : ""}.</h1><p className="mt-3 max-w-xl text-base leading-7 text-[#6d6a5e]">Your curiosity has a direction. Pick up where you left off.</p></div>
          <div className="border border-[#d8dfd4] bg-[#eef3e9] p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="font-mono text-[10px] tracking-[.16em] text-[#789071]">LEARNING FROM</p><h2 className="mt-2 font-serif text-2xl font-semibold">{activeProject?.owner}/{activeProject?.repo}</h2><p className="mt-1 text-sm text-[#6d7d6c]">Personalized course · {course.skillLevel} depth</p></div><button onClick={() => setWorkspaceTab("lessons")} className="inline-flex items-center gap-2 text-xs font-semibold text-[#a85416] hover:text-[#c2571a]">View course <ArrowRight className="size-4" /></button></div></div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
            <button onClick={() => { setActiveIdx(Math.max(flatLessons.findIndex((lesson) => !completed.has(`${lesson.moduleIndex}:${lesson.lessonIndex}`)), 0)); setWorkspaceTab("lessons"); }} className="group border border-[#ddd6c9] bg-[#fcfaf5] p-6 text-left shadow-[6px_6px_0_#e6d4bc] transition-all hover:-translate-y-1 hover:border-[#d97b2b] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] tracking-[.16em] text-[#8a867a]">UP NEXT · YOUR CURRENT LESSON</p><h2 className="mt-4 font-serif text-3xl font-semibold">{flatLessons.find((lesson) => !completed.has(`${lesson.moduleIndex}:${lesson.lessonIndex}`))?.title ?? "Course complete"}</h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#6d6a5e]">{flatLessons.find((lesson) => !completed.has(`${lesson.moduleIndex}:${lesson.lessonIndex}`))?.objective ?? "You completed every lesson in this course."}</p></div><ChevronRight className="mt-1 size-5 text-[#d97b2b] transition-transform group-hover:translate-x-1" /></div><div className="mt-8 flex items-center gap-4 font-mono text-[10px] text-[#8a867a]"><span>{completed.size} / {totalLessons} complete</span><span>·</span><span>{totalLessons - completed.size} lessons remaining</span></div></button>
            <div className="border border-[#ddd6c9] bg-[#fcfaf5] p-6"><p className="font-mono text-[10px] tracking-[.16em] text-[#8a867a]">COURSE PROGRESS</p><p className="mt-4 font-serif text-5xl font-semibold text-[#1d3f2c]">{totalLessons ? Math.round((completed.size / totalLessons) * 100) : 0}<span className="text-2xl">%</span></p><div className="mt-5 h-2 bg-[#e8e2d4]"><div className="h-full bg-[#d97b2b] transition-all" style={{ width: `${totalLessons ? (completed.size / totalLessons) * 100 : 0}%` }} /></div><p className="mt-3 text-xs leading-5 text-[#7a776b]">Keep going — every completed lesson adds a new layer to your mental model.</p></div>
          </div>
          <div className="mt-6 border border-[#ddd6c9] bg-[#fcfaf5] p-6"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] tracking-[.16em] text-[#8a867a]">ALL LESSONS</p><h2 className="mt-2 font-serif text-2xl font-semibold">Your learning path</h2></div><button onClick={() => setWorkspaceTab("lessons")} className="font-mono text-[11px] text-[#a85416] hover:text-[#c2571a]">open lessons →</button></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{flatLessons.map((lesson) => <button key={`${lesson.moduleIndex}-${lesson.lessonIndex}`} onClick={() => { setActiveIdx(flatLessons.indexOf(lesson)); setWorkspaceTab("lessons"); }} className="flex items-center gap-3 border border-[#e5e0d6] p-3 text-left transition-colors hover:border-[#d97b2b] hover:bg-[#fbeede]"><span className={`font-mono text-xs ${completed.has(`${lesson.moduleIndex}:${lesson.lessonIndex}`) ? "text-[#1d3f2c]" : "text-[#9a958a]"}`}>{completed.has(`${lesson.moduleIndex}:${lesson.lessonIndex}`) ? "✓" : String(flatLessons.indexOf(lesson) + 1).padStart(2, "0")}</span><span className="truncate text-xs font-semibold">{lesson.title}</span><ChevronRight className="ml-auto size-3.5 text-[#9a958a]" /></button>)}</div></div>
        </motion.div>
      ) : workspaceTab === "streak" ? (
        <motion.div key="streak" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl"><StreakPanel /></motion.div>
      ) : (
        <motion.div key="course" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`grid gap-8 lg:items-start ${isLessonNavMinimized ? "lg:grid-cols-[52px_1fr]" : "lg:grid-cols-[280px_1fr]"}`}>
          <aside className={`border border-[#cfcabc] bg-[#fcfaf5] lg:sticky lg:top-6 ${isLessonNavMinimized ? "p-2" : ""}`}>
            <button type="button" onClick={() => setIsLessonNavMinimized((value) => !value)} className="hidden w-full items-center justify-center border-b border-[#e0dbd0] bg-[#f5f0e6] p-3 text-[#6d6a5e] transition-colors hover:text-[#1d3f2c] lg:flex" aria-label={isLessonNavMinimized ? "Expand lesson navigation" : "Minimize lesson navigation"} title={isLessonNavMinimized ? "Expand lesson navigation" : "Minimize lesson navigation"}>
              {isLessonNavMinimized ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
            <div className={isLessonNavMinimized ? "hidden" : "block"}>
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
            </div>
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
              <>
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
                  <div className="mt-6 grid overflow-hidden border border-[#cfcabc] bg-[#202a22] shadow-[5px_5px_0_#e6d4bc] lg:grid-cols-[190px_minmax(0,1fr)]">
                    <aside className="border-b border-[#405044] bg-[#182019] lg:border-b-0 lg:border-r">
                      <div className="flex items-center justify-between border-b border-[#405044] px-3 py-3"><span className="font-mono text-[10px] tracking-[.14em] text-[#d8e4d2]">EXPLORER</span><span className="font-mono text-[9px] text-[#6f8270]">{isLoadingRepositoryFiles ? "..." : explorerRows.length}</span></div>
                      <div className="flex gap-1 border-b border-[#405044] px-2 py-2"><button type="button" onClick={() => { setNewEntryType("file"); setNewEntryName(""); }} className={`flex size-7 items-center justify-center text-[#b9c8ad] hover:bg-[#26352a] hover:text-[#f3d3a7] ${newEntryType === "file" ? "bg-[#26352a] text-[#f3d3a7]" : ""}`} aria-label="Create new file" title="New file"><FilePlus2 className="size-3.5" /></button><button type="button" onClick={() => { setNewEntryType("folder"); setNewEntryName(""); }} className={`flex size-7 items-center justify-center text-[#b9c8ad] hover:bg-[#26352a] hover:text-[#f3d3a7] ${newEntryType === "folder" ? "bg-[#26352a] text-[#f3d3a7]" : ""}`} aria-label="Create new folder" title="New folder"><FolderPlus className="size-3.5" /></button></div>
                      {newEntryType && <form onSubmit={createExplorerEntry} className="border-b border-[#405044] p-2"><input autoFocus value={newEntryName} onChange={(event) => setNewEntryName(event.target.value)} placeholder={newEntryType === "file" ? "filename.ts" : "folder-name"} className="w-full border border-[#405044] bg-[#101610] px-2 py-1.5 font-mono text-[10px] text-[#d8e4d2] outline-none placeholder:text-[#6f8270] focus:border-[#d97b2b]" /><div className="mt-2 flex gap-2"><button type="submit" className="font-mono text-[9px] font-semibold text-[#f3d3a7]">create</button><button type="button" onClick={() => setNewEntryType(null)} className="font-mono text-[9px] text-[#8fa18c]">cancel</button></div></form>}
                      {repositoryLoadError && <p className="border-b border-[#405044] px-3 py-2 font-mono text-[9px] leading-4 text-[#f0a15d]">{repositoryLoadError}</p>}
                      <div className="max-h-64 overflow-y-auto py-2">{isLoadingRepositoryFiles ? <p className="px-3 py-3 font-mono text-[10px] text-[#6f8270]">Loading GitHub tree...</p> : explorerRows.length ? explorerRows.map((entry) => { const isFolder = entry.endsWith("/"); const cleanPath = isFolder ? entry.slice(0, -1) : entry; const label = cleanPath.split("/").pop() || entry; const depth = cleanPath.split("/").length - 1; return <button type="button" key={entry} onClick={() => !isFolder && setSelectedExplorerFile(entry)} className={`flex w-full items-center gap-2 py-1.5 pr-2 text-left font-mono text-[10px] transition-colors ${selectedExplorerFile === entry ? "bg-[#2b3b2e] text-[#f3d3a7]" : "text-[#b9c8ad] hover:bg-[#26352a]"}`} style={{ paddingLeft: `${10 + depth * 10}px` }}>{isFolder ? <Folder className="size-3 shrink-0 text-[#d97b2b]" /> : <FileCode2 className="size-3 shrink-0 text-[#8fa18c]" />}<span className="truncate">{label}{isFolder ? "/" : ""}</span></button>; }) : <p className="px-3 py-3 font-mono text-[10px] leading-4 text-[#6f8270]">No verified GitHub files loaded.</p>}</div>
                      <p className="border-t border-[#405044] px-3 py-2 font-mono text-[9px] leading-4 text-[#6f8270]">New entries are local lesson drafts until you push them.</p>
                    </aside>
                    <div className="min-w-0">
                    <div className="flex flex-col gap-3 border-b border-[#405044] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2"><Code2 className="size-4 text-[#d97b2b]" /><span className="font-mono text-[10px] tracking-[.14em] text-[#e8e2d4]">LESSON WORKSPACE</span><span className="max-w-48 truncate font-mono text-[10px] text-[#8fa18c]">{selectedExplorerFile || "lesson-draft"}</span><select value={editorLanguage} onChange={(event) => { if (editorKey) setEditorLanguages((languages) => ({ ...languages, [editorKey]: event.target.value as EditorLanguage })); }} className="border border-[#405044] bg-[#182019] px-2 py-1 font-mono text-[10px] text-[#d8e4d2] outline-none focus:border-[#d97b2b]">{COMMON_EDITOR_LANGUAGES.map((language) => <option key={language} value={language}>{EDITOR_LANGUAGE_LABELS[language]}{detectedEditorLanguages.includes(language) ? " · detected" : ""}</option>)}</select><span className="hidden font-mono text-[10px] text-[#8fa18c] sm:inline">// {editorLanguage === "javascript" ? "run in browser" : "language detected from repo"}</span></div>
                      <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto"><input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} placeholder="commit message" className="w-32 border border-[#405044] bg-[#182019] px-2 py-1.5 font-mono text-[10px] text-[#d8e4d2] outline-none placeholder:text-[#6f8270] focus:border-[#d97b2b] sm:w-40" /><button type="button" onClick={handlePushFiles} disabled={isPushingFiles || !selectedExplorerFile || selectedExplorerFile.endsWith("/")} className="inline-flex items-center gap-1.5 border border-[#d97b2b] px-3 py-1.5 font-mono text-[10px] font-semibold text-[#f3d3a7] transition-colors hover:bg-[#334934] disabled:cursor-not-allowed disabled:opacity-50"><Github className="size-3" /> {isPushingFiles ? "Pushing..." : "Push"}</button><button type="button" onClick={runEditorCode} disabled={isRunningCode} className="inline-flex items-center gap-1.5 bg-[#d97b2b] disabled:cursor-wait disabled:opacity-60 px-3 py-1.5 font-mono text-[10px] font-semibold text-[#202a22] transition-colors hover:bg-[#f0a15d]"><Play className="size-3" /> Run</button><button type="button" onClick={() => { if (editorKey) setEditorDrafts((drafts) => ({ ...drafts, [editorKey]: "" })); }} className="font-mono text-[10px] text-[#b9c8ad] hover:text-[#f3d3a7]">clear draft</button></div>
                    </div>
                    {pushStatus && <p className={`border-b border-[#405044] px-4 py-2 font-mono text-[10px] ${pushStatus.startsWith("Pushed") ? "text-[#9fcf86]" : pushStatus.startsWith("Pushing") ? "text-[#d9b36a]" : "text-[#f0a15d]"}`}>{pushStatus}</p>}
                    <textarea value={editorValue} onChange={(event) => { if (editorKey) setEditorDrafts((drafts) => ({ ...drafts, [editorKey]: event.target.value })); }} placeholder={`// Try the exercise for “${active.title}”\n// Write your ${EDITOR_LANGUAGE_LABELS[editorLanguage]} solution here...`} spellCheck={false} className="min-h-56 w-full resize-y border-0 bg-[#182019] px-4 py-4 font-mono text-xs leading-6 text-[#d8e4d2] outline-none placeholder:text-[#6f8270] focus:ring-2 focus:ring-inset focus:ring-[#d97b2b]" />
                    <div className="border-t border-[#405044] px-4 py-2 font-mono text-[10px] text-[#8fa18c]">draft saved locally for this lesson · {editorValue.split("\n").length} lines</div>
                    <div className="border-t border-[#405044] bg-[#101610] px-4 py-3 font-mono text-xs text-[#d8e4d2]">
                      <div className="mb-2 flex items-center justify-between text-[10px] tracking-[.14em] text-[#8fa18c]"><span>CONSOLE</span><button type="button" onClick={() => { if (editorKey) setConsoleOutputs((outputs) => ({ ...outputs, [editorKey]: [] })); }} className="tracking-normal text-[#b9c8ad] hover:text-[#f3d3a7]">clear console</button></div>
                      <pre className="max-h-48 min-h-10 overflow-auto whitespace-pre-wrap leading-5">{consoleOutput.length ? consoleOutput.join("\n") : "Run your code to see output here."}</pre>
                    </div>
                    </div>
                  </div>
                  <div className="mt-8 flex flex-col justify-between gap-3 border-t border-[#e2ddd1] pt-5 sm:flex-row sm:items-center">
                    <label className="flex items-center gap-2 text-xs text-[#6d6a5e]"><input type="checkbox" checked={completed.has(`${active.moduleIndex}:${active.lessonIndex}`)} onChange={async () => { await toggleComplete({ courseId: course._id, moduleIndex: active.moduleIndex, lessonIndex: active.lessonIndex }); }} className="size-4 accent-[#1d3f2c]" /> Mark this lesson complete</label>
                    <Button onClick={() => setActiveIdx(Math.min(activeIdx + 1, flatLessons.length - 1))} disabled={activeIdx >= flatLessons.length - 1} className="rounded-sm bg-[#1d3f2c] text-xs text-[#f7ecda] hover:bg-[#2a5a40]">Next lesson<ChevronRight className="ml-2 size-4" /></Button>
                  </div>
                </div>
              </article>
              <LessonChat
                courseId={course._id}
                moduleIndex={active.moduleIndex}
                lessonIndex={active.lessonIndex}
                lessonTitle={active.title}
                objective={active.objective}
                explanation={active.explanation}
                exercise={active.exercise}
                relevantFiles={active.relevantFiles}
              />
              </>
            )}
            {error && <p className="mt-4 border-l-2 border-[#c2571a] bg-[#fbeede] px-3 py-2 text-xs text-[#98451c]">{error}</p>}
          </section>
        </motion.div>
      )}
    </AnimatePresence></div></div>
  </main>;
}
