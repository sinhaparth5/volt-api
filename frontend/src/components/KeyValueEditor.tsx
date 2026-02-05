import { useRef, useEffect } from "react";
import { Icons } from "./Icons";
import { KeyValuePair, generateId } from "../utils/helpers";

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: KeyValueEditorProps) {
  const lastInputRef = useRef<HTMLInputElement>(null);
  const shouldFocusLast = useRef(false);

  useEffect(() => {
    if (shouldFocusLast.current && lastInputRef.current) {
      lastInputRef.current.focus();
      shouldFocusLast.current = false;
    }
  }, [pairs.length]);

  const updatePair = (id: string, field: "key" | "value", newValue: string) => {
    const updated = pairs.map((p) =>
      p.id === id ? { ...p, [field]: newValue } : p
    );
    onChange(updated);
  };

  const togglePair = (id: string) => {
    const updated = pairs.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    onChange(updated);
  };

  const removePair = (id: string) => {
    if (pairs.length === 1) {
      // Keep one empty row
      onChange([{ id: generateId(), key: "", value: "", enabled: true }]);
    } else {
      onChange(pairs.filter((p) => p.id !== id));
    }
  };

  const addPair = () => {
    shouldFocusLast.current = true;
    onChange([...pairs, { id: generateId(), key: "", value: "", enabled: true }]);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    index: number,
    field: "key" | "value"
  ) => {
    const pair = pairs[index];

    // Enter on last row adds new row
    if (e.key === "Enter" && index === pairs.length - 1) {
      e.preventDefault();
      addPair();
    }

    // Backspace on empty key field removes row
    if (
      e.key === "Backspace" &&
      field === "key" &&
      !pair.key &&
      !pair.value &&
      pairs.length > 1
    ) {
      e.preventDefault();
      removePair(pair.id);
    }
  };

  // Ensure there's always at least one row
  const displayPairs = pairs.length > 0 ? pairs : [{ id: generateId(), key: "", value: "", enabled: true }];

  return (
    <div className="space-y-1">
      {/* Header - aligned with grid below */}
      <div className="grid grid-cols-[20px_1fr_1fr_28px] gap-2 text-xs text-ctp-subtext0 pb-1">
        <div></div>
        <div className="px-1">{keyPlaceholder}</div>
        <div className="px-1">{valuePlaceholder}</div>
        <div></div>
      </div>

      {/* Rows */}
      {displayPairs.map((pair, index) => (
        <div
          key={pair.id}
          className="grid grid-cols-[20px_1fr_1fr_28px] gap-2 items-center group"
        >
          {/* Checkbox */}
          <button
            onClick={() => togglePair(pair.id)}
            className={`w-4 h-4 rounded border flex items-center justify-center ${
              pair.enabled
                ? "bg-ctp-mauve/20 border-ctp-mauve text-ctp-mauve"
                : "bg-ctp-surface0 border-ctp-surface1 text-transparent"
            }`}
          >
            {pair.enabled && <Icons.Check size={10} />}
          </button>

          {/* Key input */}
          <input
            ref={index === displayPairs.length - 1 ? lastInputRef : null}
            type="text"
            value={pair.key}
            onChange={(e) => updatePair(pair.id, "key", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index, "key")}
            placeholder={keyPlaceholder}
            className={`bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-sm outline-none focus:border-ctp-lavender placeholder:text-ctp-overlay0 ${
              !pair.enabled ? "opacity-50" : ""
            }`}
          />

          {/* Value input */}
          <input
            type="text"
            value={pair.value}
            onChange={(e) => updatePair(pair.id, "value", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index, "value")}
            placeholder={valuePlaceholder}
            className={`bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-sm outline-none focus:border-ctp-lavender placeholder:text-ctp-overlay0 ${
              !pair.enabled ? "opacity-50" : ""
            }`}
          />

          {/* Remove button */}
          <button
            onClick={() => removePair(pair.id)}
            className="w-7 h-7 flex items-center justify-center text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-red/10 rounded-md opacity-0 group-hover:opacity-100"
          >
            <Icons.X size={14} />
          </button>
        </div>
      ))}

      {/* Add button */}
      <button
        onClick={addPair}
        className="flex items-center gap-1.5 text-xs text-ctp-subtext0 hover:text-ctp-text px-1 py-1.5 mt-1 rounded-md hover:bg-ctp-surface0/50"
      >
        <Icons.Plus size={12} />
        Add row
      </button>
    </div>
  );
}
