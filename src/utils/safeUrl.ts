const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const FALLBACK_BASE = "http://localhost";

export const normalizeSafeUrl = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) {
    return null;
  }
  if (value.startsWith("#")) {
    return value;
  }

  const base =
    typeof window !== "undefined" && window.location
      ? window.location.href
      : FALLBACK_BASE;

  try {
    const parsed = new URL(value, base);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
};

export const isSafeUrl = (raw: string): boolean =>
  normalizeSafeUrl(raw) !== null;

export const safeNavigate = (href: string, target?: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const safeHref = normalizeSafeUrl(href);
  if (!safeHref) {
    return;
  }

  const targetValue = target ?? "_self";
  if (targetValue === "_self") {
    window.location.assign(safeHref);
    return;
  }

  const opened = window.open(safeHref, targetValue, "noopener,noreferrer");
  if (opened) {
    opened.opener = null;
  }
};
