import * as React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Inbox } from "../Inbox";

// Mock the useChimeKit hook
const mockGetMeta = vi.fn();
const mockClient = {
  getMeta: mockGetMeta,
  markAllRead: vi.fn(),
  archiveAll: vi.fn(),
};

vi.mock("../../hooks/useChimeKit", () => ({
  useChimeKit: () => ({
    publicKey: "test-public-key",
    client: mockClient,
    branding: { primaryColor: null, showPoweredBy: true },
    brandingLoaded: true,
  }),
}));

// Mock child components to verify props passing
vi.mock("../Bell", () => ({
  Bell: ({
    onClick,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & { onClick?: () => void }) => (
    <div
      data-testid="mock-bell"
      data-props={JSON.stringify(props)}
      onClick={onClick}
    />
  ),
}));

vi.mock("../Feed", () => ({
  Feed: (props: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="mock-feed" data-props={JSON.stringify(props)} />
  ),
}));

vi.mock("../MessageDetails", () => ({
  MessageDetails: (props: React.ComponentPropsWithoutRef<"div">) => (
    <div
      data-testid="mock-message-details"
      data-props={JSON.stringify(props)}
    />
  ),
}));

vi.mock("../Preferences", () => ({
  Preferences: (props: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="mock-preferences" data-props={JSON.stringify(props)} />
  ),
}));

// Mock PreferencesDialog to pass through preferencesProps
const { MockPreferences } = vi.hoisted(() => ({
  MockPreferences: (props: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="mock-preferences" data-props={JSON.stringify(props)} />
  ),
}));

vi.mock("../PreferencesDialog", () => ({
  PreferencesDialog: ({
    open,
    preferencesProps,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preferencesProps?: Record<string, unknown>;
  }) => {
    if (!open) return null;
    return (
      <div
        data-testid="mock-preferences-dialog"
        data-chimekit-slot="chimekit-preferences-dialog-content"
        data-state="open"
        {...props}
      >
        <MockPreferences {...preferencesProps} />
      </div>
    );
  },
}));

// Mock MessageDetailsDialog
const { MockMessageDetails } = vi.hoisted(() => ({
  MockMessageDetails: (
    props: React.ComponentPropsWithoutRef<"div"> & { messageId?: string | null }
  ) => (
    <div
      data-testid="mock-message-details"
      data-props={JSON.stringify(props)}
    />
  ),
}));

vi.mock("../MessageDetailsDialog", () => ({
  MessageDetailsDialog: ({
    open,
    messageId,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    messageId: string | null;
  }) => {
    if (!open || !messageId) return null;
    return (
      <div
        data-testid="mock-message-details-dialog"
        data-chimekit-slot="chimekit-message-details-dialog-content"
        data-state="open"
      >
        <MockMessageDetails messageId={messageId} {...props} />
      </div>
    );
  },
}));

// Mock Radix UI Popover components
vi.mock("@radix-ui/react-popover", () => ({
  Root: ({
    children,
    open,
    onOpenChange,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    const [isOpen, setIsOpen] = React.useState(open ?? false);
    React.useEffect(() => {
      if (open !== undefined) {
        setIsOpen(open);
      }
    }, [open]);
    React.useEffect(() => {
      onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);
    return (
      <div data-testid="radix-popover-root" data-open={isOpen} {...props}>
        {children}
      </div>
    );
  },
  Trigger: ({
    children,
    asChild,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & { asChild?: boolean }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, props);
    }
    return (
      <div data-testid="radix-popover-trigger" {...props}>
        {children}
      </div>
    );
  },
  Portal: ({
    children,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & {
    container?: HTMLElement | null;
  }) => (
    <div data-testid="radix-popover-portal" {...props}>
      {children}
    </div>
  ),
  Content: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="radix-popover-content" {...props}>
      {children}
    </div>
  ),
  Close: ({
    children,
    asChild,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & { asChild?: boolean }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, props);
    }
    return (
      <div data-testid="radix-popover-close" {...props}>
        {children}
      </div>
    );
  },
}));

// Mock Radix UI Dialog components
vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({
    children,
    open,
    onOpenChange,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    const [isOpen, setIsOpen] = React.useState(open ?? false);
    React.useEffect(() => {
      if (open !== undefined) {
        setIsOpen(open);
      }
    }, [open]);
    React.useEffect(() => {
      onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);
    return (
      <div data-testid="radix-dialog-root" data-open={isOpen} {...props}>
        {children}
      </div>
    );
  },
  Portal: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="radix-dialog-portal" {...props}>
      {children}
    </div>
  ),
  Overlay: (props: React.ComponentPropsWithoutRef<"div">) => (
    <div
      data-testid="radix-dialog-overlay"
      data-chimekit-slot="chimekit-preferences-dialog-overlay"
      {...props}
    />
  ),
  Content: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
    <div
      data-testid="radix-dialog-content"
      data-chimekit-slot="chimekit-preferences-dialog-content"
      {...props}
    >
      {children}
    </div>
  ),
  Title: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="radix-dialog-title" {...props}>
      {children}
    </div>
  ),
  Trigger: ({
    children,
    asChild,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & { asChild?: boolean }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, props);
    }
    return (
      <div data-testid="radix-dialog-trigger" {...props}>
        {children}
      </div>
    );
  },
  Close: ({
    children,
    asChild,
    ...props
  }: React.ComponentPropsWithoutRef<"div"> & { asChild?: boolean }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, props);
    }
    return (
      <div data-testid="radix-dialog-close" {...props}>
        {children}
      </div>
    );
  },
}));

// Mock Radix UI VisuallyHidden
vi.mock("@radix-ui/react-visually-hidden", () => ({
  Root: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
    <div data-testid="radix-visually-hidden" {...props}>
      {children}
    </div>
  ),
}));

describe("Inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMeta.mockResolvedValue({
      totalCount: { total: 10, byCategory: [] },
      unreadCount: { total: 5, byCategory: [] },
      categories: [],
    });
  });

  it("renders the bell trigger", async () => {
    render(<Inbox />);
    await waitFor(() => {
      expect(screen.getByTestId("mock-bell")).toBeInTheDocument();
    });
  });

  it("passes bellProps to Bell", async () => {
    render(<Inbox bellProps={{ unread: 99, className: "custom-bell" }} />);
    await waitFor(() => {
      const bell = screen.getByTestId("mock-bell");
      const props = JSON.parse(bell.getAttribute("data-props") || "{}");
      // Note: Inbox overrides 'unread' with its own state, so we check if other props are passed
      expect(props.className).toBe("custom-bell");
    });
  });

  it("opens the inbox and renders header and feed", async () => {
    render(<Inbox />);
    // Click the bell to open
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-bell"));
    });

    await waitFor(
      () => {
        // Radix UI renders in a portal, so we check document.body
        expect(
          document.body.querySelector(
            '[data-chimekit-slot="chimekit-inbox-title"]'
          )
        ).toBeInTheDocument();
        expect(screen.getByTestId("mock-feed")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("uses custom labels", async () => {
    render(
      <Inbox labels={{ title: "My Inbox", tabs: { all: "Everything" } }} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-bell"));
    });

    await waitFor(
      () => {
        // Radix UI renders in a portal
        const title = document.body.querySelector(
          '[data-chimekit-slot="chimekit-inbox-title"]'
        );
        expect(title).toBeInTheDocument();
        expect(title?.textContent).toBe("My Inbox");
        expect(screen.getByText("Everything")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("passes feedProps to Feed", async () => {
    render(<Inbox feedProps={{ showCategory: false }} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-bell"));
    });

    await waitFor(
      () => {
        const feed = screen.getByTestId("mock-feed");
        const props = JSON.parse(feed.getAttribute("data-props") || "{}");
        expect(props.showCategory).toBe(false);
      },
      { timeout: 3000 }
    );
  });

  it("applies granular classes", async () => {
    const classes = {
      root: "custom-root",
      header: "custom-header",
      tabs: "custom-tabs",
    };
    render(<Inbox classes={classes} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-bell"));
    });

    await waitFor(
      () => {
        const root = document.querySelector(".custom-root");
        expect(root).toBeInTheDocument();
        const header = document.querySelector(".custom-header");
        expect(header).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("switches to preferences view in dialog and passes preferencesProps", async () => {
    render(<Inbox preferencesProps={{ className: "pref-class" }} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-bell"));
    });

    await waitFor(
      () => {
        expect(
          document.body.querySelector(
            '[data-chimekit-slot="chimekit-inbox-title"]'
          )
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Find preferences button and click it
    await act(async () => {
      const prefButton = screen.getByLabelText("Inbox settings");
      fireEvent.click(prefButton);
    });

    await waitFor(
      () => {
        const pref = screen.getByTestId("mock-preferences");
        expect(pref).toBeInTheDocument();
        const props = JSON.parse(pref.getAttribute("data-props") || "{}");
        expect(props.className).toBe("pref-class");
      },
      { timeout: 3000 }
    );
  });

  it("passes preferencesProps to inline preferences in modal variant", async () => {
    render(
      <Inbox variant="modal" preferencesProps={{ className: "pref-class" }} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-bell"));
    });

    await waitFor(
      () => {
        expect(
          document.body.querySelector(
            '[data-chimekit-slot="chimekit-inbox-title"]'
          )
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Find preferences button and click it
    await act(async () => {
      const prefButton = screen.getByLabelText("Inbox settings");
      fireEvent.click(prefButton);
    });

    await waitFor(
      () => {
        const pref = screen.getByTestId("mock-preferences");
        expect(pref).toBeInTheDocument();
        const props = JSON.parse(pref.getAttribute("data-props") || "{}");
        // In modal variant, preferences are rendered inline and should receive props
        expect(props.className).toBe("pref-class");
      },
      { timeout: 3000 }
    );
  });
});
