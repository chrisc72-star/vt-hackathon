import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { callback as githubOAuthCallback } from "./githubOAuth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/github/oauth/callback",
  method: "GET",
  handler: githubOAuthCallback,
});

export default http;
