import React from 'react';
import { logErrorEvent } from '../lib/errorTracking';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  async componentDidCatch(error, info) {
    await logErrorEvent({
      component: this.props.name || 'ErrorBoundary',
      error_name: error?.name,
      error_message: error?.message,
      stack: error?.stack,
      severity: 'error',
      context: { componentStack: info?.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;


