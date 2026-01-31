import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import type { CSSProperties } from "react";

import { Preferences, type PreferencesProps } from "./Preferences";

export type PreferencesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  preferencesProps?: Partial<PreferencesProps>;
  style?: CSSProperties;
};

export function PreferencesDialog({
  open,
  onOpenChange,
  title = "Preferences",
  preferencesProps,
  style,
}: PreferencesDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-chimekit-slot="chimekit-preferences-dialog-overlay" />
        <Dialog.Content
          data-chimekit-slot="chimekit-preferences-dialog-content"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
          style={style}
        >
          <VisuallyHidden.Root>
            <Dialog.Title>{title}</Dialog.Title>
          </VisuallyHidden.Root>
          <div data-chimekit-slot="chimekit-preferences-header">
            <div data-chimekit-slot="chimekit-preferences-header-left">
              <div data-chimekit-slot="chimekit-preferences-title">{title}</div>
            </div>
            <div data-chimekit-slot="chimekit-preferences-header-actions">
              <button
                type="button"
                aria-label="Close preferences"
                data-chimekit-slot="chimekit-preferences-header-icon-button"
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
          <Preferences {...preferencesProps} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
