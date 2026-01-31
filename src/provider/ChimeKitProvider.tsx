import { createContext, useEffect, useMemo, useState } from "react";

import {
  createMemberClient,
  DynamicTokenManager,
  StaticTokenManager,
} from "../utils/memberClient";
import type {
  ChimeKitBranding,
  ChimeKitContextValue,
  ChimeKitProviderProps,
} from "../types";

export const ChimeKitContext = createContext<ChimeKitContextValue | undefined>(
  undefined
);

export const ChimeKitProvider = (props: ChimeKitProviderProps) => {
  const {
    publicKey,
    audienceMember,
    children,
    baseUrl,
    onAuthError,
    token,
    getToken,
  } = props;

  if (!publicKey) {
    throw new Error("ChimeKitProvider requires a publicKey");
  }

  if (!token && !getToken) {
    throw new Error("ChimeKitProvider requires a token or getToken");
  }

  const tokenManager = useMemo(() => {
    if (token) {
      return new StaticTokenManager(token);
    }
    if (getToken) {
      return new DynamicTokenManager(getToken);
    }
    throw new Error("ChimeKitProvider requires a token or getToken");
  }, [token, getToken]);

  const { client } = useMemo(
    () =>
      createMemberClient({
        publicKey,
        tokenManager,
        baseUrl,
        onAuthError,
      }),
    [publicKey, tokenManager, baseUrl, onAuthError]
  );

  const [branding, setBranding] = useState<ChimeKitBranding | null>(null);
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setBrandingLoaded(false);

    client
      .getMeta()
      .then((meta) => {
        if (!isMounted) {
          return;
        }
        setBranding(meta?.branding ?? null);
        setBrandingLoaded(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setBranding(null);
        setBrandingLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, [client]);

  const value = useMemo<ChimeKitContextValue>(
    () => ({
      publicKey,
      audienceMember,
      client,
      branding,
      brandingLoaded,
    }),
    [audienceMember, branding, brandingLoaded, client, publicKey]
  );

  return (
    <ChimeKitContext.Provider value={value}>
      {children}
    </ChimeKitContext.Provider>
  );
};
