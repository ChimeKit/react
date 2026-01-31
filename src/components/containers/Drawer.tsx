import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import { useControllable } from "../../hooks/useControllable";

export type DrawerProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (o: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  title?: string;
  hideTitle?: boolean;
  side?: "left" | "right" | "top" | "bottom";
  labelledById?: string;
  descriptionId?: string;
  className?: string;
  style?: React.CSSProperties;
  classes?: {
    overlay?: string;
    content?: string;
    header?: string;
    title?: string;
    trigger?: string;
  };
  renderTrigger: (props: {
    onClick(): void;
    "aria-controls"?: string;
    "aria-expanded"?: boolean;
  }) => React.ReactNode;
  children?: React.ReactNode;
  slot?: string;
};

export function Drawer({
  open,
  defaultOpen = false,
  onOpenChange,
  onCloseAutoFocus,
  title = "Notifications",
  hideTitle = true,
  side = "right",
  labelledById,
  descriptionId,
  slot,
  style,
  classes,
  renderTrigger,
  children,
}: DrawerProps) {
  const [isOpen, setIsOpen] = useControllable<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <Dialog.Trigger asChild>
        {renderTrigger({
          onClick: () => setIsOpen(true),
          "aria-controls": labelledById,
          "aria-expanded": isOpen,
        })}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className={classes?.overlay}
          data-chimekit-slot="chimekit-drawer-overlay"
        />
        <Dialog.Content
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledById}
          aria-describedby={descriptionId}
          className={classes?.content}
          style={style}
          data-chimekit-slot={slot}
          data-chimekit-variant="drawer"
          data-chimekit-side={side}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          {hideTitle ? (
            <VisuallyHidden.Root>
              <Dialog.Title className={classes?.title}>{title}</Dialog.Title>
            </VisuallyHidden.Root>
          ) : (
            <Dialog.Title className={classes?.title}>{title}</Dialog.Title>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
