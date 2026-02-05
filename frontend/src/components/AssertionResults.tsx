import { Icons } from "./Icons";
import { AssertionResult, getAssertionsSummary } from "../utils/assertions";

interface AssertionResultsProps {
  results: AssertionResult[];
}

export function AssertionResults({ results }: AssertionResultsProps) {
  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-ctp-subtext0 text-xs">
        No assertions to run
      </div>
    );
  }

  const summary = getAssertionsSummary(results);
  const allPassed = summary.failed === 0;

  return (
    <div className="p-4 space-y-3">
      {/* Summary */}
      <div
        className={`flex items-center gap-2 p-2 rounded-md ${
          allPassed
            ? "bg-ctp-green/10 border border-ctp-green/30"
            : "bg-ctp-red/10 border border-ctp-red/30"
        }`}
      >
        {allPassed ? (
          <Icons.Check size={14} className="text-ctp-green" />
        ) : (
          <Icons.X size={14} className="text-ctp-red" />
        )}
        <span className={`text-xs ${allPassed ? "text-ctp-green" : "text-ctp-red"}`}>
          {allPassed
            ? `All ${summary.total} assertion${summary.total !== 1 ? "s" : ""} passed`
            : `${summary.failed} of ${summary.total} assertion${summary.total !== 1 ? "s" : ""} failed`}
        </span>
      </div>

      {/* Results List */}
      <div className="space-y-1">
        {results.map((result, index) => (
          <div
            key={result.assertionId || index}
            className={`flex items-start gap-2 p-2 rounded-md ${
              result.passed
                ? "bg-ctp-surface0/30"
                : "bg-ctp-red/5 border border-ctp-red/20"
            }`}
          >
            {/* Status Icon */}
            <div className="mt-0.5 flex-shrink-0">
              {result.passed ? (
                <Icons.Check size={12} className="text-ctp-green" />
              ) : (
                <Icons.X size={12} className="text-ctp-red" />
              )}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <div
                className={`text-xs ${
                  result.passed ? "text-ctp-text" : "text-ctp-red"
                }`}
              >
                {result.message}
              </div>
              {!result.passed && result.actual && (
                <div className="text-xs text-ctp-subtext0 mt-0.5 truncate">
                  Actual: {result.actual}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
