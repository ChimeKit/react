import * as React from "react";

let id = 0;
export function useId(prefix = "chimekit") {
  const [local] = React.useState(() => ++id);
  return `${prefix}-${local}`;
}
