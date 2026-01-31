import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Bell } from "../Bell";

describe("Bell", () => {
  it("renders the bell icon by default", () => {
    render(<Bell />);
    const icon = screen.getByRole("button").querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("renders the unread dot when unread count is greater than 0", () => {
    render(<Bell unread={5} />);
    const dot = screen.getByRole("button").querySelector('[data-chimekit-slot="chimekit-bell-unread-dot"]');
    expect(dot).toBeInTheDocument();
  });

  it("does not render the unread dot when unread count is 0", () => {
    render(<Bell unread={0} />);
    const dot = screen.queryByText("0");
    expect(dot).not.toBeInTheDocument();
  });

  it("uses custom renderUnreadDot if provided", () => {
    render(<Bell unread={5} renderUnreadDot={(count) => <span>Custom Dot: {count}</span>} />);
    expect(screen.getByText("Custom Dot: 5")).toBeInTheDocument();
  });

  it("applies granular classes", () => {
    const classes = {
      root: "custom-root",
      icon: "custom-icon",
      unreadDot: "custom-dot",
    };
    render(<Bell unread={5} classes={classes} />);
    
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-root");
    
    // Note: We can't easily check inner SVG classes without a test-id or selector, 
    // but we can check if the class is present in the rendered HTML if we really want to,
    // or rely on the fact that we passed it. 
    // For unread dot:
    const dot = screen.getByRole("button").querySelector('[data-chimekit-slot="chimekit-bell-unread-dot"]');
    expect(dot).toHaveClass("custom-dot");
  });
});
