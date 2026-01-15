import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
  useMemo,
} from "react";
import { View, StyleSheet } from "react-native";

// Types
type OverlayElement = React.FC<{
  isOpen: boolean;
  close: () => void;
  exit: () => void;
}>;

interface OverlayItem {
  id: string;
  element: OverlayElement;
  isOpen: boolean;
}

interface OverlayController {
  open: (element: OverlayElement) => string;
  close: (id: string) => void;
  exit: (id: string) => void;
  closeAll: () => void;
}

interface OverlayRef {
  open: (element: OverlayElement) => void;
  close: () => void;
  exit: () => void;
}

// Context
const OverlayContext = createContext<OverlayController | null>(null);

// Provider Component
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Map<string, OverlayItem>>(new Map());
  const idCounter = useRef(0);

  const open = useCallback((element: OverlayElement): string => {
    const id = `overlay-${++idCounter.current}`;

    setOverlays((prev) => {
      const next = new Map(prev);
      next.set(id, { id, element, isOpen: true });
      return next;
    });

    return id;
  }, []);

  const close = useCallback((id: string) => {
    setOverlays((prev) => {
      const item = prev.get(id);
      if (!item) return prev;

      const next = new Map(prev);
      next.set(id, { ...item, isOpen: false });
      return next;
    });
  }, []);

  const exit = useCallback((id: string) => {
    setOverlays((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setOverlays((prev) => {
      const next = new Map(prev);
      next.forEach((item, id) => {
        next.set(id, { ...item, isOpen: false });
      });
      return next;
    });
  }, []);

  const controller = useMemo(
    () => ({ open, close, exit, closeAll }),
    [open, close, exit, closeAll]
  );

  const overlayElements = useMemo(() => Array.from(overlays.values()), [overlays]);

  return (
    <OverlayContext.Provider value={controller}>
      {children}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {overlayElements.map(({ id, element: Element, isOpen }) => (
          <Element
            key={id}
            isOpen={isOpen}
            close={() => close(id)}
            exit={() => exit(id)}
          />
        ))}
      </View>
    </OverlayContext.Provider>
  );
}

// Hook
export function useOverlayController(): OverlayController {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error("useOverlayController must be used within OverlayProvider");
  }
  return context;
}

// useOverlay hook - returns a ref-like object for single overlay management
interface UseOverlayOptions {
  exitOnUnmount?: boolean;
}

export function useOverlay({ exitOnUnmount = true }: UseOverlayOptions = {}): OverlayRef {
  const controller = useOverlayController();
  const overlayId = useRef<string | null>(null);

  const open = useCallback(
    (element: OverlayElement) => {
      if (overlayId.current) {
        controller.exit(overlayId.current);
      }
      overlayId.current = controller.open(element);
    },
    [controller]
  );

  const close = useCallback(() => {
    if (overlayId.current) {
      controller.close(overlayId.current);
    }
  }, [controller]);

  const exit = useCallback(() => {
    if (overlayId.current) {
      controller.exit(overlayId.current);
      overlayId.current = null;
    }
  }, [controller]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (exitOnUnmount && overlayId.current) {
        controller.exit(overlayId.current);
      }
    };
  }, [exitOnUnmount, controller]);

  return useMemo(
    () => ({
      open,
      close,
      exit,
    }),
    [open, close, exit]
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});
