import React, { useCallback } from "react";
import { useOverlayController } from "./OverlayProvider";
import { Toast, ToastProps, ToastType, ToastPosition } from "./Toast";
import { ConfirmDialog, ConfirmDialogProps } from "./ConfirmDialog";

// Toast options
export interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  position?: ToastPosition;
  duration?: number;
  showArrow?: boolean;
  onPress?: () => void;
}

// Confirm options
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
}

export function useOverlayHelpers() {
  const controller = useOverlayController();

  // Toast helper
  const toast = useCallback(
    (options: ToastOptions) => {
      const id = controller.open(({ isOpen, close, exit }) => (
        <Toast
          isOpen={isOpen}
          close={close}
          exit={exit}
          title={options.title}
          message={options.message}
          type={options.type}
          position={options.position}
          duration={options.duration}
          showArrow={options.showArrow}
          onPress={options.onPress}
        />
      ));
      return id;
    },
    [controller]
  );

  // Confirm helper - returns Promise<boolean>
  const confirm = useCallback(
    (options: ConfirmOptions | string): Promise<boolean> => {
      const opts: ConfirmOptions =
        typeof options === "string" ? { title: options } : options;

      return new Promise((resolve) => {
        controller.open(({ isOpen, close, exit }) => (
          <ConfirmDialog
            isOpen={isOpen}
            close={close}
            exit={exit}
            title={opts.title}
            message={opts.message}
            confirmText={opts.confirmText}
            cancelText={opts.cancelText}
            confirmVariant={opts.confirmVariant}
            onConfirm={() => resolve(true)}
            onCancel={() => resolve(false)}
          />
        ));
      });
    },
    [controller]
  );

  // Alert helper (confirm with only OK button)
  const alert = useCallback(
    (options: Omit<ConfirmOptions, "cancelText"> | string): Promise<void> => {
      const opts: ConfirmOptions =
        typeof options === "string" ? { title: options } : options;

      return new Promise((resolve) => {
        controller.open(({ isOpen, close, exit }) => (
          <ConfirmDialog
            isOpen={isOpen}
            close={close}
            exit={exit}
            title={opts.title}
            message={opts.message}
            confirmText={opts.confirmText || "확인"}
            cancelText=""
            onConfirm={() => resolve()}
            onCancel={() => resolve()}
          />
        ));
      });
    },
    [controller]
  );

  // Raw open for custom overlays
  const open = controller.open;
  const close = controller.close;
  const exit = controller.exit;
  const closeAll = controller.closeAll;

  return {
    toast,
    confirm,
    alert,
    open,
    close,
    exit,
    closeAll,
  };
}
