import { isSafeUrl } from "./safeUrl";

/**
 * Allowlist of safe HTML tags for message content.
 * Using an allowlist approach is more secure than a blocklist because
 * it explicitly defines what is permitted rather than trying to block
 * all possible attack vectors.
 */
const ALLOWED_TAGS = new Set([
  // Text formatting
  "p",
  "br",
  "span",
  "div",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "del",
  "ins",
  "sub",
  "sup",
  "small",
  "mark",
  "abbr",
  "code",
  "pre",
  "kbd",
  "samp",
  "var",
  "cite",
  "q",
  "blockquote",
  // Headings
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  // Lists
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  // Tables
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  // Links and images
  "a",
  "img",
  // Semantic elements
  "article",
  "section",
  "aside",
  "header",
  "footer",
  "nav",
  "main",
  "figure",
  "figcaption",
  "details",
  "summary",
  // Other safe elements
  "hr",
  "wbr",
  "time",
  "address",
  "ruby",
  "rt",
  "rp",
]);

/**
 * Allowlist of safe attributes per tag.
 * Only these attributes will be preserved; all others are stripped.
 */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  "*": new Set([
    "id",
    "class",
    "title",
    "lang",
    "dir",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-hidden",
    "role",
    "tabindex",
    "data-*", // Handled specially below
  ]),
  a: new Set(["href", "target", "rel", "download", "hreflang", "type"]),
  img: new Set(["src", "alt", "width", "height", "loading", "decoding"]),
  td: new Set(["colspan", "rowspan", "headers"]),
  th: new Set(["colspan", "rowspan", "headers", "scope"]),
  col: new Set(["span"]),
  colgroup: new Set(["span"]),
  ol: new Set(["start", "reversed", "type"]),
  li: new Set(["value"]),
  time: new Set(["datetime"]),
  blockquote: new Set(["cite"]),
  q: new Set(["cite"]),
  abbr: new Set(["title"]),
  details: new Set(["open"]),
};

const ESCAPE_LOOKUP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (input: string) =>
  input.replace(/[&<>"']/g, (char) => ESCAPE_LOOKUP[char] ?? char);

/**
 * Check if an attribute name is allowed for the given tag.
 */
const isAllowedAttr = (tagName: string, attrName: string): boolean => {
  const globalAttrs = ALLOWED_ATTRS["*"];
  const tagAttrs = ALLOWED_ATTRS[tagName];

  // Check global attributes
  if (globalAttrs?.has(attrName)) {
    return true;
  }

  // Check data-* attributes (allowed globally)
  if (attrName.startsWith("data-")) {
    return true;
  }

  // Check tag-specific attributes
  if (tagAttrs?.has(attrName)) {
    return true;
  }

  return false;
};

/**
 * Recursively sanitize an element and its children using allowlist approach.
 * Elements not in the allowlist have their contents preserved but the tag removed.
 */
const sanitizeElement = (element: Element, doc: Document): void => {
  const children = Array.from(element.children);

  for (const child of children) {
    const tagName = child.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      // Replace disallowed element with its text content
      const textContent = child.textContent ?? "";
      const textNode = doc.createTextNode(textContent);
      child.replaceWith(textNode);
      continue;
    }

    // Sanitize attributes - remove any not in the allowlist
    const attrs = Array.from(child.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();

      // Remove all event handlers (on*)
      if (name.startsWith("on")) {
        child.removeAttribute(attr.name);
        continue;
      }

      // Remove style attribute (can be used for CSS-based attacks)
      if (name === "style") {
        child.removeAttribute(attr.name);
        continue;
      }

      // Check if attribute is in allowlist
      if (!isAllowedAttr(tagName, name)) {
        child.removeAttribute(attr.name);
        continue;
      }

      // Validate URL attributes
      if (name === "href" || name === "src") {
        if (!isSafeUrl(attr.value)) {
          child.removeAttribute(attr.name);
        }
      }
    }

    // Add security attributes to external links
    if (tagName === "a") {
      const target = child.getAttribute("target");
      if (target && target.toLowerCase() === "_blank") {
        const rel = child.getAttribute("rel") ?? "";
        const relTokens = new Set(
          rel
            .split(/\s+/)
            .map((token) => token.trim())
            .filter(Boolean)
        );
        relTokens.add("noopener");
        relTokens.add("noreferrer");
        child.setAttribute("rel", Array.from(relTokens).join(" "));
      }
    }

    // Recursively sanitize children
    sanitizeElement(child, doc);
  }
};

export const sanitizeHtml = (input: string): string => {
  if (!input) {
    return "";
  }

  if (typeof DOMParser === "undefined" || typeof document === "undefined") {
    return escapeHtml(input);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");

  // Sanitize from body element
  sanitizeElement(doc.body, doc);

  return doc.body.innerHTML;
};
