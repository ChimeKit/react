import * as React from "react";
import { clsx } from "clsx";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as ScrollArea from "@radix-ui/react-scroll-area";

import type { ChimeKitMessage } from "../types";
import { useChimeKit } from "../hooks/useChimeKit";
import { usePoweredBy } from "../hooks/usePoweredBy";
import { formatInboxTimestamp } from "../utils/formatInboxTimestamp";
import { safeNavigate } from "../utils/safeUrl";
import { PoweredByFooter } from "./PoweredByFooter";

export type FeedMessageClasses = Partial<{
  root: string;
  unreadDot: string;
  hoverActions: string;
  unarchiveButton: string;
  markReadButton: string;
  archiveButton: string;
  markUnreadButton: string;
  titleRow: string;
  title: string;
  bodyIndicator: string;
  snippet: string;
  actions: string;
  actionButton: string;
  meta: string;
}>;

export type FeedClasses = Partial<{
  root: string;
  list: string;
  message: FeedMessageClasses;
  empty: string;
  loading: string;
  error: string;
  loadMoreButton: string;
}>;

export type FeedProps = React.PropsWithChildren<{
  // global
  className?: string;
  style?: React.CSSProperties;

  // slot styling
  classes?: FeedClasses;

  // configuration
  showCategory?: boolean;
  type?: FeedTypeFilter | FeedTypeFilter[];
  category?: string;
  maxFeedHeight?: number;
  onMarkRead?: () => void;
  onMarkUnread?: () => void;
  onArchive?: (metadata: { wasUnread: boolean }) => void;
  onUnarchive?: (metadata: { wasUnread: boolean }) => void;
  onActionCallback?: (actionId: string) => void;
  onMessageClick?: (message: ChimeKitMessage) => void;

  // renderers
  renderMessage?: (props: FeedMessageProps) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string) => React.ReactNode;
}>;

export type FeedTypeFilter = "read" | "unread" | "archived" | "all";
const DEFAULT_FEED_TYPES: FeedTypeFilter[] = ["unread", "read"];
const ALLOWED_FEED_TYPES: FeedTypeFilter[] = [
  "read",
  "unread",
  "archived",
  "all",
];
const PAGE_SIZE = 10;

const sortAndDedupeMessages = (items: ChimeKitMessage[]): ChimeKitMessage[] => {
  const byId = new Map<string, ChimeKitMessage>();
  items.forEach((message) => {
    byId.set(message.id, message);
  });
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

type FeedCacheEntry = {
  messages: ChimeKitMessage[];
  nextCursor: string | null;
  error: string | null;
  loadMoreError: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasFetched: boolean;
};

const defaultFeedEntry: FeedCacheEntry = {
  messages: [],
  nextCursor: null,
  error: null,
  loadMoreError: null,
  isLoading: false,
  isLoadingMore: false,
  hasFetched: false,
};

const normalizeTypeFilters = (value: FeedProps["type"]): FeedTypeFilter[] => {
  if (!value) {
    return DEFAULT_FEED_TYPES;
  }

  const source = Array.isArray(value) ? value : [value];
  const normalized = source.filter((item): item is FeedTypeFilter =>
    item ? ALLOWED_FEED_TYPES.includes(item) : false
  );

  if (normalized.length === 0) {
    return DEFAULT_FEED_TYPES;
  }

  const unique = Array.from(new Set(normalized));
  if (unique.includes("all")) {
    return ["all"];
  }

  return unique;
};

export type FeedMessageProps = React.PropsWithChildren<{
  className?: string;
  classes?: FeedMessageClasses;
  message: ChimeKitMessage;
  index: number;
  onMarkRead?: (messageId: string) => void | Promise<void>;
  onMarkUnread?: (messageId: string) => void | Promise<void>;
  onArchive?: (messageId: string) => void | Promise<void>;
  onUnarchive?: (messageId: string) => void | Promise<void>;
  onActionCallback?: (actionId: string) => void;
  forceArchivedActions?: boolean;
  onSelect?: (message: ChimeKitMessage) => void;
}>;

export type FeedEmptyProps = React.PropsWithChildren<{
  className?: string;
}>;

const FeedMessage = (props: FeedMessageProps) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const isUnread = !props.message.readAt;
  const isArchived = props.forceArchivedActions || !!props.message.archivedAt;
  const showUnreadIndicator = isUnread && !isArchived;
  const messageId = props.message.id;
  const snippetText = props.message.snippet?.trim();

  const handleMarkRead = () => {
    void props.onMarkRead?.(messageId);
  };

  const handleMarkUnread = () => {
    void props.onMarkUnread?.(messageId);
  };

  const handleArchive = () => {
    void props.onArchive?.(messageId);
  };

  const handleUnarchive = () => {
    void props.onUnarchive?.(messageId);
  };

  const handleMessageClick = (e: React.MouseEvent<HTMLLIElement>) => {
    // Don't mark as read if clicking on action buttons or links
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[data-chimekit-slot*="action"]')
    ) {
      // Stop propagation to prevent any parent handlers from firing
      e.stopPropagation();
      return;
    }

    // Mark as read if unread
    if (isUnread && !isArchived) {
      handleMarkRead();
    }

    if (props.message.hasBody) {
      props.onSelect?.(props.message);
    }
  };

  return (
    <li
      data-chimekit-slot="chimekit-feed-message"
      data-chimekit-unread={
        !props.message.readAt && !isArchived ? "true" : "false"
      }
      className={clsx(props.classes?.root, props.className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleMessageClick}
    >
      {showUnreadIndicator && !isHovered && (
        <div
          data-chimekit-slot="chimekit-feed-message-unread-dot"
          className={props.classes?.unreadDot}
        />
      )}
      {isHovered && (
        <Tooltip.Provider>
          <div
            data-chimekit-slot="chimekit-feed-message-hover-actions"
            className={props.classes?.hoverActions}
          >
            {isArchived ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    data-chimekit-slot="chimekit-feed-message-unarchive"
                    type="button"
                    onClick={handleUnarchive}
                    className={props.classes?.unarchiveButton}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 13.5v-6m0 0-3 3m3-3 3 3M3.75 9.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v2.25a1.5 1.5 0 0 0 1.5 1.5Zm0 0V18a2.25 2.25 0 0 0 2.25 2.25h12a2.25 2.25 0 0 0 2.25-2.25V9.75"
                      />
                    </svg>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="chimekit-tooltip-content"
                    sideOffset={5}
                  >
                    Unarchive
                    <Tooltip.Arrow className="chimekit-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : isUnread ? (
              <>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      data-chimekit-slot="chimekit-feed-message-mark-read"
                      type="button"
                      onClick={handleMarkRead}
                      className={props.classes?.markReadButton}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                        />
                      </svg>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="chimekit-tooltip-content"
                      sideOffset={5}
                    >
                      Mark Read
                      <Tooltip.Arrow className="chimekit-tooltip-arrow" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      data-chimekit-slot="chimekit-feed-message-archive"
                      type="button"
                      onClick={handleArchive}
                      className={props.classes?.archiveButton}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                        />
                      </svg>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="chimekit-tooltip-content"
                      sideOffset={5}
                    >
                      Archive
                      <Tooltip.Arrow className="chimekit-tooltip-arrow" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </>
            ) : (
              <>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      data-chimekit-slot="chimekit-feed-message-mark-unread"
                      type="button"
                      onClick={handleMarkUnread}
                      className={props.classes?.markUnreadButton}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z"
                        />
                      </svg>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="chimekit-tooltip-content"
                      sideOffset={5}
                    >
                      Mark Unread
                      <Tooltip.Arrow className="chimekit-tooltip-arrow" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      data-chimekit-slot="chimekit-feed-message-archive"
                      type="button"
                      onClick={handleArchive}
                      className={props.classes?.archiveButton}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                        />
                      </svg>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="chimekit-tooltip-content"
                      sideOffset={5}
                    >
                      Archive
                      <Tooltip.Arrow className="chimekit-tooltip-arrow" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </>
            )}
          </div>
        </Tooltip.Provider>
      )}
      <div
        data-chimekit-slot="chimekit-feed-message-title-row"
        className={props.classes?.titleRow}
      >
        <div
          data-chimekit-slot="chimekit-feed-message-title"
          className={props.classes?.title}
        >
          {props.message.title}
        </div>
        {props.message.hasBody ? (
          <span
            data-chimekit-slot="chimekit-feed-message-body-indicator"
            title="View full message"
            aria-label="View full message"
            className={props.classes?.bodyIndicator}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </span>
        ) : null}
      </div>
      {snippetText ? (
        <p
          data-chimekit-slot="chimekit-feed-message-snippet"
          className={props.classes?.snippet}
        >
          {snippetText}
        </p>
      ) : null}
      {(props.message.primaryAction || props.message.secondaryAction) && (
        <div
          data-chimekit-slot="chimekit-feed-message-actions"
          className={props.classes?.actions}
        >
          {props.message.primaryAction && (
            <button
              key="primary"
              data-chimekit-slot="chimekit-feed-message-action"
              data-chimekit-action-kind="primary"
              className={props.classes?.actionButton}
              type="button"
              onClick={() => {
                if (props.message.primaryAction?.kind === "link") {
                  safeNavigate(
                    props.message.primaryAction.href,
                    props.message.primaryAction.target
                  );
                }
                if (props.message.primaryAction?.kind === "callback") {
                  void props.onActionCallback?.(
                    props.message.primaryAction.actionId
                  );
                }
              }}
            >
              {props.message.primaryAction.label}
            </button>
          )}
          {props.message.secondaryAction && (
            <button
              key="secondary"
              data-chimekit-slot="chimekit-feed-message-action"
              data-chimekit-action-kind="secondary"
              className={props.classes?.actionButton}
              type="button"
              onClick={() => {
                if (props.message.secondaryAction?.kind === "link") {
                  safeNavigate(
                    props.message.secondaryAction.href,
                    props.message.secondaryAction.target
                  );
                }
                if (props.message.secondaryAction?.kind === "callback") {
                  void props.onActionCallback?.(
                    props.message.secondaryAction.actionId
                  );
                }
              }}
            >
              {props.message.secondaryAction.label}
            </button>
          )}
        </div>
      )}
      <div
        data-chimekit-slot="chimekit-feed-message-meta"
        className={props.classes?.meta}
      >
        {formatInboxTimestamp(new Date(props.message.createdAt))}
        {props.message.category !== "default" && (
          <> &bull; {props.message.category}</>
        )}
      </div>
    </li>
  );
};

const FeedEmpty = (props: FeedEmptyProps) => (
  <div
    data-chimekit-slot="chimekit-feed-empty"
    className={clsx(props.className)}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      data-chimekit-slot="chimekit-feed-empty-icon"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
      />
    </svg>
    <p data-chimekit-slot="chimekit-feed-empty-text">
      All caught up! We'll let you know when something new arrives.
    </p>
  </div>
);

export type FeedErrorProps = React.PropsWithChildren<{
  className?: string;
}>;

const FeedError = (props: FeedErrorProps) => (
  <div
    data-chimekit-slot="chimekit-feed-error"
    className={clsx(props.className)}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      data-chimekit-slot="chimekit-feed-error-icon"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
      />
    </svg>
    <p data-chimekit-slot="chimekit-feed-error-text">
      Oops! Something went wrong.
    </p>
  </div>
);

export function Feed(props: FeedProps) {
  const {
    className,
    style,
    classes,
    renderMessage,
    renderEmpty,
    renderLoading,
    renderError,
    type,
    maxFeedHeight = "100%",
    onMarkRead,
    onMarkUnread,
    onArchive,
    onUnarchive,
    onActionCallback = () => {},
    category,
    onMessageClick,
  } = props;

  const { client } = useChimeKit();
  const showPoweredBy = usePoweredBy();
  const isComponentMountedRef = React.useRef(false);
  React.useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
    };
  }, []);
  const [stateByFilter, setStateByFilter] = React.useState<
    Record<string, FeedCacheEntry>
  >({});
  const typeFilters = React.useMemo(() => normalizeTypeFilters(type), [type]);
  const listFilters = React.useMemo(() => {
    if (typeFilters.includes("all")) {
      return undefined;
    }
    return typeFilters;
  }, [typeFilters]);
  const categoryFilter = React.useMemo(() => {
    if (!category) {
      return undefined;
    }
    const trimmed = category.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, [category]);
  const filterKey = React.useMemo(() => {
    const statusKey = listFilters
      ? listFilters.slice().sort().join(",")
      : "all";
    const categoryKey = categoryFilter ?? "__category-all__";
    return `${statusKey}|category:${categoryKey}`;
  }, [categoryFilter, listFilters]);
  const currentEntry = stateByFilter[filterKey] ?? defaultFeedEntry;
  const {
    messages,
    nextCursor,
    error,
    isLoading: entryIsLoading,
    isLoadingMore,
    hasFetched,
  } = currentEntry;
  const isLoading = entryIsLoading || !hasFetched;
  const forceArchivedActions = React.useMemo(
    () => typeFilters.length === 1 && typeFilters[0] === "archived",
    [typeFilters]
  );

  React.useEffect(() => {
    if (hasFetched || entryIsLoading) {
      return;
    }

    const requestKey = filterKey;

    setStateByFilter((prev) => {
      const prevEntry = prev[requestKey] ?? defaultFeedEntry;
      return {
        ...prev,
        [requestKey]: {
          ...prevEntry,
          isLoading: true,
          error: null,
          loadMoreError: null,
          isLoadingMore: false,
        },
      };
    });

    const fetchMessages = async () => {
      try {
        const response = await client.listInbox({
          limit: PAGE_SIZE,
          status: listFilters ?? undefined,
          category: categoryFilter,
        });
        if (!isComponentMountedRef.current) {
          return;
        }
        setStateByFilter((prev) => {
          const prevEntry = prev[requestKey] ?? defaultFeedEntry;
          return {
            ...prev,
            [requestKey]: {
              ...prevEntry,
              messages: sortAndDedupeMessages(response.messages ?? []),
              nextCursor: response.nextCursor ?? null,
              error: null,
              loadMoreError: null,
              isLoading: false,
              isLoadingMore: false,
              hasFetched: true,
            },
          };
        });
      } catch (err) {
        if (!isComponentMountedRef.current) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Failed to load inbox";
        setStateByFilter((prev) => {
          const prevEntry = prev[requestKey] ?? defaultFeedEntry;
          return {
            ...prev,
            [requestKey]: {
              ...prevEntry,
              messages: [],
              nextCursor: null,
              error: message,
              loadMoreError: null,
              isLoading: false,
              isLoadingMore: false,
              hasFetched: true,
            },
          };
        });
      }
    };

    void fetchMessages();
  }, [
    categoryFilter,
    client,
    entryIsLoading,
    filterKey,
    hasFetched,
    listFilters,
  ]);

  const markMessageRead = React.useCallback(
    async (messageId: string) => {
      try {
        await client.markRead(messageId);
        let wasUnread = false;
        setStateByFilter((prev) => {
          const prevEntry = prev[filterKey] ?? defaultFeedEntry;
          let found = false;
          const updatedMessages = prevEntry.messages.map((message) => {
            if (message.id === messageId) {
              found = true;
              wasUnread = !message.readAt;
              return { ...message, readAt: new Date().toISOString() };
            }
            return message;
          });
          if (!found) {
            return prev;
          }
          return {
            ...prev,
            [filterKey]: {
              ...prevEntry,
              messages: updatedMessages,
            },
          };
        });
        if (wasUnread) {
          onMarkRead?.();
        }
      } catch (err) {
        console.error("Failed to mark message as read", err);
      }
    },
    [client, filterKey, onMarkRead]
  );

  const markMessageUnread = React.useCallback(
    async (messageId: string) => {
      try {
        await client.markUnread(messageId);
        let wasRead = false;
        setStateByFilter((prev) => {
          const prevEntry = prev[filterKey] ?? defaultFeedEntry;
          let found = false;
          const updatedMessages = prevEntry.messages.map((message) => {
            if (message.id === messageId) {
              found = true;
              wasRead = !!message.readAt;
              return { ...message, readAt: null };
            }
            return message;
          });
          if (!found) {
            return prev;
          }
          return {
            ...prev,
            [filterKey]: {
              ...prevEntry,
              messages: updatedMessages,
            },
          };
        });
        if (wasRead) {
          onMarkUnread?.();
        }
      } catch (err) {
        console.error("Failed to mark message as unread", err);
      }
    },
    [client, filterKey, onMarkUnread]
  );

  const archiveMessage = React.useCallback(
    async (messageId: string) => {
      try {
        await client.archive(messageId);
        let wasUnread = false;
        let removed = false;
        setStateByFilter((prev) => {
          const prevEntry = prev[filterKey] ?? defaultFeedEntry;
          let localRemoved = false;
          let localWasUnread = false;
          const filtered = prevEntry.messages.filter((message) => {
            if (message.id === messageId) {
              localRemoved = true;
              localWasUnread = !message.readAt;
              return false;
            }
            return true;
          });
          if (!localRemoved) {
            return prev;
          }
          removed = true;
          wasUnread = localWasUnread;
          return {
            ...prev,
            [filterKey]: {
              ...prevEntry,
              messages: filtered,
            },
          };
        });
        if (removed) {
          onArchive?.({ wasUnread });
        }
      } catch (err) {
        console.error("Failed to archive message", err);
      }
    },
    [client, filterKey, onArchive]
  );

  const unarchiveMessage = React.useCallback(
    async (messageId: string) => {
      try {
        await client.unarchive(messageId);
        const supportsActiveMessages =
          typeFilters.includes("all") ||
          typeFilters.includes("read") ||
          typeFilters.includes("unread");
        let wasUnread = false;
        let found = false;
        setStateByFilter((prev) => {
          const prevEntry = prev[filterKey] ?? defaultFeedEntry;
          let localFound = false;
          let localWasUnread = false;
          const updated = prevEntry.messages.map((message) => {
            if (message.id === messageId) {
              localFound = true;
              localWasUnread = !message.readAt;
              return { ...message, archivedAt: null };
            }
            return message;
          });
          if (!localFound) {
            return prev;
          }
          found = true;
          wasUnread = localWasUnread;
          const nextMessages = supportsActiveMessages
            ? updated
            : updated.filter((message) => message.id !== messageId);
          return {
            ...prev,
            [filterKey]: {
              ...prevEntry,
              messages: nextMessages,
            },
          };
        });
        if (found) {
          onUnarchive?.({ wasUnread });
        }
      } catch (err) {
        console.error("Failed to unarchive message", err);
      }
    },
    [client, filterKey, onUnarchive, typeFilters]
  );

  const shouldRenderEmpty = !isLoading && !error && messages.length === 0;
  const hasMore = !!nextCursor;

  const handleLoadMore = React.useCallback(async () => {
    if (!nextCursor || isLoadingMore) {
      return;
    }
    const requestKey = filterKey;

    setStateByFilter((prev) => {
      const prevEntry = prev[requestKey] ?? defaultFeedEntry;
      return {
        ...prev,
        [requestKey]: {
          ...prevEntry,
          isLoadingMore: true,
          loadMoreError: null,
        },
      };
    });

    try {
      const response = await client.listInbox({
        cursor: nextCursor,
        limit: PAGE_SIZE,
        status: listFilters ?? undefined,
        category: categoryFilter,
      });
      setStateByFilter((prev) => {
        const prevEntry = prev[requestKey] ?? defaultFeedEntry;
        return {
          ...prev,
          [requestKey]: {
            ...prevEntry,
            messages: sortAndDedupeMessages([
              ...prevEntry.messages,
              ...(response.messages ?? []),
            ]),
            nextCursor: response.nextCursor ?? null,
            isLoadingMore: false,
            loadMoreError: null,
          },
        };
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load more messages";
      setStateByFilter((prev) => {
        const prevEntry = prev[requestKey] ?? defaultFeedEntry;
        return {
          ...prev,
          [requestKey]: {
            ...prevEntry,
            isLoadingMore: false,
            loadMoreError: message,
          },
        };
      });
    }
  }, [
    categoryFilter,
    client,
    filterKey,
    isLoadingMore,
    listFilters,
    nextCursor,
  ]);

  return (
    <div
      className={clsx("chimekit-feed", classes?.root, className)}
      style={style}
      data-chimekit-slot="chimekit-feed"
    >
      {isLoading ? (
        renderLoading ? (
          renderLoading()
        ) : (
          <div
            data-chimekit-slot="chimekit-feed-loading"
            className={classes?.loading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
              role="img"
            >
              <circle
                className="chimekit-feed-loading-track"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                opacity="0.25"
              />
              <path
                className="chimekit-feed-loading-indicator"
                fill="currentColor"
                opacity="0.75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span data-chimekit-slot="chimekit-feed-loading-text">
              Loading messages…
            </span>
          </div>
        )
      ) : error ? (
        renderError ? (
          renderError(error)
        ) : (
          <FeedError className={classes?.error} />
        )
      ) : shouldRenderEmpty ? (
        renderEmpty ? (
          renderEmpty()
        ) : (
          <FeedEmpty className={classes?.empty} />
        )
      ) : (
        <>
          <div data-chimekit-slot="chimekit-feed-scroll-area">
            <ScrollArea.Root
              className="ScrollAreaRoot"
              style={{ maxHeight: maxFeedHeight, height: "100%" }}
            >
              <ScrollArea.Viewport className="ScrollAreaViewport">
                <ul
                  data-chimekit-slot="chimekit-feed-list"
                  className={classes?.list}
                >
                  {messages?.map((message, index) => {
                    const messageProps: FeedMessageProps = {
                      className: classes?.message?.root,
                      classes: classes?.message,
                      message,
                      index,
                      onMarkRead: markMessageRead,
                      onMarkUnread: markMessageUnread,
                      onArchive: archiveMessage,
                      onUnarchive: unarchiveMessage,
                      onActionCallback,
                      forceArchivedActions,
                      onSelect: onMessageClick,
                    };

                    return (
                      <React.Fragment key={message.id}>
                        {renderMessage ? (
                          renderMessage(messageProps)
                        ) : (
                          <FeedMessage {...messageProps} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </ul>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                className="ScrollAreaScrollbar"
                orientation="vertical"
              >
                <ScrollArea.Thumb className="ScrollAreaThumb" />
              </ScrollArea.Scrollbar>
              <ScrollArea.Corner className="ScrollAreaCorner" />
            </ScrollArea.Root>
          </div>
          {showPoweredBy || hasMore ? (
            <div data-chimekit-slot="chimekit-feed-footer">
              {showPoweredBy ? (
                <PoweredByFooter slotPrefix="chimekit-feed" noWrapper />
              ) : null}
              {hasMore && (
                <button
                  type="button"
                  data-chimekit-slot="chimekit-feed-load-more"
                  onClick={() => {
                    void handleLoadMore();
                  }}
                  disabled={!hasMore || isLoadingMore}
                  className={classes?.loadMoreButton}
                >
                  {isLoadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
