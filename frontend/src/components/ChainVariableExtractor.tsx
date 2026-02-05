import { useState } from "react";
import { Icons } from "./Icons";
import {
  ChainVariable,
  ExtractionType,
  extractValue,
  generateChainId,
} from "../utils/chainVariables";

interface ChainVariableExtractorProps {
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  };
  chainVariables: ChainVariable[];
  onAddVariable: (variable: ChainVariable) => void;
  onRemoveVariable: (id: string) => void;
}

export function ChainVariableExtractor({
  response,
  chainVariables,
  onAddVariable,
  onRemoveVariable,
}: ChainVariableExtractorProps) {
  const [extractionType, setExtractionType] = useState<ExtractionType>("json");
  const [path, setPath] = useState("");
  const [variableName, setVariableName] = useState("");
  const [previewValue, setPreviewValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = () => {
    if (!path.trim()) {
      setError("Enter a path or pattern");
      setPreviewValue(null);
      return;
    }

    const value = extractValue(
      { type: extractionType, path, variableName },
      response
    );

    if (value === null) {
      setError("Could not extract value");
      setPreviewValue(null);
    } else {
      setError(null);
      setPreviewValue(value);
    }
  };

  const handleSave = () => {
    if (!variableName.trim()) {
      setError("Enter a variable name");
      return;
    }

    const value = extractValue(
      { type: extractionType, path, variableName },
      response
    );

    if (value === null) {
      setError("Could not extract value");
      return;
    }

    const sourceDescription = getSourceDescription();

    onAddVariable({
      id: generateChainId(),
      name: variableName.trim(),
      value,
      source: sourceDescription,
      createdAt: Date.now(),
    });

    // Reset form
    setPath("");
    setVariableName("");
    setPreviewValue(null);
    setError(null);
  };

  const getSourceDescription = (): string => {
    switch (extractionType) {
      case "json":
        return `JSON: ${path}`;
      case "header":
        return `Header: ${path}`;
      case "regex":
        return `Regex: ${path}`;
      case "status":
        return "Status Code";
      case "body":
        return "Full Body";
      default:
        return extractionType;
    }
  };

  const getPlaceholder = (): string => {
    switch (extractionType) {
      case "json":
        return "e.g., data.token or user.id";
      case "header":
        return "e.g., Authorization or X-Request-Id";
      case "regex":
        return "e.g., token\":\"([^\"]+)";
      case "status":
      case "body":
        return "";
      default:
        return "";
    }
  };

  const needsPath = extractionType !== "status" && extractionType !== "body";

  return (
    <div className="space-y-4">
      {/* Saved Chain Variables */}
      {chainVariables.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-ctp-text flex items-center gap-2">
            <Icons.Bolt size={12} className="text-ctp-yellow" />
            Chain Variables ({chainVariables.length})
          </div>
          <div className="space-y-1">
            {chainVariables.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-2 p-2 bg-ctp-surface0/50 rounded-md group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-ctp-yellow">
                      {`{{${v.name}}}`}
                    </code>
                    <span className="text-xs text-ctp-overlay0">→</span>
                    <span className="text-xs text-ctp-text truncate">
                      {v.value.length > 50 ? v.value.slice(0, 50) + "..." : v.value}
                    </span>
                  </div>
                  <div className="text-xs text-ctp-overlay0 mt-0.5">{v.source}</div>
                </div>
                <button
                  onClick={() => onRemoveVariable(v.id)}
                  className="p-1 text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-red/10 rounded opacity-0 group-hover:opacity-100"
                >
                  <Icons.X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extract New Variable */}
      <div className="space-y-3">
        <div className="text-xs text-ctp-text">Extract Value to Variable</div>

        {/* Extraction Type */}
        <div className="flex gap-1 bg-ctp-surface0 rounded-md p-0.5">
          {(["json", "header", "regex", "status", "body"] as ExtractionType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => {
                  setExtractionType(type);
                  setPath("");
                  setPreviewValue(null);
                  setError(null);
                }}
                className={`flex-1 px-2 py-1 text-xs rounded capitalize ${
                  extractionType === type
                    ? "bg-ctp-mauve text-ctp-base"
                    : "text-ctp-subtext0 hover:text-ctp-text"
                }`}
              >
                {type}
              </button>
            )
          )}
        </div>

        {/* Path Input */}
        {needsPath && (
          <input
            type="text"
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              setPreviewValue(null);
              setError(null);
            }}
            placeholder={getPlaceholder()}
            className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
          />
        )}

        {/* Preview Button & Result */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={needsPath && !path.trim()}
            className="px-3 py-1.5 text-xs bg-ctp-surface0 text-ctp-text hover:bg-ctp-surface1 rounded-md disabled:opacity-50"
          >
            Preview
          </button>
          {previewValue !== null && (
            <div className="flex-1 p-2 bg-ctp-green/10 border border-ctp-green/30 rounded-md">
              <span className="text-xs text-ctp-green break-all">
                {previewValue.length > 100
                  ? previewValue.slice(0, 100) + "..."
                  : previewValue}
              </span>
            </div>
          )}
          {error && (
            <div className="flex-1 p-2 bg-ctp-red/10 border border-ctp-red/30 rounded-md">
              <span className="text-xs text-ctp-red">{error}</span>
            </div>
          )}
        </div>

        {/* Variable Name & Save */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ctp-overlay0 text-xs">
              {"{{"}
            </span>
            <input
              type="text"
              value={variableName}
              onChange={(e) => setVariableName(e.target.value.replace(/[{}]/g, ""))}
              placeholder="variableName"
              className="w-full bg-ctp-surface0 border border-ctp-surface1 pl-7 pr-7 py-2 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ctp-overlay0 text-xs">
              {"}}"}
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={!variableName.trim() || (needsPath && !path.trim())}
            className="px-4 py-2 text-xs bg-ctp-yellow text-ctp-base hover:bg-ctp-yellow/90 rounded-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <Icons.Plus size={12} />
            Save
          </button>
        </div>

        {/* Usage Hint */}
        <div className="text-xs text-ctp-overlay0">
          Chain variables can be used like environment variables:{" "}
          <code className="bg-ctp-surface0 px-1 py-0.5 rounded text-ctp-yellow">
            {"{{variableName}}"}
          </code>
        </div>
      </div>
    </div>
  );
}
