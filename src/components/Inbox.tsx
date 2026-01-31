import * as React from "react";

import * as RadixPopover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";

import { Popover } from "./containers/Popover";
import { Modal } from "./containers/Modal";
import { Drawer } from "./containers/Drawer";
import { Feed, type FeedTypeFilter, type FeedProps } from "./Feed";
import { Bell, type BellProps } from "./Bell";
import { Preferences, type PreferencesProps } from "./Preferences";
import { PreferencesDialog } from "./PreferencesDialog";
import { MessageDetails, type MessageDetailsProps } from "./MessageDetails";
import { MessageDetailsDialog } from "./MessageDetailsDialog";
import { useChimeKit } from "../hooks/useChimeKit";
import type { ChimeKitInboxMetaResponse, ChimeKitMessage } from "../types";

const TAB_CONFIG = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "archived", label: "Archived" },
] as const;

type InboxTab = (typeof TAB_CONFIG)[number]["id"];

const DEFAULT_FILTER_OPTION = { value: "all", label: "All" };
const DEFAULT_CATEGORY_VALUE = "__default__";

export type InboxClasses = Partial<{
  root: string;
  header: string;
  headerLeft: string;
  title: string;
  filter: string;
  headerActions: string;
  tabs: string;
  tab: string;
  tabLabel: string;
  tabBadge: string;
  content: string;
}>;

export type InboxProps = React.PropsWithChildren<{
  // global
  className?: string;
  style?: React.CSSProperties;

  // configuration
  variant?: "popover" | "modal" | "drawer";
  width?: number;
  maxFeedHeight?: number;
  onActionCallback?: (actionId: string) => void;

  // branding
  primaryColor?: string;

  // slot styling
  classes?: InboxClasses;

  // customization
  labels?: {
    title?: string;
    preferencesTitle?: string;
    tabs?: {
      all?: string;
      unread?: string;
      archived?: string;
    };
  };
  bellProps?: Partial<BellProps>;
  feedProps?: Partial<FeedProps>;
  messageDetailsProps?: Partial<MessageDetailsProps>;
  preferencesProps?: Partial<PreferencesProps>;
}>;

export function Inbox(props: InboxProps) {
  const {
    className,
    style,
    variant = "popover",
    width,
    maxFeedHeight = 500,
    onActionCallback = () => {},
    primaryColor: primaryColorProp,
    classes,
    labels,
    bellProps,
    feedProps,
    messageDetailsProps,
    preferencesProps,
  } = props;

  const resolvedMessageDetailsOnAction =
    messageDetailsProps?.onActionCallback ?? onActionCallback;

  const containerWidth = width ?? (variant === "popover" ? 400 : 500);

  const { client } = useChimeKit();

  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<InboxTab>(TAB_CONFIG[0].id);
  const [filterValue, setFilterValue] = React.useState<string>(
    DEFAULT_FILTER_OPTION.value
  );
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [meta, setMeta] = React.useState<ChimeKitInboxMetaResponse | null>(
    null
  );
  const [derivedMeta, setDerivedMeta] =
    React.useState<ChimeKitInboxMetaResponse | null>(null);
  const [isMetaLoading, setIsMetaLoading] = React.useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = React.useState(0);
  const [preferencesDisplay, setPreferencesDisplay] = React.useState<
    "none" | "inline" | "dialog"
  >("none");
  const [messageDetails, setMessageDetails] = React.useState<{
    display: "none" | "inline" | "dialog";
    messageId: string | null;
  }>({
    display: "none",
    messageId: null,
  });

  // Ref to the container element for portaling popover content when inside a modal
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let isMounted = true;
    setIsMetaLoading(true);

    const fetchMeta = async () => {
      try {
        const result = await client.getMeta();
        if (!isMounted) {
          return;
        }
        setMeta(result);
        setDerivedMeta(result);
      } catch (err) {
        console.error("Failed to load inbox meta", err);
        if (isMounted) {
          setMeta(null);
          setDerivedMeta(null);
        }
      } finally {
        if (isMounted) {
          setIsMetaLoading(false);
        }
      }
    };

    void fetchMeta();

    return () => {
      isMounted = false;
    };
  }, [client]);

  React.useEffect(() => {
    setDerivedMeta(meta);
  }, [meta]);

  // Reset tab to first tab when inbox opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(TAB_CONFIG[0].id);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      setFilterValue(DEFAULT_FILTER_OPTION.value);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      setPreferencesDisplay((current) => {
        if (variant === "popover" && current === "dialog") {
          return current;
        }
        return "none";
      });
    }
  }, [isOpen, variant]);

  React.useEffect(() => {
    if (!isOpen) {
      setMessageDetails((current) => {
        if (current.display === "inline") {
          return {
            display: "none",
            messageId: null,
          };
        }
        return current;
      });
    }
  }, [isOpen]);

  React.useEffect(() => {
    setPreferencesDisplay((current) => {
      if (variant === "popover" && current === "inline") {
        return "none";
      }
      if (variant !== "popover" && current === "dialog") {
        return "none";
      }
      return current;
    });
  }, [variant]);

  React.useEffect(() => {
    setMessageDetails((current) => {
      if (variant === "popover" && current.display === "inline") {
        return { display: "none", messageId: null };
      }
      if (variant !== "popover" && current.display === "dialog") {
        return { display: "none", messageId: null };
      }
      return current;
    });
  }, [variant]);

  // Refetch meta when inbox opens
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    setIsMetaLoading(true);

    const fetchMeta = async () => {
      try {
        const result = await client.getMeta();
        if (!isMounted) {
          return;
        }
        setMeta(result);
      } catch (err) {
        console.error("Failed to refresh inbox meta", err);
      } finally {
        if (isMounted) {
          setIsMetaLoading(false);
        }
      }
    };

    void fetchMeta();

    return () => {
      isMounted = false;
    };
  }, [isOpen, client]);

  const categoryOptions = React.useMemo(() => {
    const seen = new Set<string>();
    const ordered: Array<{ value: string; label: string }> = [
      DEFAULT_FILTER_OPTION,
    ];
    seen.add(DEFAULT_FILTER_OPTION.value);

    if (meta?.categories) {
      meta.categories.forEach((category) => {
        const value = category.categoryId ?? DEFAULT_CATEGORY_VALUE;
        if (seen.has(value)) {
          return;
        }
        ordered.push({
          value,
          label: category.categoryName,
        });
        seen.add(value);
      });
    }

    return ordered;
  }, [meta]);

  React.useEffect(() => {
    if (!categoryOptions.some((option) => option.value === filterValue)) {
      setFilterValue(DEFAULT_FILTER_OPTION.value);
    }
  }, [categoryOptions, filterValue]);

  const currentFilterLabel =
    categoryOptions.find((option) => option.value === filterValue)?.label ??
    DEFAULT_FILTER_OPTION.label;

  const feedCategory = React.useMemo(() => {
    if (filterValue === DEFAULT_FILTER_OPTION.value) {
      return undefined;
    }
    return filterValue;
  }, [filterValue]);

  const tabItems = React.useMemo(
    () =>
      TAB_CONFIG.map((tab) => {
        let count = 0;
        if (tab.id === "all") {
          count = derivedMeta?.totalCount.total ?? 0;
        } else if (tab.id === "unread") {
          count = derivedMeta?.unreadCount.total ?? 0;
        }
        return {
          ...tab,
          label: labels?.tabs?.[tab.id] ?? tab.label,
          count,
        };
      }),
    [derivedMeta, labels]
  );

  const feedType: FeedTypeFilter | FeedTypeFilter[] | undefined =
    React.useMemo(() => {
      if (activeTab === "all") {
        return ["read", "unread"];
      }
      if (activeTab === "unread") {
        return "unread";
      }
      if (activeTab === "archived") {
        return "archived";
      }
      return undefined;
    }, [activeTab]);

  const adjustMetaCounts = React.useCallback(
    (changes: { totalDelta?: number; unreadDelta?: number }) => {
      setDerivedMeta((current) => {
        if (!current) {
          return current;
        }

        const totalDelta = changes.totalDelta ?? 0;
        const unreadDelta = changes.unreadDelta ?? 0;

        if (totalDelta === 0 && unreadDelta === 0) {
          return current;
        }

        const clamp = (value: number) => Math.max(0, value);

        return {
          ...current,
          totalCount: {
            ...current.totalCount,
            total: clamp((current.totalCount.total ?? 0) + totalDelta),
          },
          unreadCount: {
            ...current.unreadCount,
            total: clamp((current.unreadCount.total ?? 0) + unreadDelta),
          },
        };
      });
    },
    []
  );

  const refreshFeed = React.useCallback(() => {
    setFeedRefreshKey((current) => current + 1);
  }, []);

  const openPreferences = React.useCallback(() => {
    setMessageDetails({
      display: "none",
      messageId: null,
    });
    if (variant === "popover") {
      setPreferencesDisplay("dialog");
      setIsOpen(false);
      return;
    }
    setPreferencesDisplay("inline");
  }, [variant]);

  const closePreferences = React.useCallback(() => {
    setPreferencesDisplay("none");
  }, []);

  const closeMessageDetails = React.useCallback(() => {
    setMessageDetails({
      display: "none",
      messageId: null,
    });
  }, []);

  const handlePreferencesDialogOpenChange = React.useCallback(
    (isDialogOpen: boolean) => {
      if (isDialogOpen) {
        setIsOpen(false);
      }
      setPreferencesDisplay(isDialogOpen ? "dialog" : "none");
    },
    []
  );

  const handleMessageSelect = React.useCallback(
    (message: ChimeKitMessage) => {
      if (!message.hasBody || !message.messageId) {
        return;
      }
      setPreferencesDisplay("none");
      if (variant === "popover") {
        setMessageDetails({
          display: "dialog",
          messageId: message.messageId,
        });
        setIsOpen(false);
        return;
      }
      setMessageDetails({
        display: "inline",
        messageId: message.messageId,
      });
    },
    [variant]
  );

  const handleMessageDetailsDialogOpenChange = React.useCallback(
    (isDialogOpen: boolean) => {
      if (!isDialogOpen) {
        closeMessageDetails();
      }
    },
    [closeMessageDetails]
  );

  const handleMarkAllRead = React.useCallback(async () => {
    try {
      await client.markAllRead();
      setDerivedMeta((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          unreadCount: {
            ...current.unreadCount,
            total: 0,
            byCategory: current.unreadCount.byCategory.map((category) => ({
              ...category,
              count: 0,
            })),
          },
        };
      });
      refreshFeed();
    } catch (err) {
      console.error("Failed to mark all messages as read", err);
    }
  }, [client, refreshFeed]);

  const handleArchiveAll = React.useCallback(async () => {
    try {
      await client.archiveAll();
      setDerivedMeta((current) => {
        if (!current) {
          return current;
        }
        const zeroCounts = (
          entries: ChimeKitInboxMetaResponse["totalCount"]["byCategory"]
        ) =>
          entries.map((entry) => ({
            ...entry,
            count: 0,
          }));
        return {
          ...current,
          totalCount: {
            ...current.totalCount,
            total: 0,
            byCategory: zeroCounts(current.totalCount.byCategory),
          },
          unreadCount: {
            ...current.unreadCount,
            total: 0,
            byCategory: zeroCounts(current.unreadCount.byCategory),
          },
        };
      });
      refreshFeed();
    } catch (err) {
      console.error("Failed to archive all messages", err);
    }
  }, [client, refreshFeed]);

  const handleCloseAutoFocus = React.useCallback(
    (event: Event) => {
      if (
        preferencesDisplay === "dialog" ||
        messageDetails.display === "dialog"
      ) {
        event.preventDefault();
      }
    },
    [preferencesDisplay, messageDetails.display]
  );

  const Container =
    variant === "popover" ? Popover : variant === "modal" ? Modal : Drawer;
  const shouldRenderInlinePreferences =
    variant !== "popover" && preferencesDisplay === "inline";
  const shouldRenderPreferencesDialog =
    variant === "popover" && preferencesDisplay === "dialog";
  const shouldRenderInlineMessageDetails =
    variant !== "popover" &&
    messageDetails.display === "inline" &&
    Boolean(messageDetails.messageId);
  const shouldRenderMessageDetailsDialog =
    variant === "popover" &&
    messageDetails.display === "dialog" &&
    Boolean(messageDetails.messageId);
  const activeInlineView = shouldRenderInlinePreferences
    ? "preferences"
    : shouldRenderInlineMessageDetails
    ? "message"
    : "none";
  const headerTitle =
    activeInlineView === "preferences"
      ? labels?.preferencesTitle ?? "Preferences"
      : labels?.title ?? "Notifications";

  const brandingStyle = React.useMemo(() => {
    // Prop takes precedence over server-provided branding
    const primaryColor = primaryColorProp ?? meta?.branding?.primaryColor;
    if (!primaryColor) {
      return {};
    }
    // Set both the primary color and accent since accent references primary
    // and CSS variable aliases are resolved at definition, not usage
    return {
      "--chimekit-color-primary": primaryColor,
      "--chimekit-accent": primaryColor,
    } as React.CSSProperties;
  }, [primaryColorProp, meta?.branding?.primaryColor]);

  return (
    <>
      <Container
        slot="chimekit-inbox"
        className={className}
        open={isOpen}
        onOpenChange={setIsOpen}
        onCloseAutoFocus={handleCloseAutoFocus}
        renderTrigger={({ onClick }) => (
          <Bell
            onClick={onClick}
            unread={derivedMeta?.unreadCount.total ?? 0}
            {...bellProps}
          />
        )}
      >
        <>
          <div
            ref={containerRef}
            data-chimekit-slot="chimekit-inbox-root"
            className={classes?.root}
            style={{
              width: containerWidth,
              ...brandingStyle,
              ...style,
            }}
          >
            <div
              data-chimekit-slot="chimekit-inbox-header"
              className={classes?.header}
              data-chimekit-inline-message={
                shouldRenderInlineMessageDetails ? "true" : "false"
              }
            >
              <div
                data-chimekit-slot="chimekit-inbox-header-left"
                className={classes?.headerLeft}
              >
                <div
                  data-chimekit-slot="chimekit-inbox-title"
                  className={classes?.title}
                >
                  {headerTitle}
                </div>
                {activeInlineView === "none" && categoryOptions.length > 2 && (
                  <div
                    data-chimekit-slot="chimekit-inbox-filter"
                    className={classes?.filter}
                    data-chimekit-loading={isMetaLoading ? "true" : "false"}
                  >
                    <span data-chimekit-slot="chimekit-inbox-filter-label">
                      {currentFilterLabel}
                    </span>
                    <span
                      aria-hidden="true"
                      data-chimekit-slot="chimekit-inbox-filter-icon"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.394 7.106a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L10 9.939l2.106-2.833a.75.75 0 0 1 1.06 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <select
                      data-chimekit-slot="chimekit-inbox-filter-select"
                      aria-label="Filter notifications"
                      value={filterValue}
                      onChange={(event) => setFilterValue(event.target.value)}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div
                data-chimekit-slot="chimekit-inbox-header-actions"
                className={classes?.headerActions}
              >
                {activeInlineView !== "none" ? (
                  <button
                    type="button"
                    aria-label={
                      activeInlineView === "preferences"
                        ? "Close preferences"
                        : "Close message details"
                    }
                    data-chimekit-slot="chimekit-inbox-header-icon-button"
                    onClick={
                      activeInlineView === "preferences"
                        ? closePreferences
                        : closeMessageDetails
                    }
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
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                ) : (
                  <>
                    <div data-chimekit-slot="chimekit-inbox-header-menu">
                      <RadixPopover.Root
                        open={isMenuOpen}
                        onOpenChange={setIsMenuOpen}
                      >
                        <RadixPopover.Trigger asChild>
                          <button
                            type="button"
                            aria-haspopup="menu"
                            aria-label="Open inbox bulk actions"
                            aria-expanded={isMenuOpen ? "true" : "false"}
                            data-chimekit-slot="chimekit-inbox-header-menu-button"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <circle cx="5" cy="12" r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="19" cy="12" r="1.5" />
                            </svg>
                          </button>
                        </RadixPopover.Trigger>
                        <RadixPopover.Portal
                          container={
                            variant === "modal"
                              ? containerRef.current
                              : undefined
                          }
                        >
                          <RadixPopover.Content
                            role="menu"
                            align="end"
                            side="bottom"
                            sideOffset={8}
                            data-chimekit-slot="chimekit-inbox-header-menu-popover"
                            onOpenAutoFocus={(event) => event.preventDefault()}
                          >
                            <RadixPopover.Close asChild>
                              <button
                                type="button"
                                role="menuitem"
                                data-chimekit-slot="chimekit-inbox-header-menu-item"
                                onClick={() => {
                                  void handleMarkAllRead();
                                }}
                              >
                                Mark all as read
                              </button>
                            </RadixPopover.Close>
                            <RadixPopover.Close asChild>
                              <button
                                type="button"
                                role="menuitem"
                                data-chimekit-slot="chimekit-inbox-header-menu-item"
                                onClick={() => {
                                  void handleArchiveAll();
                                }}
                              >
                                Archive all
                              </button>
                            </RadixPopover.Close>
                          </RadixPopover.Content>
                        </RadixPopover.Portal>
                      </RadixPopover.Root>
                    </div>
                    <button
                      type="button"
                      aria-label="Inbox settings"
                      data-chimekit-slot="chimekit-inbox-header-icon-button"
                      onClick={openPreferences}
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
                          d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.142-.854-.108-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    </button>
                    {variant !== "popover" && (
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          aria-label="Close inbox"
                          data-chimekit-slot="chimekit-inbox-header-icon-button"
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
                              d="M6 18 18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </Dialog.Close>
                    )}
                  </>
                )}
              </div>
            </div>
            {!shouldRenderInlinePreferences &&
              !shouldRenderInlineMessageDetails && (
                <div
                  data-chimekit-slot="chimekit-inbox-tabs"
                  className={classes?.tabs}
                >
                  {tabItems.map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      data-chimekit-slot="chimekit-inbox-tab"
                      className={classes?.tab}
                      data-chimekit-active={
                        activeTab === tab.id ? "true" : "false"
                      }
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span
                        data-chimekit-slot="chimekit-inbox-tab-label"
                        className={classes?.tabLabel}
                      >
                        {tab.label}
                      </span>
                      {tab.label !== "Archived" && (
                        <span
                          data-chimekit-slot="chimekit-inbox-tab-badge"
                          className={classes?.tabBadge}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            <div
              data-chimekit-slot="chimekit-inbox-content"
              className={classes?.content}
            >
              {shouldRenderInlinePreferences ? (
                <Preferences {...preferencesProps} />
              ) : shouldRenderInlineMessageDetails ? (
                <MessageDetails
                  key={messageDetails.messageId ?? "message-details"}
                  messageId={messageDetails.messageId}
                  maxHeight={variant === "modal" ? maxFeedHeight : undefined}
                  onActionCallback={resolvedMessageDetailsOnAction}
                  {...messageDetailsProps}
                />
              ) : (
                <Feed
                  key={feedRefreshKey}
                  type={feedType}
                  category={feedCategory}
                  maxFeedHeight={maxFeedHeight as number}
                  onMarkRead={() => adjustMetaCounts({ unreadDelta: -1 })}
                  onMarkUnread={() => adjustMetaCounts({ unreadDelta: 1 })}
                  onArchive={({ wasUnread }) =>
                    adjustMetaCounts({
                      totalDelta: -1,
                      unreadDelta: wasUnread ? -1 : 0,
                    })
                  }
                  onUnarchive={({ wasUnread }) =>
                    adjustMetaCounts({
                      totalDelta: 1,
                      unreadDelta: wasUnread ? 1 : 0,
                    })
                  }
                  onActionCallback={onActionCallback}
                  onMessageClick={handleMessageSelect}
                  {...feedProps}
                />
              )}
            </div>
          </div>
        </>
      </Container>
      {variant === "popover" ? (
        <>
          <PreferencesDialog
            open={shouldRenderPreferencesDialog}
            onOpenChange={handlePreferencesDialogOpenChange}
            preferencesProps={preferencesProps}
            style={brandingStyle}
          />
          <MessageDetailsDialog
            open={shouldRenderMessageDetailsDialog}
            onOpenChange={handleMessageDetailsDialogOpenChange}
            messageId={messageDetails.messageId}
            onActionCallback={resolvedMessageDetailsOnAction}
            style={brandingStyle}
          />
        </>
      ) : null}
    </>
  );
}
