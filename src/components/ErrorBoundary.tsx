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
                <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
                    <div className="max-w-md w-full bg-slate-800 rounded-lg p-6 border border-red-500/50">
                        <h1 className="text-2xl font-bold mb-4 text-red-400">Something went wrong</h1>
                        <p className="text-slate-300 mb-4">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                            Reload Page
                        </button>
                        <details className="mt-4">
                            <summary className="cursor-pointer text-sm text-slate-400">Error details</summary>
                            <pre className="mt-2 text-xs bg-slate-900 p-4 rounded overflow-auto">
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

