import { describe, expect, it } from "vitest";

import { formatInboxTimestamp } from "../formatInboxTimestamp";

const now = new Date(2024, 10, 11, 12, 0, 0);
const locale = "en-US";

describe("formatInboxTimestamp", () => {
  it("formats timestamps for today", () => {
    const date = new Date(2024, 10, 11, 10, 1, 0);
    expect(formatInboxTimestamp(date, { now, locale })).toBe(
      "Today at 10:01 AM"
    );
  });

  it("formats timestamps for yesterday", () => {
    const date = new Date(2024, 10, 10, 21, 21, 0);
    expect(formatInboxTimestamp(date, { now, locale })).toBe(
      "Yesterday at 9:21 PM"
    );
  });

  it("formats timestamps earlier in the year without year suffix", () => {
    const date = new Date(2024, 10, 1, 17, 45, 0);
    expect(formatInboxTimestamp(date, { now, locale })).toBe(
      "November 1 at 5:45 PM"
    );
  });

  it("includes the year when different from the current year", () => {
    const date = new Date(2023, 5, 15, 8, 0, 0);
    expect(formatInboxTimestamp(date, { now, locale })).toBe(
      "June 15, 2023 at 8:00 AM"
    );
  });

  it("returns an empty string for invalid dates", () => {
    const invalidDate = new Date("invalid");
    expect(formatInboxTimestamp(invalidDate, { now, locale })).toBe("");
  });
});
