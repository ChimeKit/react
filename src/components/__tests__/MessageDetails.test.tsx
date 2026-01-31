import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageDetails } from "../MessageDetails";

// Mock the useChimeKit hook
const { mockGetMessage } = vi.hoisted(() => ({
  mockGetMessage: vi.fn(),
}));

let mockBranding = { primaryColor: null, showPoweredBy: true };
let mockBrandingLoaded = true;

vi.mock("../../hooks/useChimeKit", () => ({
  useChimeKit: () => ({
    publicKey: "test-public-key",
    client: {
      getMessage: mockGetMessage,
    },
    branding: mockBranding,
    brandingLoaded: mockBrandingLoaded,
  }),
}));

// Mock PoweredByFooter to avoid rendering issues
vi.mock("../PoweredByFooter", () => ({
  PoweredByFooter: () => (
    <div data-testid="powered-by-footer">Powered by ChimeKit</div>
  ),
}));

// Mock Radix UI ScrollArea components to avoid JSDOM issues
vi.mock("@radix-ui/react-scroll-area", () => ({
  Root: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="scroll-area-root" {...props}>
      {children}
    </div>
  ),
  Viewport: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="scroll-area-viewport" {...props}>
      {children}
    </div>
  ),
  Scrollbar: ({
    children,
    ...props
  }: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="scroll-area-scrollbar" {...props}>
      {children}
    </div>
  ),
  Thumb: (props: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="scroll-area-thumb" {...props} />
  ),
  Corner: (props: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="scroll-area-corner" {...props} />
  ),
}));

describe("MessageDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBranding = { primaryColor: null, showPoweredBy: true };
    mockBrandingLoaded = true;
  });

  it("renders nothing if no messageId is provided", () => {
    const { container } = render(<MessageDetails messageId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing if messageId is undefined", () => {
    const { container } = render(<MessageDetails />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders loading state", () => {
    mockGetMessage.mockReturnValue(new Promise(() => {}));
    const { container } = render(<MessageDetails messageId="123" />);
    // Check for default loading indicator
    expect(
      container.querySelector(
        '[data-chimekit-slot="chimekit-message-details-loading"]'
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Loading message…")).toBeInTheDocument();
  });

  it("renders custom loading state", () => {
    mockGetMessage.mockReturnValue(new Promise(() => {}));
    render(
      <MessageDetails
        messageId="123"
        renderLoading={() => <div>Custom Loading...</div>}
      />
    );
    expect(screen.getByText("Custom Loading...")).toBeInTheDocument();
  });

  it("renders error state", async () => {
    mockGetMessage.mockRejectedValue(new Error("Failed to fetch"));
    render(<MessageDetails messageId="123" />);
    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to load this message right now. Please try again."
        )
      ).toBeInTheDocument();
    });
  });

  it("renders custom error state", async () => {
    mockGetMessage.mockRejectedValue(new Error("Failed to fetch"));
    render(
      <MessageDetails
        messageId="123"
        renderError={(err) => <div>Custom Error: {err}</div>}
      />
    );
    await waitFor(() => {
      expect(
        screen.getByText(
          "Custom Error: Unable to load this message right now. Please try again."
        )
      ).toBeInTheDocument();
    });
  });

  it("renders message content", async () => {
    const message = {
      messageId: "123",
      title: "Test Message",
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: "Test Category",
      snippet: null,
    };
    mockGetMessage.mockResolvedValue(message);
    render(<MessageDetails messageId="123" />);

    await waitFor(
      () => {
        expect(screen.getByText("Test Message")).toBeInTheDocument();
        expect(screen.getByText("Test Category")).toBeInTheDocument();
        // Body is rendered via dangerouslySetInnerHTML, so we look for text
        expect(screen.getByText("Hello World")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("renders message with null title as 'Notification'", async () => {
    const message = {
      messageId: "123",
      title: null,
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: null,
    };
    mockGetMessage.mockResolvedValue(message);
    render(<MessageDetails messageId="123" />);

    await waitFor(
      () => {
        expect(screen.getByText("Notification")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("renders message with empty title as 'Notification'", async () => {
    const message = {
      messageId: "123",
      title: "   ",
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: null,
    };
    mockGetMessage.mockResolvedValue(message);
    render(<MessageDetails messageId="123" />);

    await waitFor(
      () => {
        expect(screen.getByText("Notification")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("renders timestamp when provided", async () => {
    const message = {
      messageId: "123",
      title: "Test Message",
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: null,
    };
    mockGetMessage.mockResolvedValue(message);
    render(<MessageDetails messageId="123" />);

    await waitFor(
      () => {
        expect(screen.getByText("Test Message")).toBeInTheDocument();
        // Timestamp should be rendered as a time element
        const timeElement = screen.getByRole("time");
        expect(timeElement).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("renders snippet when displaySnippet is true", async () => {
    const message = {
      messageId: "123",
      title: "Test Message",
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: "This is a snippet",
    };
    mockGetMessage.mockResolvedValue(message);
    render(<MessageDetails messageId="123" displaySnippet={true} />);

    await waitFor(
      () => {
        expect(screen.getByText("This is a snippet")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("does not render snippet when displaySnippet is false", async () => {
    const message = {
      messageId: "123",
      title: "Test Message",
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: "This is a snippet",
    };
    mockGetMessage.mockResolvedValue(message);
    render(<MessageDetails messageId="123" displaySnippet={false} />);

    await waitFor(
      () => {
        expect(screen.getByText("Test Message")).toBeInTheDocument();
        expect(screen.queryByText("This is a snippet")).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("ignores hideFooter when branding is required", async () => {
    const message = {
      messageId: "123",
      title: "Test Message",
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: null,
    };
    mockGetMessage.mockResolvedValue(message);
    render(<MessageDetails messageId="123" hideFooter={true} />);

    await waitFor(
      () => {
        expect(screen.getByText("Test Message")).toBeInTheDocument();
        expect(screen.getByTestId("powered-by-footer")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("hides footer when branding is disabled", async () => {
    const message = {
      messageId: "123",
      title: "Test Message",
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: null,
    };
    mockBranding = { primaryColor: null, showPoweredBy: false };
    mockBrandingLoaded = true;
    mockGetMessage.mockResolvedValue(message);
    render(<MessageDetails messageId="123" />);

    await waitFor(
      () => {
        expect(screen.getByText("Test Message")).toBeInTheDocument();
        expect(
          screen.queryByTestId("powered-by-footer")
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("applies granular classes", async () => {
    const message = {
      messageId: "123",
      title: "Test Message",
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: null,
    };
    mockGetMessage.mockResolvedValue(message);
    const classes = {
      root: "custom-root",
      header: "custom-header",
      title: "custom-title",
    };
    const { container } = render(
      <MessageDetails messageId="123" classes={classes} />
    );

    await waitFor(
      () => {
        expect(screen.getByText("Test Message")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(container.querySelector(".custom-root")).toBeInTheDocument();
    expect(container.querySelector(".custom-header")).toBeInTheDocument();
    expect(container.querySelector(".custom-title")).toBeInTheDocument();
  });

  it("applies className prop", async () => {
    const message = {
      messageId: "123",
      title: "Test Message",
      bodyHtml: "<p>Hello World</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: null,
    };
    mockGetMessage.mockResolvedValue(message);
    const { container } = render(
      <MessageDetails messageId="123" className="external-class" />
    );

    await waitFor(
      () => {
        expect(screen.getByText("Test Message")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const root = container.querySelector(
      '[data-chimekit-slot="chimekit-message-details-root"]'
    );
    expect(root).toHaveClass("external-class");
  });

  it("handles messageId change", async () => {
    const message1 = {
      messageId: "123",
      title: "First Message",
      bodyHtml: "<p>First</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: null,
    };
    const message2 = {
      messageId: "456",
      title: "Second Message",
      bodyHtml: "<p>Second</p>",
      createdAt: new Date().toISOString(),
      category: null,
      snippet: null,
    };

    mockGetMessage.mockImplementation(async (id: string) => {
      if (id === "123") return message1;
      if (id === "456") return message2;
      throw new Error(`Unexpected messageId: ${id}`);
    });

    const { rerender } = render(<MessageDetails messageId="123" />);

    await waitFor(
      () => {
        expect(screen.getByText("First Message")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    rerender(<MessageDetails messageId="456" />);

    await waitFor(
      () => {
        expect(screen.getByText("Second Message")).toBeInTheDocument();
        expect(screen.queryByText("First Message")).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
