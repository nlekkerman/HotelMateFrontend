import React, { Component } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

/**
 * Chart Error Boundary
 * 
 * React Error Boundary for graceful chart failure handling
 */
class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    // Call parent retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const { height = 400, width = '100%', showDetails = false } = this.props;
      
      return (
        <div 
          className="chart-error-boundary"
          style={{
            width,
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px'
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <FaExclamationTriangle 
              size={48} 
              style={{ color: '#856404', marginBottom: '15px' }} 
            />
            
            <Alert variant="warning" style={{ marginBottom: '15px' }}>
              <Alert.Heading style={{ fontSize: '18px' }}>
                Chart Rendering Error
              </Alert.Heading>
              <p style={{ marginBottom: '10px', fontSize: '14px' }}>
                Something went wrong while rendering this chart.
              </p>
              {showDetails && this.state.error && (
                <details style={{ 
                  marginTop: '10px', 
                  textAlign: 'left',
                  fontSize: '12px',
                  backgroundColor: '#fff',
                  padding: '10px',
                  borderRadius: '4px'
                }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Error Details
                  </summary>
                  <pre style={{ 
                    marginTop: '10px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </Alert>
            
            <Button 
              variant="warning" 
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaRedo size={14} />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;
