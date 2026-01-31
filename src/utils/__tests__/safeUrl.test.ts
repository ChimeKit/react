import { describe, expect, it } from "vitest";

import { normalizeSafeUrl, isSafeUrl } from "../safeUrl";

describe("normalizeSafeUrl", () => {
  it("returns null for empty strings", () => {
    expect(normalizeSafeUrl("")).toBeNull();
    expect(normalizeSafeUrl("   ")).toBeNull();
  });

  it("allows fragment-only URLs", () => {
    expect(normalizeSafeUrl("#section")).toBe("#section");
    expect(normalizeSafeUrl("#top")).toBe("#top");
    expect(normalizeSafeUrl("#")).toBe("#");
  });

  it("allows http URLs", () => {
    expect(normalizeSafeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeSafeUrl("http://example.com/path")).toBe(
      "http://example.com/path"
    );
    expect(normalizeSafeUrl("http://example.com/path?query=1")).toBe(
      "http://example.com/path?query=1"
    );
  });

  it("allows https URLs", () => {
    expect(normalizeSafeUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeSafeUrl("https://example.com/path")).toBe(
      "https://example.com/path"
    );
  });

  it("allows mailto URLs", () => {
    expect(normalizeSafeUrl("mailto:test@example.com")).toBe(
      "mailto:test@example.com"
    );
    expect(normalizeSafeUrl("mailto:test@example.com?subject=Hello")).toBe(
      "mailto:test@example.com?subject=Hello"
    );
  });

  it("allows tel URLs", () => {
    expect(normalizeSafeUrl("tel:+1234567890")).toBe("tel:+1234567890");
    expect(normalizeSafeUrl("tel:555-1234")).toBe("tel:555-1234");
  });

  it("rejects javascript URLs", () => {
    expect(normalizeSafeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSafeUrl("javascript:void(0)")).toBeNull();
    expect(normalizeSafeUrl("JAVASCRIPT:alert(1)")).toBeNull();
  });

  it("rejects data URLs", () => {
    expect(
      normalizeSafeUrl("data:text/html,<script>alert(1)</script>")
    ).toBeNull();
    expect(normalizeSafeUrl("data:image/png;base64,abc123")).toBeNull();
  });

  it("rejects vbscript URLs", () => {
    expect(normalizeSafeUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects file URLs", () => {
    expect(normalizeSafeUrl("file:///etc/passwd")).toBeNull();
  });

  it("handles relative URLs", () => {
    expect(normalizeSafeUrl("/path/to/page")).toBe("/path/to/page");
    expect(normalizeSafeUrl("./relative")).toBe("./relative");
    expect(normalizeSafeUrl("../parent")).toBe("../parent");
  });

  it("handles URLs with special characters", () => {
    expect(normalizeSafeUrl("https://example.com/path%20with%20spaces")).toBe(
      "https://example.com/path%20with%20spaces"
    );
  });

  it("handles strings that could be relative paths", () => {
    // The URL API treats plain strings as relative paths, which is valid behavior
    // These resolve against the current location (or fallback base in SSR)
    expect(normalizeSafeUrl("path/to/page")).toBe("path/to/page");
  });
});

describe("isSafeUrl", () => {
  it("returns true for safe URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("http://example.com")).toBe(true);
    expect(isSafeUrl("mailto:test@example.com")).toBe(true);
    expect(isSafeUrl("tel:+1234567890")).toBe(true);
    expect(isSafeUrl("#section")).toBe(true);
    expect(isSafeUrl("/relative/path")).toBe(true);
  });

  it("returns false for unsafe URLs", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>")).toBe(false);
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeUrl("")).toBe(false);
    expect(isSafeUrl("   ")).toBe(false);
  });
});
