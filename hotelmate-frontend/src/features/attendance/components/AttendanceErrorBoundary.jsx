import React from 'react';

/**
 * Error Boundary for Attendance System
 * Catches JavaScript errors anywhere in the attendance component tree and displays a fallback UI.
 */
class AttendanceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { 
      hasError: true,
      errorId: `att-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Attendance Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Here you could send error to logging service
    // Example: sendErrorToService(error, errorInfo, this.props.hotelSlug);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    });
  };

  handleReloadPage = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { showDetails = false } = this.props;
      
      return (
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-md-8">
              <div className="card border-danger">
                <div className="card-header bg-danger text-white">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Attendance System Error
                  </h5>
                </div>
                <div className="card-body">
                  <div className="alert alert-danger" role="alert">
                    <strong>Something went wrong!</strong> The attendance system encountered an unexpected error.
                  </div>
                  
                  <p className="text-muted mb-3">
                    Don't worry - your data is safe. This appears to be a temporary issue with the interface.
                  </p>

                  <div className="d-flex gap-2 flex-wrap mb-4">
                    <button 
                      className="hm-btn hm-btn-confirm" 
                      onClick={this.handleRetry}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Try Again
                    </button>
                    <button 
                      className="hm-btn hm-btn-outline" 
                      onClick={this.handleReloadPage}
                    >
                      <i className="bi bi-arrow-repeat me-1"></i>
                      Reload Page
                    </button>
                    <a 
                      href="/dashboard" 
                      className="btn btn-outline-primary"
                    >
                      <i className="bi bi-house me-1"></i>
                      Back to Dashboard
                    </a>
                  </div>

                  <div className="border rounded p-3 bg-light">
                    <h6 className="text-muted mb-2">What you can do:</h6>
                    <ul className="mb-0 text-muted small">
                      <li>Click "Try Again" to retry loading the attendance system</li>
                      <li>Click "Reload Page" to refresh the entire page</li>
                      <li>Go back to the main dashboard and try accessing attendance again</li>
                      <li>If the problem persists, contact your system administrator</li>
                    </ul>
                  </div>

                  {showDetails && this.state.error && (
                    <details className="mt-3">
                      <summary className="text-muted small" style={{ cursor: 'pointer' }}>
                        Technical Details (for developers)
                      </summary>
                      <div className="mt-2 p-2 bg-light border rounded">
                        <small className="text-muted d-block mb-2">
                          Error ID: <code>{this.state.errorId}</code>
                        </small>
                        <pre className="small text-danger mb-2" style={{ fontSize: '0.75rem' }}>
                          {this.state.error && this.state.error.toString()}
                        </pre>
                        {this.state.errorInfo && (
                          <pre className="small text-muted" style={{ fontSize: '0.7rem' }}>
                            {this.state.errorInfo.componentStack}
                          </pre>
                        )}
                      </div>
                    </details>
                  )}
                </div>
                <div className="card-footer text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  If this problem continues, please report it with error ID: <code>{this.state.errorId}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withAttendanceErrorBoundary(Component, options = {}) {
  return function WrappedComponent(props) {
    return (
      <AttendanceErrorBoundary {...options}>
        <Component {...props} />
      </AttendanceErrorBoundary>
    );
  };
}

export default AttendanceErrorBoundary;