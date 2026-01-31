
![share](https://github.com/user-attachments/assets/dc18926c-f7e7-4fbc-ad87-d60e918855a5)

# ChimeKit - React SDK

ChimeKit React SDK provides prebuilt notification UI and hooks for embedding the ChimeKit inbox in React apps. ChimeKit is a developer-first notification and product messaging infrastructure.

What you get:

- Prebuilt inbox UI (popover, modal, drawer) with feed, preferences, and message details.
- A client API for inbox data, metadata, and member preferences.
- Hooks and context access for custom UI.
- Theme tokens and class slots for styling.

## Installation

```bash
npm install @chimekit/react
```

```bash
pnpm add @chimekit/react
```

```bash
yarn add @chimekit/react
```

Peer dependencies: `react` and `react-dom`.

## Usage

### 1) Quickstart

```tsx
import "@chimekit/react/styles.css";
// Tailwind (optional): if you want utilities to override ChimeKit styles,
// use your global CSS instead:
// @import "@chimekit/react/styles.css" layer(components);
import { ChimeKitProvider, Inbox } from "@chimekit/react";

const audienceMember = { id: "user_123" };

export function App() {
  return (
    <ChimeKitProvider
      publicKey="ck_pub_..."
      audienceMember={audienceMember}
      token="member_token"
    >
      <Inbox />
    </ChimeKitProvider>
  );
}
```

### 2) Provider setup and auth

`ChimeKitProvider` requires:

- `publicKey` (your ChimeKit public key)
- `audienceMember` (the logged-in user, at minimum `{ id: string }`)
- either `token` or `getToken`

Optional provider props include `baseUrl` and `onAuthError`. `baseUrl` defaults to `https://api.chimekit.com/member/v1`.

`audienceMember` supports these optional fields: `displayName`, `email`, `externalUserId`, `avatarUrl`, and `traits`.

Dynamic token example:

```tsx
import { ChimeKitProvider, Inbox } from "@chimekit/react";

const getToken = async () => {
  const response = await fetch("/api/chimekit/token");
  if (!response.ok) {
    throw new Error("Failed to fetch ChimeKit token");
  }
  const data = await response.json();
  return data.token;
};

<ChimeKitProvider
  publicKey="ck_pub_..."
  audienceMember={{ id: "user_123" }}
  getToken={getToken}
  onAuthError={(error) => {
    console.error("ChimeKit auth error", error);
  }}
>
  <Inbox variant="popover" />
</ChimeKitProvider>;
```

`getToken` can return a string or a promise. If a request returns a 401, the client clears the cached token and retries once; if the retry fails, `onAuthError` is called.

### 3) Accessing the client

```tsx
import { useEffect } from "react";
import { useChimeKit } from "@chimekit/react";

export function UnreadCount() {
  const { client } = useChimeKit();

  useEffect(() => {
    void client.unreadCount().then((result) => {
      console.log(result.unreadCount);
    });
  }, [client]);

  return null;
}
```

Client methods:

- `listInbox`, `getMessage`, `unreadCount`
- `markRead`, `markUnread`, `markAllRead`
- `archive`, `archiveAll`, `unarchive`
- `getMeta`, `getPreferences`, `updatePreferences`
- `fetcher` for custom member API calls

### 4) Components

Exports:

- Provider: `ChimeKitProvider`
- Inbox UI: `Inbox`, `Bell`, `Feed`
- Preferences UI: `Preferences`, `PreferencesDialog`
- Message UI: `MessageDetails`, `MessageDetailsDialog`

`Inbox` supports `variant="popover" | "modal" | "drawer"` and accepts `labels`, `classes`, and `primaryColor` for customization. Use `bellProps`, `feedProps`, `messageDetailsProps`, and `preferencesProps` to pass through component props.

`Bell` supports `unread` (boolean or number), `size`, `renderIcon`, and `renderUnreadDot`.

`Feed` supports `type` filters (`"read" | "unread" | "archived" | "all"`) and optional `category` filtering.

### 5) Styling and theming

Import the stylesheet once. Tailwind users can keep the JS import; only use the
layered `@import` if you want Tailwind utilities to override ChimeKit styles.

```tsx
import "@chimekit/react/styles.css";
// Tailwind (optional): if you want utilities to override ChimeKit styles,
// use your global CSS instead:
// @import "@chimekit/react/styles.css" layer(components);
```

Theme with CSS variables on `:root` or `.chimekit-theme`:

```css
.chimekit-theme {
  --chimekit-color-primary: #0ea5e9;
  --chimekit-font-sans: "Inter", system-ui, sans-serif;
  --chimekit-radius: 0.5rem;
  --chimekit-bg: #ffffff;
  --chimekit-fg: #0f172a;
}
```

Dark mode is supported via `.dark .chimekit-theme` or `prefers-color-scheme: dark` with the default tokens.

Slot-level class overrides are available through the `classes` props. Example:

```tsx
<Inbox
  classes={{ root: "my-inbox", header: "my-inbox-header" }}
  bellProps={{ className: "my-bell" }}
/>
```

### 6) Message actions and HTML

Messages can include link actions or callback actions. Use `onActionCallback` to handle callback actions. `MessageDetails` renders HTML and accepts `sanitizeHtml` to customize sanitization.

```tsx
import { MessageDetails } from "@chimekit/react";

<MessageDetails
  messageId="msg_123"
  sanitizeHtml={(html) => html}
  onActionCallback={(actionId) => {
    console.log("Action clicked", actionId);
  }}
/>;
```

## Documentation

Full Client SDK documentation can be found here: [https://docs.chimekit.com/client-sdks](https://docs.chimekit.com/client-sdks)

## License

MIT License - see [LICENSE](./LICENSE) for details.
