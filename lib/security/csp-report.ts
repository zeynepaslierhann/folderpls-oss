/**
 * Parses browser CSP violation reports into a small, log-safe summary.
 *
 * Browsers send either the legacy `application/csp-report` shape
 * ({ "csp-report": { ... } }) or the Reporting API shape
 * (`application/reports+json`: [{ type: "csp-violation", body: { ... } }]).
 * Only the fields needed to decide the enforce switch are kept; query strings
 * are dropped because they can carry tokens or personal data.
 */

export interface CspViolationSummary {
  directive: string;
  blocked: string;
  page: string;
  disposition: string;
}

const MAX_FIELD = 200;

function pathOnly(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  if (!/^https?:\/\//.test(value)) return value.slice(0, MAX_FIELD); // "inline", "eval", "data" …
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, MAX_FIELD);
  } catch {
    return "";
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_FIELD) : "";
}

function summarize(body: Record<string, unknown>): CspViolationSummary | null {
  const directive =
    str(body["effective-directive"]) ||
    str(body["effectiveDirective"]) ||
    str(body["violated-directive"]);
  if (!directive) return null;
  return {
    directive,
    blocked: pathOnly(body["blocked-uri"] ?? body["blockedURL"]),
    page: pathOnly(body["document-uri"] ?? body["documentURL"]),
    disposition: str(body["disposition"]) || "report",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCspReports(payload: unknown): CspViolationSummary[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((r): r is Record<string, unknown> => isRecord(r) && r.type === "csp-violation" && isRecord(r.body))
      .map((r) => summarize(r.body as Record<string, unknown>))
      .filter((s): s is CspViolationSummary => s !== null)
      .slice(0, 20);
  }
  if (isRecord(payload) && isRecord(payload["csp-report"])) {
    const s = summarize(payload["csp-report"]);
    return s ? [s] : [];
  }
  return [];
}
