import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ======================
// CONFIGURAÇÃO GLOBAL
// ======================

// Configurar console em produção
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// ======================
// ERROR BOUNDARY GLOBAL
// ======================

class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('💥 Erro global capturado:', error, errorInfo);
    
    // Salvar erro para diagnóstico
    try {
      localStorage.setItem(
        '@lunara_global_error',
        JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Erro ao salvar log de erro:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😕</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Algo deu errado
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#006699',
              color: 'white',
              borderRadius: '0.75rem',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Recarregar Página
          </button>
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '600px' }}>
              <summary style={{ cursor: 'pointer', color: '#6b7280' }}>
                Detalhes do erro (apenas em desenvolvimento)
              </summary>
              <pre style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                overflow: 'auto'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// ======================
// RENDERIZAÇÃO
// ======================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);

// ======================
// SERVICE WORKER REGISTRATION
// ======================

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration.scope);
        
        // Verificar atualizações periodicamente
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // A cada hora
      })
      .catch((error) => {
        console.error('❌ Erro ao registrar Service Worker:', error);
      });
  });
}

// ======================
// PERFORMANCE MONITORING
// ======================

if (import.meta.env.DEV) {
  // Monitorar performance em desenvolvimento
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.duration > 50) {
        console.warn(`⚠️ Operação lenta detectada: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
      }
    });
  });

  observer.observe({ entryTypes: ['measure', 'navigation'] });
}

// ======================
// UNHANDLED REJECTION HANDLER
// ======================

window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Promise rejeitada não tratada:', event.reason);
  
  // Salvar para diagnóstico
  try {
    const errors = JSON.parse(localStorage.getItem('@lunara_unhandled_errors') || '[]');
    errors.push({
      reason: String(event.reason),
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('@lunara_unhandled_errors', JSON.stringify(errors.slice(-10)));
  } catch (e) {
    console.error('Erro ao salvar log de erro:', e);
  }
});

console.log('🚀 Lunara Agenda v3.0 inicializado');