import * as React from "react";
import { clsx } from "clsx";
import * as ScrollArea from "@radix-ui/react-scroll-area";

import { useChimeKit } from "../hooks/useChimeKit";
import { usePoweredBy } from "../hooks/usePoweredBy";
import type { ChimeKitMessageDetailsResponse } from "../types";
import { formatInboxTimestamp } from "../utils/formatInboxTimestamp";
import { safeNavigate } from "../utils/safeUrl";
import { sanitizeHtml as defaultSanitizeHtml } from "../utils/sanitizeHtml";
import { sanitizeMessageDetailsResponse } from "../utils/validateApiResponse";
import { PoweredByFooter } from "./PoweredByFooter";

export type MessageDetailsClasses = Partial<{
  root: string;
  error: string;
  loading: string;
  card: string;
  header: string;
  headerLeft: string;
  title: string;
  timestamp: string;
  category: string;
  snippet: string;
  body: string;
  actions: string;
  actionButton: string;
}>;

export type MessageDetailsProps = React.PropsWithChildren<{
  messageId?: string | null;
  className?: string;
  style?: React.CSSProperties;
  displaySnippet?: boolean;
  maxHeight?: number | string;
  hideFooter?: boolean;
  classes?: MessageDetailsClasses;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string) => React.ReactNode;
  onActionCallback?: (actionId: string) => void;
  sanitizeHtml?: (html: string) => string;
}>;

export function MessageDetails({
  messageId,
  className,
  style,
  displaySnippet = false,
  maxHeight,
  classes,
  renderLoading,
  renderError,
  onActionCallback,
  sanitizeHtml: sanitizeHtmlProp,
}: MessageDetailsProps) {
  const { client } = useChimeKit();
  const showPoweredBy = usePoweredBy();
  const [data, setData] = React.useState<ChimeKitMessageDetailsResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const sanitizedBody = React.useMemo(() => {
    const sanitizer = sanitizeHtmlProp ?? defaultSanitizeHtml;
    return sanitizer(data?.bodyHtml ?? "");
  }, [data?.bodyHtml, sanitizeHtmlProp]);

  React.useEffect(() => {
    if (!messageId) {
      setData(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    setData(null);

    const fetchDetails = async () => {
      try {
        const result = await client.getMessage(messageId);
        if (!isMounted) {
          return;
        }
        // Sanitize the response to strip any actions with unsafe URLs
        const sanitizedResult = sanitizeMessageDetailsResponse(result);
        setData(sanitizedResult);
      } catch (err) {
        console.error("Failed to load message details", err);
        if (isMounted) {
          setErrorMessage(
            "Unable to load this message right now. Please try again."
          );
          setData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [client, messageId]);

  if (!messageId) {
    return null;
  }

  const timestampLabel = data?.createdAt
    ? formatInboxTimestamp(new Date(data.createdAt))
    : null;
  const createdAtIso = data?.createdAt ?? null;
  const headingText =
    data?.title && data.title.trim().length > 0 ? data.title : "Notification";
  const categoryLabel =
    data?.category && data.category.trim().length > 0 ? data.category : null;

  const shouldShowCard = !isLoading && !errorMessage && data;

  return (
    <section
      data-chimekit-slot="chimekit-message-details-root"
      className={clsx(classes?.root, className)}
      style={style}
    >
      {errorMessage ? (
        renderError ? (
          renderError(errorMessage)
        ) : (
          <div
            role="alert"
            data-chimekit-slot="chimekit-message-details-error"
            className={classes?.error}
          >
            {errorMessage}
          </div>
        )
      ) : null}
      {!errorMessage && isLoading ? (
        renderLoading ? (
          renderLoading()
        ) : (
          <div
            data-chimekit-slot="chimekit-message-details-loading"
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
            <span data-chimekit-slot="chimekit-message-details-loading-text">
              Loading message…
            </span>
          </div>
        )
      ) : null}
      {shouldShowCard ? (
        <>
          <ScrollArea.Root
            type="auto"
            data-chimekit-slot="chimekit-message-details-body-scroll"
            style={maxHeight ? { maxHeight, height: "100%" } : undefined}
          >
            <ScrollArea.Viewport data-chimekit-slot="chimekit-message-details-body-viewport">
              <article
                data-chimekit-slot="chimekit-message-details-card"
                className={classes?.card}
              >
                <header
                  data-chimekit-slot="chimekit-message-details-header"
                  className={classes?.header}
                >
                  <div
                    data-chimekit-slot="chimekit-message-details-header-left"
                    className={classes?.headerLeft}
                  >
                    <div
                      data-chimekit-slot="chimekit-message-details-title"
                      className={classes?.title}
                    >
                      {headingText}
                    </div>
                    {timestampLabel ? (
                      <time
                        dateTime={createdAtIso ?? undefined}
                        data-chimekit-slot="chimekit-message-details-timestamp"
                        className={classes?.timestamp}
                      >
                        {timestampLabel}
                      </time>
                    ) : null}
                  </div>
                  {categoryLabel ? (
                    <span
                      data-chimekit-slot="chimekit-message-details-category"
                      className={classes?.category}
                    >
                      {categoryLabel}
                    </span>
                  ) : null}
                </header>
                {displaySnippet && data?.snippet ? (
                  <p
                    data-chimekit-slot="chimekit-message-details-snippet"
                    className={classes?.snippet}
                  >
                    {data.snippet}
                  </p>
                ) : null}
                <div
                  data-chimekit-slot="chimekit-message-details-body"
                  className={clsx(
                    "chimekit-message-details-body",
                    classes?.body
                  )}
                  dangerouslySetInnerHTML={{
                    __html: sanitizedBody,
                  }}
                />
                {(data?.primaryAction || data?.secondaryAction) && (
                  <div
                    data-chimekit-slot="chimekit-message-details-actions"
                    className={classes?.actions}
                  >
                    {data?.primaryAction ? (
                      <button
                        key="primary"
                        data-chimekit-slot="chimekit-message-details-action"
                        data-chimekit-action-kind="primary"
                        className={classes?.actionButton}
                        type="button"
                        onClick={() => {
                          if (data.primaryAction?.kind === "link") {
                            safeNavigate(
                              data.primaryAction.href,
                              data.primaryAction.target
                            );
                          }
                          if (data.primaryAction?.kind === "callback") {
                            void onActionCallback?.(
                              data.primaryAction.actionId
                            );
                          }
                        }}
                      >
                        {data.primaryAction.label}
                      </button>
                    ) : null}
                    {data?.secondaryAction ? (
                      <button
                        key="secondary"
                        data-chimekit-slot="chimekit-message-details-action"
                        data-chimekit-action-kind="secondary"
                        className={classes?.actionButton}
                        type="button"
                        onClick={() => {
                          if (data.secondaryAction?.kind === "link") {
                            safeNavigate(
                              data.secondaryAction.href,
                              data.secondaryAction.target
                            );
                          }
                          if (data.secondaryAction?.kind === "callback") {
                            void onActionCallback?.(
                              data.secondaryAction.actionId
                            );
                          }
                        }}
                      >
                        {data.secondaryAction.label}
                      </button>
                    ) : null}
                  </div>
                )}
              </article>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              data-chimekit-slot="chimekit-message-details-body-scrollbar"
            >
              <ScrollArea.Thumb data-chimekit-slot="chimekit-message-details-body-scroll-thumb" />
            </ScrollArea.Scrollbar>
            <ScrollArea.Corner data-chimekit-slot="chimekit-message-details-body-scroll-corner" />
          </ScrollArea.Root>
          {showPoweredBy ? (
            <PoweredByFooter slotPrefix="chimekit-message-details" />
          ) : null}
        </>
      ) : null}
      {!errorMessage && !isLoading && !data ? (
        <div data-chimekit-slot="chimekit-message-details-status">
          Message details are unavailable.
        </div>
      ) : null}
    </section>
  );
}
