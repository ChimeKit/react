import { useContext } from "react";

import { ChimeKitContext } from "../provider/ChimeKitProvider";
import type { ChimeKitContextValue } from "../types";

export const useChimeKit = (): ChimeKitContextValue => {
  const context = useContext(ChimeKitContext);

  if (!context) {
    throw new Error("useChimeKit must be used within a ChimeKitProvider");
  }

  return context;
};
