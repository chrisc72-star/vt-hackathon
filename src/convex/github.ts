import { v } from "convex/values";
import { internalAction } from "./_generated/server";

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

    const repoInfo = await ghFetch(`/repos/${owner}/${repo}`);
    const branch = repoInfo.default_branch as string;
    const commitSha = repoInfo.object?.sha ?? (await ghFetch(`/repos/${owner}/${repo}/commits/${branch}`)).sha;

    const treeData = await ghFetch(`/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`);
    const tree: TreeItem[] = treeData.tree ?? [];
    const fileCount = tree.filter((f) => f.type === "blob").length;
    const digestPaths = selectDigestFiles(tree);

    // Fetch the digest file contents (raw, capped at 8KB each).
    const digestFiles: { path: string; content: string }[] = [];
    for (const path of digestPaths) {
      try {
        const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${commitSha}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const buff = Buffer.from(data.content ?? "", "base64");
          digestFiles.push({ path, content: buff.toString("utf-8").slice(0, 8192) });
        }
        if (digestFiles.length >= 20) break;
        await new Promise((r) => setTimeout(r, 50)); // stay friendly to rate limits
      } catch {
        // skip files that fail to fetch
      }
    }

    return {
      owner,
      repo,
      description: (repoInfo.description as string) ?? "",
      defaultBranch: branch,
      commitSha,
      fileCount,
      treePaths: tree.filter((f) => f.type === "blob").slice(0, 400).map((f) => f.path),
      digestFiles,
    };
  },
});
