import { useState, useEffect, useRef } from "react";
import { Icons } from "./Icons";
import {
  GetEnvironments,
  GetActiveEnvironment,
  SetActiveEnvironment,
} from "../../wailsjs/go/app/App";
import { app } from "../../wailsjs/go/models";

type Environment = app.Environment;

interface EnvironmentSelectorProps {
  onEnvironmentChange?: () => void;
  onManageClick: () => void;
}

export function EnvironmentSelector({
  onEnvironmentChange,
  onManageClick,
}: EnvironmentSelectorProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnv, setActiveEnv] = useState<Environment | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadEnvironments = async () => {
    try {
      const [envs, active] = await Promise.all([
        GetEnvironments(),
        GetActiveEnvironment(),
      ]);
      setEnvironments(envs || []);
      setActiveEnv(active || null);
    } catch (err) {
      console.error("Failed to load environments:", err);
    }
  };

  useEffect(() => {
    loadEnvironments();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = async (envId: string) => {
    try {
      await SetActiveEnvironment(envId);
      await loadEnvironments();
      onEnvironmentChange?.();
    } catch (err) {
      console.error("Failed to set active environment:", err);
    }
    setIsOpen(false);
  };

  const handleClearEnvironment = async () => {
    try {
      await SetActiveEnvironment("");
      await loadEnvironments();
      onEnvironmentChange?.();
    } catch (err) {
      console.error("Failed to clear environment:", err);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md ${
          activeEnv
            ? "bg-ctp-green/10 text-ctp-green border border-ctp-green/30"
            : "text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0"
        }`}
      >
        <Icons.Globe size={12} />
        <span>{activeEnv?.name || "No Environment"}</span>
        <Icons.ChevronDown
          size={10}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-ctp-surface0 border border-ctp-surface1 rounded-md shadow-lg shadow-ctp-crust/30 overflow-hidden z-50">
          {/* No Environment option */}
          <button
            onClick={handleClearEnvironment}
            className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 ${
              !activeEnv
                ? "bg-ctp-surface1 text-ctp-text"
                : "text-ctp-subtext0 hover:bg-ctp-surface1 hover:text-ctp-text"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${!activeEnv ? "bg-ctp-green" : "bg-transparent"}`} />
            No Environment
          </button>

          {/* Divider */}
          {environments.length > 0 && (
            <div className="border-t border-ctp-surface1" />
          )}

          {/* Environment list */}
          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => handleSelect(env.id)}
              className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 ${
                activeEnv?.id === env.id
                  ? "bg-ctp-green/10 text-ctp-green"
                  : "text-ctp-subtext0 hover:bg-ctp-surface1 hover:text-ctp-text"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeEnv?.id === env.id ? "bg-ctp-green" : "bg-transparent"}`} />
              {env.name}
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-ctp-surface1" />

          {/* Manage button */}
          <button
            onClick={() => {
              setIsOpen(false);
              onManageClick();
            }}
            className="w-full px-3 py-2 text-left text-xs text-ctp-subtext0 hover:bg-ctp-surface1 hover:text-ctp-text flex items-center gap-2"
          >
            <Icons.Settings size={12} />
            Manage Environments
          </button>
        </div>
      )}
    </div>
  );
}
