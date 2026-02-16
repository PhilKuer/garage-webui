import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
          <div className="bg-base-100 rounded-box p-6 md:p-8 max-w-lg w-full shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-error" size={28} />
              <h1 className="text-xl font-bold">Something went wrong</h1>
            </div>
            <p className="text-base-content/70 mb-4">
              An unexpected error occurred. Try refreshing the page.
            </p>
            {this.state.error && (
              <pre className="bg-base-200 rounded-box p-3 text-sm overflow-auto max-h-40 mb-4">
                {this.state.error.message}
              </pre>
            )}
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
