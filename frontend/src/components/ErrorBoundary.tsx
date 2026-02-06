import { Component, ErrorInfo, ReactNode } from "react";
import { Icons } from "./Icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex-1 flex items-center justify-center bg-ctp-base p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-xl bg-ctp-red/10 flex items-center justify-center mx-auto mb-4">
              <Icons.AlertTriangle size={32} className="text-ctp-red" />
            </div>
            <h2 className="text-lg font-semibold text-ctp-text mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-ctp-subtext0 mb-4">
              An unexpected error occurred. Try refreshing the page or resetting this section.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-xs text-ctp-overlay0 cursor-pointer hover:text-ctp-text">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-ctp-surface0 rounded-md text-xs text-ctp-red overflow-auto max-h-32">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-sm bg-ctp-surface0 hover:bg-ctp-surface1 text-ctp-text rounded-md"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm bg-ctp-mauve hover:bg-ctp-mauve/90 text-ctp-base rounded-md"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Smaller inline error boundary for sections
export function SectionErrorFallback({ onReset }: { onReset?: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center">
        <Icons.AlertTriangle size={20} className="text-ctp-peach mx-auto mb-2" />
        <p className="text-sm text-ctp-subtext0 mb-2">Failed to load this section</p>
        {onReset && (
          <button
            onClick={onReset}
            className="text-xs text-ctp-mauve hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
