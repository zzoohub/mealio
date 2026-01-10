/**
 * Overlay System
 *
 * toss/useOverlay 스타일의 선언적 오버레이 관리 시스템.
 * 어떤 컴포넌트든 { isOpen, close, exit } 시그니처만 맞추면 띄울 수 있음.
 *
 * @example
 * ```tsx
 * // 기본 사용법 - 커스텀 컴포넌트 띄우기
 * const overlay = useOverlay();
 *
 * overlay.open(({ isOpen, close, exit }) => (
 *   <MyCustomModal isOpen={isOpen} close={close} exit={exit}>
 *     <Content />
 *   </MyCustomModal>
 * ));
 *
 * // 편의 메서드 사용
 * const { toast, confirm, alert } = useOverlayHelpers();
 *
 * toast({ title: "저장됨", type: "success" });
 *
 * const result = await confirm({ title: "삭제할까요?", confirmVariant: "destructive" });
 * if (result) { ... }
 * ```
 */

// Provider & Core Hooks
export { OverlayProvider, useOverlay, useOverlayController } from "./OverlayProvider";

// Helper Hooks
export { useOverlayHelpers } from "./useOverlayHelpers";
export type {
  ToastOptions,
  ConfirmOptions,
  BottomSheetOptions,
  BottomSheetContent,
  ModalElement,
} from "./useOverlayHelpers";

// UI Components (for direct use)
export { Toast } from "./Toast";
export type { ToastProps, ToastType, ToastPosition } from "./Toast";

export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";
