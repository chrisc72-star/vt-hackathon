"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// GitHub connector: fetch repo metadata, file tree, and a digest of key files
// for LLM consumption. Public repos only in v1 — no OAuth required.

const GITHUB_API = "https://api.github.com";

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.trim().match(/^https?:\/\/(www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  if (!match) return null;
  return { owner: match[2], repo: match[3] };
}

interface TreeItem {
  path: string;
  type: string;
  size?: number;
}

interface RepositoryFileResult {
  path: string;
  content: string;
  readable: boolean;
}

// Pick a representative digest of the repo: config/manifests first, then the
// largest source files, capped so the LLM prompt stays affordable.
function selectDigestFiles(tree: TreeItem[]): string[] {
  const files = tree.filter((f) => f.type === "blob");
  const interesting = new RegExp(
    "(package\\.json|requirements\\.txt|pyproject\\.toml|go\\.mod|cargo\\.toml|pom\\.xml|build\\.gradle|composer\\.json|gemfile|dockerfile|docker-compose|\\.env\\.example|readme|contributing)" +
    "|(src/|app/|lib/|server/|api/|components/|pages/|routes/|models/|services/|utils/)" ,
    "i",
  );
  const skip = new RegExp(
    "(node_modules|\\.lock|lock-file|\\.min\\.|\\.map$|dist/|build/|vendor/|\\.png$|\\.jpg$|\\.jpeg$|\\.gif$|\\.svg$|\\.ico$|\\.woff|\\.ttf|\\.eot|\\.mp4|\\.pdf|\\.zip)",
    "i",
  );

  const candidates = files.filter((f) => interesting.test(f.path) && !skip.test(f.path));
  const manifests = candidates.filter((f) => /(package\.json|requirements\.txt|pyproject\.toml|go\.mod|cargo\.toml|pom\.xml|build\.gradle|composer\.json|gemfile|readme)/i.test(f.path));
  const source = candidates
    .filter((f) => !manifests.includes(f))
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, 25);

  return [...manifests.slice(0, 6), ...source].slice(0, 30).map((f) => f.path);
}

export const pushFiles = action({
  args: {
    projectId: v.id("projects"),
    branch: v.optional(v.string()),
    message: v.string(),
    files: v.array(v.object({ path: v.string(), content: v.string() })),
  },
  handler: async (ctx, { projectId, branch, message, files }): Promise<{ branch: string; commitSha: string; commitUrl: string; fileCount: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    if (files.length === 0) throw new Error("There are no files to push.");

    const project: { _id: Id<"projects">; userId: Id<"users">; owner: string; repo: string; defaultBranch?: string } | null = await ctx.runQuery(internal.courses.getProject, { projectId });
    if (!project || project.userId !== userId) throw new Error("You do not have access to this repository.");

    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN is not set. Add it in the Keys panel to enable pushes.");
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const apiFetch = async (path: string, options?: RequestInit) => {
      const response = await fetch(`${GITHUB_API}${path}`, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        throw new Error(`GitHub push failed (${response.status}): ${detail}`);
      }
      return response.json();
    };

    const repoPath = `/repos/${project.owner}/${project.repo}`;
    const resolvedBranch: string = branch || project.defaultBranch || (await apiFetch(repoPath)).default_branch as string;
    const ref = await apiFetch(`${repoPath}/git/ref/heads/${encodeURIComponent(resolvedBranch)}`);
    const baseSha = ref.object.sha as string;
    const baseCommit = await apiFetch(`${repoPath}/git/commits/${baseSha}`);
    const tree: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];

    for (const file of files) {
      const blob = await apiFetch(`${repoPath}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: Buffer.from(file.content, "utf8").toString("base64"), encoding: "base64" }),
      });
      tree.push({ path: file.path.split("/").filter(Boolean).join("/"), mode: "100644", type: "blob", sha: blob.sha });
    }

    const newTree = await apiFetch(`${repoPath}/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
    });
    const commit = await apiFetch(`${repoPath}/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message: message.trim() || "Update lesson files", tree: newTree.sha, parents: [baseSha] }),
    });
    await apiFetch(`${repoPath}/git/refs/heads/${encodeURIComponent(resolvedBranch)}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });

    return { branch: resolvedBranch, commitSha: commit.sha as string, commitUrl: commit.html_url as string, fileCount: files.length };
  },
});

export const fetchProjectFile = action({
  args: { owner: v.string(), repo: v.string(), branch: v.optional(v.string()), path: v.string() },
  handler: async (ctx, { owner, repo, branch, path }) => {
    await getAuthUserId(ctx) ?? (() => { throw new Error("Sign in first."); })();
    const ref = branch || "main";
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path.split("/").filter(Boolean).join("/")}`;
    const response = await fetch(rawUrl);
    if (!response.ok) throw new Error(`Could not load ${path} from GitHub (${response.status}).`);
    return { path, content: (await response.text()).slice(0, 50000), readable: true };
  },
});

export const fetchProjectFiles = action({
  args: { owner: v.string(), repo: v.string(), branch: v.optional(v.string()) },
  handler: async (ctx, { owner, repo, branch }): Promise<{ branch: string; commitSha: string; files: RepositoryFileResult[] }> => {
    await getAuthUserId(ctx) ?? (() => { throw new Error("Sign in first."); })();

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const ghFetch = async (path: string) => {
      const res = await fetch(`${GITHUB_API}${path}`, { headers });
      if (!res.ok) {
        if (res.status === 404) throw new Error(`Repository not found: ${owner}/${repo}.`);
        if (res.status === 403) throw new Error("GitHub API rate limit reached. Try again in a few minutes.");
        throw new Error(`GitHub API error (${res.status}) fetching ${path}`);
      }
      return res.json();
    };

    const repoInfo = await ghFetch(`/repos/${owner}/${repo}`);
    const resolvedBranch = branch || repoInfo.default_branch as string;
    const commit = await ghFetch(`/repos/${owner}/${repo}/commits/${resolvedBranch}`);
    const commitSha = commit.sha as string;
    const treeData = await ghFetch(`/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`);
    const paths = (treeData.tree ?? [])
      .filter((item: TreeItem) => item.type === "blob")
      .slice(0, 400)
      .map((item: TreeItem) => item.path);

    // Return the tree immediately. File contents are fetched lazily when a learner selects a file,
    // so a large repository never delays or times out the explorer itself.
    const files = paths.map((path: string) => ({ path, content: "", readable: true }));

    return { branch: resolvedBranch, commitSha, files };
  },
});

export const fetchRepo = internalAction({
  args: { url: v.string() },
  handler: async (_ctx, { url }) => {
    const parsed = parseGithubUrl(url);
    if (!parsed) {
      throw new Error("Not a valid GitHub repository URL. Use https://github.com/owner/repo");
    }
    const { owner, repo } = parsed;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const ghFetch = async (path: string) => {
      const res = await fetch(`${GITHUB_API}${path}`, { headers });
      if (!res.ok) {
        if (res.status === 404) throw new Error(`Repository not found: ${owner}/${repo}. Check the URL and make sure the repo is public.`);
        if (res.status === 403) throw new Error("GitHub API rate limit reached. Try again in a few minutes.");
        throw new Error(`GitHub API error (${res.status}) fetching ${path}`);
      }
      return res.json();
    };

    let branch = "HEAD";
    let commitSha = "HEAD";
    let description = "";
    let tree: TreeItem[] = [];

    try {
      // Only these small metadata calls use the GitHub API. File contents below
      // come from raw.githubusercontent.com and do not consume API quota.
      const repoInfo = await ghFetch(`/repos/${owner}/${repo}`);
      branch = repoInfo.default_branch as string;
      description = (repoInfo.description as string) ?? "";
      const commit = await ghFetch(`/repos/${owner}/${repo}/commits/${branch}`);
      commitSha = commit.sha as string;
      const treeData = await ghFetch(`/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`);
      tree = treeData.tree ?? [];
    } catch (error) {
      // Public GitHub API quota can be exhausted even for valid public repos.
      // Continue with raw GitHub instead of blocking course generation.
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("rate limit")) throw error;
      tree = [
        "README.md", "package.json", "tsconfig.json", "vite.config.ts", "src/main.tsx",
        "src/App.tsx", "src/index.css", "src/pages/index.tsx", "src/pages/App.tsx",
        "requirements.txt", "pyproject.toml", "go.mod", "Cargo.toml", "Dockerfile",
      ].map((path) => ({ path, type: "blob" }));
    }

    const fileCount = tree.filter((f) => f.type === "blob").length;
    const digestPaths = selectDigestFiles(tree);
    const fallbackPaths = digestPaths.length > 0 ? digestPaths : tree.map((f) => f.path);

    // Raw GitHub is separate from the API rate limit and supports public files.
    const digestFiles: { path: string; content: string }[] = [];
    const rawRefs = [...new Set([commitSha, branch, "main", "master"])];
    for (const path of fallbackPaths.slice(0, 20)) {
      try {
        for (const ref of rawRefs) {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
          const res = await fetch(rawUrl);
          if (res.ok) {
            digestFiles.push({ path, content: (await res.text()).slice(0, 8192) });
            break;
          }
        }
      } catch {
        // skip files that fail to fetch
      }
    }

    return {
      owner,
      repo,
      description,
      defaultBranch: branch,
      commitSha,
      fileCount,
      treePaths: tree.filter((f) => f.type === "blob").slice(0, 400).map((f) => f.path),
      digestFiles,
    };
  },
});
