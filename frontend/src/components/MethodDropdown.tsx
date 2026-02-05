import { useRef, useEffect } from "react";
import { Icons } from "./Icons";
import { METHODS, getMethodColor, getMethodBg } from "../utils/helpers";

interface MethodDropdownProps {
  method: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (method: string) => void;
}

export function MethodDropdown({ method, isOpen, onToggle, onSelect }: MethodDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        className={`border px-3 py-2 rounded-md w-24 text-xs flex items-center justify-between gap-1 ${getMethodBg(method)} ${getMethodColor(method)}`}
      >
        <span className="font-semibold">{method}</span>
        <Icons.ChevronDown
          size={12}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-28 bg-ctp-surface0 border border-ctp-surface1 rounded-md shadow-lg shadow-ctp-crust/30 overflow-hidden z-50">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onSelect(m)}
              className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 ${
                method === m
                  ? `${getMethodBg(m)} ${getMethodColor(m)}`
                  : `text-ctp-subtext1 hover:bg-ctp-surface1`
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${method === m ? "bg-current" : "bg-transparent"}`} />
              <span className="font-semibold">{m}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
