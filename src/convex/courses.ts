import { v } from "convex/values";
import { internalQuery, internalMutation, query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Persistence layer for projects, cached repo summaries, courses, and progress.
// Kept separate from the LLM actions to avoid circular type inference.

const summaryValidator = v.object({
  projectName: v.string(),
  description: v.string(),
  stack: v.array(v.string()),
  patterns: v.array(v.string()),
  architecture: v.string(),
  keyFiles: v.array(v.object({ path: v.string(), why: v.string() })),
  concepts: v.array(v.string()),
});

const modulesValidator = v.array(
  v.object({
    title: v.string(),
    goal: v.string(),
    lessons: v.array(
      v.object({
        title: v.string(),
        objective: v.string(),
        concept: v.string(),
        explanation: v.string(),
        exercise: v.string(),
        relevantFiles: v.array(v.string()),
      }),
    ),
  }),
);

// ─── Internal (used by the generation actions) ───────────────────────────────

export const getSummaryByCommit = internalQuery({
  args: { owner: v.string(), repo: v.string(), commitSha: v.string() },
  handler: async (ctx, { owner, repo, commitSha }) => {
    const row = await ctx.db
      .query("repoSummaries")
      .withIndex("by_repo_and_commit", (q) => q.eq("owner", owner).eq("repo", repo).eq("commitSha", commitSha))
      .first();
    return row?.summary ?? null;
  },
});

export const getLatestCommit = internalQuery({
  args: { owner: v.string(), repo: v.string() },
  handler: async (ctx, { owner, repo }) => {
    const rows = await ctx.db
      .query("repoSummaries")
      .withIndex("by_repo_and_commit", (q) => q.eq("owner", owner).eq("repo", repo))
      .collect();
    if (rows.length === 0) throw new Error("No cached summary for this repo yet.");
    return rows.sort((a, b) => b.createdAt - a.createdAt)[0].commitSha;
  },
});

export const getProject = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => await ctx.db.get(projectId),
});

export const upsertProject = internalMutation({
  args: { owner: v.string(), repo: v.string(), defaultBranch: v.string() },
  handler: async (ctx, { owner, repo, defaultBranch }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_user_and_repo", (q) => q.eq("userId", userId).eq("owner", owner).eq("repo", repo))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { defaultBranch });
      return existing._id;
    }
    return ctx.db.insert("projects", { userId, owner, repo, defaultBranch, createdAt: Date.now() });
  },
});

export const saveSummary = internalMutation({
  args: {
    owner: v.string(),
    repo: v.string(),
    commitSha: v.string(),
    summary: summaryValidator,
  },
  handler: async (ctx, { owner, repo, commitSha, summary }) => {
    const existing = await ctx.db
      .query("repoSummaries")
      .withIndex("by_repo_and_commit", (q) => q.eq("owner", owner).eq("repo", repo).eq("commitSha", commitSha))
      .first();
    if (existing) return existing._id;
    return ctx.db.insert("repoSummaries", { owner, repo, commitSha, summary, createdAt: Date.now() });
  },
});

export const saveCourse = internalMutation({
  args: {
    projectId: v.id("projects"),
    skillLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    title: v.string(),
    overview: v.string(),
    modules: modulesValidator,
  },
  handler: async (ctx, { projectId, skillLevel, title, overview, modules }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    // One active course per user+repo for now; regenerate replaces it.
    const existing = await ctx.db
      .query("courses")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { skillLevel, title, overview, modules, createdAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("courses", { userId, projectId, skillLevel, title, overview, modules, createdAt: Date.now() });
  },
});

// ─── Public (used by the UI) ─────────────────────────────────────────────────

export const myProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db.query("projects").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

export const latestCourse = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    return courses.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  },
});

export const courseProgress = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("lessonProgress")
      .withIndex("by_user_and_course", (q) => q.eq("userId", userId).eq("courseId", courseId))
      .collect();
  },
});

export const toggleLessonComplete = mutation({
  args: { courseId: v.id("courses"), moduleIndex: v.number(), lessonIndex: v.number() },
  handler: async (ctx, { courseId, moduleIndex, lessonIndex }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const rows = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_and_course", (q) => q.eq("userId", userId).eq("courseId", courseId))
      .collect();
    const existing = rows.find((r) => r.moduleIndex === moduleIndex && r.lessonIndex === lessonIndex);
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("lessonProgress", { userId, courseId, moduleIndex, lessonIndex, completedAt: Date.now() });
    return true;
  },
});
