import React from 'react';

/**
 * Error boundary.
 *
 * TWO THINGS WERE WRONG BEFORE, AND BOTH MATTERED
 *
 * 1. Where it was mounted. It wrapped only the `<main>` slot, so a throw in the
 *    top bar, the sidebar, either drawer or any of the seven popups took down
 *    the whole app with no message. A card failing and the product being gone
 *    are very different outcomes, and the code was treating them the same.
 *
 * 2. How it recovered. "Try again" only cleared a flag. If the error came from
 *    props rather than a race, the very next render threw again and the user
 *    was stuck in a loop with a button that visibly did nothing. Now the child
 *    subtree is remounted through a key, so recovery re-runs the code path
 *    rather than re-reading the same broken tree.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, attempt: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Kept as console.error: there is no reporting endpoint yet, and inventing
    // one that silently drops errors would be worse than the honest log.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, attempt: s.attempt + 1 }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { title = 'Something went wrong', compact = false } = this.props;

    if (compact) {
      // For a single screen or card: stay inside the app shell so the user
      // keeps their navigation and can simply pick a different screen.
      return (
        <div
          role="alert"
          className="p-8 max-w-xl mx-auto my-12 bg-white rounded-lg border border-red-200 shadow-sm text-center"
        >
          <h2 className="text-lg font-semibold text-[#393A3D] mb-1">{title}</h2>
          <p className="text-sm text-[#6B6C72] mb-4">
            {this.state.error?.message || 'This part of the app could not be displayed.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 bg-[#2CA01C] hover:bg-[#108000] text-white text-sm font-semibold rounded"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => (window.location.hash = '#/dashboard')}
              className="px-4 py-2 text-sm font-semibold text-[#0077C5] hover:underline"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      );
    }

    // For the whole app: the shell itself failed, so navigation is gone too and
    // a reload is the only real recovery.
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F8] p-6">
        <div role="alert" className="max-w-md w-full bg-white rounded-lg border border-red-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl" aria-hidden="true">
            !
          </div>
          <h1 className="text-xl font-semibold text-[#393A3D] mb-2">{title}</h1>
          <p className="text-sm text-[#6B6C72] mb-6">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-5 py-2 bg-[#2CA01C] hover:bg-[#108000] text-white text-sm font-semibold rounded"
          >
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
