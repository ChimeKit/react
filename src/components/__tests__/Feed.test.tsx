import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Feed } from "../Feed";


// Mock the useChimeKit hook
const { mockListInbox, mockMarkRead, mockMarkUnread, mockArchive, mockUnarchive } = vi.hoisted(() => ({
  mockListInbox: vi.fn(),
  mockMarkRead: vi.fn(),
  mockMarkUnread: vi.fn(),
  mockArchive: vi.fn(),
  mockUnarchive: vi.fn(),
}));

vi.mock("../../hooks/useChimeKit", () => ({
  useChimeKit: () => ({
    client: {
      listInbox: mockListInbox,
      markRead: mockMarkRead,
      markUnread: mockMarkUnread,
      archive: mockArchive,
      unarchive: mockUnarchive,
    },
    branding: { primaryColor: null, showPoweredBy: true },
    brandingLoaded: true,
  }),
}));

describe("Feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Return a promise that never resolves to simulate loading
    mockListInbox.mockReturnValue(new Promise(() => {}));
    render(<Feed />);
    // Default loading is a spinner, might be hard to query without role/text.
    // But we can check for the absence of empty state or messages.
    // Or check for the loading class if we knew it.
    // Let's check if we can find the loading indicator by a generic query or class.
    // The default loader has `data-chimekit-slot="chimekit-feed-loading"`.
    const loader = screen.getByText("Loading messages…");
    expect(loader).toBeInTheDocument();
  });

  it("renders custom loading state", () => {
    mockListInbox.mockReturnValue(new Promise(() => {}));
    render(<Feed renderLoading={() => <div>Custom Loading...</div>} />);
    expect(screen.getByText("Custom Loading...")).toBeInTheDocument();
  });

  it("renders empty state when no messages", async () => {
    mockListInbox.mockResolvedValue({ messages: [] });
    render(<Feed />);
    await waitFor(() => {
      expect(screen.getByText(/All caught up! We'll let you know when something new arrives/)).toBeInTheDocument();
    });
  });

  it("renders custom empty state", async () => {
    mockListInbox.mockResolvedValue({ messages: [] });
    render(<Feed renderEmpty={() => <div>Custom Empty</div>} />);
    await waitFor(() => {
      expect(screen.getByText(/Custom Empty/)).toBeInTheDocument();
    });
  });

  it("renders error state", async () => {
    mockListInbox.mockRejectedValue(new Error("Failed to fetch"));
    render(<Feed />);
    await waitFor(() => {
      expect(screen.getByText(/Oops! Something went wrong/)).toBeInTheDocument();
    });
  });

  it("renders custom error state", async () => {
    mockListInbox.mockRejectedValue(new Error("Failed to fetch"));
    render(<Feed renderError={(err) => <div>Custom Error: {err}</div>} />);
    await waitFor(() => {
      expect(screen.getByText(/Custom Error: Failed to fetch/)).toBeInTheDocument();
    });
  });

  it("renders messages", async () => {
    const messages = [
      { id: "1", title: "Message 1", snippet: "Body 1", createdAt: new Date().toISOString(), readAt: null, archivedAt: null, hasBody: false },
      { id: "2", title: "Message 2", snippet: "Body 2", createdAt: new Date().toISOString(), readAt: null, archivedAt: null, hasBody: false },
    ];
    mockListInbox.mockResolvedValue({ messages });
    render(<Feed />);
    await waitFor(() => {
      expect(screen.getByText(/Message 1/)).toBeInTheDocument();
      expect(screen.getByText(/Message 2/)).toBeInTheDocument();
    });
  });

  it("uses custom renderMessage", async () => {
    const messages = [
      { id: "1", title: "Message 1", snippet: "Body 1", createdAt: new Date().toISOString(), readAt: null, archivedAt: null, hasBody: false },
    ];
    mockListInbox.mockResolvedValue({ messages });
    render(<Feed renderMessage={(props) => <div key={props.message.id}>Custom: {props.message.title}</div>} />);
    await waitFor(() => {
      expect(screen.getByText(/Custom: Message 1/)).toBeInTheDocument();
    });
  });

  it("applies granular classes", async () => {
    const messages = [
      { id: "1", title: "Message 1", snippet: "Body 1", createdAt: new Date().toISOString(), readAt: null, archivedAt: null, hasBody: false },
    ];
    mockListInbox.mockResolvedValue({ messages });
    const classes = {
      root: "custom-root",
      list: "custom-list",
      message: { root: "custom-message" },
    };
    const { container } = render(<Feed classes={classes} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Message 1/)).toBeInTheDocument();
    });

    expect(container.querySelector(".custom-root")).toBeInTheDocument();
    expect(container.querySelector(".custom-list")).toBeInTheDocument();
    // The message class is applied to the li element
    expect(container.querySelector(".custom-message")).toBeInTheDocument();
  });
});
