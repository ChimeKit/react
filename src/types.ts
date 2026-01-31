import type { HTMLAttributeAnchorTarget, ReactNode } from "react";

export type ChimeKitAudienceMember = {
  id: string;
  displayName?: string | null;
  email?: string | null;
  externalUserId?: string | null;
  avatarUrl?: string | null;
  traits?: Record<string, unknown> | null;
};

export type ChimeKitProviderBaseProps = {
  publicKey: string;
  audienceMember: ChimeKitAudienceMember;
  children: ReactNode;
  baseUrl?: string;
  onAuthError?: (error: Error) => void;
};

export type ChimeKitProviderStaticTokenProps = ChimeKitProviderBaseProps & {
  token: string;
  getToken?: never;
};

export type ChimeKitProviderDynamicTokenProps = ChimeKitProviderBaseProps & {
  token?: never;
  getToken: () => Promise<string> | string;
};

export type ChimeKitProviderProps =
  | ChimeKitProviderStaticTokenProps
  | ChimeKitProviderDynamicTokenProps;

export type ChimeKitMessage = {
  id: string;
  messageId: string;
  title?: string | null;
  snippet?: string | null;
  hasBody: boolean;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  category: string;
  primaryAction?: ChimeKitLinkAction | ChimeKitCallbackAction;
  secondaryAction?: ChimeKitLinkAction | ChimeKitCallbackAction;
};

type BaseChimeKitAction = {
  id?: string;
  label: string;
  type: "primary" | "secondary";
};

export type ChimeKitLinkAction = BaseChimeKitAction & {
  kind: "link";
  href: string;
  target?: HTMLAttributeAnchorTarget;
  rel?: string;
};

export type ChimeKitCallbackAction = BaseChimeKitAction & {
  kind: "callback";
  actionId: string;
};

export type ChimeKitAction = ChimeKitLinkAction | ChimeKitCallbackAction;

export type ChimeKitListMessagesResponse = {
  messages: Array<ChimeKitMessage>;
  nextCursor?: string | null;
};

export type ChimeKitMessageDetailsResponse = {
  messageId: string;
  title: string | null;
  snippet: string | null;
  createdAt: string;
  bodyHtml: string;
  category: string | null;
  primaryAction?: ChimeKitLinkAction | ChimeKitCallbackAction;
  secondaryAction?: ChimeKitLinkAction | ChimeKitCallbackAction;
};

export type ChimeKitUnreadCountResponse = {
  unreadCount: number;
};

export type ChimeKitRequestQuery = Record<
  string,
  string | number | boolean | undefined | null
>;

export type ChimeKitFetcherOptions = Omit<RequestInit, "body"> & {
  body?: RequestInit["body"] | Record<string, unknown>;
  query?: ChimeKitRequestQuery;
};

export type ChimeKitInboxFilters = {
  cursor?: string;
  limit?: number;
  status?: "all" | "read" | "unread" | "archived" | Array<"read" | "unread" | "archived" | "all">;
  category?: string;
};

export type ChimeKitUnreadCountFilters = {
  category?: string;
};

export type ChimeKitInboxMetaCategory = {
  categoryId: string | null;
  categoryName: string;
};

export type ChimeKitInboxMetaCategoryCount = ChimeKitInboxMetaCategory & {
  count: number;
};

export type ChimeKitBranding = {
  primaryColor: string | null;
  showPoweredBy?: boolean;
};

export type ChimeKitInboxMetaResponse = {
  unreadCount: {
    total: number;
    byCategory: ChimeKitInboxMetaCategoryCount[];
  };
  totalCount: {
    total: number;
    byCategory: ChimeKitInboxMetaCategoryCount[];
  };
  categories: ChimeKitInboxMetaCategory[];
  branding?: ChimeKitBranding;
};

export type ChimeKitMemberPreferenceChannelType = "email" | "in_app";

export type ChimeKitMemberPreferenceChannelState = {
  type: ChimeKitMemberPreferenceChannelType;
  enabled: boolean;
  canUpdate: boolean;
};

export type ChimeKitMemberPreferenceCategory = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  channels: Record<
    ChimeKitMemberPreferenceChannelType,
    ChimeKitMemberPreferenceChannelState
  >;
};

export type ChimeKitMemberPreferencesResponse = {
  categories: ChimeKitMemberPreferenceCategory[];
};

export type ChimeKitUpdateMemberPreferencesRequest = {
  preferences: Array<{
    categoryId: string;
    channel: ChimeKitMemberPreferenceChannelType;
    enabled: boolean;
  }>;
};

export type ChimeKitClient = {
  listInbox: (
    filters?: ChimeKitInboxFilters
  ) => Promise<ChimeKitListMessagesResponse>;
  getMessage: (messageId: string) => Promise<ChimeKitMessageDetailsResponse>;
  unreadCount: (
    filters?: ChimeKitUnreadCountFilters
  ) => Promise<ChimeKitUnreadCountResponse>;
  markRead: (messageId: string) => Promise<void>;
  markUnread: (messageId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archive: (messageId: string) => Promise<void>;
  archiveAll: () => Promise<void>;
  unarchive: (messageId: string) => Promise<void>;
  getMeta: () => Promise<ChimeKitInboxMetaResponse>;
  getPreferences: () => Promise<ChimeKitMemberPreferencesResponse>;
  updatePreferences: (
    payload: ChimeKitUpdateMemberPreferencesRequest
  ) => Promise<ChimeKitMemberPreferencesResponse>;
  fetcher: <T = unknown>(
    path: string,
    init?: ChimeKitFetcherOptions
  ) => Promise<T>;
};

export type ChimeKitContextValue = {
  publicKey: string;
  audienceMember: ChimeKitAudienceMember;
  client: ChimeKitClient;
  branding?: ChimeKitBranding | null;
  brandingLoaded?: boolean;
};
