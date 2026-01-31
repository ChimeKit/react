import { useMemo } from "react";

import { useChimeKit } from "./useChimeKit";

export const usePoweredBy = (): boolean | null => {
  const { branding, brandingLoaded } = useChimeKit();
  const loaded = brandingLoaded ?? false;

  return useMemo(() => {
    if (!loaded) {
      return null;
    }
    return branding?.showPoweredBy ?? true;
  }, [branding?.showPoweredBy, loaded]);
};

export default usePoweredBy;
