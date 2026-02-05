import { Icons } from "./Icons";
import {
  Assertion,
  AssertionType,
  AssertionOperator,
  createEmptyAssertion,
  getAssertionTypeName,
  getOperatorsForType,
  getOperatorName,
} from "../utils/assertions";

interface AssertionsEditorProps {
  assertions: Assertion[];
  onChange: (assertions: Assertion[]) => void;
}

export function AssertionsEditor({ assertions, onChange }: AssertionsEditorProps) {
  const handleAddAssertion = () => {
    onChange([...assertions, createEmptyAssertion()]);
  };

  const handleRemoveAssertion = (id: string) => {
    onChange(assertions.filter((a) => a.id !== id));
  };

  const handleUpdateAssertion = (id: string, updates: Partial<Assertion>) => {
    onChange(
      assertions.map((a) => {
        if (a.id !== id) return a;
        const updated = { ...a, ...updates };
        // Reset operator if type changes and current operator is invalid
        if (updates.type) {
          const validOperators = getOperatorsForType(updates.type);
          if (!validOperators.includes(updated.operator)) {
            updated.operator = validOperators[0];
          }
          // Reset expected value for certain type changes
          if (updates.type === "status") {
            updated.expected = "200";
            updated.property = "";
          } else if (updates.type === "responseTime") {
            updated.expected = "1000";
            updated.property = "";
          } else if (updates.type === "headerExists" || updates.type === "headerEquals") {
            updated.property = "Content-Type";
          } else if (updates.type === "bodyJson") {
            updated.property = "";
          }
        }
        return updated;
      })
    );
  };

  const assertionTypes: AssertionType[] = [
    "status",
    "responseTime",
    "bodyContains",
    "bodyJson",
    "headerExists",
    "headerEquals",
  ];

  const needsProperty = (type: AssertionType) =>
    ["bodyJson", "headerExists", "headerEquals"].includes(type);

  const needsExpected = (type: AssertionType, operator: AssertionOperator) =>
    !["exists", "notExists"].includes(operator);

  const getPropertyPlaceholder = (type: AssertionType) => {
    switch (type) {
      case "bodyJson": return "e.g., data.id or items[0].name";
      case "headerExists":
      case "headerEquals": return "e.g., Content-Type";
      default: return "";
    }
  };

  const getExpectedPlaceholder = (type: AssertionType) => {
    switch (type) {
      case "status": return "e.g., 200";
      case "responseTime": return "e.g., 1000 (ms)";
      case "bodyContains": return "Text to find...";
      case "bodyJson": return "Expected value (JSON)";
      case "headerEquals": return "Expected value";
      default: return "";
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-ctp-subtext0">
          {assertions.length === 0
            ? "No assertions yet"
            : `${assertions.length} assertion${assertions.length !== 1 ? "s" : ""}`}
        </div>
        <button
          onClick={handleAddAssertion}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-ctp-mauve hover:bg-ctp-mauve/10 rounded-md"
        >
          <Icons.Plus size={12} />
          Add Assertion
        </button>
      </div>

      {/* Assertions List */}
      {assertions.length === 0 ? (
        <div className="text-center py-8 text-ctp-subtext0 text-xs">
          <p>Add assertions to test your API responses</p>
          <p className="mt-1 text-ctp-overlay0">
            Check status codes, response times, headers, and body content
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {assertions.map((assertion) => {
            const operators = getOperatorsForType(assertion.type);
            const showProperty = needsProperty(assertion.type);
            const showExpected = needsExpected(assertion.type, assertion.operator);

            return (
              <div
                key={assertion.id}
                className={`p-3 rounded-md border ${
                  assertion.enabled
                    ? "bg-ctp-surface0/50 border-ctp-surface1"
                    : "bg-ctp-surface0/20 border-ctp-surface0 opacity-60"
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() =>
                      handleUpdateAssertion(assertion.id, { enabled: !assertion.enabled })
                    }
                    className={`mt-1 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      assertion.enabled
                        ? "bg-ctp-mauve/20 border-ctp-mauve text-ctp-mauve"
                        : "bg-ctp-surface0 border-ctp-surface1 text-transparent"
                    }`}
                  >
                    {assertion.enabled && <Icons.Check size={10} />}
                  </button>

                  {/* Assertion Fields */}
                  <div className="flex-1 space-y-2">
                    {/* Row 1: Type and Operator */}
                    <div className="flex gap-2">
                      <select
                        value={assertion.type}
                        onChange={(e) =>
                          handleUpdateAssertion(assertion.id, {
                            type: e.target.value as AssertionType,
                          })
                        }
                        className="flex-1 bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text"
                      >
                        {assertionTypes.map((type) => (
                          <option key={type} value={type}>
                            {getAssertionTypeName(type)}
                          </option>
                        ))}
                      </select>

                      <select
                        value={assertion.operator}
                        onChange={(e) =>
                          handleUpdateAssertion(assertion.id, {
                            operator: e.target.value as AssertionOperator,
                          })
                        }
                        className="w-28 bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text"
                      >
                        {operators.map((op) => (
                          <option key={op} value={op}>
                            {getOperatorName(op)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Row 2: Property (if needed) */}
                    {showProperty && (
                      <input
                        type="text"
                        value={assertion.property}
                        onChange={(e) =>
                          handleUpdateAssertion(assertion.id, { property: e.target.value })
                        }
                        placeholder={getPropertyPlaceholder(assertion.type)}
                        className="w-full bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
                      />
                    )}

                    {/* Row 3: Expected Value (if needed) */}
                    {showExpected && (
                      <input
                        type="text"
                        value={assertion.expected}
                        onChange={(e) =>
                          handleUpdateAssertion(assertion.id, { expected: e.target.value })
                        }
                        placeholder={getExpectedPlaceholder(assertion.type)}
                        className="w-full bg-ctp-surface0 border border-ctp-surface1 px-2 py-1.5 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
                      />
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemoveAssertion(assertion.id)}
                    className="mt-1 p-1 text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-red/10 rounded-md flex-shrink-0"
                  >
                    <Icons.X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add Presets */}
      {assertions.length === 0 && (
        <div className="pt-4 border-t border-ctp-surface0">
          <div className="text-xs text-ctp-subtext0 mb-2">Quick Add:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                onChange([
                  {
                    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
                    type: "status",
                    property: "",
                    operator: "equals",
                    expected: "200",
                    enabled: true,
                  },
                ]);
              }}
              className="px-2 py-1 text-xs bg-ctp-green/10 text-ctp-green border border-ctp-green/30 rounded-md hover:bg-ctp-green/20"
            >
              Status is 200
            </button>
            <button
              onClick={() => {
                onChange([
                  {
                    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
                    type: "status",
                    property: "",
                    operator: "lessThan",
                    expected: "400",
                    enabled: true,
                  },
                ]);
              }}
              className="px-2 py-1 text-xs bg-ctp-blue/10 text-ctp-blue border border-ctp-blue/30 rounded-md hover:bg-ctp-blue/20"
            >
              Status {"<"} 400
            </button>
            <button
              onClick={() => {
                onChange([
                  {
                    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
                    type: "responseTime",
                    property: "",
                    operator: "lessThan",
                    expected: "1000",
                    enabled: true,
                  },
                ]);
              }}
              className="px-2 py-1 text-xs bg-ctp-peach/10 text-ctp-peach border border-ctp-peach/30 rounded-md hover:bg-ctp-peach/20"
            >
              Response {"<"} 1s
            </button>
            <button
              onClick={() => {
                onChange([
                  {
                    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
                    type: "headerExists",
                    property: "Content-Type",
                    operator: "exists",
                    expected: "",
                    enabled: true,
                  },
                ]);
              }}
              className="px-2 py-1 text-xs bg-ctp-mauve/10 text-ctp-mauve border border-ctp-mauve/30 rounded-md hover:bg-ctp-mauve/20"
            >
              Has Content-Type
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
