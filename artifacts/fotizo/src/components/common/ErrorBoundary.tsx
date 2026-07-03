import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// App-level error boundary: shows a recoverable fallback instead of a white screen
// when a render throws. Hook a real error-tracking service into componentDidCatch.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Replace with your error-reporting service (Sentry, etc.).
    console.error("Uncaught render error:", error, info);
  }

  private handleReload = () => {
    window.location.assign("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center"
        >
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            An unexpected error occurred. Please reload the page — if it keeps happening, try again
            later.
          </p>
          <Button onClick={this.handleReload}>Reload Fotizo</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
