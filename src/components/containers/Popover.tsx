import * as React from "react";
import * as RadixPopover from "@radix-ui/react-popover";

import { useControllable } from "../../hooks/useControllable";

export type PopoverProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (o: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  labelledById?: string;
  descriptionId?: string;
  classes?: { content?: string; trigger?: string };
  style?: React.CSSProperties;
  slot?: string;
  renderTrigger: (props: {
    className?: string;
    onClick(): void;
    "aria-controls"?: string;
    "aria-expanded"?: boolean;
  }) => React.ReactNode;
  children?: React.ReactNode; // content
};

export function Popover({
  open,
  defaultOpen = false,
  onOpenChange,
  onCloseAutoFocus,
  align = "end",
  side = "bottom",
  sideOffset = 12,
  slot,
  labelledById,
  descriptionId,
  style,
  classes,
  renderTrigger,
  children,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useControllable<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <RadixPopover.Root open={isOpen} onOpenChange={setIsOpen}>
      <RadixPopover.Trigger asChild>
        {renderTrigger({
          onClick: () => setIsOpen(!isOpen),
          "aria-controls": labelledById,
          "aria-expanded": isOpen,
          className: classes?.trigger,
        })}
      </RadixPopover.Trigger>

      <RadixPopover.Portal>
        <RadixPopover.Content
          role="dialog"
          aria-modal="false"
          aria-labelledby={labelledById}
          aria-describedby={descriptionId}
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={classes?.content}
          style={style}
          data-chimekit-variant="popover"
          data-chimekit-slot={slot}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
