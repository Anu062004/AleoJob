import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-white p-4">
                    <div className="max-w-md w-full bg-white rounded-xl p-6 border border-red-200 shadow-card-soft">
                        <h1 className="text-2xl font-bold mb-4 text-red-500">Something went wrong</h1>
                        <p className="text-brand-text-muted mb-4">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-4 py-2 bg-brand-primary hover:opacity-90 text-white rounded-lg transition-all"
                        >
                            Reload Page
                        </button>
                        <details className="mt-4">
                            <summary className="cursor-pointer text-sm text-brand-text-muted">Error details</summary>
                            <pre className="mt-2 text-xs bg-brand-surface p-4 rounded-lg overflow-auto text-brand-text">
                                {this.state.error?.stack}
                            </pre>
                        </details>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

