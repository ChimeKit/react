import { describe, it, expect } from "vitest";
import {
  validateMessageDetailsResponse,
  sanitizeMessageDetailsResponse,
} from "../validateApiResponse";
import type { ChimeKitMessageDetailsResponse } from "../../types";

describe("validateMessageDetailsResponse", () => {
  const validResponse: ChimeKitMessageDetailsResponse = {
    messageId: "msg-123",
    title: "Test Title",
    snippet: "Test snippet",
    createdAt: "2024-01-15T10:00:00Z",
    bodyHtml: "<p>Hello World</p>",
    category: "updates",
  };

  describe("basic validation", () => {
    it("validates a minimal valid response", () => {
      const result = validateMessageDetailsResponse(validResponse);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(validResponse);
      }
    });

    it("rejects null response", () => {
      const result = validateMessageDetailsResponse(null);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("Response must be an object");
      }
    });

    it("rejects non-object response", () => {
      const result = validateMessageDetailsResponse("string");
      expect(result.valid).toBe(false);
    });

    it("rejects response with missing messageId", () => {
      const response = { ...validResponse, messageId: undefined };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("messageId must be a non-empty string");
      }
    });

    it("rejects response with empty messageId", () => {
      const response = { ...validResponse, messageId: "" };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
    });

    it("accepts response with null title", () => {
      const response = { ...validResponse, title: null };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("accepts response with null snippet", () => {
      const response = { ...validResponse, snippet: null };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("accepts response with null category", () => {
      const response = { ...validResponse, category: null };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("rejects response with non-string bodyHtml", () => {
      const response = { ...validResponse, bodyHtml: 123 };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("bodyHtml must be a string");
      }
    });
  });

  describe("link action validation", () => {
    it("validates response with valid https link action", () => {
      const response: ChimeKitMessageDetailsResponse = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Click me",
          type: "primary",
          href: "https://example.com/action",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("validates response with valid http link action", () => {
      const response: ChimeKitMessageDetailsResponse = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Click me",
          type: "primary",
          href: "http://example.com/action",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("validates response with mailto link action", () => {
      const response: ChimeKitMessageDetailsResponse = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Email us",
          type: "primary",
          href: "mailto:test@example.com",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("validates response with tel link action", () => {
      const response: ChimeKitMessageDetailsResponse = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Call us",
          type: "primary",
          href: "tel:+1234567890",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("rejects response with javascript: protocol in link action", () => {
      const response = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Click me",
          type: "primary",
          href: "javascript:alert('xss')",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe(
          "primaryAction has invalid structure or unsafe URL"
        );
      }
    });

    it("rejects response with data: protocol in link action", () => {
      const response = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Click me",
          type: "primary",
          href: "data:text/html,<script>alert('xss')</script>",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
    });

    it("rejects response with vbscript: protocol in link action", () => {
      const response = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Click me",
          type: "primary",
          href: "vbscript:msgbox('xss')",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
    });

    it("rejects link action with empty href", () => {
      const response = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Click me",
          type: "primary",
          href: "",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
    });

    it("rejects link action with empty label", () => {
      const response = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "",
          type: "primary",
          href: "https://example.com",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
    });

    it("rejects link action with invalid type", () => {
      const response = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Click",
          type: "invalid",
          href: "https://example.com",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
    });

    it("validates link action with valid target", () => {
      const response: ChimeKitMessageDetailsResponse = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Click me",
          type: "primary",
          href: "https://example.com",
          target: "_blank",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("rejects link action with invalid target type", () => {
      const response = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Click me",
          type: "primary",
          href: "https://example.com",
          target: 123,
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
    });
  });

  describe("callback action validation", () => {
    it("validates response with valid callback action", () => {
      const response: ChimeKitMessageDetailsResponse = {
        ...validResponse,
        primaryAction: {
          kind: "callback",
          label: "Click me",
          type: "primary",
          actionId: "action-123",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("rejects callback action with empty actionId", () => {
      const response = {
        ...validResponse,
        primaryAction: {
          kind: "callback",
          label: "Click me",
          type: "primary",
          actionId: "",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
    });

    it("rejects callback action with empty label", () => {
      const response = {
        ...validResponse,
        primaryAction: {
          kind: "callback",
          label: "",
          type: "primary",
          actionId: "action-123",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
    });
  });

  describe("secondary action validation", () => {
    it("validates response with both primary and secondary actions", () => {
      const response: ChimeKitMessageDetailsResponse = {
        ...validResponse,
        primaryAction: {
          kind: "link",
          label: "Primary",
          type: "primary",
          href: "https://example.com/primary",
        },
        secondaryAction: {
          kind: "callback",
          label: "Secondary",
          type: "secondary",
          actionId: "action-456",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(true);
    });

    it("rejects response with unsafe secondary action URL", () => {
      const response = {
        ...validResponse,
        secondaryAction: {
          kind: "link",
          label: "Secondary",
          type: "secondary",
          href: "javascript:void(0)",
        },
      };
      const result = validateMessageDetailsResponse(response);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe(
          "secondaryAction has invalid structure or unsafe URL"
        );
      }
    });
  });
});

describe("sanitizeMessageDetailsResponse", () => {
  const validResponse: ChimeKitMessageDetailsResponse = {
    messageId: "msg-123",
    title: "Test Title",
    snippet: "Test snippet",
    createdAt: "2024-01-15T10:00:00Z",
    bodyHtml: "<p>Hello World</p>",
    category: "updates",
  };

  it("preserves valid actions", () => {
    const response: ChimeKitMessageDetailsResponse = {
      ...validResponse,
      primaryAction: {
        kind: "link",
        label: "Click me",
        type: "primary",
        href: "https://example.com",
      },
    };
    const sanitized = sanitizeMessageDetailsResponse(response);
    expect(sanitized.primaryAction).toBeDefined();
    expect(sanitized.primaryAction?.kind).toBe("link");
  });

  it("removes primary action with unsafe URL", () => {
    const response: ChimeKitMessageDetailsResponse = {
      ...validResponse,
      primaryAction: {
        kind: "link",
        label: "Click me",
        type: "primary",
        href: "javascript:alert('xss')",
      },
    };
    const sanitized = sanitizeMessageDetailsResponse(response);
    expect(sanitized.primaryAction).toBeUndefined();
  });

  it("removes secondary action with unsafe URL", () => {
    const response: ChimeKitMessageDetailsResponse = {
      ...validResponse,
      secondaryAction: {
        kind: "link",
        label: "Click me",
        type: "secondary",
        href: "data:text/html,<script>alert('xss')</script>",
      },
    };
    const sanitized = sanitizeMessageDetailsResponse(response);
    expect(sanitized.secondaryAction).toBeUndefined();
  });

  it("preserves message content when actions are stripped", () => {
    const response: ChimeKitMessageDetailsResponse = {
      ...validResponse,
      primaryAction: {
        kind: "link",
        label: "Click me",
        type: "primary",
        href: "javascript:malicious()",
      },
    };
    const sanitized = sanitizeMessageDetailsResponse(response);
    expect(sanitized.messageId).toBe("msg-123");
    expect(sanitized.title).toBe("Test Title");
    expect(sanitized.bodyHtml).toBe("<p>Hello World</p>");
    expect(sanitized.primaryAction).toBeUndefined();
  });

  it("keeps valid action when other action is invalid", () => {
    const response: ChimeKitMessageDetailsResponse = {
      ...validResponse,
      primaryAction: {
        kind: "link",
        label: "Valid",
        type: "primary",
        href: "https://safe.example.com",
      },
      secondaryAction: {
        kind: "link",
        label: "Invalid",
        type: "secondary",
        href: "javascript:void(0)",
      },
    };
    const sanitized = sanitizeMessageDetailsResponse(response);
    expect(sanitized.primaryAction).toBeDefined();
    expect(sanitized.secondaryAction).toBeUndefined();
  });

  it("does not mutate the original response", () => {
    const response: ChimeKitMessageDetailsResponse = {
      ...validResponse,
      primaryAction: {
        kind: "link",
        label: "Click me",
        type: "primary",
        href: "javascript:alert('xss')",
      },
    };
    const sanitized = sanitizeMessageDetailsResponse(response);
    expect(response.primaryAction).toBeDefined();
    expect(sanitized.primaryAction).toBeUndefined();
  });
});
