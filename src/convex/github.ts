import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
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

export const fetchProjectFiles = action({
  args: { owner: v.string(), repo: v.string(), branch: v.optional(v.string()) },
  handler: async (ctx, { owner, repo, branch }) => {
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

    const files = await Promise.all(paths.map(async (path: string) => {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${path}`;
        const res = await fetch(rawUrl);
        if (!res.ok) return { path, content: "", readable: false };
        const content = await res.text();
        // Keep binary assets visible in the tree but do not put them in the editor.
        if (content.includes("\u0000")) return { path, content: "", readable: false };
        return { path, content: content.slice(0, 50000), readable: true };
      } catch {
        return { path, content: "", readable: false };
      }
    }));

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
