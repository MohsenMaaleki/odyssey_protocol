import React, { Component, ReactNode } from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary component to catch and handle React component errors
 * Prevents entire app from crashing when a component fails
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { componentName } = this.props;
    const timestamp = new Date().toISOString();
    
    console.error(
      `[ErrorBoundary${componentName ? ` - ${componentName}` : ''}] Component error caught at ${timestamp}:`,
      {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }
    );

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-content">
            <h3 className="error-boundary-title">
              {componentName ? `${componentName} Error` : 'Something went wrong'}
            </h3>
            <p className="error-boundary-message">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <button className="error-boundary-reset" onClick={this.handleReset}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
