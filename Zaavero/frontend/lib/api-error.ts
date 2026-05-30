/** Parse FastAPI / Pydantic error responses into human-readable strings. */

type ValidationErrorItem = {
  type?: string;
  loc?: (string | number)[];
  msg?: string;
  input?: unknown;
};

export function parseApiError(detail: unknown, fallback = "Something went wrong"): string {
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = (detail as ValidationErrorItem[])
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && item.msg) {
          const field = Array.isArray(item.loc) ? item.loc.filter((x) => x !== "body").join(".") : "";
          return field ? `${field}: ${item.msg}` : item.msg;
        }
        return null;
      })
      .filter(Boolean);
    return messages.length ? messages.join(". ") : fallback;
  }
  if (typeof detail === "object" && detail !== null && "msg" in detail) {
    return String((detail as ValidationErrorItem).msg);
  }
  return fallback;
}
