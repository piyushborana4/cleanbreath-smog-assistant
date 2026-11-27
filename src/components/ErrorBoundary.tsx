import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * React ErrorBoundary capturing unexpected UI or Firestore permission errors gracefully.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('CleanBreath ErrorBoundary caught error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto my-12 max-w-xl rounded-lg border border-light-error dark:border-dark-error bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container p-gutter-xl flex flex-col gap-gutter-md"
        >
          <div className="flex items-center gap-gutter-sm">
            <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
              error
            </span>
            <h2 className="font-headline text-title-lg">Something went wrong</h2>
          </div>
          <p className="font-body text-body-md">
            CleanBreath encountered a display or data error. Reload the page to continue safely.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="self-start min-h-12 px-gutter-xl rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-label text-label-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
          >
            Reload CleanBreath
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
