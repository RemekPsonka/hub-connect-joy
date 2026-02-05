import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    this.setState({ error, errorInfo });

    // Log to Supabase - do this BEFORE showing UI to not lose the error
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try to get tenant_id from directors table if user is logged in
      let tenantId: string | null = null;
      if (user) {
        const { data: director } = await supabase
          .from('directors')
          .select('tenant_id')
          .eq('user_id', user.id)
          .maybeSingle();
        tenantId = director?.tenant_id || null;
      }
      
      await supabase.from('error_logs').insert({
        user_id: user?.id || null,
        tenant_id: tenantId,
        error_message: error.message,
        error_stack: error.stack?.substring(0, 5000), // Limit stack size
        component_stack: errorInfo.componentStack?.substring(0, 5000),
        url: window.location.href,
        user_agent: navigator.userAgent,
      });
    } catch (logError) {
      console.error('Failed to log error to database:', logError);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRefresh = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Coś poszło nie tak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Aplikacja napotkała nieoczekiwany błąd. Możesz spróbować:
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleReset} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Spróbuj ponownie
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Strona główna
                </Button>
              </div>

              {/* Error details - only in development or with toggle */}
              {this.state.error && (
                <div className="pt-2">
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {this.state.showDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    {isDev ? 'Szczegóły błędu' : 'Szczegóły techniczne'}
                  </button>
                  
                  {this.state.showDetails && (
                    <div className="mt-2 p-3 bg-muted rounded-md overflow-auto max-h-48">
                      <p className="text-sm font-medium text-destructive mb-2">
                        {this.state.error.message}
                      </p>
                      {isDev && this.state.error.stack && (
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Błąd został automatycznie zgłoszony do zespołu technicznego.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper function component for easier use with hooks
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallbackComponent={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
