import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // A GitHub repository connected by a user.
    projects: defineTable({
      userId: v.id("users"),
      owner: v.string(),
      repo: v.string(),
      defaultBranch: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_repo", ["userId", "owner", "repo"]),

    // Cached LLM summary of a repo's stack and patterns (keyed by repo + commit)
    // so we never re-read a large repo per lesson.
    repoSummaries: defineTable({
      owner: v.string(),
      repo: v.string(),
      commitSha: v.string(),
      summary: v.object({
        projectName: v.string(),
        description: v.string(),
        stack: v.array(v.string()),
        patterns: v.array(v.string()),
        architecture: v.string(),
        keyFiles: v.array(v.object({ path: v.string(), why: v.string() })),
        concepts: v.array(v.string()),
      }),
      createdAt: v.number(),
    })
      .index("by_repo_and_commit", ["owner", "repo", "commitSha"]),

    // A generated course for a user + repo at a given skill depth.
    courses: defineTable({
      userId: v.id("users"),
      projectId: v.id("projects"),
      skillLevel: v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced"),
      ),
      title: v.string(),
      overview: v.string(),
      modules: v.array(
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
      ),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_project", ["projectId"]),

    // Per-lesson completion state for a user's course.
    lessonProgress: defineTable({
      userId: v.id("users"),
      courseId: v.id("courses"),
      moduleIndex: v.number(),
      lessonIndex: v.number(),
      completedAt: v.number(),
    })
      .index("by_user_and_course", ["userId", "courseId"])
      .index("by_user_and_completed_at", ["userId", "completedAt"]),

    // Daily server-side quota for lesson help. Reservations prevent concurrent
    // requests from bypassing the message/token caps.
    chatUsage: defineTable({
      userId: v.id("users"),
      day: v.string(),
      messageCount: v.number(),
      tokenCount: v.number(),
      reservedTokens: v.number(),
    }).index("by_user_and_day", ["userId", "day"]),

    chatMessages: defineTable({
      userId: v.id("users"),
      courseId: v.id("courses"),
      moduleIndex: v.number(),
      lessonIndex: v.number(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      createdAt: v.number(),
    }).index("by_lesson", ["courseId", "moduleIndex", "lessonIndex"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
