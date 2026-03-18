import { Icons } from "./Icons";
import { AssertionResult, getAssertionsSummary } from "../utils/assertions";

interface AssertionResultsProps {
  results: AssertionResult[];
}

const getSummaryMessage = (total: number, failed: number) => {
  const assertionLabel = `assertion${total !== 1 ? "s" : ""}`;
  if (failed === 0) {
    return `All ${total} ${assertionLabel} passed`;
  }
  return `${failed} of ${total} ${assertionLabel} failed`;
};

export function AssertionResults({ results }: AssertionResultsProps) {
  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-ctp-text text-xs">
        No assertions to run
      </div>
    );
  }

  const summary = getAssertionsSummary(results);
  const allPassed = summary.failed === 0;

  return (
    <div className="p-4 space-y-3">
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
          {getSummaryMessage(summary.total, summary.failed)}
        </span>
      </div>

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
            <div className="mt-0.5 flex-shrink-0">
              {result.passed ? (
                <Icons.Check size={12} className="text-ctp-green" />
              ) : (
                <Icons.X size={12} className="text-ctp-red" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div
                className={`text-xs ${
                  result.passed ? "text-ctp-text" : "text-ctp-red"
                }`}
              >
                {result.message}
              </div>
              {!result.passed && result.actual && (
                <div className="text-xs text-ctp-text mt-0.5 truncate">
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
