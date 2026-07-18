import { createHmac } from "node:crypto";

/**
 * Server-side GitHub OAuth + REST helpers. The chat backend has no native
 * tool-calling, so the model emits a `[[github:action]]` directive (see
 * lib/githubDirective.ts) and the client calls /api/apps/github/action, which
 * runs `executeGithubAction` here with the user's stored OAuth token.
 */

const CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET || "";
const STATE_SECRET =
  process.env.AUTH_SECRET || "koda-dev-secret-change-me-in-production";

/** Scopes we request: private repos, Actions workflows, and profile read/write. */
export const GITHUB_SCOPES = "repo workflow user";

export function githubOAuthConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

// ─── OAuth state (signed, short-lived, bound to the user) ──────
export function signState(userId: string): string {
  const body = Buffer.from(
    JSON.stringify({ uid: userId, t: Date.now() })
  ).toString("base64url");
  const sig = createHmac("sha256", STATE_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string | null): string | null {
  if (!state) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", STATE_SECRET).update(body).digest("base64url");
  if (expected !== sig) return null;
  try {
    const { uid, t } = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      uid: string;
      t: number;
    };
    // 10-minute validity window for the round-trip.
    if (!uid || typeof t !== "number" || Date.now() - t > 10 * 60 * 1000) return null;
    return uid;
  } catch {
    return null;
  }
}

export function githubAuthorizeUrl(state: string, redirectUri: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: GITHUB_SCOPES,
    state,
    allow_signup: "false",
  });
  return `https://github.com/login/oauth/authorize?${p.toString()}`;
}

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; scope: string }> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    scope?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error_description || "GitHub token exchange failed.");
  }
  return { accessToken: data.access_token, scope: data.scope || "" };
}

// ─── REST helpers ─────────────────────────────────────────────
const API = "https://api.github.com";

async function gh<T = unknown>(
  token: string,
  pathname: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "KodaAI",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (json && (json.message as string)) || `GitHub API error (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

interface ViewerLike {
  login: string;
  name?: string;
  avatar_url?: string;
}

export async function getViewer(token: string): Promise<ViewerLike> {
  return gh<ViewerLike>(token, "/user");
}

/** Resolve "owner/repo" or a bare "repo" (defaulting owner to the viewer). */
function splitRepo(repo: string, login: string): { owner: string; name: string } {
  const clean = repo.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length >= 2) return { owner: parts[0], name: parts[1] };
  return { owner: login, name: parts[0] || "" };
}

export type GithubActionResult = { ok: true; data: unknown } | { ok: false; error: string };

/**
 * Execute one GitHub action against the user's account. `login` is the
 * connected username (used to default the repo owner). Returns a compact,
 * model-friendly result — the chat then summarises it for the user.
 */
export async function executeGithubAction(
  token: string,
  login: string,
  action: string,
  args: Record<string, unknown>
): Promise<GithubActionResult> {
  try {
    const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : "");
    const bool = (k: string) => args[k] === true || args[k] === "true";

    switch (action) {
      case "list_repos": {
        const visibility = str("visibility") || "all";
        const repos = await gh<Array<Record<string, unknown>>>(
          token,
          `/user/repos?visibility=${encodeURIComponent(visibility)}&affiliation=owner,collaborator,organization_member&sort=updated&per_page=50`
        );
        return {
          ok: true,
          data: repos.map((r) => ({
            full_name: r.full_name,
            private: r.private,
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            updated_at: r.updated_at,
            url: r.html_url,
          })),
        };
      }

      case "get_repo": {
        const { owner, name } = splitRepo(str("repo"), login);
        const r = await gh<Record<string, unknown>>(token, `/repos/${owner}/${name}`);
        return {
          ok: true,
          data: {
            full_name: r.full_name,
            private: r.private,
            description: r.description,
            default_branch: r.default_branch,
            language: r.language,
            stars: r.stargazers_count,
            forks: r.forks_count,
            open_issues: r.open_issues_count,
            url: r.html_url,
          },
        };
      }

      case "list_dir":
      case "get_file": {
        const { owner, name } = splitRepo(str("repo"), login);
        const filePath = str("path");
        const r = await gh<unknown>(
          token,
          `/repos/${owner}/${name}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`
        );
        if (Array.isArray(r)) {
          return {
            ok: true,
            data: (r as Array<Record<string, unknown>>).map((e) => ({
              name: e.name,
              type: e.type,
              path: e.path,
            })),
          };
        }
        const file = r as Record<string, unknown>;
        const content =
          file.encoding === "base64" && typeof file.content === "string"
            ? Buffer.from(file.content, "base64").toString("utf8")
            : "";
        return {
          ok: true,
          data: { path: file.path, size: file.size, content: content.slice(0, 12000) },
        };
      }

      case "create_repo": {
        const name = (str("name") || str("repo")).split("/").pop()?.trim() || "";
        if (!name) {
          return { ok: false, error: "A repository name is required (e.g. \"my-project\")." };
        }
        const r = await gh<Record<string, unknown>>(token, "/user/repos", {
          method: "POST",
          body: JSON.stringify({
            name,
            description: str("description") || undefined,
            private: bool("private"),
            auto_init: args.autoInit === false ? false : true,
          }),
        });
        return {
          ok: true,
          data: { full_name: r.full_name, private: r.private, url: r.html_url },
        };
      }

      case "put_file": {
        const { owner, name } = splitRepo(str("repo"), login);
        const filePath = str("path");
        const apiPath = `/repos/${owner}/${name}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`;
        const branch = str("branch") || "main";
        // Need the existing blob SHA to update (omit to create).
        let sha: string | undefined;
        try {
          const existing = await gh<Record<string, unknown>>(token, `${apiPath}?ref=${encodeURIComponent(branch)}`);
          if (existing && typeof existing.sha === "string") sha = existing.sha;
        } catch {
          /* file doesn't exist yet — creating */
        }
        try {
          const r = await gh<Record<string, unknown>>(token, apiPath, {
            method: "PUT",
            body: JSON.stringify({
              message: str("message") || `Update ${filePath} via KodaAI`,
              content: Buffer.from(str("content"), "utf8").toString("base64"),
              ...(sha ? { sha } : {}),
              branch,
              author: {
                name: "koda-ai-agent",
                email: "koda-support@hsrprojects.org",
              },
              committer: {
                name: "koda-ai-agent",
                email: "koda-support@hsrprojects.org",
              },
            }),
          });
          const commit = (r.commit as Record<string, unknown>) || {};
          return {
            ok: true,
            data: { path: filePath, action: sha ? "updated" : "created", commit_url: commit.html_url },
          };
        } catch (e: any) {
          // If 404 on branch, try to create the branch first
          if (e.message?.includes("404") && !sha) {
            try {
              // Get default branch SHA
              const repo = await gh<Record<string, unknown>>(token, `/repos/${owner}/${name}`);
              const defaultBranch = repo.default_branch || "main";
              const ref = await gh<Record<string, unknown>>(token, `/repos/${owner}/${name}/git/ref/heads/${defaultBranch}`);
              const baseSha = (ref.object as Record<string, unknown>)?.sha as string;
              // Create the target branch
              await gh<unknown>(token, `/repos/${owner}/${name}/git/refs`, {
                method: "POST",
                body: JSON.stringify({
                  ref: `refs/heads/${branch}`,
                  sha: baseSha,
                }),
              });
              // Retry the put_file
              const r = await gh<Record<string, unknown>>(token, apiPath, {
                method: "PUT",
                body: JSON.stringify({
                  message: str("message") || `Update ${filePath} via KodaAI`,
                  content: Buffer.from(str("content"), "utf8").toString("base64"),
                  branch,
                  author: {
                    name: "koda-ai-agent",
                    email: "koda-support@hsrprojects.org",
                  },
                  committer: {
                    name: "koda-ai-agent",
                    email: "koda-support@hsrprojects.org",
                  },
                }),
              });
              const commit = (r.commit as Record<string, unknown>) || {};
              return {
                ok: true,
                data: { path: filePath, action: "created", commit_url: commit.html_url },
              };
            } catch (e2) {
              return { ok: false, error: `Failed to create branch and file: ${(e2 as Error).message}` };
            }
          }
          return { ok: false, error: e.message || "GitHub API error" };
        }
      }

      // ─── Batch file operations for agentic coding ────────────────
      case "put_files": {
        const { owner, name } = splitRepo(str("repo"), login);
        const files = args.files as Array<{ path: string; content: string }> | undefined;
        const branch = str("branch") || "main";
        const message = str("message") || "Batch update via KodaAI";

        if (!files || !Array.isArray(files) || files.length === 0) {
          return { ok: false, error: "files array required" };
        }

        try {
          // Get repo info and default branch
          const repo = await gh<Record<string, unknown>>(token, `/repos/${owner}/${name}`);
          const defaultBranch = repo.default_branch || "main";

          // Create target branch if needed
          if (branch !== defaultBranch) {
            try {
              await gh<unknown>(token, `/repos/${owner}/${name}/git/ref/heads/${branch}`);
            } catch {
              const ref = await gh<Record<string, unknown>>(token, `/repos/${owner}/${name}/git/ref/heads/${defaultBranch}`);
              const baseSha = (ref.object as Record<string, unknown>)?.sha as string;
              await gh<unknown>(token, `/repos/${owner}/${name}/git/refs`, {
                method: "POST",
                body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
              });
            }
          }

          // Create blobs for all files
          const blobs: Array<{ sha: string }> = [];
          for (const f of files) {
            const blob = await gh<Record<string, unknown>>(token, `/repos/${owner}/${name}/git/blobs`, {
              method: "POST",
              body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
            });
            blobs.push({ sha: blob.sha as string });
          }

          // Get base tree
          const baseTree = await gh<Record<string, unknown>>(token, `/repos/${owner}/${name}/git/trees/${branch}?recursive=1`);
          const treeItems = (baseTree.tree as Array<Record<string, unknown>>).map((t) => ({
            path: t.path as string,
            mode: t.mode as string,
            type: t.type as string,
            sha: t.sha as string,
          }));

          // Add new/updated files
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            treeItems.push({
              path: f.path,
              mode: "100644",
              type: "blob",
              sha: blobs[i].sha,
            });
          }

          // Create new tree
          const newTree = await gh<Record<string, unknown>>(token, `/repos/${owner}/${name}/git/trees`, {
            method: "POST",
            body: JSON.stringify({ base_tree: (baseTree.sha as string), tree: treeItems }),
          });

          // Create commit
          const commit = await gh<Record<string, unknown>>(token, `/repos/${owner}/${name}/git/commits`, {
            method: "POST",
            body: JSON.stringify({
              message,
              tree: newTree.sha,
              parents: [baseTree.sha],
              author: { name: "koda-ai-agent", email: "koda-support@hsrprojects.org" },
              committer: { name: "koda-ai-agent", email: "koda-support@hsrprojects.org" },
            }),
          });

          // Update branch reference
          await gh<unknown>(token, `/repos/${owner}/${name}/git/refs/heads/${branch}`, {
            method: "PATCH",
            body: JSON.stringify({ sha: commit.sha, force: true }),
          });

          return {
            ok: true,
            data: { committed: files.length, branch, commit_url: commit.html_url },
          };
        } catch (e: any) {
          return { ok: false, error: e.message || "Batch commit failed" };
        }
      }

      case "trigger_workflow": {
        const { owner, name } = splitRepo(str("repo"), login);
        const wf = str("workflow");
        await gh<unknown>(token, `/repos/${owner}/${name}/actions/workflows/${encodeURIComponent(wf)}/dispatches`, {
          method: "POST",
          body: JSON.stringify({
            ref: str("ref") || "main",
            ...(args.inputs && typeof args.inputs === "object" ? { inputs: args.inputs } : {}),
          }),
        });
        return { ok: true, data: { workflow: wf, ref: str("ref") || "main", dispatched: true } };
      }

      case "list_runs": {
        const { owner, name } = splitRepo(str("repo"), login);
        const r = await gh<{ workflow_runs?: Array<Record<string, unknown>> }>(
          token,
          `/repos/${owner}/${name}/actions/runs?per_page=10`
        );
        return {
          ok: true,
          data: (r.workflow_runs ?? []).map((run) => ({
            name: run.name,
            status: run.status,
            conclusion: run.conclusion,
            branch: run.head_branch,
            event: run.event,
            url: run.html_url,
            created_at: run.created_at,
          })),
        };
      }

      case "get_profile": {
        const r = await gh<Record<string, unknown>>(token, "/user");
        return {
          ok: true,
          data: {
            login: r.login,
            name: r.name,
            bio: r.bio,
            company: r.company,
            location: r.location,
            blog: r.blog,
            public_repos: r.public_repos,
            followers: r.followers,
            following: r.following,
            url: r.html_url,
          },
        };
      }

      case "update_profile": {
        const patch: Record<string, unknown> = {};
        for (const k of ["name", "bio", "company", "location", "blog"]) {
          if (typeof args[k] === "string") patch[k] = args[k];
        }
        const r = await gh<Record<string, unknown>>(token, "/user", {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        return {
          ok: true,
          data: { login: r.login, name: r.name, bio: r.bio, updated: Object.keys(patch) },
        };
      }

      default:
        return { ok: false, error: `Unknown GitHub action "${action}".` };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message || "GitHub request failed." };
  }
}