import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// LLM pipeline (see the architecture note in the product spec):
//   connector fetches repo → LLM call #1 summarizes stack/patterns (cached by
//   commit) → LLM call #2 drafts modules + lessons with the skill level as a
//   parameter. Persistence lives in courses.ts.

const OPENAI_API = "https://api.openai.com/v1";
const MODEL = "gpt-4o-mini";

async function chatJSON<T>(system: string, user: string): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set. Add it in the Keys panel.");
  const res = await fetch(`${OPENAI_API}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content) as T;
}

interface RepoSummary {
  projectName: string;
  description: string;
  stack: string[];
  patterns: string[];
  architecture: string;
  keyFiles: { path: string; why: string }[];
  concepts: string[];
}

interface GeneratedCourse {
  title: string;
  overview: string;
  modules: {
    title: string;
    goal: string;
    lessons: {
      title: string;
      objective: string;
      concept: string;
      explanation: string;
      exercise: string;
      relevantFiles: string[];
    }[];
  }[];
}

const SKILL_DEPTH: Record<string, string> = {
  beginner: "Beginner: plain language, define every term, one small idea per lesson, no assumed prior knowledge.",
  intermediate: "Intermediate: assume comfort reading code; focus on patterns, tradeoffs, and the 'why' behind decisions.",
  advanced: "Advanced: systems thinking — constraints, failure modes, scaling behavior, and design forces. Skip basics.",
};

// ─── Step 1: connector fetches repo (github.ts) → LLM summarizes (cached) ────

interface SummarizeResult {
  projectId: Id<"projects">;
  summary: RepoSummary;
  cached: boolean;
}

export const summarizeRepo = action({
  args: { url: v.string() },
  handler: async (ctx, { url }): Promise<SummarizeResult> => {
    await getAuthUserId(ctx) ?? (() => { throw new Error("Sign in first."); })();

    // 1. Connector
    const repoData = await ctx.runAction(internal.github.fetchRepo, { url });

    // 2. Cache check: skip LLM call #1 if this exact commit is already summarized
    const cached = await ctx.runQuery(internal.courses.getSummaryByCommit, {
      owner: repoData.owner,
      repo: repoData.repo,
      commitSha: repoData.commitSha,
    });
    if (cached) {
      const projectId = await ctx.runMutation(internal.courses.upsertProject, {
        owner: repoData.owner,
        repo: repoData.repo,
        defaultBranch: repoData.defaultBranch,
      });
      return { projectId, summary: cached, cached: true };
    }

    // 3. LLM call #1: summarize stack and patterns
    const digestText = repoData.digestFiles
      .map((f: { path: string; content: string }) => `--- ${f.path} ---\n${f.content}`)
      .join("\n\n");
    const summary = await chatJSON<RepoSummary>(
      "You are a senior engineer analyzing a codebase. Respond ONLY with JSON matching: {projectName, description, stack: string[], patterns: string[], architecture: string, keyFiles: [{path, why}], concepts: string[]}. 'concepts' are CS principles (e.g. state management, caching, auth flows) visible in this codebase that could anchor lessons.",
      `Repository: ${repoData.owner}/${repoData.repo}\nDefault branch: ${repoData.defaultBranch}\nTotal files: ${repoData.fileCount}\n\nFile tree (partial):\n${repoData.treePaths.slice(0, 200).join("\n")}\n\nKey file contents:\n${digestText}`,
    );

    // 4. Persist cache + project
    const projectId = await ctx.runMutation(internal.courses.upsertProject, {
      owner: repoData.owner,
      repo: repoData.repo,
      defaultBranch: repoData.defaultBranch,
    });
    await ctx.runMutation(internal.courses.saveSummary, {
      owner: repoData.owner,
      repo: repoData.repo,
      commitSha: repoData.commitSha,
      summary,
    });

    return { projectId, summary, cached: false };
  },
});

// ─── Step 2: LLM drafts modules/lessons with the skill level as a parameter ──

export const generateCourse = action({
  args: {
    projectId: v.id("projects"),
    skillLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
  },
  handler: async (ctx, { projectId, skillLevel }): Promise<{ courseId: Id<"courses"> }> => {
    await getAuthUserId(ctx) ?? (() => { throw new Error("Sign in first."); })();

    const project: { owner: string; repo: string } | null = await ctx.runQuery(internal.courses.getProject, { projectId });
    if (!project) throw new Error("Project not found.");

    const latestSha: string = await ctx.runQuery(internal.courses.getLatestCommit, { owner: project.owner, repo: project.repo });
    const cached = await ctx.runQuery(internal.courses.getSummaryByCommit, {
      owner: project.owner,
      repo: project.repo,
      commitSha: latestSha,
    });
    if (!cached) throw new Error("Summarize the repo first.");

    const course = await chatJSON<GeneratedCourse>(
      `You are an expert curriculum designer who builds courses around a real codebase. Respond ONLY with JSON matching: {title, overview, modules: [{title, goal, lessons: [{title, objective, concept, explanation, exercise, relevantFiles: string[]}]}]}. Rules: 3 modules, each with 2-3 lessons. Each lesson teaches one CS or architecture concept THROUGH this specific codebase (reference real files in relevantFiles). 'exercise' must be a concrete code change the learner makes in the repo and could push as a commit. Depth calibration: ${SKILL_DEPTH[skillLevel]}`,
      `Codebase summary:\n${JSON.stringify(cached)}\n\nSkill level: ${skillLevel}\nGenerate the course.`,
    );

    const courseId = await ctx.runMutation(internal.courses.saveCourse, {
      projectId,
      skillLevel,
      title: course.title,
      overview: course.overview,
      modules: course.modules,
    });

    return { courseId };
  },
});
