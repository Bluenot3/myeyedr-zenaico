import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** A label used to reset the boundary when it changes (e.g. active tab). */
  resetKey?: string | number;
  /** Optional friendly name for the failing area. */
  section?: string;
  /** When true, render a compact inline fallback instead of a full panel. */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — hard stability net. Any render/runtime error inside a wrapped
 * subtree is caught here so it can never white-screen the entire app. The user
 * gets a graceful, recoverable panel instead of a crash.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prev: Props) {
    // Auto-recover when navigating to a different section.
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for logs without taking the app down.
    console.error(`[ErrorBoundary${this.props.section ? `:${this.props.section}` : ""}]`, error, info?.componentStack);
  }

  private reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.compact) {
      return (
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-muted-foreground flex-1">This section hit a snag.</span>
          <button onClick={this.reset} className="neu-btn h-8 px-3 gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6 animate-rise">
        <div className="glass-panel rounded-2xl p-8 max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/12 border border-amber-500/30">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">Something needs a moment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.props.section ? `The ${this.props.section} view` : "This view"} ran into an unexpected issue. Your data is safe — reload the section to continue.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button onClick={this.reset} className="neu-btn neu-btn--primary h-10 px-4 gap-2 text-sm font-medium">
              <RotateCcw className="h-4 w-4" /> Reload section
            </button>
            <button onClick={() => window.location.reload()} className="neu-btn h-10 px-4 text-sm">
              Refresh app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
