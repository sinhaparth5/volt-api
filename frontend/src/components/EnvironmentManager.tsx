import { useState, useEffect } from "react";
import { Icons } from "./Icons";
import {
  GetEnvironments,
  CreateEnvironment,
  RenameEnvironment,
  DeleteEnvironment,
  GetEnvironmentVariables,
  SetEnvironmentVariable,
  DeleteEnvironmentVariable,
  ExportEnvironment,
  ImportEnvironment,
} from "../../wailsjs/go/app/App";
import { app } from "../../wailsjs/go/models";

type Environment = app.Environment;
type EnvironmentVariable = app.EnvironmentVariable;

interface EnvironmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onEnvironmentChange?: () => void;
}

export function EnvironmentManager({
  isOpen,
  onClose,
  onEnvironmentChange,
}: EnvironmentManagerProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null);
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [newEnvName, setNewEnvName] = useState("");
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [editingEnvName, setEditingEnvName] = useState("");
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarValue, setNewVarValue] = useState("");

  const loadEnvironments = async () => {
    try {
      const envs = await GetEnvironments();
      setEnvironments(envs || []);
    } catch (err) {
      console.error("Failed to load environments:", err);
    }
  };

  const loadVariables = async (envId: string) => {
    try {
      const vars = await GetEnvironmentVariables(envId);
      setVariables(vars || []);
    } catch (err) {
      console.error("Failed to load variables:", err);
      setVariables([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEnvironments();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedEnv) {
      loadVariables(selectedEnv.id);
    } else {
      setVariables([]);
    }
  }, [selectedEnv]);

  const handleCreateEnvironment = async () => {
    if (!newEnvName.trim()) return;
    try {
      const env = await CreateEnvironment(newEnvName.trim());
      if (env) {
        setNewEnvName("");
        await loadEnvironments();
        setSelectedEnv(env);
        onEnvironmentChange?.();
      }
    } catch (err) {
      console.error("Failed to create environment:", err);
    }
  };

  const handleRenameEnvironment = async (id: string) => {
    if (!editingEnvName.trim()) {
      setEditingEnvId(null);
      return;
    }
    try {
      await RenameEnvironment(id, editingEnvName.trim());
      setEditingEnvId(null);
      await loadEnvironments();
      if (selectedEnv?.id === id) {
        setSelectedEnv({ ...selectedEnv, name: editingEnvName.trim() });
      }
      onEnvironmentChange?.();
    } catch (err) {
      console.error("Failed to rename environment:", err);
    }
  };

  const handleDeleteEnvironment = async (id: string) => {
    try {
      await DeleteEnvironment(id);
      if (selectedEnv?.id === id) {
        setSelectedEnv(null);
      }
      await loadEnvironments();
      onEnvironmentChange?.();
    } catch (err) {
      console.error("Failed to delete environment:", err);
    }
  };

  const handleAddVariable = async () => {
    if (!selectedEnv || !newVarKey.trim()) return;
    try {
      await SetEnvironmentVariable(selectedEnv.id, newVarKey.trim(), newVarValue, true);
      setNewVarKey("");
      setNewVarValue("");
      await loadVariables(selectedEnv.id);
      onEnvironmentChange?.();
    } catch (err) {
      console.error("Failed to add variable:", err);
    }
  };

  const handleUpdateVariable = async (id: string, key: string, value: string, enabled: boolean) => {
    if (!selectedEnv) return;
    try {
      await SetEnvironmentVariable(selectedEnv.id, key, value, enabled);
      await loadVariables(selectedEnv.id);
      onEnvironmentChange?.();
    } catch (err) {
      console.error("Failed to update variable:", err);
    }
  };

  const handleDeleteVariable = async (id: string) => {
    try {
      await DeleteEnvironmentVariable(id);
      if (selectedEnv) {
        await loadVariables(selectedEnv.id);
      }
      onEnvironmentChange?.();
    } catch (err) {
      console.error("Failed to delete variable:", err);
    }
  };

  const handleExport = async () => {
    if (!selectedEnv) return;
    try {
      const json = await ExportEnvironment(selectedEnv.id);
      if (json) {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedEnv.name}.env.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to export environment:", err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = await file.text();
      const env = await ImportEnvironment(json);
      if (env) {
        await loadEnvironments();
        setSelectedEnv(env);
        onEnvironmentChange?.();
      }
    } catch (err) {
      console.error("Failed to import environment:", err);
    }
    e.target.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ctp-crust/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-ctp-base border border-ctp-surface0 rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ctp-surface0">
          <h2 className="text-sm text-ctp-text">Manage Environments</h2>
          <button
            onClick={onClose}
            className="text-ctp-subtext0 hover:text-ctp-text p-1 rounded hover:bg-ctp-surface0"
          >
            <Icons.X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Environment List */}
          <div className="w-48 border-r border-ctp-surface0 flex flex-col">
            {/* Create new */}
            <div className="p-2 border-b border-ctp-surface0">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateEnvironment()}
                  placeholder="New environment..."
                  className="flex-1 bg-ctp-surface0 border border-ctp-surface1 px-2 py-1 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
                />
                <button
                  onClick={handleCreateEnvironment}
                  disabled={!newEnvName.trim()}
                  className="px-2 py-1 bg-ctp-mauve text-ctp-base rounded-md text-xs disabled:opacity-50"
                >
                  <Icons.Plus size={12} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {environments.length === 0 && (
                <div className="p-4 text-center text-ctp-subtext0 text-xs">
                  No environments yet
                </div>
              )}
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`group px-3 py-2 cursor-pointer flex items-center justify-between ${
                    selectedEnv?.id === env.id
                      ? "bg-ctp-surface0 text-ctp-text"
                      : "text-ctp-subtext0 hover:bg-ctp-surface0/50"
                  }`}
                  onClick={() => setSelectedEnv(env)}
                >
                  {editingEnvId === env.id ? (
                    <input
                      type="text"
                      value={editingEnvName}
                      onChange={(e) => setEditingEnvName(e.target.value)}
                      onBlur={() => handleRenameEnvironment(env.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameEnvironment(env.id);
                        if (e.key === "Escape") setEditingEnvId(null);
                      }}
                      className="flex-1 bg-ctp-surface0 border border-ctp-lavender px-1 py-0.5 rounded text-xs outline-none text-ctp-text"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="text-xs truncate">{env.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEnvId(env.id);
                            setEditingEnvName(env.name);
                          }}
                          className="p-0.5 text-ctp-overlay0 hover:text-ctp-text"
                        >
                          <Icons.Code size={10} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEnvironment(env.id);
                          }}
                          className="p-0.5 text-ctp-overlay0 hover:text-ctp-red"
                        >
                          <Icons.Trash size={10} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Import */}
            <div className="p-2 border-t border-ctp-surface0">
              <label className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded-md cursor-pointer">
                <Icons.ArrowUp size={12} />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Variables */}
          <div className="flex-1 flex flex-col">
            {selectedEnv ? (
              <>
                {/* Variables header */}
                <div className="px-4 py-2 border-b border-ctp-surface0 flex items-center justify-between">
                  <span className="text-xs text-ctp-text">
                    Variables in <span className="text-ctp-mauve">{selectedEnv.name}</span>
                  </span>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded-md"
                  >
                    <Icons.ArrowDown size={12} />
                    Export
                  </button>
                </div>

                {/* Variables list */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Header */}
                  <div className="grid grid-cols-[20px_1fr_1fr_28px] gap-2 text-xs text-ctp-subtext0 pb-2">
                    <div></div>
                    <div>Variable</div>
                    <div>Value</div>
                    <div></div>
                  </div>

                  {/* Variables */}
                  {variables.map((v) => (
                    <div key={v.id} className="grid grid-cols-[20px_1fr_1fr_28px] gap-2 items-center mb-1 group">
                      <button
                        onClick={() => handleUpdateVariable(v.id, v.key, v.value, !v.enabled)}
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          v.enabled
                            ? "bg-ctp-mauve/20 border-ctp-mauve text-ctp-mauve"
                            : "bg-ctp-surface0 border-ctp-surface1 text-transparent"
                        }`}
                      >
                        {v.enabled && <Icons.Check size={10} />}
                      </button>
                      <input
                        type="text"
                        value={v.key}
                        onChange={(e) => handleUpdateVariable(v.id, e.target.value, v.value, v.enabled)}
                        className={`bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text ${!v.enabled ? "opacity-50" : ""}`}
                      />
                      <input
                        type="text"
                        value={v.value}
                        onChange={(e) => handleUpdateVariable(v.id, v.key, e.target.value, v.enabled)}
                        className={`bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text ${!v.enabled ? "opacity-50" : ""}`}
                      />
                      <button
                        onClick={() => handleDeleteVariable(v.id)}
                        className="w-7 h-7 flex items-center justify-center text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-red/10 rounded-md opacity-0 group-hover:opacity-100"
                      >
                        <Icons.X size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Add new variable */}
                  <div className="grid grid-cols-[20px_1fr_1fr_28px] gap-2 items-center mt-2 pt-2 border-t border-ctp-surface0">
                    <div></div>
                    <input
                      type="text"
                      value={newVarKey}
                      onChange={(e) => setNewVarKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddVariable()}
                      placeholder="Variable name"
                      className="bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
                    />
                    <input
                      type="text"
                      value={newVarValue}
                      onChange={(e) => setNewVarValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddVariable()}
                      placeholder="Value"
                      className="bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
                    />
                    <button
                      onClick={handleAddVariable}
                      disabled={!newVarKey.trim()}
                      className="w-7 h-7 flex items-center justify-center text-ctp-mauve hover:bg-ctp-mauve/10 rounded-md disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Icons.Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Usage hint */}
                <div className="px-4 py-2 border-t border-ctp-surface0 text-xs text-ctp-subtext0">
                  Use <code className="bg-ctp-surface0 px-1 py-0.5 rounded text-ctp-mauve">{"{{variableName}}"}</code> in URLs, headers, or body
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-ctp-subtext0 text-sm">
                Select an environment to manage variables
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
