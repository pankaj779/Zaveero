/** Normalize product URLs — fallback when DB still has legacy external doc links. */

export function resolveDocumentationUrl(slug: string, url: string | null | undefined): string {
  if (!url || url.includes("docs.zaavero.com")) {
    return `/documentation/${slug}`;
  }
  if (url.startsWith("/")) return url;
  return url;
}

export function isLocalLaunchUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export function launchHint(url: string): string | null {
  if (!isLocalLaunchUrl(url)) return null;
  try {
    const u = new URL(url);
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    if (port === "5173") {
      return "AgentOps must be running locally (frontend :5173, API :8081). Run scripts/start-local.ps1 or see Documentation → AgentOps.";
    }
    if (port === "3001") {
      return "DataWhisper must be running locally (frontend :3001, API :8002). Run scripts/start-local.ps1 or see Documentation → DataWhisper.";
    }
  } catch {
    /* ignore */
  }
  return null;
}
