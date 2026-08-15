import { readFileSync } from "fs";

/**
 * The package version, single-sourced from package.json.
 *
 * This lives in its own module rather than in buildServer.ts because the daemon
 * socket path needs it too (issue #99), and the shim must not import the server
 * to learn its own version — the whole point of the shim is that it starts
 * without building an McpServer or touching the OmniFocus bridge.
 *
 * Works from both src/ (tsx) and dist/ (build): each is one level below the
 * package root.
 */
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
);

export const SERVER_VERSION: string = version;

/**
 * The version rendered safe for use inside a filename.
 *
 * Semver permits characters that are legal in a path but unpleasant in one
 * (`+` for build metadata, `-` and `.` for prereleases), and nothing stops a
 * fork from putting a `/` in there — which would silently redirect the socket
 * into a subdirectory that does not exist. Collapse anything outside a
 * conservative set.
 */
export const VERSION_SLUG: string = SERVER_VERSION.replace(/[^A-Za-z0-9._-]/g, "-");
