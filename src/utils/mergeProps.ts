import { clsx } from "clsx";
import type * as React from "react";

type WithClassAndStyle = {
  className?: string;
  style?: React.CSSProperties;
};

type Writable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Deep-merges className and style; shallow-merges other keys.
 * Later objects override earlier ones (last wins).
 */
export function mergeProps<T extends WithClassAndStyle>(
  ...all: ReadonlyArray<Partial<T> | undefined>
): T {
  const out = {} as Writable<T> & WithClassAndStyle;

  for (const src of all) {
    if (!src) continue;

    // className (use clsx directly)
    if (src.className) {
      out.className = clsx(out.className, src.className);
    }

    // style (deep merge)
    if (src.style) {
      out.style = { ...(out.style ?? {}), ...src.style };
    }

    // everything else (shallow, typed)
    for (const key of Object.keys(src) as Array<keyof T>) {
      if (key === "className" || key === "style") continue;
      out[key] = src[key] as T[typeof key];
    }
  }

  return out as T;
}
