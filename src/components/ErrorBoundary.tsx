import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let tenantId: string | null = null;
      if (user) {
        const { data: director } = await supabase
          .from('directors')
          .select('tenant_id')
          .eq('user_id', user.id)
          .maybeSingle();
        tenantId = director?.tenant_id || null;
      }
      
      if (user) {
        await supabase.from('error_logs').insert({
          user_id: user.id,
          tenant_id: tenantId,
          error_message: error.message,
          error_stack: error.stack?.substring(0, 5000),
          component_stack: errorInfo.componentStack?.substring(0, 5000),
          url: window.location.href,
          user_agent: navigator.userAgent,
        });
      }
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

  handleReportBug = () => {
    const subject = encodeURIComponent(`Błąd: ${this.state.error?.message || 'Nieznany'}`);
    const body = encodeURIComponent(
      `Opis błędu:\n\n` +
      `URL: ${window.location.href}\n` +
      `Czas: ${new Date().toLocaleString('pl-PL')}\n` +
      `Przeglądarka: ${navigator.userAgent}\n\n` +
      `Komunikat: ${this.state.error?.message || 'Brak'}\n`
    );
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`, '_blank');
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
          <div className="max-w-lg w-full bg-card rounded-2xl shadow-lg border border-border p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-foreground text-center mb-2">
              Coś poszło nie tak
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Aplikacja napotkała nieoczekiwany błąd. Możesz spróbować poniższych akcji.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <Button onClick={this.handleReset} className="flex-1 gap-2">
                <RefreshCw className="h-4 w-4" />
                Spróbuj ponownie
              </Button>
              <Button 
                variant="outline" 
                onClick={this.handleGoHome}
                className="flex-1 gap-2"
              >
                <Home className="h-4 w-4" />
                Strona główna
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
              onClick={this.handleReportBug}
            >
              <Mail className="h-4 w-4" />
              Zgłoś błąd
            </Button>

            {/* Error details */}
            {this.state.error && (
              <div className="pt-4 mt-4 border-t border-border">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  {this.state.showDetails ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {isDev ? 'Szczegóły błędu' : 'Szczegóły techniczne'}
                </button>
                
                {this.state.showDetails && (
                  <div className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-48">
                    <p className="text-xs font-mono font-medium text-destructive mb-2">
                      {this.state.error.message}
                    </p>
                    {isDev && this.state.error.stack && (
                      <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground/60 text-center mt-4">
              Błąd został automatycznie zgłoszony do zespołu technicznego.
            </p>
          </div>
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
