import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const callback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const installationId = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");
  const failure = (message: string, status = 400) => new Response(`<h1>GitHub connection failed</h1><p>${message}</p><p>You can close this tab and try again.</p>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
  if (!code && !installationId) return failure("Missing GitHub authorization code or installation.");

  // GitHub App installations redirect with installation_id and no OAuth state.
  // In that case, the user authorization code is still exchanged below and
  // the OAuth identity is stored directly for the current installation flow.
  const oauthState = state ? await ctx.runMutation(internal.githubConnections.consumeOAuthState, { state }) : null;
  if (!oauthState && !installationId) return failure("This GitHub authorization link expired. Start the connection again.");

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI || (process.env.CONVEX_SITE_URL ? `${process.env.CONVEX_SITE_URL}/github/oauth/callback` : "");
  if (!clientId || !clientSecret || !redirectUri) return failure("GitHub OAuth is missing server keys. Configure GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_OAUTH_REDIRECT_URI using your https://<deployment>.convex.site/github/oauth/callback URL.", 500);

  if (!code) return failure(`GitHub installation ${installationId} completed, but no user authorization code was returned. Enable user authorization during installation and start Connect GitHub from Orbit again.`);

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok || !token.access_token) return failure("GitHub did not return an access token.", 502);

  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token.access_token}`, "X-GitHub-Api-Version": "2022-11-28" },
  });
  const githubUser = await userResponse.json();
  if (!userResponse.ok || !githubUser.id || !githubUser.login) return failure("Could not read the authorized GitHub account.", 502);

  const successUrl = process.env.GITHUB_OAUTH_SUCCESS_URL || process.env.SITE_URL || "";
  if (!oauthState) {
    const ticket = crypto.randomUUID();
    await ctx.runMutation(internal.githubConnections.createOAuthTicket, {
      ticket,
      githubUserId: String(githubUser.id),
      login: githubUser.login,
      accessToken: token.access_token,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    const destination = successUrl.startsWith("http") ? `${successUrl.replace(/\/$/, "")}/dashboard?github_ticket=${encodeURIComponent(ticket)}` : `/dashboard?github_ticket=${encodeURIComponent(ticket)}`;
    return new Response(`<script>window.location.replace(${JSON.stringify(destination)});</script><p>GitHub connected. Returning to Orbit...</p>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  await ctx.runMutation(internal.githubConnections.saveConnection, {
    userId: oauthState.userId,
    githubUserId: String(githubUser.id),
    login: githubUser.login,
    accessToken: token.access_token,
  });

  const destination = successUrl.startsWith("http") ? `${successUrl.replace(/\/$/, "")}/dashboard?github=connected` : "/dashboard?github=connected";
  return new Response(`<script>window.location.replace(${JSON.stringify(destination)});</script><p>GitHub connected. You can close this tab.</p>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});
