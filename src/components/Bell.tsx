import * as React from "react";
import { clsx } from "clsx";

export type BellClasses = Partial<{
  root: string;
  icon: string;
  unreadDot: string;
}>;

export type BellProps = React.PropsWithChildren<{
  // global
  className?: string;
  style?: React.CSSProperties;

  // slot styling
  classes?: BellClasses;

  // configuration
  size?: "sm" | "md" | "lg";
  onClick?: () => void;

  // data
  unread?: boolean | number;

  // renderers
  renderIcon?: () => React.ReactNode;
  renderUnreadDot?: (unread: boolean | number) => React.ReactNode;
}>;

export const Bell = React.forwardRef<HTMLButtonElement, BellProps>(
  function Bell(props, ref) {
    const {
      className,
      style,
      classes,
      renderIcon,
      renderUnreadDot,
      unread,
      size = "md",
      onClick,
    } = props;

    const iconSize = size === "sm" ? "16" : size === "md" ? "24" : "32";

    const hasUnread =
      unread === true || (typeof unread === "number" && unread > 0);

    return (
      <button
        ref={ref}
        className={clsx("chimekit-bell", classes?.root, className)}
        style={style}
        data-chimekit-slot="chimekit-bell"
        data-chimekit-unread={hasUnread ? "true" : "false"}
        data-chimekit-size={size}
        type="button"
        onClick={onClick}
      >
        {renderIcon ? (
          renderIcon()
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            width={iconSize}
            height={iconSize}
            className={classes?.icon}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
        )}
        {hasUnread &&
          (renderUnreadDot ? (
            renderUnreadDot(unread ?? true)
          ) : (
            <div
              data-chimekit-slot="chimekit-bell-unread-dot"
              className={classes?.unreadDot}
            />
          ))}
      </button>
    );
  }
);
