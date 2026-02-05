import { useState, useRef, useCallback, useEffect } from "react";

interface ResizablePanelProps {
  direction: "horizontal" | "vertical";
  initialSize: number;
  minSize: number;
  maxSize: number;
  children: React.ReactNode;
  className?: string;
  onResize?: (size: number) => void;
  storageKey?: string;
}

export function ResizablePanel({
  direction,
  initialSize,
  minSize,
  maxSize,
  children,
  className = "",
  onResize,
  storageKey,
}: ResizablePanelProps) {
  // Load from localStorage if available
  const getInitialSize = () => {
    if (storageKey) {
      const saved = localStorage.getItem(`panel-size-${storageKey}`);
      if (saved) {
        const size = parseInt(saved, 10);
        if (size >= minSize && size <= maxSize) {
          return size;
        }
      }
    }
    return initialSize;
  };

  const [size, setSize] = useState(getInitialSize);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      let newSize: number;

      if (direction === "horizontal") {
        newSize = e.clientX - rect.left;
      } else {
        newSize = e.clientY - rect.top;
      }

      // Clamp to min/max
      newSize = Math.max(minSize, Math.min(maxSize, newSize));

      setSize(newSize);
      onResize?.(newSize);

      // Save to localStorage
      if (storageKey) {
        localStorage.setItem(`panel-size-${storageKey}`, String(newSize));
      }
    },
    [isResizing, direction, minSize, maxSize, onResize, storageKey]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp, direction]);

  const style = direction === "horizontal" ? { width: size } : { height: size };

  return (
    <div
      ref={panelRef}
      className={`relative flex-shrink-0 ${className}`}
      style={style}
    >
      {children}

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute z-10 ${
          direction === "horizontal"
            ? "right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-ctp-mauve/50"
            : "bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-ctp-mauve/50"
        } ${isResizing ? "bg-ctp-mauve" : "bg-transparent"}`}
      />
    </div>
  );
}
