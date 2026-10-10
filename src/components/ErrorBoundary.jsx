import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-lg border border-red-200 shadow-sm text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-semibold text-[#393A3D] mb-2">Something went wrong</h2>
          <p className="text-sm text-[#6B6D74] mb-4">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[#2CA01C] hover:bg-[#108000] text-white text-sm font-semibold rounded"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
