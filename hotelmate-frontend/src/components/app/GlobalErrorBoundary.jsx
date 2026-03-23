import React from 'react';

/**
 * GlobalErrorBoundary — Top-level error boundary for the app shell.
 *
 * Catches unhandled render errors anywhere in the tree and shows a
 * recovery-friendly fallback instead of a white screen.
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[GlobalErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="d-flex align-items-center justify-content-center min-vh-100"
          style={{ backgroundColor: '#f8f9fa' }}
        >
          <div
            className="card shadow-sm"
            style={{ maxWidth: 520, width: '100%' }}
          >
            <div className="card-body text-center p-4">
              <h4 className="card-title mb-3">Something went wrong</h4>
              <p className="text-muted mb-4">
                An unexpected error occurred. You can try reloading the page or
                going back.
              </p>

              <div className="d-flex justify-content-center gap-2 mb-3">
                <button
                  className="btn btn-primary"
                  onClick={this.handleReload}
                >
                  Reload Page
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={this.handleReset}
                >
                  Try Again
                </button>
              </div>

              {this.state.error && (
                <details className="text-start mt-3">
                  <summary className="text-muted" style={{ cursor: 'pointer' }}>
                    Error Details
                  </summary>
                  <pre
                    className="bg-light p-2 rounded mt-2"
                    style={{
                      fontSize: '0.75rem',
                      maxHeight: 200,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
