import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Captura de errores globales para producción
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { tieneError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { tieneError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Raíz Error Boundary]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ tieneError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.tieneError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-4 text-rose-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black italic uppercase tracking-wide text-indigo-400 mb-2">
            Algo no salió como esperábamos
          </h1>
          <p className="text-slate-400 text-sm font-bold italic mb-6 max-w-md">
            Ocurrió un problema técnico al cargar la interfaz de usuario.
          </p>

          <button
            onClick={this.handleReset}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black italic text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95"
          >
            Reintentar / Cargar de nuevo
          </button>

          {/* Mensaje técnico para diagnóstico rápido en producción */}
          {this.state.error?.message && (
            <p className="mt-6 max-w-xl text-[10px] font-mono text-slate-600 break-all select-all">
              {String(this.state.error.message).slice(0, 300)}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);