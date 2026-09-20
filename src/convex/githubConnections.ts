import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { connected: false, login: null };
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return { connected: Boolean(connection), login: connection?.login ?? null };
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (connection) await ctx.db.delete(connection._id);
  },
});

export const getForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const createOAuthState = internalMutation({
  args: { state: v.string(), userId: v.id("users"), expiresAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("githubOAuthStates", args);
  },
});

export const consumeOAuthState = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const row = await ctx.db
      .query("githubOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", state))
      .first();
    if (!row || row.expiresAt < Date.now()) {
      if (row) await ctx.db.delete(row._id);
      return null;
    }
    await ctx.db.delete(row._id);
    return row;
  },
});

export const createOAuthTicket = internalMutation({
  args: { ticket: v.string(), githubUserId: v.string(), login: v.string(), accessToken: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => { await ctx.db.insert("githubOAuthTickets", args); },
});

export const claimOAuthTicket = mutation({
  args: { ticket: v.string() },
  handler: async (ctx, { ticket }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const row = await ctx.db.query("githubOAuthTickets").withIndex("by_ticket", (q) => q.eq("ticket", ticket)).first();
    if (!row || row.expiresAt < Date.now()) {
      if (row) await ctx.db.delete(row._id);
      throw new Error("This GitHub installation link expired. Connect GitHub again.");
    }
    await ctx.db.delete(row._id);
    const existing = await ctx.db.query("githubConnections").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    const connection = { userId, githubUserId: row.githubUserId, login: row.login, accessToken: row.accessToken, connectedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, connection);
    else await ctx.db.insert("githubConnections", connection);
  },
});

export const saveConnection = internalMutation({
  args: {
    userId: v.id("users"),
    githubUserId: v.string(),
    login: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) await ctx.db.patch(existing._id, args);
    else await ctx.db.insert("githubConnections", { ...args, connectedAt: Date.now() });
  },
});
