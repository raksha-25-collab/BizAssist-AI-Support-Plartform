import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error && parsed.operationType) {
          friendlyMessage = `Database ${parsed.operationType} error on ${parsed.path || 'workspace'}: ${parsed.error}`;
        }
      } catch {
        // Not JSON, keep raw message
      }

      return (
        <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E5DDD5] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-[#C23B0A] mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold text-[#171412]">Workspace Error Detected</h2>
            </div>
            <p className="text-sm text-[#574E47] leading-relaxed mb-5 break-words">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C23B0A] text-white text-sm font-semibold hover:bg-[#A63107] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
