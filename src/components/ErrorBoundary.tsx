import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null; showDetails: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the full error debuggable in the console.
    console.error('[TRACE] Uncaught error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const err = this.state.error;
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0c', color: '#e0e0e8',
        fontFamily: "'Space Grotesk', sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <svg width="48" height="42" viewBox="0 0 40 34" fill="none" style={{ marginBottom: 20 }}>
            <polyline points="20,4 4,30 36,30" stroke="#4f8fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: '#fff', marginBottom: 10 }}>
            Algo no ha ido como esperábamos
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#888898', marginBottom: 24, lineHeight: 1.6 }}>
            Refresca la página o vuelve al inicio. Si el problema persiste, escríbenos a soporte@traceetx.com.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
            <button onClick={() => window.location.reload()} style={btn(true)}>Refrescar</button>
            <button onClick={() => { window.location.href = '/'; }} style={btn(false)}>Volver al inicio</button>
          </div>
          {err && (
            <div style={{ textAlign: 'left' }}>
              <button
                onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                style={{ background: 'transparent', border: 'none', color: '#4a4a60', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {this.state.showDetails ? '▾' : '▸'} Detalles técnicos
              </button>
              {this.state.showDetails && (
                <pre style={{ marginTop: 8, background: '#111113', border: '1px solid #1e1e20', borderRadius: 8, padding: 12, fontSize: '0.72rem', color: '#ef4444', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  {err.name}: {err.message}{'\n'}{err.stack?.slice(0, 600)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

function btn(primary: boolean): React.CSSProperties {
  return {
    background: primary ? '#4f8fff' : 'transparent',
    color: primary ? '#fff' : '#e0e0e8',
    border: primary ? 'none' : '1px solid #1e1e20',
    borderRadius: 8, padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
  };
}

export default ErrorBoundary;
