import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Preferences } from "../Preferences";

// Mock the useChimeKit hook
const mockGetPreferences = vi.fn();
const mockClient = {
  getPreferences: mockGetPreferences,
  updatePreferences: vi.fn(),
};

vi.mock("../../hooks/useChimeKit", () => ({
  useChimeKit: () => ({
    client: mockClient,
  }),
}));

describe("Preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    mockGetPreferences.mockReturnValue(new Promise(() => {}));
    render(<Preferences />);
    expect(screen.getByText("Loading preferences…")).toBeInTheDocument();
  });

  it("renders custom loading state", () => {
    mockGetPreferences.mockReturnValue(new Promise(() => {}));
    render(<Preferences renderLoading={() => <div>Custom Loading...</div>} />);
    expect(screen.getByText("Custom Loading...")).toBeInTheDocument();
  });

  it("renders error state", async () => {
    mockGetPreferences.mockRejectedValue(new Error("Failed to fetch"));
    render(<Preferences />);
    await waitFor(() => {
      expect(screen.getByText("Unable to load preferences right now. Please try again.")).toBeInTheDocument();
    });
  });

  it("renders custom error state", async () => {
    mockGetPreferences.mockRejectedValue(new Error("Failed to fetch"));
    render(<Preferences renderError={(err) => <div>Custom Error: {err}</div>} />);
    await waitFor(() => {
      expect(screen.getByText("Custom Error: Unable to load preferences right now. Please try again.")).toBeInTheDocument();
    });
  });

  it("renders empty state", async () => {
    mockGetPreferences.mockResolvedValue({ categories: [] });
    render(<Preferences />);
    await waitFor(() => {
      expect(screen.getByText("No notification categories are available yet.")).toBeInTheDocument();
    });
  });

  it("renders custom empty state", async () => {
    mockGetPreferences.mockResolvedValue({ categories: [] });
    render(<Preferences renderEmpty={() => <div>Custom Empty</div>} />);
    await waitFor(() => {
      expect(screen.getByText("Custom Empty")).toBeInTheDocument();
    });
  });

  it("renders preferences table", async () => {
    const categories = [
      {
        id: "cat1",
        name: "Category 1",
        description: "Description 1",
        channels: {
          email: { enabled: true, canUpdate: true },
          in_app: { enabled: false, canUpdate: true },
        },
      },
    ];
    mockGetPreferences.mockResolvedValue({ categories });
    render(<Preferences />);
    
    await waitFor(() => {
      expect(screen.getByText("Category 1")).toBeInTheDocument();
      expect(screen.getByText("Description 1")).toBeInTheDocument();
    });
  });

  it("applies granular classes", async () => {
    const categories = [
      {
        id: "cat1",
        name: "Category 1",
        channels: {
          email: { enabled: true, canUpdate: true },
          in_app: { enabled: false, canUpdate: true },
        },
      },
    ];
    mockGetPreferences.mockResolvedValue({ categories });
    const classes = {
      root: "custom-root",
      table: "custom-table",
      row: "custom-row",
    };
    const { container } = render(<Preferences classes={classes} />);
    
    await waitFor(() => {
      expect(screen.getByText("Category 1")).toBeInTheDocument();
    });

    expect(container.querySelector(".custom-root")).toBeInTheDocument();
    expect(container.querySelector(".custom-table")).toBeInTheDocument();
    expect(container.querySelector(".custom-row")).toBeInTheDocument();
  });
});
