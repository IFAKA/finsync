import { useState, useRef, useCallback, TouchEvent } from "react";

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  swiping: boolean;
}

interface SwipeHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance to trigger swipe (px)
  preventScrollOnSwipe?: boolean;
}

interface UseSwipeReturn {
  handlers: SwipeHandlers;
  swiping: boolean;
  direction: "left" | "right" | "up" | "down" | null;
  deltaX: number;
  deltaY: number;
}

export function useSwipe(options: UseSwipeOptions = {}): UseSwipeReturn {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScrollOnSwipe = false,
  } = options;

  const [swiping, setSwiping] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | "up" | "down" | null>(null);
  const [deltaX, setDeltaX] = useState(0);
  const [deltaY, setDeltaY] = useState(0);

  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    swiping: false,
  });

  const onTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      swiping: true,
    };
    setSwiping(true);
    setDirection(null);
    setDeltaX(0);
    setDeltaY(0);
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!stateRef.current.swiping) return;

    const touch = e.touches[0];
    const dx = touch.clientX - stateRef.current.startX;
    const dy = touch.clientY - stateRef.current.startY;

    stateRef.current.currentX = touch.clientX;
    stateRef.current.currentY = touch.clientY;

    setDeltaX(dx);
    setDeltaY(dy);

    // Determine direction based on dominant axis
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? "right" : "left");
      if (preventScrollOnSwipe && Math.abs(dx) > 10) {
        e.preventDefault();
      }
    } else {
      setDirection(dy > 0 ? "down" : "up");
    }
  }, [preventScrollOnSwipe]);

  const onTouchEnd = useCallback(() => {
    if (!stateRef.current.swiping) return;

    const dx = stateRef.current.currentX - stateRef.current.startX;
    const dy = stateRef.current.currentY - stateRef.current.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Check if swipe threshold was met
    if (absDx > threshold || absDy > threshold) {
      // Horizontal swipe takes precedence if both exceeded
      if (absDx > absDy) {
        if (dx > threshold && onSwipeRight) {
          onSwipeRight();
        } else if (dx < -threshold && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        if (dy > threshold && onSwipeDown) {
          onSwipeDown();
        } else if (dy < -threshold && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    stateRef.current.swiping = false;
    setSwiping(false);
    setDirection(null);
    setDeltaX(0);
    setDeltaY(0);
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    swiping,
    direction,
    deltaX,
    deltaY,
  };
}

// Hook for page navigation with swipe
export function useSwipeNavigation(
  pages: string[],
  currentPage: string,
  onNavigate: (page: string) => void
) {
  const currentIndex = pages.indexOf(currentPage);

  const handleSwipeLeft = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      onNavigate(pages[currentIndex + 1]);
    }
  }, [currentIndex, pages, onNavigate]);

  const handleSwipeRight = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(pages[currentIndex - 1]);
    }
  }, [currentIndex, pages, onNavigate]);

  return useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 75,
    preventScrollOnSwipe: true,
  });
}
