import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";
const DAILY_MESSAGE_LIMIT = 20;
const DAILY_TOKEN_LIMIT = 20_000;
const MAX_OUTPUT_TOKENS = 900;

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function extractText(data: { content?: { type: string; text?: string }[] }) {
  const text = data.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Claude returned an empty response.");
  return text;
}

export const reserveChatUsage = internalMutation({
  args: { estimatedTokens: v.number() },
  handler: async (ctx, { estimatedTokens }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const day = dayKey();
    const current = await ctx.db
      .query("chatUsage")
      .withIndex("by_user_and_day", (q) => q.eq("userId", userId).eq("day", day))
      .first();
    const usage = current ?? { messageCount: 0, tokenCount: 0, reservedTokens: 0 };
    if (usage.messageCount >= DAILY_MESSAGE_LIMIT) {
      throw new Error(`Daily lesson-chat limit reached (${DAILY_MESSAGE_LIMIT} messages). Try again tomorrow.`);
    }
    if (usage.tokenCount + usage.reservedTokens + estimatedTokens > DAILY_TOKEN_LIMIT) {
      throw new Error(`Daily lesson-chat token limit reached (${DAILY_TOKEN_LIMIT.toLocaleString()} tokens). Try again tomorrow.`);
    }
    if (current) {
      await ctx.db.patch(current._id, { messageCount: current.messageCount + 1, reservedTokens: current.reservedTokens + estimatedTokens });
    } else {
      await ctx.db.insert("chatUsage", { userId, day, messageCount: 1, tokenCount: 0, reservedTokens: estimatedTokens });
    }
    return { day, userId, estimatedTokens };
  },
});

export const recordChatUsage = internalMutation({
  args: { day: v.string(), estimatedTokens: v.number(), inputTokens: v.number(), outputTokens: v.number() },
  handler: async (ctx, { day, estimatedTokens, inputTokens, outputTokens }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const current = await ctx.db
      .query("chatUsage")
      .withIndex("by_user_and_day", (q) => q.eq("userId", userId).eq("day", day))
      .first();
    if (!current) return;
    const actualTokens = inputTokens + outputTokens;
    await ctx.db.patch(current._id, {
      tokenCount: current.tokenCount + actualTokens,
      reservedTokens: Math.max(0, current.reservedTokens - estimatedTokens),
    });
  },
});

export const saveChatMessage = internalMutation({
  args: {
    courseId: v.id("courses"),
    moduleIndex: v.number(),
    lessonIndex: v.number(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    return ctx.db.insert("chatMessages", { ...args, userId, createdAt: Date.now() });
  },
});

export const lessonMessages = query({
  args: { courseId: v.id("courses"), moduleIndex: v.number(), lessonIndex: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("chatMessages")
      .withIndex("by_lesson", (q) => q.eq("courseId", args.courseId).eq("moduleIndex", args.moduleIndex).eq("lessonIndex", args.lessonIndex))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
  },
});

export const todayUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { messageCount: 0, tokenCount: 0 };
    const row = await ctx.db
      .query("chatUsage")
      .withIndex("by_user_and_day", (q) => q.eq("userId", userId).eq("day", dayKey()))
      .first();
    return { messageCount: row?.messageCount ?? 0, tokenCount: (row?.tokenCount ?? 0) + (row?.reservedTokens ?? 0) };
  },
});

export const askLesson = action({
  args: {
    courseId: v.id("courses"),
    moduleIndex: v.number(),
    lessonIndex: v.number(),
    lessonTitle: v.string(),
    objective: v.string(),
    explanation: v.string(),
    exercise: v.string(),
    relevantFiles: v.array(v.string()),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const question = args.question.trim();
    if (!question) throw new Error("Ask a question first.");
    if (question.length > 2000) throw new Error("Keep your question under 2,000 characters.");

    // Reserve before calling Claude. A failed call releases the reservation.
    const estimatedTokens = Math.min(DAILY_TOKEN_LIMIT, Math.max(600, Math.ceil((question.length + args.explanation.length + args.exercise.length) / 3) + MAX_OUTPUT_TOKENS));
    const reservation = await ctx.runMutation(internal.chat.reserveChatUsage, { estimatedTokens });
    await ctx.runMutation(internal.chat.saveChatMessage, { courseId: args.courseId, moduleIndex: args.moduleIndex, lessonIndex: args.lessonIndex, role: "user", content: question });

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set. Add it in the Keys panel.");
      const res = await fetch(ANTHROPIC_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: "You are Orbit's patient lesson tutor. Answer only in the context of the lesson and provided repository files. Explain clearly at the learner's level, do not invent files or facts, and keep answers concise. If the learner asks for a code change, guide them rather than doing unrelated work. You are Claude Haiku and this is a lesson-help chat.",
          messages: [{ role: "user", content: `Lesson: ${args.lessonTitle}\nObjective: ${args.objective}\nLesson explanation: ${args.explanation}\nExercise: ${args.exercise}\nRelevant files: ${args.relevantFiles.join(", ")}\n\nStudent question: ${question}` }],
          temperature: 0.3,
        }),
      });
      if (!res.ok) throw new Error(`Claude request failed (${res.status}). Try again.`);
      const data = await res.json();
      if (!String(data.model ?? "").includes("haiku")) throw new Error("Model policy violation: lesson chat only permits Claude Haiku.");
      const answer = extractText(data);
      const inputTokens = Number(data.usage?.input_tokens ?? 0);
      const outputTokens = Number(data.usage?.output_tokens ?? 0);
      await ctx.runMutation(internal.chat.recordChatUsage, { day: reservation.day, estimatedTokens, inputTokens, outputTokens });
      await ctx.runMutation(internal.chat.saveChatMessage, { courseId: args.courseId, moduleIndex: args.moduleIndex, lessonIndex: args.lessonIndex, role: "assistant", content: answer, inputTokens, outputTokens });
      return { answer, inputTokens, outputTokens };
    } catch (error) {
      // The reservation remains counted for the message but releases its
      // temporary token reservation through a best-effort usage update.
      await ctx.runMutation(internal.chat.recordChatUsage, { day: reservation.day, estimatedTokens, inputTokens: 0, outputTokens: 0 });
      throw error;
    }
  },
});
