import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import type { CSSProperties } from "react";

import { MessageDetails } from "./MessageDetails";

export type MessageDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string | null;
  title?: string;
  onActionCallback?: (actionId: string) => void;
  style?: CSSProperties;
};

export function MessageDetailsDialog({
  open,
  onOpenChange,
  messageId,
  title = "Notifications",
  onActionCallback,
  style,
}: MessageDetailsDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-chimekit-slot="chimekit-message-details-dialog-overlay" />
        <Dialog.Content
          data-chimekit-slot="chimekit-message-details-dialog-content"
          aria-describedby={undefined}
          style={style}
        >
          <VisuallyHidden.Root>
            <Dialog.Title>{title}</Dialog.Title>
          </VisuallyHidden.Root>
          <div data-chimekit-slot="chimekit-message-details-dialog-header">
            <div data-chimekit-slot="chimekit-message-details-dialog-title">
              {title}
            </div>
            <div data-chimekit-slot="chimekit-message-details-dialog-actions">
              <button
                type="button"
                aria-label="Close message details"
                data-chimekit-slot="chimekit-message-details-dialog-icon-button"
                onClick={() => onOpenChange(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div data-chimekit-slot="chimekit-message-details-dialog-body">
            {messageId ? (
              <MessageDetails
                messageId={messageId}
                onActionCallback={onActionCallback}
              />
            ) : (
              <div data-chimekit-slot="chimekit-message-details-dialog-empty">
                Select a message from your inbox to view its full content.
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
