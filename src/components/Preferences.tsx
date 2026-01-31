import * as React from "react";
import { clsx } from "clsx";

import { useChimeKit } from "../hooks/useChimeKit";
import type {
  ChimeKitMemberPreferenceChannelType,
  ChimeKitMemberPreferencesResponse,
} from "../types";

export type PreferencesClasses = Partial<{
  root: string;
  body: string;
  error: string;
  success: string;
  status: string;
  empty: string;
  table: string;
  tableHead: string;
  tableBody: string;
  channelHeadings: string;
  channelHeading: string;
  row: string;
  category: string;
  categoryName: string;
  categoryDescription: string;
  channelCells: string;
  channelCell: string;
  checkbox: string;
  footer: string;
  button: string;
  buttonSecondary: string;
}>;

export type PreferencesProps = React.PropsWithChildren<{
  className?: string;
  style?: React.CSSProperties;
  classes?: PreferencesClasses;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string) => React.ReactNode;
  renderSuccess?: (message: string) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderAccessDenied?: () => React.ReactNode;
}>;

type DraftState = Record<
  string,
  Record<ChimeKitMemberPreferenceChannelType, boolean>
>;

const CHANNELS: Array<{
  type: ChimeKitMemberPreferenceChannelType;
  label: string;
}> = [
  { type: "email", label: "Email" },
  { type: "in_app", label: "In-app" },
];

export function Preferences({
  className,
  style,
  classes,
  renderLoading,
  renderError,
  renderSuccess,
  renderEmpty,
  renderAccessDenied,
}: PreferencesProps) {
  const { client } = useChimeKit();

  const [data, setData] =
    React.useState<ChimeKitMemberPreferencesResponse | null>(null);
  const [draft, setDraft] = React.useState<DraftState>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    const fetchPreferences = async () => {
      try {
        const result = await client.getPreferences();
        if (!isMounted) {
          return;
        }
        setData(result);
        setDraft(buildDraft(result));
      } catch (err) {
        console.error("Failed to load member preferences", err);
        if (isMounted) {
          setData(null);
          setDraft({});
          setErrorMessage(
            "Unable to load preferences right now. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchPreferences();

    return () => {
      isMounted = false;
    };
  }, [client]);

  React.useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);

  const hasChanges = React.useMemo(() => {
    if (!data) {
      return false;
    }

    return data.categories.some((category) => {
      const categoryDraft = draft[category.id];
      if (!categoryDraft) {
        return false;
      }

      return CHANNELS.some(({ type }) => {
        const channelState = category.channels[type];
        if (!channelState || !channelState.canUpdate) {
          return false;
        }
        return (
          typeof categoryDraft[type] === "boolean" &&
          categoryDraft[type] !== channelState.enabled
        );
      });
    });
  }, [data, draft]);

  const handleChannelToggle = React.useCallback(
    (categoryId: string, channel: ChimeKitMemberPreferenceChannelType) => {
      return (event: React.ChangeEvent<HTMLInputElement>) => {
        setSuccessMessage(null);
        setDraft((current) => {
          const existing = current[categoryId];
          if (!existing) {
            return current;
          }

          if (existing[channel] === event.target.checked) {
            return current;
          }

          return {
            ...current,
            [categoryId]: {
              ...existing,
              [channel]: event.target.checked,
            },
          };
        });
      };
    },
    []
  );

  const handleReset = React.useCallback(() => {
    if (!data || isSaving) {
      return;
    }
    setSuccessMessage(null);
    setErrorMessage(null);
    setDraft(buildDraft(data));
  }, [data, isSaving]);

  const handleSave = React.useCallback(async () => {
    if (!data || isSaving || !hasChanges) {
      return;
    }

    const updates = data.categories.flatMap((category) => {
      const categoryDraft = draft[category.id];
      if (!categoryDraft) {
        return [];
      }

      return CHANNELS.filter(
        ({ type }) => category.channels[type]?.canUpdate
      ).flatMap(({ type }) => {
        const nextValue = categoryDraft[type];
        const currentValue = category.channels[type]?.enabled ?? true;
        if (typeof nextValue !== "boolean" || nextValue === currentValue) {
          return [];
        }
        return [
          {
            categoryId: category.id,
            channel: type,
            enabled: nextValue,
          },
        ];
      });
    });

    if (updates.length === 0) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await client.updatePreferences({
        preferences: updates,
      });
      setData(result);
      setDraft(buildDraft(result));
      setSuccessMessage("Preferences saved");
    } catch (err) {
      console.error("Failed to update member preferences", err);
      setErrorMessage("Unable to save your changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [client, data, draft, hasChanges, isSaving]);

  const hasLoadedPreferences = Boolean(data);
  const showEmptyState =
    !isLoading && hasLoadedPreferences && (data?.categories.length ?? 0) === 0;
  const showTable =
    !isLoading && hasLoadedPreferences && (data?.categories.length ?? 0) > 0;

  return (
    <section
      data-chimekit-slot="chimekit-preferences-root"
      className={clsx(classes?.root, className)}
      style={style}
    >
      <div
        data-chimekit-slot="chimekit-preferences-body"
        className={classes?.body}
      >

        {errorMessage &&
          (renderError ? (
            renderError(errorMessage)
          ) : (
            <div
              role="alert"
              data-chimekit-slot="chimekit-preferences-error"
              className={classes?.error}
            >
              {errorMessage}
            </div>
          ))}
        {successMessage &&
          !errorMessage &&
          (renderSuccess ? (
            renderSuccess(successMessage)
          ) : (
            <div
              role="status"
              data-chimekit-slot="chimekit-preferences-success"
              className={classes?.success}
            >
              {successMessage}
            </div>
          ))}
        {isLoading ? (
          renderLoading ? (
            renderLoading()
          ) : (
            <div
              data-chimekit-slot="chimekit-preferences-status"
              className={classes?.status}
            >
              Loading preferences…
            </div>
          )
        ) : showTable ? (
          <>
            <div
              data-chimekit-slot="chimekit-preferences-table"
              className={classes?.table}
            >
              <div
                data-chimekit-slot="chimekit-preferences-table-head"
                className={classes?.tableHead}
              >
                <div>Category</div>
                <div
                  data-chimekit-slot="chimekit-preferences-channel-headings"
                  className={classes?.channelHeadings}
                >
                  {CHANNELS.map((channel) => (
                      <div
                        key={channel.type}
                        data-chimekit-slot="chimekit-preferences-channel-heading"
                        className={classes?.channelHeading}
                      >
                      {channel.label}
                    </div>
                  ))}
                </div>
              </div>
              <div
                data-chimekit-slot="chimekit-preferences-table-body"
                className={classes?.tableBody}
              >
                {data?.categories.map((category) => (
                    <div
                      key={category.id}
                      data-chimekit-slot="chimekit-preferences-row"
                      className={classes?.row}
                    >
                      <div
                        data-chimekit-slot="chimekit-preferences-category"
                        className={classes?.category}
                      >
                        <div
                          data-chimekit-slot="chimekit-preferences-category-name"
                          className={classes?.categoryName}
                        >
                          {category.name}
                        </div>
                        {category.description && (
                          <div
                            data-chimekit-slot="chimekit-preferences-category-description"
                            className={classes?.categoryDescription}
                          >
                            {category.description}
                          </div>
                        )}
                      </div>
                      <div
                        data-chimekit-slot="chimekit-preferences-channel-cells"
                        className={classes?.channelCells}
                      >
                      {CHANNELS.map((channel) => {
                        const channelState = category.channels[channel.type];
                        const checked =
                          draft[category.id]?.[channel.type] ??
                          channelState?.enabled ??
                          true;
                        const disabled =
                          !channelState?.canUpdate ||
                          channel.type !== "email" ||
                          isSaving;

                        return (
                            <div
                              key={channel.type}
                              data-chimekit-slot="chimekit-preferences-channel-cell"
                              className={classes?.channelCell}
                            >
                              <input
                                type="checkbox"
                                data-chimekit-slot="chimekit-preferences-checkbox"
                                className={classes?.checkbox}
                              aria-label={`${channel.label} notifications for ${category.name}`}
                              checked={checked}
                              disabled={disabled}
                              onChange={handleChannelToggle(
                                category.id,
                                channel.type
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              data-chimekit-slot="chimekit-preferences-footer"
              className={classes?.footer}
            >
              <button
                type="button"
                data-chimekit-slot="chimekit-preferences-button-secondary"
                className={classes?.buttonSecondary}
                onClick={handleReset}
                disabled={!hasChanges || isSaving}
              >
                Reset
              </button>
              <button
                type="button"
                data-chimekit-slot="chimekit-preferences-button"
                className={classes?.button}
                onClick={handleSave}
                disabled={!hasChanges || isSaving || !data}
              >
                {isSaving ? "Saving…" : "Save preferences"}
              </button>
            </div>
          </>
        ) : showEmptyState ? (
          renderEmpty ? (
            renderEmpty()
          ) : (
            <div
              data-chimekit-slot="chimekit-preferences-empty"
              className={classes?.empty}
            >
              No notification categories are available yet.
            </div>
          )
        ) : renderAccessDenied ? (
          renderAccessDenied()
        ) : (
          <div
            data-chimekit-slot="chimekit-preferences-status"
            className={classes?.status}
          >
            Preferences are unavailable at the moment.
          </div>
        )}
      </div>
    </section>
  );
}

const buildDraft = (
  preferences: ChimeKitMemberPreferencesResponse | null
): DraftState => {
  if (!preferences) {
    return {};
  }

  const state: DraftState = {};
  preferences.categories.forEach((category) => {
    state[category.id] = {
      email: category.channels.email?.enabled ?? true,
      in_app: category.channels.in_app?.enabled ?? true,
    };
  });

  return state;
};
